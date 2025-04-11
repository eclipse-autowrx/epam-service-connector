import os
import subprocess
import shutil
from velocitas.model_generator import generate_model
import json
import signal

def restart_databroker():
    try:
        result = subprocess.check_output(["pgrep", "-f", "/app/databroker"]).decode().strip()
        pids = result.split('\n')
        
        # If any PIDs are found, terminate them
        if pids and pids[0]:
            for pid in pids:
                os.kill(int(pid), signal.SIGKILL)
        
    except subprocess.CalledProcessError:
        print("No running instance of databroker found. Starting a new instance...", flush=True)
    
    except Exception as e:
        print(f"Error: Failed to terminate existing databroker processes. {str(e)}", flush=True)
    
    # Restart the databroker app regardless of whether any instances were found
    try:
        command = "/app/databroker &"
        subprocess.Popen(command, shell=True)
        print("Databroker restarted successfully.", flush=True)
        
    except Exception as e:
        print(f"Error: Failed to start databroker. {str(e)}", flush=True)
    
def generate_vehicle_model(input_str):
    data = json.loads(input_str)
    with open('/home/dev/ws/custom-vss.json', 'w') as custom_vss_file:
        json.dump(data, custom_vss_file, indent=4)
    
    custom_vss_path = "/home/dev/ws/custom-vss.json"
    if not os.path.isfile(custom_vss_path):
        print("Error: Couldn't find custom-vss.json.", flush=True)
        return

    try:
        current_dir = "/home/dev/python-packages/vehicle"
        if os.path.exists(current_dir):
            shutil.rmtree(current_dir)
        input_unit_file_path_list = ["/home/dev/python-packages/vehicle_signal_specification/spec/units.yaml"]
        language = "python"
        target_folder = "/home/dev/ws/gen_model"
        name = "vehicle"
        strict = True
        include_dir = "/home/dev/python-packages/vehicle_signal_specification/spec"

        generate_model( custom_vss_path,
                        input_unit_file_path_list,
                        language,
                        target_folder,
                        name,
                        strict,
                        include_dir)
        
        shutil.move(f"{target_folder}/vehicle", "/home/dev/python-packages/")
        os.environ["KUKSA_DATABROKER_METADATA_FILE"] = custom_vss_path
        restart_databroker()
    
    except Exception as e:
        print(f">>Error occured when generating vehicle model: {e}.", flush=True)  

def revert_vehicle_model():
    current_dir = "/home/dev/python-packages/vehicle"
    if os.path.exists(current_dir):
        shutil.rmtree(current_dir)
    # The std_vehicle directory is included in the Dockerfile so it will always
    # be here unless it get removed during runtime.
    old_dir = "/home/dev/python-packages/std_vehicle"
    shutil.copytree(old_dir, current_dir)
    os.environ["KUKSA_DATABROKER_METADATA_FILE"] = "/home/dev/ws/vss_release_4.0.json"
    restart_databroker()
    print("Reverted back to standard vehicle model")