# Copyright (c) 2026 Eclipse Foundation.
#
# This program and the accompanying materials are made available under the
# terms of the MIT License which is available at
# https://opensource.org/licenses/MIT.
#
# SPDX-License-Identifier: MIT
"""BMS (Battery Monitoring System) service.

Receives raw battery telemetry from the host dashboard over Zenoh and
writes it to the shared Kuksa Databroker (sdv-runtime).

Signal flow
-----------
  pytk_dashboard.py (host)
    ├─ sim/battery/voltage  ─┐
    ├─ sim/battery/current  ─┼─Zenoh─►  bms.py (this)
    └─ sim/battery/soc      ─┘              │
                                write VSS over gRPC ▼
                             Kuksa: Vehicle.Powertrain.TractionBattery.*
                                            │
                                            ▼
                             range_ai.py ─► Vehicle.Powertrain.Range

Zenoh wire format: {"value": <number>, "source": "host", "ts": "<iso>"}
"""

import argparse
import asyncio
import json
import sys
from datetime import datetime

import zenoh
from kuksa_client.grpc import Datapoint
from kuksa_client.grpc.aio import VSSClient

DEFAULT_ROUTER = "tcp/zenoh:7447"  # zenoh router (resolves to primary node)
DEFAULT_KUKSA_HOST = "kuksa"
DEFAULT_KUKSA_PORT = 55555


# Zenoh key -> (VSS path, cast). Keep in sync with pytk_dashboard.py PUBLISHED_KEYS.
KEY_TO_VSS = {
    "sim/battery/voltage": (
        "Vehicle.Powertrain.TractionBattery.CurrentVoltage",
        float,
    ),
    "sim/battery/current": (
        "Vehicle.Powertrain.TractionBattery.CurrentCurrent",
        float,
    ),
    "sim/battery/soc": (
        "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current",
        float,
    ),
}

KEY_PREFIX = "sim/battery/**"


def log(msg: str) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    print(f"[{ts}] [bms] {msg}", flush=True)


def build_zenoh_config(router_endpoint: str) -> zenoh.Config:
    # Client mode: dial the router on the primary node and open NO
    # inbound listener. Pub/sub still flows both ways over the outbound
    # link, so no inbound port is exposed and the service stays
    # reachable no matter which node it migrates to.
    #
    # Scouting is disabled so the client connects ONLY to the configured
    # router and never auto-discovers or meshes with other peers/routers
    # (deterministic connectivity; no rogue-router vector). Verify these
    # key names against the Zenoh version in the runtime image.
    config = zenoh.Config()
    config.insert_json5("mode", '"client"')
    config.insert_json5("connect/endpoints", f'["{router_endpoint}"]')
    config.insert_json5("scouting/multicast/enabled", "false")
    config.insert_json5("scouting/gossip/enabled", "false")
    return config


async def push_to_kuksa(client: VSSClient, path: str, value, cast, src: str) -> None:
    try:
        coerced = cast(value)
    except (TypeError, ValueError) as exc:
        log(f"WARN cannot cast {value!r} -> {cast.__name__} for {path}: {exc}")
        return
    try:
        await client.set_current_values({path: Datapoint(coerced)})
    except Exception as exc:
        log(f"ERROR writing {path}={coerced} to Kuksa: {exc}")
        return
    log(f"OK   {path} = {coerced} (from {src})")


async def run(router: str, kuksa_host: str, kuksa_port: int) -> None:
    log(f"Connecting to Kuksa Databroker at {kuksa_host}:{kuksa_port}...")
    async with VSSClient(kuksa_host, kuksa_port) as kuksa:
        log("Connected to Kuksa.")
        log("Subscribed Zenoh keys -> VSS paths:")
        for k, (vss, cast) in KEY_TO_VSS.items():
            log(f"    {k}  ->  {vss}  ({cast.__name__})")

        loop = asyncio.get_running_loop()
        log(f"Opening Zenoh session (client mode) -> router {router}, subscribed to '{KEY_PREFIX}'")
        with zenoh.open(build_zenoh_config(router)) as session:
            stop_event = asyncio.Event()

            def listener(sample: zenoh.Sample) -> None:
                key = str(sample.key_expr)
                cfg = KEY_TO_VSS.get(key)
                if cfg is None:
                    log(f"WARN ignoring unknown key '{key}'")
                    return
                vss_path, cast = cfg
                try:
                    raw = sample.payload.to_string()
                    msg = json.loads(raw)
                except Exception as exc:
                    log(f"WARN bad payload on '{key}': {exc}")
                    return
                value = msg.get("value")
                src = msg.get("source", "?")
                if value is None:
                    log(f"WARN payload missing 'value' on '{key}': {msg}")
                    return
                asyncio.run_coroutine_threadsafe(
                    push_to_kuksa(kuksa, vss_path, value, cast, src), loop
                )

            # Retain the subscriber handle for the session's lifetime. If
            # this reference is dropped, Zenoh garbage-collects the
            # subscription and ingest stops with no error. Kept in a list
            # (and referenced below) so it survives lint/autoflake passes.
            subscribers = [session.declare_subscriber(KEY_PREFIX, listener)]
            log(f"BMS running ({len(subscribers)} subscriber). Drive values "
                f"from the host PyTk dashboard. Ctrl+C to stop.")
            try:
                await stop_event.wait()
            except asyncio.CancelledError:
                pass


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Battery Monitoring System (BMS). Connects (Zenoh "
                    "client mode) to the router on the primary node for "
                    "sim/battery/* keys driven by the host PyTk dashboard, "
                    "and writes the values into the ev-range Kuksa "
                    "Databroker. Opens no inbound listener."
    )
    p.add_argument("--router", default=DEFAULT_ROUTER,
                   help=f"Zenoh router endpoint on the primary node "
                        f"(default: {DEFAULT_ROUTER})")
    p.add_argument("--kuksa-host", default=DEFAULT_KUKSA_HOST,
                   help=f"Kuksa Databroker host (default: {DEFAULT_KUKSA_HOST})")
    p.add_argument("--kuksa-port", type=int, default=DEFAULT_KUKSA_PORT,
                   help=f"Kuksa Databroker port (default: {DEFAULT_KUKSA_PORT})")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    try:
        asyncio.run(run(args.router, args.kuksa_host, args.kuksa_port))
    except KeyboardInterrupt:
        log("Stopping.")
        return 0
    except Exception as exc:
        log(f"FATAL: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
