# Copyright (c) 2026 Eclipse Foundation.
#
# This program and the accompanying materials are made available under the
# terms of the MIT License which is available at
# https://opensource.org/licenses/MIT.
#
# SPDX-License-Identifier: MIT
"""Seat ECU (SCM) service — runs on VM2.

Consumes the host dashboard's seat heating/cooling commands over a direct
TCP connection, publishes corresponding values to the kuksa-bridge wire
namespace, and sends status updates back to the dashboard's indicator panel
on the same socket.

Signal flow (inbound — dashboard control)
-----------------------------------------
  pytk_hwsim.py
    ├─ sim/cabin/seat/heating  ──TCP (port 7462)──►
    └─ sim/cabin/seat/hc       ────────────────►  seat_ecu.py
                                                     │
                                        publish wire values ▼
                      kuksa-bridge/Vehicle/Cabin/Seat/Row1/DriverSide/Heating
                      kuksa-bridge/Vehicle/Cabin/Seat/Row1/DriverSide/HeatingCooling

Signal flow (outbound — kuksa-bridge inbound from VM1)
------------------------------------------------------
    VM1 Kuksa change
        └─► kuksa-bridge (VM1 outbound → Zenoh → VM2 inbound)
                            └─► VM2 seat ECU receives bridge payload

Dashboard update (single path, both cases above)
------------------------------------------------
    VM2 seat ECU
        └─► TCP dash/status/seat ──► pytk_hwsim.py indicator

Note: heating is 0–100 %; hc is –100 (cooling) to +100 (heating).
Cross-VM VSS mirroring is handled exclusively by kuksa-bridge.
"""

import argparse
import asyncio
import json
import sys
from datetime import datetime, timezone
from typing import Any

import zenoh


DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = 7462
DEFAULT_BRIDGE_CONNECT = "tcp/127.0.0.1:7448"  # local VM2 bridge relay
BRIDGE_KEY_PREFIX = "kuksa-bridge"
SEAT_HEAT_VSS_PATH = "Vehicle.Cabin.Seat.Row1.DriverSide.Heating"
SEAT_HC_VSS_PATH = "Vehicle.Cabin.Seat.Row1.DriverSide.HeatingCooling"
SEAT_HEAT_BRIDGE_KEY = f"{BRIDGE_KEY_PREFIX}/{SEAT_HEAT_VSS_PATH.replace('.', '/')}"
SEAT_HC_BRIDGE_KEY = f"{BRIDGE_KEY_PREFIX}/{SEAT_HC_VSS_PATH.replace('.', '/')}"

SOURCE_LABEL = "vm2"           # embedded in every outgoing envelope
DASH_STATUS_KEY = "dash/status/seat"  # reverse channel to dashboard


KEY_TO_VSS = {
    "sim/cabin/seat/heating": (
        SEAT_HEAT_VSS_PATH,
        int,
    ),
    "sim/cabin/seat/hc": (
        SEAT_HC_VSS_PATH,
        int,
    ),
}


# VSS path -> dashboard indicator key used by IndicatorPanel.
VSS_TO_DASH_KEY = {
    SEAT_HEAT_VSS_PATH: "seat.heating",
    SEAT_HC_VSS_PATH: "seat.heating_cooling",
}


def _seat_status(vss_path: str, value: Any) -> str:
    """Map a (path, value) pair to the dashboard indicator state.

    Indicator semantics (see module docstring):
       Heating          > 0  -> "heating"  (dashboard renders red)
       HeatingCooling   > 0  -> "heating"  (dashboard renders red)
       HeatingCooling   < 0  -> "cooling"  (dashboard renders blue)
       all other (=== 0)     -> "off"      (dashboard renders blue/idle)
    """
    try:
        v = float(value)
    except (TypeError, ValueError):
        return "off"
    if v > 0:
        return "heating"
    if vss_path.endswith("HeatingCooling") and v < 0:
        return "cooling"
    return "off"


def log(msg: str) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    print(f"[{ts}] [seat] {msg}", flush=True)


def _build_bridge_config(connect_endpoint: str) -> zenoh.Config:
    """Zenoh config for the VM1<->VM2 bridge relay (connect-only, no listen)."""
    config = zenoh.Config()
    config.insert_json5("connect/endpoints", json.dumps([connect_endpoint]))
    return config


def _tcp_dash_payload_for_path(path: str, value: int) -> bytes:
    """Reverse-status frame for one seat signal sent back to the dashboard over TCP.

    The "topic" field routes to the correct TcpBus subscriber (STATUS_KEY_SEAT).
    The "key" field carries the inner logical key used by IndicatorPanel.
    """
    dash_key = VSS_TO_DASH_KEY[path]
    return (
        json.dumps({
            "topic": DASH_STATUS_KEY,
            "key": dash_key,
            "value": int(value),
            "status": _seat_status(path, value),
            "source": SOURCE_LABEL,
            "ts": datetime.now(timezone.utc).isoformat(),
        })
        + "\n"
    ).encode()


