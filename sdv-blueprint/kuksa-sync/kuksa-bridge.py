#!/usr/bin/env python3
# Copyright (c) 2026 Eclipse Foundation.
# SPDX-License-Identifier: MIT

"""
KUKSA-to-KUKSA Signal Bridge — subscribes to the Zonal KUKSA Databroker
and writes every received signal update into the HPC KUKSA Databroker.

This replaces the SOME/IP gateway for demonstration purposes: it keeps
two separate databroker instances in sync so the HPC apps can read signals
that originate on the Zonal node.

Usage:
  ZONAL_KUKSA_ADDR=localhost:55556 HPC_KUKSA_ADDR=localhost:55555 \
    python3 kuksa-bridge.py
"""

import os
import sys
import time
import threading
import grpc

ZONAL_ADDR = os.environ.get("ZONAL_KUKSA_ADDR", "localhost:55556")
HPC_ADDR = os.environ.get("HPC_KUKSA_ADDR", "localhost:55555")

SIGNALS = [
    "Vehicle.Speed",
    "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current",
    "Vehicle.Cabin.HVAC.AmbientAirTemperature",
    "Vehicle.Cabin.HVAC.TargetTemperature",
    "Vehicle.Infotainment.Display.Brightness",
    "Vehicle.Cabin.Seat.VentilationLevel",
]


def wait_for_broker(stub, name, addr):
    """Block until the databroker is reachable."""
    try:
        from kuksa.val.v1 import val_pb2
    except ImportError:
        from kuksa_client.grpc import VSSClient
        return

    for attempt in range(1, 16):
        try:
            resp = stub.GetServerInfo(
                val_pb2.GetServerInfoRequest(), timeout=3
            )
            print(f"[Bridge] {name} ({addr}): {resp.name} {resp.version}")
            return
        except grpc.RpcError:
            if attempt == 15:
                print(f"[Bridge] {name} unreachable after 15 attempts")
                sys.exit(1)
            print(f"[Bridge] Waiting for {name} ({attempt}/15)...")
            time.sleep(2)


def run_with_proto():
    """Use generated proto stubs for subscribe + set."""
    from kuksa.val.v1 import val_pb2, val_pb2_grpc, types_pb2

    zonal_channel = grpc.insecure_channel(ZONAL_ADDR)
    hpc_channel = grpc.insecure_channel(HPC_ADDR)
    zonal_stub = val_pb2_grpc.VALStub(zonal_channel)
    hpc_stub = val_pb2_grpc.VALStub(hpc_channel)

    wait_for_broker(zonal_stub, "Zonal", ZONAL_ADDR)
    wait_for_broker(hpc_stub, "HPC", HPC_ADDR)

    sub_req = val_pb2.SubscribeRequest()
    for path in SIGNALS:
        entry = sub_req.entries.add()
        entry.path = path
        entry.view = types_pb2.VIEW_CURRENT_VALUE
        entry.fields.append(types_pb2.FIELD_VALUE)

    print(f"[Bridge] Subscribing to {len(SIGNALS)} signals on Zonal...")
    synced = 0

    while True:
        try:
            reader = zonal_stub.Subscribe(sub_req)
            for response in reader:
                for update in response.updates:
                    path = update.entry.path
                    dp = update.entry.value

                    hpc_entry = types_pb2.DataEntry(path=path, value=dp)
                    hpc_update = val_pb2.EntryUpdate(
                        entry=hpc_entry,
                        fields=[types_pb2.FIELD_VALUE],
                    )
                    try:
                        hpc_stub.Set(
                            val_pb2.SetRequest(updates=[hpc_update]),
                            timeout=3,
                        )
                        synced += 1
                    except grpc.RpcError as e:
                        print(f"  [warn] HPC Set({path}): {e.code()}")

                    if synced % 50 == 0:
                        print(f"[Bridge] Synced {synced} signal updates",
                              flush=True)

        except grpc.RpcError as e:
            print(f"[Bridge] Zonal stream ended: {e.code()}, "
                  f"reconnecting in 5s...")
            time.sleep(5)


def run_with_kuksa_client():
    """Fallback using the kuksa-client library (polling mode)."""
    from kuksa_client.grpc import VSSClient, Datapoint

    zonal_host, zonal_port = ZONAL_ADDR.rsplit(":", 1)
    hpc_host, hpc_port = HPC_ADDR.rsplit(":", 1)

    print("[Bridge] Using kuksa-client polling mode")
    synced = 0

    while True:
        try:
            with VSSClient(zonal_host, int(zonal_port)) as zonal, \
                 VSSClient(hpc_host, int(hpc_port)) as hpc:

                print("[Bridge] Connected to both databrokers")
                while True:
                    values = zonal.get_current_values(SIGNALS)
                    updates = {}
                    for path, dp in values.items():
                        if dp is not None and dp.value is not None:
                            updates[path] = Datapoint(dp.value)

                    if updates:
                        hpc.set_current_values(updates)
                        synced += len(updates)

                    if synced % 50 < len(updates):
                        print(f"[Bridge] Synced {synced} signal updates",
                              flush=True)

                    time.sleep(1)

        except Exception as e:
            print(f"[Bridge] Error: {e}, reconnecting in 5s...")
            time.sleep(5)


if __name__ == "__main__":
    print("=" * 50)
    print("  KUKSA-to-KUKSA Signal Bridge")
    print(f"  Zonal: {ZONAL_ADDR}")
    print(f"  HPC:   {HPC_ADDR}")
    print(f"  Signals: {len(SIGNALS)}")
    print("=" * 50, flush=True)

    try:
        from kuksa.val.v1 import val_pb2
        run_with_proto()
    except ImportError:
        try:
            run_with_kuksa_client()
        except ImportError:
            print("[Bridge] ERROR: Neither proto stubs nor kuksa-client found.")
            print("[Bridge] Install: pip install kuksa-client")
            sys.exit(1)
