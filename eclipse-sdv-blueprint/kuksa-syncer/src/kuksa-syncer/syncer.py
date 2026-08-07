# Copyright (c) 2025 Eclipse Foundation.
# 
# This program and the accompanying materials are made available under the
# terms of the MIT License which is available at
# https://opensource.org/licenses/MIT.
#
# SPDX-License-Identifier: MIT
import shutil
import signal
import subprocess
from kuksa_client.grpc.aio import VSSClient
from kuksa_client.grpc import VSSClient as KClient
from kuksa_client.grpc import Datapoint
from kuksa_client.grpc import VSSClientError
from kuksa_client.grpc import MetadataField
from kuksa_client.grpc import EntryType
import socketio
import asyncio
from subpiper import subpiper
import time
import os
import sys
import json
from json_array_patch import apply_global_patch
from project_utils import create_project_from_json

# Apply global JSON patch for array serialization
apply_global_patch()

# from vehicle_model_manager import generate_vehicle_model, revert_vehicle_model
import pkg_manager

# Infra endpoints are env-overridable so the same image can run on the AosUnit
# (defaults) or on Azure Container Apps (env vars set by the deployment).
BROKER_IP = os.getenv('KUKSA_BROKER_HOST', 'kuksa')
BROKER_PORT = int(os.getenv('KUKSA_BROKER_PORT', '55555'))

DEFAULT_KIT_SERVER = 'https://kit.digitalauto.tech'
DEFAULT_RUNTIME_NAME = 'ev-range-extender'
DEFAULT_RUNTIME_PREFIX = 'Runtime-'

TIME_TO_KEEP_SUBSCRIBER_ALIVE = 60
TIME_TO_KEEP_RUNNER_ALIVE = 3*60


lsOfRunner = []

lsOfApiSubscriber = {}

sio = socketio.AsyncClient()

client = VSSClient(BROKER_IP, BROKER_PORT)

# Storage location for the mock-signals file. On AosUnit this is a mounted
# writable volume at /storage; on Azure Container Apps we mount an Azure Files
# share to the same path (or override via env).
mock_signal_read_ony_filename = "signals.json"
mock_signal_path = os.getenv('SIGNALS_STORE_PATH', '/storage/signals.json')

# ---------------------------------------------------------------------------
# VSS path alias layer
# ---------------------------------------------------------------------------
# The Digital Auto playground/dashboard uses recent VSS path names (e.g.
# Vehicle.Cabin.Seat.Row1.DriverSide.Heating) while the Kuksa databroker on
# this unit may have an older VSS loaded (e.g. Vehicle.Cabin.Seat.Row1.Pos1.
# Heating). We keep a per-process map from the dashboard-facing path to the
# actual databroker path. Everything sent back to the kit server is keyed by
# the dashboard path, so widgets keep working transparently.
#
# A value of None in the map is a "negative" entry meaning: we probed the
# databroker and no candidate worked, don't probe again.
path_alias_map = {}

# Set of paths currently being resolved by a background task, to avoid
# scheduling duplicate resolutions from ticker_fast.
_alias_resolution_in_flight = set()

# Optional static overrides supplied via env var, e.g.
#   KUKSA_PATH_ALIASES='{"Vehicle.A.B":"Vehicle.X.Y"}'
_static_aliases_env = os.getenv("KUKSA_PATH_ALIASES", "")
if _static_aliases_env:
    try:
        _static_aliases = json.loads(_static_aliases_env)
        if isinstance(_static_aliases, dict):
            path_alias_map.update({str(k): str(v) for k, v in _static_aliases.items()})
            print("[SYNCER] Loaded " + str(len(path_alias_map)) +
                  " static VSS path alias(es) from KUKSA_PATH_ALIASES", flush=True)
    except Exception as _e:
        print("[SYNCER] Failed to parse KUKSA_PATH_ALIASES: " + str(_e), flush=True)


# Legacy renaming rules. Each entry is (needle, replacement) applied via
# str.replace. Rules whose needle is not in the path are skipped. All
# non-empty combinations of the applicable rules are generated as candidates
# so a single path can be rewritten in more than one dimension at once (e.g.
# both the seat-position rename *and* the leaf rename below).
#
# Known renamings covered:
#   DriverSide         -> Pos1         (VSS >=4.3 seat position rename)
#   PassengerSide      -> Pos2
#   Middle             -> Pos2         (Row2 middle seat in some specs)
#   .HeatingCooling    -> .Heating     (VSS 4.x renamed the seat heating leaf
#                                       from Heating to HeatingCooling; older
#                                       databrokers still expose Heating)
#
# The leaf rename is anchored with a leading dot so it only matches the last
# path segment, not a hypothetical child like HeatingCoolingLevel.
_LEGACY_SUBSTITUTIONS = (
    (".DriverSide.", ".Pos1."),
    (".PassengerSide.", ".Pos2."),
    (".Middle.", ".Pos2."),
    (".HeatingCooling", ".Heating"),
)


