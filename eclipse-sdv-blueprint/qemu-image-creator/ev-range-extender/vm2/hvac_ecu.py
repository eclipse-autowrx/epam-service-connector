# Copyright (c) 2026 Eclipse Foundation.
#
# This program and the accompanying materials are made available under the
# terms of the MIT License which is available at
# https://opensource.org/licenses/MIT.
#
# SPDX-License-Identifier: MIT
"""HVAC ECU service — runs on VM2.

Consumes the host dashboard's fan-speed command over a direct TCP
connection, publishes it to the kuksa-bridge wire namespace, and sends
status updates back to the dashboard's indicator panel on the same socket.

Signal flow (inbound — dashboard control)
-----------------------------------------
  pytk_hwsim.py  ──TCP sim/cabin/temp (port 7461)──►  hvac_ecu.py
                                                            │
                                                 publish wire value ▼
                      kuksa-bridge/Vehicle/Cabin/HVAC/AmbientAirTemperature

Signal flow (outbound — kuksa-bridge inbound from VM1)
------------------------------------------------------
    VM1 Kuksa change
        └─► kuksa-bridge (VM1 outbound → Zenoh → VM2 inbound)
                            └─► VM2 HVAC ECU receives bridge payload

Dashboard update (single path, both cases above)
------------------------------------------------
    VM2 HVAC ECU
        └─► TCP dash/status/hvac ──► pytk_hwsim.py indicator

Note: 'sim/cabin/temp' carries a 0–100 fan-speed % value.
Cross-VM VSS mirroring is handled exclusively by kuksa-bridge.
"""

import argparse
import asyncio
import json
import sys
from datetime import datetime, timezone

import zenoh


DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = 7461
DEFAULT_BRIDGE_CONNECT = "tcp/127.0.0.1:7448"  # local VM2 bridge relay
BRIDGE_KEY_PREFIX = "kuksa-bridge"
HVAC_VSS_PATH = "Vehicle.Cabin.HVAC.AmbientAirTemperature"
HVAC_BRIDGE_KEY = f"{BRIDGE_KEY_PREFIX}/{HVAC_VSS_PATH.replace('.', '/')}"

SOURCE_LABEL = "vm2"           # embedded in every outgoing envelope
DASH_STATUS_KEY = "dash/status/hvac"  # reverse channel to dashboard
DASH_KEY_PAIR = "hvac.fan_speed"      # logical key used by dashboard indicator


KEY_TO_VSS = {
    "sim/cabin/temp": (
        HVAC_VSS_PATH,
        float,
    ),
}


def _hvac_status(value: float) -> str:
    """Map a fan-speed value (0..100) to the dashboard indicator state.

    Per the demo narrative the HVAC indicator is binary:
       fan > 0  -> "on"   (dashboard renders green)
       fan == 0 -> "off"  (dashboard renders red)
    """
    try:
        return "on" if float(value) > 0 else "off"
    except (TypeError, ValueError):
        return "off"


def log(msg: str) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    print(f"[{ts}] [hvac] {msg}", flush=True)


def _build_bridge_config(connect_endpoint: str) -> zenoh.Config:
    """Zenoh config for the VM1<->VM2 bridge relay (connect-only, no listen)."""
    config = zenoh.Config()
    config.insert_json5("connect/endpoints", json.dumps([connect_endpoint]))
    return config


def _tcp_dash_payload(value: float) -> bytes:
    """Reverse-status frame sent back to the host dashboard over TCP.

    The "topic" field is used by TcpBus on the dashboard side to route
    this frame to the correct subscriber (STATUS_KEY_HVAC).
    The "key" field is the inner logical key read by IndicatorPanel.
    """
    status = _hvac_status(value)
    return (
        json.dumps({
            "topic": DASH_STATUS_KEY,
            "key": DASH_KEY_PAIR,
            "value": float(value),
            "status": status,
            "source": SOURCE_LABEL,
            "ts": datetime.now(timezone.utc).isoformat(),
        })
        + "\n"
    ).encode()


def _bridge_payload(value: float, source: str) -> bytes:
    return json.dumps({
        "path": HVAC_VSS_PATH,
        "value": float(value),
        "unit": "percent",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": source,
    }).encode("utf-8")


async def run(host: str, port: int, bridge_connect: str) -> None:
    log(f"TCP listen={host}:{port}, bridge-connect={bridge_connect}")
    with zenoh.open(_build_bridge_config(bridge_connect)) as bridge_session:
        bridge_pub = bridge_session.declare_publisher(HVAC_BRIDGE_KEY)
        log(f"Bridge Zenoh publisher ready on '{HVAC_BRIDGE_KEY}'")
        last_outbound: dict[str, float] = {}
        last_inbound: dict[str, float] = {}
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
                        vss_path, cast = cfg
                        value = msg.get("value")
                        src = str(msg.get("source", "?"))
                        if value is None:
                            continue
                        try:
                            coerced = cast(value)
                        except (TypeError, ValueError) as exc:
                            log(f"WARN cast failed for {key}: {exc}")
                            continue
                        changed = last_outbound.get(vss_path) != coerced
                        last_outbound[vss_path] = coerced
                        try:
                            bridge_pub.put(_bridge_payload(coerced, SOURCE_LABEL))
                        except Exception as exc:
                            log(f"ERROR bridge publish: {exc}")
                        await _send_to_all(_tcp_dash_payload(coerced))
                        tag = "OK  " if changed else "ok  "
                        log(f"{tag} {vss_path} = {coerced} (from {src})")
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
            if path != HVAC_VSS_PATH or value is None or src == SOURCE_LABEL:
                return
            try:
                coerced = float(value)
            except (TypeError, ValueError):
                return
            changed = last_inbound.get(path) != coerced
            last_inbound[path] = coerced
            payload = _tcp_dash_payload(coerced)
            loop.call_soon_threadsafe(
                lambda p=payload: asyncio.ensure_future(_send_to_all(p))
            )
            tag = "ACT " if changed else "act "
            log(
                f"{tag} {path} = {coerced} -> dashboard {DASH_KEY_PAIR} "
                f"(status={_hvac_status(coerced)})"
            )

        _bridge_sub = bridge_session.declare_subscriber(
            f"{BRIDGE_KEY_PREFIX}/**", bridge_listener
        )
        server = await asyncio.start_server(handle_client, host, port)
        log(f"HVAC ECU TCP server listening on {host}:{port}")
        async with server:
            await server.serve_forever()


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="HVAC ECU on VM2. Listens on a TCP port for "
                    "sim/cabin/temp frames from the host PyTk "
                    "dashboard and forwards them to the VM1<->VM2 "
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
