"""HVAC ECU service — runs on VM2.

Consumes the host dashboard's fan-speed command over Zenoh, publishes it
to the kuksa-bridge wire namespace, and sends status updates back to the
dashboard's indicator panel.

Signal flow (inbound — dashboard control)
-----------------------------------------
  pytk_dashboard.py  ──Zenoh sim/cabin/temp (tcp/:7461)──►  hvac_ecu.py
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
    VM2 HVAC ECU bridge handler
        └─► Zenoh dash/status/hvac ──► pytk_dashboard.py indicator

Note: 'sim/cabin/temp' carries a 0–100 fan-speed % value.
Cross-VM VSS mirroring is handled exclusively by kuksa-bridge.
"""

import argparse
import asyncio
import json
import socket
import sys
import threading
from datetime import datetime, timezone
from typing import Any

import zenoh
from kuksa_client.grpc import Datapoint
from kuksa_client.grpc.aio import VSSClient


DEFAULT_LISTEN = "tcp/0.0.0.0:7461"
DEFAULT_KUKSA_HOST = "127.0.0.1"
DEFAULT_KUKSA_PORT = 55555
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

KEY_PREFIX = "sim/cabin/temp"


# VSS paths the ECU subscribes to on its local Kuksa to drive the
# dashboard indicator. Listed separately from KEY_TO_VSS because the
# dashboard-forward path is independent of the host-Zenoh ingest path.
VSS_TO_DASH = (HVAC_VSS_PATH,)


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


def build_zenoh_config(listen_endpoint: str, connect_endpoints: tuple[str, ...] = ()) -> zenoh.Config:
    config = zenoh.Config()
    config.insert_json5("listen/endpoints", f'["{listen_endpoint}"]')
    if connect_endpoints:
        config.insert_json5("connect/endpoints", json.dumps(list(connect_endpoints)))
    return config


def _bridge_payload(value: float, source: str) -> bytes:
    return json.dumps({
        "path": HVAC_VSS_PATH,
        "value": float(value),
        "unit": "percent",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": source,
    }).encode("utf-8")


def _dash_payload(value: float, source: str) -> bytes:
    status = _hvac_status(value)
    return json.dumps({
        "key": DASH_KEY_PAIR,
        "value": float(value),
        "status": status,
        "source": source,
        "ts": datetime.now(timezone.utc).isoformat(),
    }).encode("utf-8")