def _generate_path_candidates(path):
    """Yield legacy-style candidates for a dashboard-facing VSS path.

    Applies every non-empty subset of the applicable substitutions from
    _LEGACY_SUBSTITUTIONS so that combined renames (e.g. DriverSide+leaf) are
    also tried. Extend _LEGACY_SUBSTITUTIONS to add more renamings.
    """
    applicable = [(old, new) for old, new in _LEGACY_SUBSTITUTIONS if old in path]
    if not applicable:
        return
    n = len(applicable)
    seen = set()
    for mask in range(1, 1 << n):
        candidate = path
        for i in range(n):
            if mask & (1 << i):
                old, new = applicable[i]
                candidate = candidate.replace(old, new)
        if candidate != path and candidate not in seen:
            seen.add(candidate)
            yield candidate


def _resolve_databroker_path(kclient, dashboard_path):
    """Return the actual databroker path for a dashboard path, or None.

    Results are memoized in path_alias_map so we only probe once per path.
    A cached None means "already probed, nothing works".
    """
    if dashboard_path in path_alias_map:
        return path_alias_map[dashboard_path]

    # First try the path as-is.
    try:
        md = kclient.get_metadata([dashboard_path])
        if md is not None:
            path_alias_map[dashboard_path] = dashboard_path
            return dashboard_path
    except Exception:
        pass

    # Then try known legacy candidates.
    for candidate in _generate_path_candidates(dashboard_path):
        try:
            md = kclient.get_metadata([candidate])
            if md is not None:
                path_alias_map[dashboard_path] = candidate
                print("[SYNCER] path alias: '" + dashboard_path +
                      "' -> '" + candidate + "'", flush=True)
                return candidate
        except Exception:
            continue

    # Cache the negative result so ticker_fast doesn't keep re-probing.
    path_alias_map[dashboard_path] = None
    return None


def _resolve_alias_blocking(dashboard_path):
    """Blocking resolver used from a thread (run_in_executor).

    Opens its own short-lived KClient so we never share a sync client across
    threads.
    """
    if dashboard_path in path_alias_map:
        return path_alias_map[dashboard_path]
    try:
        with KClient(BROKER_IP, BROKER_PORT) as kclient:
            return _resolve_databroker_path(kclient, dashboard_path)
    except Exception as e:
        print("[SYNCER] alias resolver: KClient error for " + str(dashboard_path) +
              ": " + str(e), flush=True)
        return None

def is_process_running_nix(process_name):
    """Check if a process with the given name is running on Linux/macOS."""
    try:
        # Using pgrep (more direct)
        process = subprocess.Popen(['pgrep', '-x', process_name], stdout=subprocess.PIPE)
        output, error = process.communicate()
        return len(output) > 0
    except FileNotFoundError:
        # pgrep might not be available, try ps
        process = subprocess.Popen(['ps', '-ax', '-o', 'comm'], stdout=subprocess.PIPE)
        output, error = process.communicate()
        return process_name.lower().encode() in output.lower()

async def send_app_run_reply(master_id, is_done, retcode, content):
    await sio.emit("messageToKit-kitReply", {
        "kit_id": CLIENT_ID,
        "request_from": master_id,
        "cmd": "run_python_app",
        "data": "",
        "isDone": is_done,
        "result": content,
        "code": retcode
    })

async def send_app_deploy_reply(master_id, content, is_finish, cmd="deploy-request"):
    await sio.emit("messageToKit-kitReply", {
        "token": "12a-124-45634-12345-1swer",
        "request_from": master_id,
        "cmd": cmd,
        "data": "",
        "result": content,
        "is_finish": is_finish
    })

main_loop = None

def process_done(master_id: str, retcode: int):
    if main_loop:
        asyncio.run_coroutine_threadsafe(send_app_run_reply(master_id, True, retcode, ""), main_loop)

def my_stdout_callback(master_id: str, line: str):
    if main_loop:
        asyncio.run_coroutine_threadsafe(send_app_run_reply(master_id, False, 0, line + '\r\n'), main_loop)

def my_stderr_callback(master_id: str, line: str):
    if main_loop:
        asyncio.run_coroutine_threadsafe(send_app_run_reply(master_id, False, 0, line + '\r\n'), main_loop)

@sio.event
async def connect():
    print('[SYNCER] Connected to Kit Server. Registering as kit_id=' + str(CLIENT_ID), flush=True)
    await sio.emit("register_kit", {
        "kit_id": CLIENT_ID,
        "name": CLIENT_ID
    })
    print('[SYNCER] register_kit emitted', flush=True)

@sio.event
async def disconnect():
    print('[SYNCER] Disconnected from Kit Server', flush=True)

@sio.event
async def connect_error(data):
    print('[SYNCER] Kit Server connect_error: ' + str(data), flush=True)

def wait_for_databroker_ready(max_attempts=10, sleep_time=0.5):
    for attempt in range(max_attempts):
        try:
            with KClient(BROKER_IP, BROKER_PORT) as temp_client:
                # Test connection by fetching server info or metadata
                temp_client.get_server_info()
            print("Databroker is ready.")
            return True
        except VSSClientError as e:
            if "Connection refused" in str(e):
                print(f"Databroker not ready yet (attempt {attempt + 1}/{max_attempts}). Retrying...")
                time.sleep(sleep_time)
            else:
                raise
    raise Exception("Databroker failed to become ready after retries.")

