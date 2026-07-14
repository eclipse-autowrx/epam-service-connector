# Copyright (c) 2026 Eclipse Foundation.
#
# This program and the accompanying materials are made available under the
# terms of the MIT License which is available at
# https://opensource.org/licenses/MIT.
#
# SPDX-License-Identifier: MIT
"""BMS (Battery Monitoring System) service — runs on VM1.

Receives raw battery telemetry from the host dashboard over a direct TCP
connection and writes it to the local Kuksa Databroker
(sdv-runtime, 127.0.0.1:55555).

Signal flow
-----------
  pytk_dashboard.py (host)
    ├─ sim/battery/voltage  ──TCP (port 7460)──►
    ├─ sim/battery/current  ──────────────────►  bms.py (this)
    └─ sim/battery/soc      ──────────────────►      │
                                                     ▼
                                          VM1 Kuksa Databroker
                                          Vehicle.Powertrain.TractionBattery.*
                                                     │
                                                     ▼
                                          range_ai.py  ──►  Vehicle.Powertrain.Range

TCP wire format: {"key": "sim/battery/soc", "value": 80, "source": "host", "ts": "<iso>"}\n
"""

import argparse
import asyncio
import json
import sys
from datetime import datetime

from kuksa_client.grpc import Datapoint
from kuksa_client.grpc.aio import VSSClient


DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = 7460
DEFAULT_KUKSA_HOST = "127.0.0.1"
DEFAULT_KUKSA_PORT = 55555


# TCP key -> (VSS path, cast). Keep in sync with pytk_dashboard.py key_routes.
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

def log(msg: str) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    print(f"[{ts}] [bms] {msg}", flush=True)


async def wait_for_kuksa(host: str, port: int, max_attempts: int = 600) -> VSSClient:
    """Block until the Databroker accepts a gRPC connection.

    The SDV runtime helper may tear down and recreate its container during
    first boot; a plain TCP port check can pass on the old instance and
    then fail on writes.  Opening a real client session avoids that race.
    """
    log(f"Waiting for Kuksa Databroker at {host}:{port}...")
    last_exc: Exception | None = None
    for attempt in range(1, max_attempts + 1):
        client = VSSClient(host, port)
        try:
            await client.connect()
            log("Connected to Kuksa.")
            return client
        except Exception as exc:
            last_exc = exc
            try:
                await client.disconnect()
            except Exception:
                pass
            if attempt == 1 or attempt % 30 == 0:
                log(f"Kuksa not ready yet (attempt {attempt}/{max_attempts}): {exc}")
            await asyncio.sleep(1)
    raise RuntimeError(
        f"Kuksa Databroker at {host}:{port} did not become ready: {last_exc}"
    )


async def push_to_kuksa(
    kuksa_holder: dict[str, VSSClient],
    kuksa_target: tuple[str, int],
    path: str,
    value,
    cast,
    src: str,
) -> None:
    try:
        coerced = cast(value)
    except (TypeError, ValueError) as exc:
        log(f"WARN cannot cast {value!r} -> {cast.__name__} for {path}: {exc}")
        return

    host, port = kuksa_target
    for attempt in range(1, 4):
        client = kuksa_holder["client"]
        try:
            await client.set_current_values({path: Datapoint(coerced)})
            log(f"OK   {path} = {coerced} (from {src})")
            return
        except Exception as exc:
            if attempt >= 3:
                log(f"ERROR writing {path}={coerced} to Kuksa: {exc}")
                return
            log(f"WARN Kuksa write failed (attempt {attempt}/3), reconnecting: {exc}")
            try:
                await client.disconnect()
            except Exception:
                pass
            kuksa_holder["client"] = await wait_for_kuksa(host, port, max_attempts=30)


async def run(host: str, port: int, kuksa_host: str, kuksa_port: int) -> None:
    kuksa_holder = {"client": await wait_for_kuksa(kuksa_host, kuksa_port)}
    try:
        log("TCP keys -> VSS paths:")
        for k, (vss, cast) in KEY_TO_VSS.items():
            log(f"    {k}  ->  {vss}  ({cast.__name__})")

        async def handle_client(
            reader: asyncio.StreamReader, writer: asyncio.StreamWriter
        ) -> None:
            addr = writer.get_extra_info("peername")
            log(f"Connection from {addr}")
            buf = b""
            try:
                while True:
                    chunk = await reader.read(4096)
                    if not chunk:
                        break
                    buf += chunk
                    while b"\n" in buf:
                        line, buf = buf.split(b"\n", 1)
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            msg = json.loads(line.decode())
                        except Exception:
                            continue
                        key = str(msg.get("key", ""))
                        cfg = KEY_TO_VSS.get(key)
                        if cfg is None:
                            log(f"WARN ignoring unknown key '{key}'")
                            continue
                        vss_path, cast = cfg
                        value = msg.get("value")
                        src = str(msg.get("source", "?"))
                        if value is None:
                            log(f"WARN missing 'value' for key '{key}'")
                            continue
                        await push_to_kuksa(
                            kuksa_holder,
                            (kuksa_host, kuksa_port),
                            vss_path,
                            value,
                            cast,
                            src,
                        )
            except Exception as exc:
                log(f"ERROR in client handler for {addr}: {exc}")
            finally:
                writer.close()
            log(f"Connection closed from {addr}")

        server = await asyncio.start_server(handle_client, host, port)
        log(f"BMS TCP server listening on {host}:{port}")
        async with server:
            await server.serve_forever()
    finally:
        try:
            await kuksa_holder["client"].disconnect()
        except Exception:
            pass


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Battery Monitoring System (BMS) on VM1. Listens on a "
                    "TCP port for sim/battery/* frames from the host PyTk "
                    "dashboard and writes the values into the local "
                    "ev-range Kuksa Databroker."
    )
    p.add_argument("--host", default=DEFAULT_HOST,
                   help=f"TCP listen address (default: {DEFAULT_HOST})")
    p.add_argument("--port", type=int, default=DEFAULT_PORT,
                   help=f"TCP listen port (default: {DEFAULT_PORT})")
    p.add_argument("--kuksa-host", default=DEFAULT_KUKSA_HOST,
                   help=f"Kuksa Databroker host (default: {DEFAULT_KUKSA_HOST})")
    p.add_argument("--kuksa-port", type=int, default=DEFAULT_KUKSA_PORT,
                   help=f"Kuksa Databroker port (default: {DEFAULT_KUKSA_PORT})")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    try:
        asyncio.run(run(args.host, args.port, args.kuksa_host, args.kuksa_port))
    except KeyboardInterrupt:
        log("Stopping.")
        return 0
    except Exception as exc:
        log(f"FATAL: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
