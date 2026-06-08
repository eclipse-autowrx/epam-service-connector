#!/usr/bin/env python3
# Copyright (c) 2026 Eclipse Foundation.
# SPDX-License-Identifier: MIT

"""
End ECU Simulator — publishes fake sensor values for End-domain signals
directly to the Zonal KUKSA Databroker via gRPC.

Simulated signals:
  - Vehicle.Cabin.HVAC.TargetTemperature   (oscillates 18-26 °C)
  - Vehicle.Infotainment.Display.Brightness (oscillates 30-100 %)
  - Vehicle.Cabin.Seat.VentilationLevel     (cycles 0-3)

Usage:
  KUKSA_ADDR=localhost:55556 python3 simulator.py
"""

import os
import sys
import time
import math
import grpc

# Generated proto stubs are optional; fall back to kuksa-client if available.
try:
    from kuksa.val.v1 import val_pb2, val_pb2_grpc, types_pb2
    USE_PROTO = True
except ImportError:
    USE_PROTO = False

KUKSA_ADDR = os.environ.get("KUKSA_ADDR", "localhost:55556")
INTERVAL = float(os.environ.get("PUBLISH_INTERVAL", "2"))


def set_signal_raw(stub, path: str, value: float):
    """Set a float signal using the raw gRPC API."""
    datapoint = types_pb2.Datapoint(float=value)
    entry = types_pb2.DataEntry(path=path, value=datapoint)
    update = val_pb2.EntryUpdate(
        entry=entry,
        fields=[types_pb2.FIELD_VALUE],
    )
    request = val_pb2.SetRequest(updates=[update])
    try:
        stub.Set(request, timeout=3)
    except grpc.RpcError as e:
        print(f"  [warn] Set({path}) failed: {e.code()}", flush=True)


def run_with_proto():
    """Main loop using generated proto stubs."""
    print(f"[EndSim] Connecting to KUKSA at {KUKSA_ADDR} (proto mode)")
    channel = grpc.insecure_channel(KUKSA_ADDR)
    stub = val_pb2_grpc.VALStub(channel)

    # Wait for databroker
    for attempt in range(1, 16):
        try:
            info = stub.GetServerInfo(
                val_pb2.GetServerInfoRequest(), timeout=3
            )
            print(f"[EndSim] Connected: {info.name} {info.version}")
            break
        except grpc.RpcError:
            if attempt == 15:
                print("[EndSim] Could not reach databroker, exiting.")
                sys.exit(1)
            print(f"[EndSim] Waiting ({attempt}/15)...")
            time.sleep(2)

    t = 0
    while True:
        target_temp = 22.0 + 4.0 * math.sin(t * 0.08)
        brightness = 65.0 + 35.0 * math.sin(t * 0.12)
        vent_level = float(t % 4)

        set_signal_raw(stub,
                       "Vehicle.Cabin.HVAC.TargetTemperature", target_temp)
        set_signal_raw(stub,
                       "Vehicle.Infotainment.Display.Brightness", brightness)
        set_signal_raw(stub,
                       "Vehicle.Cabin.Seat.VentilationLevel", vent_level)

        if t % 5 == 0:
            print(
                f"[EndSim] t={t}"
                f"  TargetTemp={target_temp:.1f}"
                f"  Brightness={brightness:.0f}"
                f"  VentLevel={vent_level:.0f}",
                flush=True,
            )

        t += 1
        time.sleep(INTERVAL)


def run_with_kuksa_client():
    """Fallback using the kuksa-client Python library."""
    from kuksa_client.grpc import VSSClient, Datapoint

    print(f"[EndSim] Connecting to KUKSA at {KUKSA_ADDR} (kuksa-client mode)")
    host, port = KUKSA_ADDR.rsplit(":", 1)

    with VSSClient(host, int(port)) as client:
        print("[EndSim] Connected via kuksa-client")
        t = 0
        while True:
            target_temp = 22.0 + 4.0 * math.sin(t * 0.08)
            brightness = 65.0 + 35.0 * math.sin(t * 0.12)
            vent_level = float(t % 4)

            client.set_current_values({
                "Vehicle.Cabin.HVAC.TargetTemperature":
                    Datapoint(target_temp),
                "Vehicle.Infotainment.Display.Brightness":
                    Datapoint(brightness),
                "Vehicle.Cabin.Seat.VentilationLevel":
                    Datapoint(vent_level),
            })

            if t % 5 == 0:
                print(
                    f"[EndSim] t={t}"
                    f"  TargetTemp={target_temp:.1f}"
                    f"  Brightness={brightness:.0f}"
                    f"  VentLevel={vent_level:.0f}",
                    flush=True,
                )

            t += 1
            time.sleep(INTERVAL)


if __name__ == "__main__":
    print("=" * 44)
    print("  End ECU Simulator")
    print(f"  KUKSA Databroker: {KUKSA_ADDR}")
    print(f"  Interval:         {INTERVAL}s")
    print("=" * 44, flush=True)

    if USE_PROTO:
        run_with_proto()
    else:
        try:
            run_with_kuksa_client()
        except ImportError:
            print("[EndSim] ERROR: Neither proto stubs nor kuksa-client found.")
            print("[EndSim] Install: pip install kuksa-client")
            sys.exit(1)