async def install_dependencies(request_from):
    """Install dependencies from requirements.txt."""
    requirements_path = "app/requirements.txt"
    if not os.path.exists(requirements_path):
        return True

    await send_app_run_reply(request_from, False, 0, "Installing dependencies from requirements.txt...\r\n")

    process = await asyncio.create_subprocess_exec(
        'pip', 'install', '-r', requirements_path,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )

    async def stream_output(stream, callback):
        while True:
            line = await stream.readline()
            if not line:
                break
            # The callbacks use asyncio.run, which is not ideal inside an already running loop.
            # A better approach would be to pass the loop and use loop.call_soon_threadsafe
            # or simply await the callback if it were async.
            # For now, we'll stick to the existing callback structure.
            callback(request_from, line.decode())

    stdout_task = asyncio.create_task(stream_output(process.stdout, my_stdout_callback))
    stderr_task = asyncio.create_task(stream_output(process.stderr, my_stdout_callback))

    await asyncio.gather(stdout_task, stderr_task)
    return_code = await process.wait()

    if return_code != 0:
        await send_app_run_reply(request_from, False, return_code, "Failed to install dependencies.\r\n")
        return False
    else:
        await send_app_run_reply(request_from, False, 0, "Dependencies installed successfully.\r\n")
        return True

@sio.event
async def messageToKit(data):
    try:
        print("[SYNCER] messageToKit cmd=" + str(data.get("cmd")) +
              " request_from=" + str(data.get("request_from")), flush=True)
    except Exception:
        print("[SYNCER] messageToKit received (unparseable data)", flush=True)
    if data["cmd"] in ("deploy_request", "deploy-request"):
        print("Receive deploy_request...")
        request_from =  data["request_from"]
        # your code to run app
        await send_app_deploy_reply(request_from, "Receive deploy request \r\n", False, data["cmd"])
        await asyncio.sleep(1)
        writeCodeToFile(data["code"], filename="main.py")
        await send_app_deploy_reply(request_from, "Check syntax.... \r\n", False, data["cmd"])
        # your_code_to_check_velocitas_code(data["code"])
        await asyncio.sleep(3)
        await send_app_deploy_reply(request_from, "Build docker image \r\n", False, data["cmd"])
        # your_code_to_build_docker(data["code"])
        await asyncio.sleep(3)
        await send_app_deploy_reply(request_from, "Send to HW kit \r\n", False, data["cmd"])
        # your_code...()
        await asyncio.sleep(3)
        await send_app_deploy_reply(request_from, "Run docker on HW kit \r\n", False, data["cmd"])
        # your_code...()
        await asyncio.sleep(3)
        await send_app_deploy_reply(request_from, "Deploy done! \r\n", True, data["cmd"])
        return 0
    
    if data["cmd"] == "subscribe_apis":
        if data["apis"] is not None:
            apis = data["apis"]
            master_id=data["request_from"]
            print("[SYNCER] subscribe_apis from=" + str(master_id) +
                  " count=" + str(len(apis) if isinstance(apis, list) else 'n/a') +
                  " apis=" + str(apis), flush=True)
            lsOfApiSubscriber[master_id] = {
                "from": time.time(),
                "apis": apis,
                "first_emit_logged": False,
            }
            print("[SYNCER] active subscribers=" + str(len(lsOfApiSubscriber)), flush=True)

            # Reply to the kit server IMMEDIATELY so the dashboard knows the
            # subscription is registered. Metadata probing (which is a blocking
            # gRPC call) is done off the event loop below so it can never stall
            # ticker_fast or socket.io.
            await sio.emit("messageToKit-kitReply", {
                "kit_id": CLIENT_ID,
                "request_from": data["request_from"],
                "cmd": "subscribe_apis",
                "result": "Successful"
            })

            if isinstance(apis, list) and len(apis) > 0:
                async def _do_append(_apis):
                    loop = asyncio.get_running_loop()
                    try:
                        t0 = time.time()
                        await loop.run_in_executor(None, appendMockSignal, _apis)
                        print("[SYNCER] appendMockSignal finished in " +
                              ("%.2f" % (time.time() - t0)) + "s", flush=True)
                    except Exception as e:
                        print("[SYNCER] appendMockSignal error: " + str(e), flush=True)
                asyncio.create_task(_do_append(list(apis)))
        else:
            print("[SYNCER] subscribe_apis received with apis=None", flush=True)
        return 0
    
    if data["cmd"] == "unsubscribe_apis":
        master_id=data["request_from"]
        print("[SYNCER] unsubscribe_apis from=" + str(master_id), flush=True)
        if master_id in lsOfApiSubscriber:
            del lsOfApiSubscriber[master_id]
        else:
            print("[SYNCER] unsubscribe_apis: no such subscriber", flush=True)
        await sio.emit("messageToKit-kitReply", {
            "kit_id": CLIENT_ID,
            "request_from": data["request_from"],
            "cmd": "unsubscribe_apis",
            "result": "Successful"
        })
        return 0
    
    if data["cmd"] == "list_mock_signal":
        mock_signal = listMockSignal()
        await sio.emit("messageToKit-kitReply", {
            "kit_id": CLIENT_ID,
            "request_from": data["request_from"],
            "cmd": "list_mock_signal",
            "data": mock_signal,
            "result": "Successful"
        })
        return 0
    
    if data["cmd"] == "set_mock_signals":
        modifyMockSignal(data["data"])
        mock_signal = listMockSignal()
        # print("After modifying:")
        # print(mock_signal)
        restartMockProvider()
        await sio.emit("messageToKit-kitReply", {
            "kit_id": CLIENT_ID,
            "request_from": data["request_from"],
            "cmd": "set_mock_signals",
            "data": mock_signal,
            "result": "Successful"
        })
        return 0
    
    if data["cmd"] == "write_signals_value":
        writeSignalsValue(data["data"])
        # mock_signal = listMockSignal()
        mock_signal = {}
        await sio.emit("messageToKit-kitReply", {
            "kit_id": CLIENT_ID,
            "request_from": data["request_from"],
            "cmd": "write_signals_value",
            "data": mock_signal,
            "result": "Successful"
        })
        return 0
    
    if data["cmd"] == "reset_signals_value":
        with open(mock_signal_path) as f:
            signal_list = json.load(f)
        writeSignalsValue(str(signal_list))
        mock_signal = listMockSignal()
        await sio.emit("messageToKit-kitReply", {
            "kit_id": CLIENT_ID,
            "request_from": data["request_from"],
            "cmd": "reset_signals_value",
            "data": mock_signal,
            "result": "Successful"
        })
        return 0
    
    if data["cmd"] == "generate_vehicle_model":
        print("receive reauest generate_vehicle_model")
        # print(data["data"])
        # print type of data["data"]
        # print(type(data["data"]))
        print("not supported command: generate_vehicle_model")

        # try:
        #     await sio.emit("messageToKit-kitReply", {
        #         "kit_id": CLIENT_ID,
        #         "request_from": data["request_from"],
        #         "cmd": "revert_vehicle_model",
        #         "result": "Start to rebuild vehicle model...\r\n"
        #     })
        #     stopMockService()
        #     generate_vehicle_model(json.dumps(data["data"]))
        #
        #     time.sleep(0.5)
        #     if not os.environ.get('DISABLE_DATABROKER'):
        #         # Check is databroker app running or not
        #         if is_process_running_nix("databroker"):
        #             print("databroker is running")
        #         else:
        #             print("databroker is not running")
        #             raise Exception("Databroker is not running")
        #
        #         # Wait until databroker is fully ready (port is listening)
        #         wait_for_databroker_ready()
        #
        #     modifyMockSignal([""])
        #     time.sleep(0.5)
        #     startMockService()
        #     await sio.emit("messageToKit-kitReply", {
        #         "kit_id": CLIENT_ID,
        #         "request_from": data["request_from"],
        #         "cmd": "generate_vehicle_model",
        #         "result": "Generate new model Successful"
        #     })
        #     return 0
        # except Exception as e:
        #     # print("generate_vehicle_model Error: ", str(e))
        #
        #     await sio.emit("messageToKit-kitReply", {
        #         "kit_id": CLIENT_ID,
        #         "request_from": data["request_from"],
        #         "cmd": "generate_vehicle_model",
        #         "result": "Error: generate_vehicle_model Failed: " + str(e) + "\r\nRevert back to default model"
        #     })
        #     revert_vehicle_model();
        #     return 0
        return 0

    if data["cmd"] == "revert_vehicle_model":
        print("not supported command: revert_vehicle_model")

        # await sio.emit("messageToKit-kitReply", {
        #     "kit_id": CLIENT_ID,
        #     "request_from": data["request_from"],
        #     "cmd": "revert_vehicle_model",
        #     "result": "Start to revert to default vehicle model...\r\n"
        # })
        # stopMockService()
        # revert_vehicle_model()
        # time.sleep(0.5)
        # startMockService()
        # await sio.emit("messageToKit-kitReply", {
        #     "kit_id": CLIENT_ID,
        #     "request_from": data["request_from"],
        #     "cmd": "revert_vehicle_model",
        #     "result": "Revert to default Vehicle Model Successful\r\n"
        # })
        return 0  
    
    if data["cmd"] == "list_python_packages":
        pkgs = pkg_manager.listPkg()
        # print(pkgs,flush=True)
        await sio.emit("messageToKit-kitReply", {
            "kit_id": CLIENT_ID,
            "request_from": data["request_from"],
            "cmd": "list_python_packages",
            "data": pkgs,
            "result": "Successful"
        })
        return 0
        
    if data["cmd"] == "install_python_packages":
        msg = data["data"]
        await sio.emit("messageToKit-kitReply", {
            "kit_id": CLIENT_ID,
            "request_from": data["request_from"],
            "cmd": "install_python_packages",
            "result": "Installing",
            "data": f"Installing packages: {msg}\n"
        })
        # print(msg,flush=True)
        response = await pkg_manager.installPkg(data["data"])
        # await asyncio.sleep(1)
        await sio.emit("messageToKit-kitReply", {
            "kit_id": CLIENT_ID,
            "request_from": data["request_from"],
            "cmd": "install_python_packages",
            "result": "Successful",
            "data": str(response)
        }) 

        return 0  

    if data["cmd"] == "run_python_app":
        # check do we have data["data"]["code"]
        if "code" not in data["data"]:
            await sio.emit("messageToKit-kitReply", {
                "kit_id": CLIENT_ID,
                "request_from": data["request_from"],
                "cmd": "run_python_app",
                "result": "Error: Missing code",
                "data": ""
            })
            return 1
        appName = "App name"
        if "name" in data["data"]:
            appName = data["data"]["name"]
       
        code_data = data["data"]["code"]
        cmd_to_run = 'python -u main.py'
        is_project = False
        try:
            # Try to parse the code as JSON
            json.loads(code_data)
            is_project = True
            create_project_from_json(code_data, base_dir="app")
            cmd_to_run = 'python -u app/main.py'
        except json.JSONDecodeError:
            # Not a JSON, treat as raw code
            writeCodeToFile(code_data, filename="main.py")

        if is_project:
            install_success = await install_dependencies(data["request_from"])
            if not install_success:
                return 1  # Stop execution if dependencies failed to install

        # try:
        usedAPIs = data["usedAPIs"]
        if isinstance(usedAPIs,list) and len(usedAPIs)>0:
            try:
                appendMockSignal(usedAPIs)
            except Exception as e:
                print("Error: ", str(e))
                pass
        # except Exception as e:
        #     print("Fail to appendMockSignal for usedAPIs")
        #     print(str(e))

        proc = subpiper(
            master_id=data["request_from"],
            cmd=cmd_to_run,
            stdout_callback=my_stdout_callback,
            stderr_callback=my_stdout_callback,
            finished_callback=process_done
        )
        lsOfRunner.append({
            "appName": appName,
            "runner": proc,
            "request_from": data["request_from"],
            "from": time.time()
        })
        return 0
    
    if data["cmd"] == "run_bin_app":
        if "data" not in data:
            await sio.emit("messageToKit-kitReply", {
                "kit_id": CLIENT_ID,
                "request_from": data["request_from"],
                "cmd": "run_bin_app",
                "result": "Error: Missing app name",
                "data": ""
            }) 
            return 1
        app_name = data["data"]
        if os.path.isfile(f'/home/dev/output/{app_name}'):
            try:
                usedAPIs = data["usedAPIs"]
                if isinstance(usedAPIs,list) and len(usedAPIs)>0:
                    try:
                        appendMockSignal(usedAPIs)
                    except Exception as e:
                        print("Error: ", str(e))
                        pass
            except Exception as e:
                print("Fail to appendMockSignal for usedAPIs")
                print(str(e))
                
            await asyncio.sleep(0.5)
            proc = subpiper(
                master_id=data["request_from"],
                cmd=f'/home/dev/output/{app_name}',
                stdout_callback=my_stdout_callback,
                stderr_callback=my_stdout_callback,
                finished_callback=process_done
            )
            lsOfRunner.append({
                "appName": app_name,
                "runner": proc,
                "request_from": data["request_from"],
                "from": time.time()
            })
        else:
            await sio.emit("messageToKit-kitReply", {
                "kit_id": CLIENT_ID,
                "request_from": data["request_from"],
                "cmd": "run_bin_app",
                "result": "Failed: Rust app not found",
                "data": ""
            }) 
        return 0
    
    elif data["cmd"] == "stop_python_app":
        # print(data["code"])
        for runner in lsOfRunner:
            if runner["request_from"] == data["request_from"]:
                proc = runner["runner"]
                if proc is not None:
                    try:
                        proc.kill()
                        lsOfRunner.remove(runner)
                    except Exception as e:
                        print("Kill proc get error", str(e))
                        await sio.emit("messageToKit-kitReply", {
                            "kit_id": CLIENT_ID,
                            "request_from": data["request_from"],
                            "cmd": "stop_python_app",
                            "result": str(e)
                        })
        return 0
    
    elif data["cmd"] == "get-runtime-info":
        await sio.emit("messageToKit-kitReply", {
            "kit_id": CLIENT_ID,
            "request_from": data["request_from"],
            "cmd": "get-runtime-info",
            "data": {
                "lsOfRunner": convertLsOfRunnerToJson(lsOfRunner),
                "lsOfApiSubscriber": lsOfApiSubscriber
            }
            
        })
        return 0
    return 1

