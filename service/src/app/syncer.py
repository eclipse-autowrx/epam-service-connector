import socketio
import asyncio
import os
from subpiper import subpiper
import time
import json
from kuksa_client.grpc.aio import VSSClient
from kuksa_client.grpc import VSSClient as KClient
from kuksa_client.grpc import Datapoint
from kuksa_client.grpc import VSSClientError
from kuksa_client.grpc import MetadataField
from kuksa_client.grpc import EntryType
import socket
import pathlib

BORKER_IP = '172.29.0.1'
BROKER_PORT = 55555

MAIN_APP_PATH = '/storage/main.py'

print(">>>>>>>>>>>>> BORKER_IP", BORKER_IP)


DEFAULT_KIT_SERVER = 'https://kit.digitalauto.tech'
DEFAULT_RUNTIME_NAME = 'EPAM-SERVICE-001'

TIME_TO_KEEP_SUBSCRIBER_ALIVE = 60
TIME_TO_KEEP_RUNNER_ALIVE = 3*60

lsOfRunner = []
lsOfApiSubscriber = {}
sio = socketio.AsyncClient()
client = VSSClient("Server",
            55555,
            root_certificates=pathlib.Path("/etc/kuksa-val/CA.pem"),
            token=pathlib.Path("/etc/kuksa-val//provide-all.token")
            .expanduser()
            .read_text(encoding="utf-8")
            .rstrip("\n"),
        )

def writeCodeToFile(code, filename=MAIN_APP_PATH):
    f = open(filename, "w+")
    f.write(code)
    f.close()

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

async def send_app_deploy_reply(master_id, content, is_finish):
    await sio.emit("messageToKit-kitReply", {
        "token": "12a-124-45634-12345-1swer",
        "request_from": master_id,
        "cmd": "deploy-request",
        "data": "",
        "result": content,
        "is_finish": is_finish
    })

def process_done(master_id: str, retcode: int):
    asyncio.run(send_app_run_reply(master_id, True, retcode, ""))

def my_stdout_callback(master_id: str, line: str):
    asyncio.run(send_app_run_reply(master_id, False, 0, line + '\r\n'))

def my_stderr_callback(master_id: str, line: str):
    asyncio.run(send_app_run_reply(master_id, False, 0, line + '\r\n'))

@sio.event
async def connect():
    print('Connected to Kit Server ',flush=True)
    await sio.emit("register_kit", {
        "kit_id": CLIENT_ID,
        "name": CLIENT_ID
    })

