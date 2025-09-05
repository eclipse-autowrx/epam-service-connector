
# Copyright (c) 2025 Eclipse Foundation.
 
# This program and the accompanying materials are made available under the
# terms of the MIT License which is available at
# https://opensource.org/licenses/MIT.

# SPDX-License-Identifier: MIT

'''

This script is used to control the Ambient Light using KUKSA.
The script listens to the KUKSA and updates the Ambient Light accordingly.

# The kuksa_client package is used to interface with KUKSA (KUKSA.io Vehicle Signal Specification).
# In this script, KUKSA values are received as objects with the following important attributes:
#   - value: The value of the KUKSA value (boolean, integer, string, etc.).
#   - timestamp: The timestamp of the KUKSA value (datetime).
#   - status: The status of the KUKSA value (string).
#   - metadata: The metadata of the KUKSA value (dict). 
    # Example KUKSA value format:
    #   - value: True
    #   - timestamp: 2025-01-01 12:00:00
    #   - status: "OK"
    #   - metadata: {
    #       "unit": "percent",
    #       "type": "actuator",
    #       "uuid": "1234567890"
    #   }

And then convert the KUKSA values to CAN messages and send them to the CAN bus.

Sample CAN message:
{
    "arbitration_id": 0x123,
    "data": [0x01, 0xFF, 0xFF, 0xFF, 0x00],
    "dlc": 5,
    "extended_id": false,
}

'''
import pathlib
import time
import subprocess

from kuksa_client.grpc import Datapoint
from kuksa_client.grpc import VSSClient

on_off = "Vehicle.Cabin.Light.AmbientLight.Row1.DriverSide.IsLightOn"
intent = "Vehicle.Cabin.Light.AmbientLight.Row1.DriverSide.Intensity"
color = "Vehicle.Cabin.Light.AmbientLight.Row1.DriverSide.Color"

#l_on_off = False
l_intent = 0
l_color = 0x000000

with VSSClient(
    "localhost",
    55555,
    root_certificates=pathlib.Path("/absolute/path/to/token/CA.pem"),
    token=pathlib.Path("/absolute/path/to/token/provide-all.token")
    .expanduser()
    .read_text(encoding="utf-8")
    .rstrip("\n"),
) as client:
    while True:
        target_value = client.get_current_values([on_off,intent,color])
        if (target_value[on_off] is not None or
            target_value[intent] is not None or
            target_value[color] is not None):
            if target_value[on_off].value == True:
                client.set_current_values({
                    on_off: Datapoint(target_value[on_off].value)
                })
                if target_value[intent].value != l_intent:
                    client.set_current_values({
                        intent: Datapoint(target_value[intent].value)
                    })
                    scaled = round(target_value[intent].value * 255 / 100)
                    l_intent = target_value[intent].value
                if target_value[color].value != l_color:
                    client.set_current_values({
                        color: Datapoint(target_value[color].value)
                    })
                    l_color = target_value[color].value
                subprocess.run(
                    ["cansend", "can0", f"123#01.{target_value[color].value.lstrip("#")}.{scaled:02X}"]
                )
            elif target_value[on_off].value == False:
                print("Ambient Light is Off")
                subprocess.run(
                        ["cansend", "can0", f"123#00.00.00.00.00"]
                    )

        time.sleep(1)