def convertLsOfRunnerToJson(lsOfRunner):
    result = []
    for runner in lsOfRunner:
        result.append({
            "appName": runner["appName"],
            "request_from": runner["request_from"],
            "from": runner["from"]
        })
    return result

def writeCodeToFile(code, filename="main.py"):
    f = open(filename, "w+")
    f.write(code)
    f.close()

def listMockSignal():
    if os.path.exists(mock_signal_path):
        with open(mock_signal_path,'r') as file:
            mock_signal_array = json.load(file)
            return mock_signal_array
    else:
        print("No signals found.",flush=True)

def stopMockService():
    pid_file = "/home/dev/mockprovider.pid"
    if os.path.exists(pid_file):
        with open(pid_file, "r") as f:
            pid = int(f.read().strip())

        try:
            os.kill(pid, signal.SIGKILL)
            print(f"mockprovider with PID {pid} has been killed.", flush=True)
        except ProcessLookupError:
            print(f"No process found with PID {pid}.", flush=True)
            pass
    else:
        print(f"mockprovider pid file at '{pid_file}' does not exist.", flush=True)

def startMockService():
    try:
        print("Starting mock provider...", flush=True)
        subprocess.Popen(["python", "/home/dev/ws/mock/mockprovider.py"])
        print("mock provider started.", flush=True)
    except Exception as e:
        print(f"Error starting mock provider: {e}", flush=True)
        return 1