def _bridge_payload(path: str, value: int, source: str) -> bytes:
    return json.dumps({
        "path": path,
        "value": int(value),
        "unit": "percent",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": source,
    }).encode("utf-8")


async def run(host: str, port: int, bridge_connect: str) -> None:
    log(f"TCP listen={host}:{port}, bridge-connect={bridge_connect}")
    with zenoh.open(_build_bridge_config(bridge_connect)) as bridge_session:
        bridge_pubs = {
            SEAT_HEAT_VSS_PATH: bridge_session.declare_publisher(SEAT_HEAT_BRIDGE_KEY),
            SEAT_HC_VSS_PATH: bridge_session.declare_publisher(SEAT_HC_BRIDGE_KEY),
        }
        log("Bridge Zenoh publishers ready")
        last_outbound: dict[str, int] = {}
        last_inbound: dict[str, int] = {}
        writers: list[asyncio.StreamWriter] = []
        writers_lock = asyncio.Lock()
        loop = asyncio.get_running_loop()

        async def _send_to_all(payload: bytes) -> None:
            async with writers_lock:
                dead = []
                for w in writers:
                    try:
                        w.write(payload)
                        await w.drain()
                    except Exception:
                        dead.append(w)
                for w in dead:
                    writers.remove(w)

        async def handle_client(
            reader: asyncio.StreamReader, writer: asyncio.StreamWriter
        ) -> None:
            addr = writer.get_extra_info("peername")
            log(f"Dashboard connected from {addr}")
            async with writers_lock:
                writers.append(writer)
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
                        path, cast = cfg
                        value = msg.get("value")
                        src = str(msg.get("source", "?"))
                        if value is None:
                            continue
                        try:
                            coerced = cast(value)
                        except (TypeError, ValueError) as exc:
                            log(f"WARN cast failed for {key}: {exc}")
                            continue
                        changed = last_outbound.get(path) != coerced
                        last_outbound[path] = coerced
                        try:
                            bridge_pubs[path].put(_bridge_payload(path, coerced, SOURCE_LABEL))
                        except Exception as exc:
                            log(f"ERROR bridge publish for {path}: {exc}")
                        await _send_to_all(_tcp_dash_payload_for_path(path, coerced))
                        tag = "OK  " if changed else "ok  "
                        log(f"{tag} {path} = {coerced} (from {src})")
            except Exception as exc:
                log(f"ERROR in client handler for {addr}: {exc}")
            finally:
                async with writers_lock:
                    try:
                        writers.remove(writer)
                    except ValueError:
                        pass
                writer.close()
            log(f"Dashboard disconnected from {addr}")

        def bridge_listener(sample: zenoh.Sample) -> None:
            try:
                msg = json.loads(sample.payload.to_string())
            except Exception as exc:
                log(f"WARN bad bridge payload: {exc}")
                return
            path = str(msg.get("path", ""))
            src = str(msg.get("source", "?"))
            value = msg.get("value")
            if path not in VSS_TO_DASH_KEY or value is None or src == SOURCE_LABEL:
                return
            try:
                coerced = int(round(float(value)))
            except (TypeError, ValueError):
                return
            changed = last_inbound.get(path) != coerced
            last_inbound[path] = coerced
            payload = _tcp_dash_payload_for_path(path, coerced)
            loop.call_soon_threadsafe(
                lambda p=payload: asyncio.ensure_future(_send_to_all(p))
            )
            tag = "ACT " if changed else "act "
            log(
                f"{tag} {path} = {coerced} -> dashboard {VSS_TO_DASH_KEY[path]} "
                f"(status={_seat_status(path, coerced)})"
            )

        _bridge_sub = bridge_session.declare_subscriber(
            f"{BRIDGE_KEY_PREFIX}/**", bridge_listener
        )
        server = await asyncio.start_server(handle_client, host, port)
        log(f"Seat ECU TCP server listening on {host}:{port}")
        async with server:
            await server.serve_forever()


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Seat Control Module on VM2. Listens on a TCP "
                    "port for sim/cabin/seat/* frames from the host "
                    "PyTk dashboard and forwards them to the VM1<->VM2 "
                    "kuksa-bridge."
    )
    p.add_argument("--host", default=DEFAULT_HOST,
                   help=f"TCP listen address (default: {DEFAULT_HOST})")
    p.add_argument("--port", type=int, default=DEFAULT_PORT,
                   help=f"TCP listen port (default: {DEFAULT_PORT})")
    p.add_argument("--bridge-connect", default=DEFAULT_BRIDGE_CONNECT,
                   help=f"VM1 kuksa-bridge endpoint (default: {DEFAULT_BRIDGE_CONNECT})")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    try:
        asyncio.run(run(args.host, args.port, args.bridge_connect))
    except KeyboardInterrupt:
        log("Stopping.")
        return 0
    except Exception as exc:
        log(f"FATAL: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
