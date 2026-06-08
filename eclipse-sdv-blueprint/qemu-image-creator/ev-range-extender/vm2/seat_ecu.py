"""Seat ECU (SCM) service — runs on VM2.

Consumes the host dashboard's seat heating/cooling commands over Zenoh,
publishes corresponding values to the kuksa-bridge wire namespace, and
sends status updates back to the dashboard's indicator panel.

Signal flow (inbound — dashboard control)
-----------------------------------------
  pytk_dashboard.py
    ├─ sim/cabin/seat/heating  ──Zenoh (tcp/:7462)──►
    └─ sim/cabin/seat/hc       ──────────────────────►  seat_ecu.py
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
    VM2 seat ECU bridge handler
        └─► Zenoh dash/status/seat ──► pytk_dashboard.py indicator

Note: heating is 0–100 %; hc is –100 (cooling) to +100 (heating).
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


DEFAULT_LISTEN = "tcp/0.0.0.0:7462"
DEFAULT_KUKSA_HOST = "127.0.0.1"
DEFAULT_KUKSA_PORT = 55555
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

KEY_PREFIX = "sim/cabin/seat/**"


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


def build_zenoh_config(listen_endpoint: str, connect_endpoints: tuple[str, ...] = ()) -> zenoh.Config:
    config = zenoh.Config()
    config.insert_json5("listen/endpoints", f'["{listen_endpoint}"]')
    if connect_endpoints:
        config.insert_json5("connect/endpoints", json.dumps(list(connect_endpoints)))
    return config


def _bridge_key_for_path(path: str) -> str:
    return f"{BRIDGE_KEY_PREFIX}/{path.replace('.', '/')}"


def _bridge_payload(path: str, value: int, source: str) -> bytes:
    return json.dumps({
        "path": path,
        "value": int(value),
        "unit": "percent",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": source,
    }).encode("utf-8")


def _dash_payload(path: str, value: int, source: str) -> bytes:
    return json.dumps({
        "key": VSS_TO_DASH_KEY[path],
        "value": int(value),
        "status": _seat_status(path, value),
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

    For seat the queue is especially useful because Heating and
    HeatingCooling toggles can flip near-simultaneously (the host
    dashboard's mutex publishes them in quick succession). Both end
    up in the same snapshot and are written to Kuksa in a single
    batched RPC.
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
                self._evt.clear()


async def _consumer(
    queue: "_LatestValueQueue",
    kuksa: VSSClient,
) -> None:
    """Drain the latest-value queue and write to Kuksa with dedup.

    Only writes to Kuksa. Dashboard updates come exclusively from
    _dashboard_forwarder (Kuksa subscription), which fires for both
    slider/toggle writes and kuksa-bridge inbound writes.
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
    """Subscribe to both seat VSS paths on local Kuksa and forward each
    change to the host dashboard as a `{key, value, status}` envelope.

    See module docstring for the surface contract; semantics are kept
    intentionally tiny on this side so the dashboard can stay a dumb
    renderer that just maps `status` to a color.
    """
    last_status: dict[str, str] = {}
    paths = list(VSS_TO_DASH_KEY.keys())
    async for updates in kuksa.subscribe_current_values(paths):
        for path, dp in updates.items():
            if dp is None or dp.value is None:
                continue
            dash_key = VSS_TO_DASH_KEY.get(path)
            if dash_key is None:
                continue
            status = _seat_status(path, dp.value)
            payload = json.dumps({
                "key": dash_key,
                "value": int(dp.value) if isinstance(dp.value, (int, float))
                                       else dp.value,
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
            log(f"{tag} {path} = {dp.value}  -> dashboard {dash_key} (status={status})")


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
                f"{', '.join(VSS_TO_DASH_KEY.keys())}")

            log("Seat ECU running. Drive values from the host PyTk dashboard. Ctrl+C to stop.")
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
        bridge_pubs = {
            SEAT_HEAT_VSS_PATH: session.declare_publisher(SEAT_HEAT_BRIDGE_KEY),
            SEAT_HC_VSS_PATH: session.declare_publisher(SEAT_HC_BRIDGE_KEY),
        }
        last_outbound: dict[str, int] = {}
        last_inbound: dict[str, int] = {}

        def dashboard_listener(sample: zenoh.Sample) -> None:
            key = str(sample.key_expr)
            cfg = KEY_TO_VSS.get(key)
            if cfg is None:
                log(f"WARN ignoring unknown key '{key}'")
                return
            path, cast = cfg
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
                coerced = cast(value)
            except (TypeError, ValueError) as exc:
                log(f"WARN cannot cast {value!r} -> {cast.__name__} for {path}: {exc}")
                return
            changed = last_outbound.get(path) != coerced
            last_outbound[path] = coerced
            try:
                bridge_pubs[path].put(_bridge_payload(path, coerced, SOURCE_LABEL))
                dash_pub.put(_dash_payload(path, coerced, SOURCE_LABEL))
            except Exception as exc:
                log(f"ERROR forwarding dashboard value for {path}: {exc}")
                return
            tag = "OK  " if changed else "ok  "
            log(f"{tag} {path} = {coerced} (from {src})")

        def bridge_listener(sample: zenoh.Sample) -> None:
            try:
                msg = json.loads(sample.payload.to_string())
            except Exception as exc:
                log(f"WARN bad bridge payload on '{sample.key_expr}': {exc}")
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
            try:
                dash_pub.put(_dash_payload(path, coerced, SOURCE_LABEL))
            except Exception as exc:
                log(f"ERROR forwarding bridge value for {path} to dashboard: {exc}")
                return
            tag = "ACT " if changed else "act "
            log(f"{tag} {path} = {coerced}  -> dashboard {VSS_TO_DASH_KEY[path]} (status={_seat_status(path, coerced)})")

        dashboard_sub = session.declare_subscriber(KEY_PREFIX, dashboard_listener)
        bridge_sub = session.declare_subscriber(f"{BRIDGE_KEY_PREFIX}/**", bridge_listener)
        log("Bridge-wire mode ready for seat signals.")
        try:
            await stop_event.wait()
        except asyncio.CancelledError:
            pass
        finally:
            _ = dashboard_sub
            _ = bridge_sub


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Seat Control Module on VM2. Listens on a Zenoh "
                    "endpoint for sim/cabin/seat/* samples driven by "
                    "the host PyTk dashboard, and writes the values "
                    "into VM2 local Kuksa (bridge sync propagates to VM1)."
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