def restartMockProvider():
    stopMockService()
    time.sleep(0.5)
    startMockService()

def appendMockSignal(signals):
    if signals is None or len(signals) <=0:
        return 0
    print("[SYNCER] appendMockSignal: checking " + str(len(signals)) +
          " signal(s) against databroker " + str(BROKER_IP) + ":" + str(BROKER_PORT), flush=True)
    hasNew = False
    try:
        kclient_ctx = KClient(BROKER_IP, BROKER_PORT)
    except Exception as e:
        print("[SYNCER] appendMockSignal: cannot create KClient: " + str(e), flush=True)
        return 0
    with kclient_ctx as kclient:
        with open(mock_signal_path,'r+') as f:
            content = f.read()
            if len(content) == 0 :
                content = "[]"
            cur_mocks = json.loads(content)
            cur_mock_names = []
            for cur_mock in cur_mocks:
                cur_mock_names.append(cur_mock["signal"])
            for run_signal in signals:
                if run_signal not in cur_mock_names:
                    try:
                        resolved = _resolve_databroker_path(kclient, run_signal)
                        if resolved is not None:
                            hasNew = True
                            if resolved == run_signal:
                                print("[SYNCER] appendMockSignal: registered new signal " +
                                      str(run_signal), flush=True)
                            else:
                                print("[SYNCER] appendMockSignal: registered new signal " +
                                      str(run_signal) + " via alias " + str(resolved), flush=True)
                            cur_mock_names.append(run_signal)
                            cur_mocks.append({
                                "signal":  run_signal,
                                "value": "0"
                            })
                        else:
                            print("[SYNCER] appendMockSignal: no databroker path for " +
                                  str(run_signal) + " (tried aliases)", flush=True)
                    except Exception as e:
                        print("[SYNCER] appendMockSignal: resolve failed for " +
                              str(run_signal) + ": " + str(e), flush=True)
                else:
                    # Signal is already in signals.json (from a prior run).
                    # path_alias_map is in-memory only, so warm it up now
                    # otherwise ticker_fast will hit the un-aliased path.
                    if run_signal not in path_alias_map:
                        try:
                            resolved = _resolve_databroker_path(kclient, run_signal)
                            if resolved is None:
                                print("[SYNCER] appendMockSignal: already tracked " +
                                      str(run_signal) + " but no databroker path found", flush=True)
                            elif resolved != run_signal:
                                print("[SYNCER] appendMockSignal: already tracked " +
                                      str(run_signal) + " -> alias " + str(resolved), flush=True)
                            else:
                                print("[SYNCER] appendMockSignal: already tracked " +
                                      str(run_signal), flush=True)
                        except Exception as e:
                            print("[SYNCER] appendMockSignal: alias warmup failed for " +
                                  str(run_signal) + ": " + str(e), flush=True)
                    else:
                        print("[SYNCER] appendMockSignal: already tracked " + str(run_signal), flush=True)
                    
            if hasNew:
                f.seek(0)
                json.dump(cur_mocks,f,indent=4)
                f.truncate()

    if hasNew:
        restartMockProvider()
        
    return 0

