#!/usr/bin/env python3
# Copyright (c) 2026 Eclipse Foundation.
# SPDX-License-Identifier: MIT

"""
Signal Reporter (Python) — subscribes to all 9 blueprint signals on the
HPC KUKSA Databroker and pushes each update to the broadcaster's signal
relay endpoint via HTTP POST.

This is the local-demo equivalent of the C++ Signal Reporter AOS service
(presets/signal-reporter.cpp) which runs on real edge hardware via OTA.

Usage:
  HPC_KUKSA_ADDR=localhost:55555 RELAY_URL=localhost:9100 python3 reporter.py
"""

import os
import sys
import time
import json
import grpc
import http.client

try:
    from kuksa.val.v1 import val_pb2, val_pb2_grpc, types_pb2
    USE_PROTO = True
except ImportError:
    USE_PROTO = False

HPC_ADDR = os.environ.get("HPC_KUKSA_ADDR", "localhost:55555")
RELAY_HOST = os.environ.get("RELAY_HOST", "localhost")
RELAY_PORT = int(os.environ.get("RELAY_PORT", "9100"))

SIGNALS = [
    "Vehicle.Speed",
    "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current",
    "Vehicle.Powertrain.Range",
    "Vehicle.Cabin.HVAC.AmbientAirTemperature",
    "Vehicle.Cabin.HVAC.TargetTemperature",
    "Vehicle.Cabin.Lights.AmbientLight.Intensity",
    "Vehicle.Cabin.Seat.Heating",
    "Vehicle.Cabin.Seat.VentilationLevel",
    "Vehicle.Infotainment.Display.Brightness",
]


def format_value(dp):
    if dp.HasField("float"):
        return dp.float
    if dp.HasField("double"):
        return dp.double
    if dp.HasField("int32"):
        return dp.int32
    if dp.HasField("uint32"):
        return dp.uint32
    return 0


def post_signal(host, port, path, value, ts):
    body = json.dumps({"signal": path, "value": float(value), "ts": ts})
    try:
        conn = http.client.HTTPConnection(host, port, timeout=2)
        conn.request("POST", "/signal", body,
                     {"Content-Type": "application/json"})
        conn.getresponse()
        conn.close()
        return True
    except Exception:
        return False


def run_with_proto():
    channel = grpc.insecure_channel(HPC_ADDR)
    stub = val_pb2_grpc.VALStub(channel)

    for attempt in range(1, 16):
        try:
            info = stub.GetServerInfo(
                val_pb2.GetServerInfoRequest(), timeout=3)
            print(f"[Reporter] HPC: {info.name} {info.version}")
            break
        except grpc.RpcError:
            if attempt == 15:
                print("[Reporter] HPC unreachable after 15 attempts")
                sys.exit(1)
            print(f"[Reporter] Waiting for HPC ({attempt}/15)...")
            time.sleep(2)

    sub = val_pb2.SubscribeRequest()
    for path in SIGNALS:
        entry = sub.entries.add()
        entry.path = path
        entry.view = types_pb2.VIEW_CURRENT_VALUE
        entry.fields.append(types_pb2.FIELD_VALUE)

    print(f"[Reporter] Subscribing to {len(SIGNALS)} signals...")
    count = ok = fail = 0

    while True:
        try:
            reader = stub.Subscribe(sub)
            for response in reader:
                for update in response.updates:
                    path = update.entry.path
                    value = format_value(update.entry.value)
                    ts = int(time.time() * 1000)

                    if post_signal(RELAY_HOST, RELAY_PORT, path, value, ts):
                        ok += 1
                    else:
                        fail += 1
                    count += 1

                    if count % 50 == 0:
                        print(f"[Reporter] signals={count} ok={ok} fail={fail}",
                              flush=True)

        except grpc.RpcError as e:
            print(f"[Reporter] Stream ended: {e.code()}, reconnecting in 5s...")
            time.sleep(5)


def run_with_kuksa_client():
    from kuksa_client.grpc import VSSClient, Datapoint

    host, port = HPC_ADDR.rsplit(":", 1)
    print(f"[Reporter] Using kuksa-client polling mode")
    count = ok = fail = 0

    while True:
        try:
            with VSSClient(host, int(port)) as client:
                print("[Reporter] Connected to HPC")
                while True:
                    values = client.get_current_values(SIGNALS)
                    for path, dp in values.items():
                        if dp is not None and dp.value is not None:
                            ts = int(time.time() * 1000)
                            if post_signal(RELAY_HOST, RELAY_PORT,
                                           path, dp.value, ts):
                                ok += 1
                            else:
                                fail += 1
                            count += 1

                    if count % 50 == 0 and count > 0:
                        print(f"[Reporter] signals={count} ok={ok} fail={fail}",
                              flush=True)
                    time.sleep(2)

        except Exception as e:
            print(f"[Reporter] Error: {e}, reconnecting in 5s...")
            time.sleep(5)


if __name__ == "__main__":
    print("=" * 50)
    print("  Signal Reporter (Python)")
    print(f"  HPC KUKSA: {HPC_ADDR}")
    print(f"  Relay:     {RELAY_HOST}:{RELAY_PORT}")
    print(f"  Signals:   {len(SIGNALS)}")
    print("=" * 50, flush=True)

    if USE_PROTO:
        run_with_proto()
    else:
        try:
            run_with_kuksa_client()
        except ImportError:
            print("[Reporter] ERROR: Neither proto stubs nor kuksa-client found.")
            print("[Reporter] Install: pip install kuksa-client")
            sys.exit(1)