class _LatestValueQueue:
    """Coalescing latest-value queue for a small number of VSS paths.

    Producers (the Zenoh worker thread) call `offer(path, value, cast,
    src)` on every incoming sample. When multiple samples for the same
    path arrive before the consumer drains, only the LAST one survives.
    The single consumer (one asyncio task) calls `take()` and gets a
    snapshot of all pending paths, then clears the slot.

    This caps Kuksa RPC traffic at the asyncio loop tick rate, no matter
    how fast the dashboard's slider drags fire, so a fast drag never
    queues up a backlog of stale writes - the user always sees the
    most recent value land in Kuksa with ~asyncio-tick latency.
    """

    def __init__(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop
        self._lock = threading.Lock()
        self._pending: dict[str, tuple[Any, Any, str]] = {}
        self._evt = asyncio.Event()

    def offer(self, path: str, value: Any, cast: Any, src: str) -> None:
        """Producer side. Safe to call from any thread; never blocks."""
        with self._lock:
            self._pending[path] = (value, cast, src)
        # Wake the consumer task on the asyncio loop thread.
        self._loop.call_soon_threadsafe(self._evt.set)

    async def take(self) -> dict[str, tuple[Any, Any, str]]:
        """Consumer side. Awaits at least one offered value, returns snapshot."""
        while True:
            await self._evt.wait()
            with self._lock:
                if self._pending:
                    snapshot = self._pending
                    self._pending = {}
                    self._evt.clear()
                    return snapshot
                # Spurious wake-up (offer raced with a previous take's
                # critical section). Clear and re-await.
                self._evt.clear()


async def _consumer(
    queue: "_LatestValueQueue",
    kuksa: VSSClient,
) -> None:
    """Drain the latest-value queue and write to Kuksa with dedup.

    Only writes to Kuksa. Dashboard updates come exclusively from
    _dashboard_forwarder (Kuksa subscription), which fires for both
    slider writes and kuksa-bridge inbound writes.
    """
    last_sent: dict[str, Any] = {}
    while True:
        pending = await queue.take()
        updates: dict[str, Datapoint] = {}
        log_lines: list[str] = []
        for path, (raw_value, cast, src) in pending.items():
            try:
                coerced = cast(raw_value)
            except (TypeError, ValueError) as exc:
                log(f"WARN cannot cast {raw_value!r} -> {cast.__name__} for {path}: {exc}")
                continue
            if last_sent.get(path) == coerced:
                continue
            updates[path] = Datapoint(coerced)
            last_sent[path] = coerced
            log_lines.append(f"OK   {path} = {coerced} (from {src})")
        if updates:
            try:
                await kuksa.set_current_values(updates)
            except Exception as exc:
                log(f"ERROR writing {len(updates)} key(s) to Kuksa: {exc}")
                continue
        for line in log_lines:
            log(line)


async def _dashboard_forwarder(
    kuksa: VSSClient,
    dash_pub: "zenoh.Publisher",
) -> None:
    """Subscribe to the HVAC VSS path on local Kuksa and forward
    each change to the host dashboard as a `{key, value, status}`
    envelope. Logs an `ACT` line per change so the actuation is
    visible in the ECU log.

    This is the path that surfaces writes made BY the EV Range
    Extender app on VM1: the app writes to VM1's Kuksa, the
    kuksa-bridge mirrors the value VM1 -> VM2, this subscriber
    fires here, the dashboard indicator updates.

    For the host-dashboard slider path the same subscriber also
    fires (since we write to Kuksa from `_consumer`), which means
    every slider movement results in a single dashboard-side echo.
    That is intentional: the indicator should reflect the current
    Kuksa state regardless of who wrote it.
    """
    last_status: dict[str, str] = {}
    async for updates in kuksa.subscribe_current_values(list(VSS_TO_DASH)):
        for path, dp in updates.items():
            if dp is None or dp.value is None:
                continue
            status = _hvac_status(dp.value)
            payload = json.dumps({
                "key": DASH_KEY_PAIR,
                "value": float(dp.value),
                "status": status,
                "source": SOURCE_LABEL,
                "ts": datetime.now(timezone.utc).isoformat(),
            }).encode("utf-8")
            try:
                dash_pub.put(payload)
            except Exception as exc:
                log(f"ERROR forwarding {path} to dashboard: {exc}")
                continue
            changed = last_status.get(path) != status
            last_status[path] = status
            tag = "ACT " if changed else "act "
            log(f"{tag} {path} = {dp.value}  -> dashboard {DASH_KEY_PAIR} (status={status})")


async def run(listen: str, kuksa_host: str, kuksa_port: int, bridge_connect: str) -> None:
    # Enforce single-runtime architecture: VM2 never writes to a local
    # Kuksa runtime, all VM1<->VM2 transfer goes through kuksa-bridge.
    _ = (kuksa_host, kuksa_port)
    await _run_without_kuksa(listen, bridge_connect)


async def _run_with_kuksa(listen: str, kuksa_host: str, kuksa_port: int) -> None:
    log(f"Connecting to Kuksa Databroker at {kuksa_host}:{kuksa_port}...")
    async with VSSClient(kuksa_host, kuksa_port) as kuksa:
        log("Connected to Kuksa.")
        log("Subscribed Zenoh keys -> VSS paths:")
        for k, (vss, cast) in KEY_TO_VSS.items():
            log(f"    {k}  ->  {vss}  ({cast.__name__})")

        loop = asyncio.get_running_loop()
        queue = _LatestValueQueue(loop)
        log(f"Opening Zenoh session, listen={listen}, subscribed to '{KEY_PREFIX}'")
        with zenoh.open(build_zenoh_config(listen)) as session:
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
                queue.offer(vss_path, value, cast, src)

            _sub = session.declare_subscriber(KEY_PREFIX, listener)

            # Reverse channel to the host dashboard - declared on the
            # SAME Zenoh session so the existing TCP peer connection
            # (host -> ECU) is reused for ECU -> host samples too.
            dash_pub = session.declare_publisher(DASH_STATUS_KEY)
            log(f"Reverse channel publisher on '{DASH_STATUS_KEY}' ready.")

            consumer_task = asyncio.create_task(_consumer(queue, kuksa))

            forwarder_task = asyncio.create_task(
                _dashboard_forwarder(kuksa, dash_pub)
            )
            log(f"Kuksa->dashboard forwarder subscribed to: "
                f"{', '.join(VSS_TO_DASH)}")

            log("HVAC ECU running. Drive values from the host PyTk dashboard. Ctrl+C to stop.")
            try:
                await stop_event.wait()
            except asyncio.CancelledError:
                pass
            finally:
                consumer_task.cancel()
                forwarder_task.cancel()


async def _run_without_kuksa(listen: str, bridge_connect: str) -> None:
    log(f"Opening Zenoh session, listen={listen}, connect=[{bridge_connect}] in bridge-wire mode")
    with zenoh.open(build_zenoh_config(listen, (bridge_connect,))) as session:
        stop_event = asyncio.Event()
        dash_pub = session.declare_publisher(DASH_STATUS_KEY)
        bridge_pub = session.declare_publisher(HVAC_BRIDGE_KEY)
        last_outbound: dict[str, float] = {}
        last_inbound: dict[str, float] = {}

        def dashboard_listener(sample: zenoh.Sample) -> None:
            key = str(sample.key_expr)
            cfg = KEY_TO_VSS.get(key)
            if cfg is None:
                log(f"WARN ignoring unknown key '{key}'")
                return
            try:
                msg = json.loads(sample.payload.to_string())
            except Exception as exc:
                log(f"WARN bad payload on '{key}': {exc}")
                return
            value = msg.get("value")
            src = str(msg.get("source", socket.gethostname()))
            if value is None:
                log(f"WARN payload missing 'value' on '{key}': {msg}")
                return
            try:
                coerced = float(value)
            except (TypeError, ValueError) as exc:
                log(f"WARN cannot cast {value!r} -> float for {HVAC_VSS_PATH}: {exc}")
                return
            changed = last_outbound.get(HVAC_VSS_PATH) != coerced
            last_outbound[HVAC_VSS_PATH] = coerced
            try:
                bridge_pub.put(_bridge_payload(coerced, SOURCE_LABEL))
                dash_pub.put(_dash_payload(coerced, SOURCE_LABEL))
            except Exception as exc:
                log(f"ERROR forwarding dashboard value {coerced} over bridge: {exc}")
                return
            tag = "OK  " if changed else "ok  "
            log(f"{tag} {HVAC_VSS_PATH} = {coerced} (from {src})")

        def bridge_listener(sample: zenoh.Sample) -> None:
            try:
                msg = json.loads(sample.payload.to_string())
            except Exception as exc:
                log(f"WARN bad bridge payload on '{sample.key_expr}': {exc}")
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
            try:
                dash_pub.put(_dash_payload(coerced, SOURCE_LABEL))
            except Exception as exc:
                log(f"ERROR forwarding bridge value {coerced} to dashboard: {exc}")
                return
            tag = "ACT " if changed else "act "
            log(f"{tag} {path} = {coerced}  -> dashboard {DASH_KEY_PAIR} (status={_hvac_status(coerced)})")

        dashboard_sub = session.declare_subscriber(KEY_PREFIX, dashboard_listener)
        bridge_sub = session.declare_subscriber(f"{BRIDGE_KEY_PREFIX}/**", bridge_listener)
        log(f"Bridge-wire mode ready. Dashboard key '{KEY_PREFIX}', bridge key '{HVAC_BRIDGE_KEY}'")
        try:
            await stop_event.wait()
        except asyncio.CancelledError:
            pass
        finally:
            _ = dashboard_sub
            _ = bridge_sub


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="HVAC ECU on VM2. Listens on a Zenoh endpoint for "
                    "sim/cabin/temp samples driven by the host PyTk "
                    "dashboard, and writes the values into VM2 local "
                    "Kuksa (bridge sync propagates to VM1)."
    )
    p.add_argument("--listen", default=DEFAULT_LISTEN,
                   help=f"Zenoh listen endpoint (default: {DEFAULT_LISTEN})")
    p.add_argument("--kuksa-host", default=DEFAULT_KUKSA_HOST,
                   help=f"Kuksa Databroker host (default: {DEFAULT_KUKSA_HOST})")
    p.add_argument("--kuksa-port", type=int, default=DEFAULT_KUKSA_PORT,
                   help=f"Kuksa Databroker port (default: {DEFAULT_KUKSA_PORT})")
    p.add_argument("--bridge-connect", default=DEFAULT_BRIDGE_CONNECT,
                   help=f"VM1 kuksa-bridge endpoint for no-local-Kuksa fallback (default: {DEFAULT_BRIDGE_CONNECT})")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    try:
        asyncio.run(run(args.listen, args.kuksa_host, args.kuksa_port, args.bridge_connect))
    except KeyboardInterrupt:
        log("Stopping.")
        return 0
    except Exception as exc:
        log(f"FATAL: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