def modifyMockSignal(input_str):
    with open(mock_signal_path,'w') as file:
        json_string = json.dumps(input_str)
        input_signals = json.loads(json_string)
        final_signals = []
        with KClient(BROKER_IP, BROKER_PORT) as kclient:
            for signal in input_signals:
                try: 
                    if kclient.get_metadata([signal['signal'], ]) is not None:
                        final_signals.append(signal)
                except Exception as e:
                    print(e,flush=True)
        
        file.seek(0)
        json.dump(final_signals,file,indent=4)
        file.truncate()
        return 0

def writeSignalsValue(input_str):
    json_str = json.dumps(input_str)
    signal_values = json.loads(json_str)
    with KClient(BROKER_IP, BROKER_PORT) as kclient:
        for path,value in signal_values.items():
            try:
                db_path = _resolve_databroker_path(kclient, path) or path
                if db_path != path:
                    print("[SYNCER] writeSignalsValue: using alias " + str(path) +
                          " -> " + str(db_path), flush=True)
                meta_data = kclient.get_metadata([db_path], MetadataField.ENTRY_TYPE)
                entry_type = meta_data[db_path].entry_type
                if entry_type == EntryType.ACTUATOR:
                    try:
                        target_value = {db_path: Datapoint(value)}
                        kclient.set_target_values(target_value)
                    except Exception as e:
                        print("Error occured when writing target values: " + str(e),flush=True)
                elif entry_type == EntryType.SENSOR:
                    try:
                        current_value = {db_path: Datapoint(value)}
                        kclient.set_current_values(current_value)
                    except Exception as e:
                        print("Error occured when writing current values: " + str(e), flush=True)
                else:
                    print("The signal path provided was not actuator or sensor", flush=True)
            except Exception as e:
                print("Error occured when writing signal values: " + str(e),flush=True)

