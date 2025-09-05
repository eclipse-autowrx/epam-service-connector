# Copyright (c) 2025 Eclipse Foundation.
 
# This program and the accompanying materials are made available under the
# terms of the MIT License which is available at
# https://opensource.org/licenses/MIT.

# SPDX-License-Identifier: MIT

import pathlib
import time
from kuksa_client.grpc import VSSClient, Datapoint

with VSSClient(
    "Server",
    55555,
    root_certificates=pathlib.Path("/etc/kuksa-val/CA.pem"),
    token=pathlib.Path("/etc/kuksa-val/provide-all.token")
    .expanduser()
    .read_text(encoding="utf-8")
    .rstrip("\n"),
) as client:
    current_values = client.set_current_values({
            "Vehicle.Cabin.Light.AmbientLight.Row1.DriverSide.IsLightOn": Datapoint(True),
            "Vehicle.Cabin.Light.AmbientLight.Row1.DriverSide.Intensity": Datapoint(100)
        })
    for i in range(10):
        current_values = client.set_current_values({
            "Vehicle.Cabin.Light.AmbientLight.Row1.DriverSide.Color": Datapoint("#FF0000")
        })
        time.sleep(2)

        current_values = client.set_current_values({
            "Vehicle.Cabin.Light.AmbientLight.Row1.DriverSide.Color": Datapoint("#0000FF")
        })
        time.sleep(2)

        current_values = client.set_current_values({
            "Vehicle.Cabin.Light.AmbientLight.Row1.DriverSide.Color": Datapoint("#00FF00")
        })
        time.sleep(2)

    current_values = client.set_current_values({
            "Vehicle.Cabin.Light.AmbientLight.Row1.DriverSide.IsLightOn": Datapoint(False),
            "Vehicle.Cabin.Light.AmbientLight.Row1.DriverSide.Intensity": Datapoint(0)
        })