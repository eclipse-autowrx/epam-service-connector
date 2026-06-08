#!/usr/bin/env python3
# Signal Writer for SDV Blueprint demo
# Writes Speed, SoC, and AmbientAirTemperature to Zonal KUKSA

import grpc
import time
import math
from kuksa.val.v1 import val_pb2, val_pb2_grpc, types_pb2

import os
target = os.getenv('KUKSA_DATABROKER_ADDR', '172.17.0.1:55556')
stub = val_pb2_grpc.VALStub(grpc.insecure_channel(target))

print(f"[SignalWriter] Connected to Zonal KUKSA ({target})")
print("[SignalWriter] Writing: Speed, SoC, AmbientAirTemperature")

t = 0
while True:
    for path, val in [
        ('Vehicle.Speed', 40 + 30 * math.sin(t * 0.1)),
        ('Vehicle.Cabin.HVAC.AmbientAirTemperature', 22 + 5 * math.sin(t * 0.05)),
        ('Vehicle.Powertrain.TractionBattery.StateOfCharge.Current', max(0, 80 - (t*0.1) % 80)),
    ]:
        dp = types_pb2.Datapoint(float=val)
        entry = types_pb2.DataEntry(path=path, value=dp)
        update = val_pb2.EntryUpdate(entry=entry, fields=[types_pb2.FIELD_VALUE])
        stub.Set(val_pb2.SetRequest(updates=[update]), timeout=3)

    if t % 10 == 0:
        print(f"[SignalWriter] t={t}  Speed={40 + 30 * math.sin(t * 0.1):.1f}  SoC={max(0, 80 - (t*0.1) % 80):.1f}")

    t += 1
    time.sleep(2)
