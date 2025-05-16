import pathlib
import time

from kuksa_client.grpc import VSSClient

"""=== For test aos-pylibs-layer ==="""

import aiohttp
import socketio

sio = socketio.Client()
"""================================="""

with VSSClient(
    "Server",
    55555,
    root_certificates=pathlib.Path("/etc/kuksa-val/CA.pem"),
    token=pathlib.Path("/etc/kuksa-val//provide-all.token")
    .expanduser()
    .read_text(encoding="utf-8")
    .rstrip("\n"),
) as client:
    while True:
        current_values = client.get_current_values(["Vehicle.Speed"])
        if current_values["Vehicle.Speed"] is not None:
            print(">>>>>>>>>>> Vehicle.Speed:", current_values["Vehicle.Speed"].value)
        else:
            print(">>>>>>>>>>> Vehicle.Speed is empty")

        time.sleep(5)
