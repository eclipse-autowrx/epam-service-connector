#!/usr/bin/env python3
# Copyright (c) 2026 Eclipse Foundation.
# SPDX-License-Identifier: MIT

"""Feed simulated vehicle signal data into KUKSA databroker for testing."""

import math
import os
import random
import time

from kuksa_client.grpc import Datapoint, VSSClient

KUKSA_HOST = os.environ.get('KUKSA_DATABROKER_HOST', '127.0.0.1')
KUKSA_PORT = int(os.environ.get('KUKSA_DATABROKER_PORT', '55555'))

print(f'[Feeder] Connecting to KUKSA at {KUKSA_HOST}:{KUKSA_PORT}')

with VSSClient(KUKSA_HOST, KUKSA_PORT) as client:
    print('[Feeder] Connected — feeding signals every 1 s')
    t = 0
    while True:
        speed = 40 + 30 * math.sin(t * 0.1) + random.uniform(-2, 2)
        temp = 22 + 5 * math.sin(t * 0.05) + random.uniform(-0.5, 0.5)
        soc = max(0.0, min(100.0, 80 - t * 0.02 + random.uniform(-1, 1)))

        client.set_current_values({
            'Vehicle.Speed': Datapoint(round(speed, 1)),
            'Vehicle.Cabin.HVAC.AmbientAirTemperature': Datapoint(round(temp, 1)),
            'Vehicle.Powertrain.TractionBattery.StateOfCharge.Current': Datapoint(round(soc, 1)),
        })

        if t % 10 == 0:
            print(f'[Feeder] Speed={speed:.1f} km/h  Temp={temp:.1f} C  SoC={soc:.1f}%')

        t += 1
        time.sleep(1)
