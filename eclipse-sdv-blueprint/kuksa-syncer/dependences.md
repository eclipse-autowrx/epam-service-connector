# Syncer dependences

## subpiper
From: ./subpiper/subpiper.py  
Support for cmd: 
- run_python_app
- run_bin_app

## pkg_manager

From: ./pkg_manager.py

Support for cmd: 
- `list_python_packages`
- `install_python_packages`

## vehicle_model_manager
From: vehicle_model_manager.py

Support for cmd:
- generate_vehicle_model
- revert_vehicle_model

## Working with mock signals

CMD: 

```python
mock_signal_path = "/home/dev/ws/mock/signals.json"

def listMockSignal():
    ...

def appendMockSignal(signals):
    ...

def modifyMockSignal(input_str):
    ...

def restartMockProvider():
    ...

```


## Working with kuksa
from kuksa_client.grpc.aio import VSSClient
from kuksa_client.grpc import VSSClient as KClient
from kuksa_client.grpc import Datapoint
from kuksa_client.grpc import VSSClientError
from kuksa_client.grpc import MetadataField
from kuksa_client.grpc import EntryType

```python
client = VSSClient(BORKER_IP, BROKER_PORT)

def writeSignalsValue(input_str):
    ...
    with KClient(BORKER_IP, BROKER_PORT) as kclient:
        ...
async def ticker_fast():
    ...
        ...
            for api in apis:
                try:
                    current_values = await client.get_current_values([api])
                    current_values_dict.update(current_values)
                except Exception as e:
                    print("Error: ", str(e))
                    pass
```

## Working with subprocess
```python
import subprocess

...
    ...
        subprocess.Popen(["python", "/home/dev/ws/mock/mockprovider.py"])
```

## Working with socketio
```python
import socketio
sio = socketio.AsyncClient()
async def start_socketio(SERVER):
    print("Connecting to Kit Server: " + SERVER, flush=True)
    await sio.connect(SERVER)
    await sio.wait()
```