async def start_socketio(SERVER):
    print("Connecting to Kit Server: " + SERVER, flush=True)
    await sio.connect(SERVER)
    await sio.wait()


'''
    Faster ticker: 0.3 seconds sleep
        - Report API value back to client
'''
async def ticker_fast():
    log_counter = 0
    while True:
        await asyncio.sleep(0.3)
        # count number of child in lsOfApiSubscriber

        if len(lsOfApiSubscriber) <= 0:
            continue
        if not client.connected:
            try:
                await client.connect()
                print("[SYNCER] ticker_fast: Kuksa connected=" + str(client.connected), flush=True)
            except Exception as e:
                print("[SYNCER] ticker_fast: Kuksa connect failed: " + str(e), flush=True)
            continue

        try:
            log_counter += 1
            # Log a heartbeat roughly every ~3s (0.3s * 10)
            do_log = (log_counter % 10 == 0)
            for client_id in lsOfApiSubscriber:
                apis = lsOfApiSubscriber[client_id]["apis"]
                if len(apis) > 0:
                    # Map dashboard-facing api -> databroker path (may be identical).
                    # We keep the reverse mapping to relabel the response.
                    db_to_dash = {}
                    for api in apis:
                        mapped = path_alias_map.get(api, api)
                        # A cached None means "nothing works" - skip so we
                        # don't spam the databroker with 404s.
                        if mapped is None:
                            continue
                        db_to_dash[mapped] = api
                    current_values_dict = {}
                    for db_path, api in db_to_dash.items():
                        try:
                            current_values = await client.get_current_values([db_path])
                            # Relabel keys back to what the dashboard subscribed to.
                            for k, v in current_values.items():
                                current_values_dict[db_to_dash.get(k, k)] = v
                        except Exception as e:
                            # 404 = path not in databroker. Kick off an async
                            # alias resolution once so future reads use the
                            # correct path (or skip via negative cache).
                            err_text = str(e)
                            is_not_found = "not_found" in err_text or "404" in err_text
                            if is_not_found and api not in path_alias_map and \
                                    api not in _alias_resolution_in_flight:
                                _alias_resolution_in_flight.add(api)
                                loop = asyncio.get_running_loop()

                                def _done(fut, _api=api):
                                    _alias_resolution_in_flight.discard(_api)
                                    try:
                                        resolved = fut.result()
                                    except Exception:
                                        resolved = None
                                    if resolved is None:
                                        print("[SYNCER] ticker_fast: alias resolver gave up on " +
                                              str(_api) + " (negative-cached)", flush=True)
                                    elif resolved != _api:
                                        print("[SYNCER] ticker_fast: alias resolved " +
                                              str(_api) + " -> " + str(resolved), flush=True)

                                fut = loop.run_in_executor(None, _resolve_alias_blocking, api)
                                fut.add_done_callback(_done)
                            if do_log:
                                print("[SYNCER] ticker_fast: get_current_values failed for " +
                                      str(api) +
                                      (" (db=" + str(db_path) + ")" if db_path != api else "") +
                                      ": " + err_text, flush=True)
                            pass
                    result = {}
                    for api in current_values_dict:
                        if current_values_dict[api] is not None:
                            value = current_values_dict[api].value
                            # Convert array types to list for JSON serialization
                            if hasattr(value, 'values') and hasattr(value.values, '__iter__'):
                                result[api] = list(value.values)
                            elif hasattr(value, 'tolist'):
                                result[api] = value.tolist()
                            else:
                                result[api] = value
                        else:
                            result[api] = None
                    if do_log:
                        none_count = sum(1 for v in result.values() if v is None)
                        print("[SYNCER] ticker_fast: subscriber=" + str(client_id) +
                              " apis=" + str(len(apis)) +
                              " values_returned=" + str(len(result)) +
                              " none_values=" + str(none_count) +
                              " sample=" + str({k: result[k] for k in list(result)[:3]}), flush=True)
                    # Always log the first emit for a brand-new subscriber so
                    # we can confirm end-to-end delivery without waiting for
                    # the periodic heartbeat.
                    sub = lsOfApiSubscriber.get(client_id)
                    if sub is not None and not sub.get("first_emit_logged", False):
                        sub["first_emit_logged"] = True
                        none_count = sum(1 for v in result.values() if v is None)
                        print("[SYNCER] ticker_fast: FIRST emit to subscriber=" + str(client_id) +
                              " values_returned=" + str(len(result)) +
                              " none_values=" + str(none_count) +
                              " payload=" + str(result), flush=True)
                    await sio.emit("messageToKit-kitReply", {
                        "kit_id": CLIENT_ID,
                        "request_from": client_id,
                        "cmd":"apis-value",
                        "result": result
                    })
        except VSSClientError as vssErr:
            print("[SYNCER] ticker_fast: VSSClientError: " + str(vssErr), flush=True)
        except Exception as e:
            print("[SYNCER] ticker_fast: unexpected error: " + str(e), flush=True)