@sio.event
async def messageToKit(data):
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
        
        try:
            writeCodeToFile(data["data"]["code"], filename=MAIN_APP_PATH)

        except Exception as e:
            print("Exception on write main file")
            print(str(e))
        # try:
        # usedAPIs = data["usedAPIs"]
        # if isinstance(usedAPIs,list) and len(usedAPIs)>0:
        #     appendMockSignal(usedAPIs)
        # except Exception as e:
        #     print("Fail to appendMockSignal for usedAPIs")
        #     print(str(e))

        proc = subpiper(
            master_id=data["request_from"],
            cmd='ls /storage',
            stdout_callback=my_stdout_callback,
            stderr_callback=my_stderr_callback,
            finished_callback=process_done
        )

        proc = subpiper(
            master_id=data["request_from"],
            cmd='python3 -u ' + MAIN_APP_PATH,
            stdout_callback=my_stdout_callback,
            stderr_callback=my_stderr_callback,
            finished_callback=process_done
        )
        lsOfRunner.append({
            "appName": appName,
            "runner": proc,
            "request_from": data["request_from"],
            "from": time.time()
        })
        return 0
    if data["cmd"] == "stop_python_app":
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
    if data["cmd"] == "subscribe_apis":
        if data["apis"] is not None:
            apis = data["apis"]
            master_id=data["request_from"]
            lsOfApiSubscriber[master_id] = {
                "from": time.time(),
                "apis": apis
            }

            # if isinstance(apis,list) and len(apis)>0:
            #     appendMockSignal(apis)
            
            await sio.emit("messageToKit-kitReply", {
                "kit_id": CLIENT_ID,
                "request_from": data["request_from"],
                "cmd": "subscribe_apis",
                "result": "Successful"
            })
        return 0
    if data["cmd"] == "unsubscribe_apis":
        master_id=data["request_from"]
        del lsOfApiSubscriber[master_id]
        await sio.emit("messageToKit-kitReply", {
            "kit_id": CLIENT_ID,
            "request_from": data["request_from"],
            "cmd": "unsubscribe_apis",
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
        await sio.emit("messageToKit-kitReply", {
            "kit_id": CLIENT_ID,
            "request_from": data["request_from"],
            "cmd": "reset_signals_value",
            "data": [],
            "result": "Unsupport"
        })
        return 0
    if data["cmd"] == "get-runtime-info":
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

'''
    Faster ticker: 0.3 seconds sleep
        - Report API value back to client
'''
async def ticker_fast():
    while True:
        await asyncio.sleep(0.3)
        # count number of child in lsOfApiSubscriber

        if len(lsOfApiSubscriber) <= 0:
            continue
        if not client.connected:
            await client.connect()
            print("Kuksa connected", client.connected)
            continue

        try:
            for client_id in lsOfApiSubscriber:
                apis = lsOfApiSubscriber[client_id]["apis"]
                if len(apis) > 0:
                    # print(f"read apis {apis}")
                    # start_time = time.time()
                    current_values_dict = {}
                    for api in apis:
                        try:
                            current_values = await client.get_current_values([api])
                            current_values_dict.update(current_values)
                        except Exception as e:
                            # print("get_current_values Error: ", str(e))
                            pass
                    result = {}
                    for api in current_values_dict:
                        if current_values_dict[api] is not None:
                            result[api] = current_values_dict[api].value
                        else:
                            result[api] = None
                    # elapsed_time = time.time() - start_time
                    # print(f"Execution time of one subscriber read: {elapsed_time:.6f} seconds")
                    await sio.emit("messageToKit-kitReply", {
                        "kit_id": CLIENT_ID,
                        "request_from": client_id,
                        "cmd":"apis-value",
                        "result": result
                    })
        except VSSClientError as vssErr:
            print("Error Code:" , str(vssErr),flush=True)
        except Exception as e:
            # pass
            print("Error:" , str(e),flush=True)

'''
    One second ticker
        - Handle old subscriber remove
        - Stop long runner
'''
async def ticker():
    print("Kuksa connected", client.connected)
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
        await asyncio.sleep(1)
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
                    await sio.emit("messageToKit-kitReply", {
                            "kit_id": CLIENT_ID,
                            "request_from": client_sid,
                            "cmd":"report-runtime-state",
                            "data": {
                                "lsOfRunner": convertLsOfRunnerToJson(lsOfRunner),
                                "lsOfApiSubscriber": lsOfApiSubscriber
                            }
                        })
        except Exception as e:
            print("Error: ", str(e))


async def start_socketio(SERVER):
    print("Connecting to Kit Server: " + SERVER, flush=True)
    await sio.connect(SERVER)
    await sio.wait()

def writeSignalsValue(input_str):
    json_str = json.dumps(input_str)
    signal_values = json.loads(json_str)
    with KClient(
            "Server",
            55555,
            root_certificates=pathlib.Path("/etc/kuksa-val/CA.pem"),
            token=pathlib.Path("/etc/kuksa-val//provide-all.token")
            .expanduser()
            .read_text(encoding="utf-8")
            .rstrip("\n"),
        ) as kclient:
        for path,value in signal_values.items():
            try:
                meta_data = kclient.get_metadata([path], MetadataField.ENTRY_TYPE)
                entry_type = meta_data[path].entry_type
                if entry_type == EntryType.ACTUATOR:
                    try:
                        target_value = {path: Datapoint(value)}
                        kclient.set_target_values(target_value)
                        print(target_value,flush=True)
                    except Exception as e:
                        print("Error occured when writing target values: " + str(e),flush=True)
                elif entry_type == EntryType.SENSOR:
                    try:
                        current_value = {path: Datapoint(value)}
                        kclient.set_current_values(current_value)
                        print(current_value, flush=True)
                    except Exception as e:
                        print("Error occured when writing current values: " + str(e), flush=True)
                else:
                    print("The signal path provided was not actuator or sensor", flush=True)
            except Exception as e:
                print("Error occured when writing signal values: " + str(e),flush=True)


async def main():
    SERVER = os.getenv('SYNCER_SERVER_URL', DEFAULT_KIT_SERVER) + ""
    global CLIENT_ID
    CLIENT_ID = "RunTime-" + os.getenv('RUNTIME_NAME', DEFAULT_RUNTIME_NAME)
    print("RunTime display name: " + CLIENT_ID, flush=True)
    # await asyncio.gather(start_socketio(SERVER))
    await asyncio.gather(start_socketio(SERVER), ticker(), ticker_fast(), ticker_5s())

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    try:
        loop.run_until_complete(main())
    finally:
        loop.close()