'''
    One second ticker
        - Handle old subscriber remove
        - Stop long runner
'''
async def ticker():
    print("[SYNCER] ticker started. Kuksa connected=" + str(client.connected), flush=True)
    while True:
        await asyncio.sleep(1)

        # remove old subscriber
        if len(list(lsOfApiSubscriber.keys())) > 0:
            for client_id in list(lsOfApiSubscriber.keys()):
                subscriber = lsOfApiSubscriber[client_id]
                timePass = time.time() - subscriber["from"]
                if timePass > TIME_TO_KEEP_SUBSCRIBER_ALIVE:
                    del lsOfApiSubscriber[client_id]


        # remove old subscriber
        if len(lsOfRunner) > 0:
            for runner in lsOfRunner:
                timePass = time.time() - runner["from"]
                if timePass > TIME_TO_KEEP_RUNNER_ALIVE:
                    try:
                        runner["runner"].kill()
                        lsOfRunner.remove(runner)
                    except Exception as e:
                        print(str(e))

'''
    5 second ticker: 5 seconds sleep
        - Report API value back to client
'''
async def ticker_5s():
    lastLstRunString = ""
    lastNoApiSubscriber = 0
    while True:
        await asyncio.sleep(5)
        noSubscriber = len(list(lsOfApiSubscriber.keys()))
        if noSubscriber <= 0:
            continue
        try:
            lstRunString = json.dumps(convertLsOfRunnerToJson(lsOfRunner))
            if lastLstRunString != lstRunString or lastNoApiSubscriber != noSubscriber:
                lastLstRunString = lstRunString
                lastNoApiSubscriber = noSubscriber

                await sio.emit("report-runtime-state", {
                    "kit_id": CLIENT_ID,
                    "data": {
                        "noOfRunner": len(lsOfRunner),
                        "noOfApiSubscriber": noSubscriber,
                    }
                })

                for client_sid in lsOfApiSubscriber:
                    # Convert lsOfApiSubscriber to JSON-safe format
                    safe_api_subscriber = {}
                    for key, val in lsOfApiSubscriber.items():
                        safe_api_subscriber[key] = {
                            "apis": val.get("apis", []),
                            "keep_alive": val.get("keep_alive", 0)
                        }
                    await sio.emit("messageToKit-kitReply", {
                            "kit_id": CLIENT_ID,
                            "request_from": client_sid,
                            "cmd":"report-runtime-state",
                            "data": {
                                "lsOfRunner": convertLsOfRunnerToJson(lsOfRunner),
                                "lsOfApiSubscriber": safe_api_subscriber
                            }
                        })
        except Exception as e:
            print("Error: ", str(e))

async def main():
    global main_loop
    main_loop = asyncio.get_running_loop()

    KIT_SERVER = os.getenv('KIT_SERVER_URL', DEFAULT_KIT_SERVER)
    SERVER = os.getenv('SYNCER_SERVER_URL', KIT_SERVER) + ""

    print(f'Kit server: {KIT_SERVER}')
    print(f'Command server: {SERVER}')

    global CLIENT_ID
    runtime_prefix = os.getenv('RUNTIME_PREFIX', DEFAULT_RUNTIME_PREFIX)
    runtime_name = os.getenv('RUNTIME_NAME', DEFAULT_RUNTIME_NAME)
    CLIENT_ID = runtime_prefix + runtime_name
    print('RunTime display name: ' + CLIENT_ID, flush=True)

    try:
        await client.connect()
        print("[SYNCER] Initial Kuksa databroker connect: connected=" +
              str(client.connected) + " (" + str(BROKER_IP) + ":" + str(BROKER_PORT) + ")", flush=True)
    except Exception as e:
        print("[SYNCER] Initial Kuksa databroker connect FAILED: " + str(e), flush=True)
    await asyncio.gather(start_socketio(SERVER), ticker(), ticker_fast(), ticker_5s())

if __name__ == "__main__":
    # Copy signalss.json to writable partition only if absent
    if not os.path.exists(mock_signal_path):
        shutil.copy(mock_signal_read_ony_filename, mock_signal_path)
        print("Copied signals.json to writable partition: " + mock_signal_path, flush=True)
    else:
        print("signals.json already exists in writable partition: " + mock_signal_path, flush=True)

    loop = asyncio.get_event_loop()
    try:
        loop.run_until_complete(main())
    finally:
        loop.close()
