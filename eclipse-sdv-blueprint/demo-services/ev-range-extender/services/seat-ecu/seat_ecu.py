# Copyright (c) 2026 Eclipse Foundation.
#
# This program and the accompanying materials are made available under the
# terms of the MIT License which is available at
# https://opensource.org/licenses/MIT.
#
# SPDX-License-Identifier: MIT
"""Seat ECU (SCM) service.

Consumes the host dashboard's seat heating/cooling commands over Zenoh,
writes corresponding values directly into the shared Kuksa Databroker on
the primary node, and sends status updates back to the dashboard's
indicator panel.

Connectivity: runs as a Zenoh *client* that dials the router on the
primary node (no inbound listener), and a Kuksa gRPC client pointed at
the single broker. The service is stateless and may migrate between
nodes; both endpoints are fixed on the primary node, so its current
node does not matter.

Signal flow (inbound — dashboard control)
-----------------------------------------
  pytk_dashboard.py
    ├─ sim/cabin/seat/heating ─┐
    └─ sim/cabin/seat/hc       ┴─Zenoh─► router ─► seat_ecu.py
                                                       │
                                           write VSS over gRPC ▼
                      Kuksa: Vehicle.Cabin.Seat.Row1.DriverSide.Heating
                             Vehicle.Cabin.Seat.Row1.DriverSide.HeatingCooling

Dashboard update
----------------
    Kuksa change (this ECU's write, or any other writer)
        └─► _dashboard_forwarder (Kuksa subscription)
                └─► Zenoh dash/status/seat ─► router ─► dashboard indicator

Note: heating is 0–100 %; hc is –100 (cooling) to +100 (heating).
"""

import argparse
import asyncio
import json
import sys
import threading
from datetime import datetime, timezone
from typing import Any

import zenoh
from kuksa_client.grpc import Datapoint
from kuksa_client.grpc.aio import VSSClient

DEFAULT_ROUTER = "tcp/zenoh:7447"  # zenoh router (resolves to primary node)
DEFAULT_KUKSA_HOST = "kuksa"
DEFAULT_KUKSA_PORT = 55555
SEAT_HEAT_VSS_PATH = "Vehicle.Cabin.Seat.Row1.DriverSide.Heating"
SEAT_HC_VSS_PATH = "Vehicle.Cabin.Seat.Row1.DriverSide.HeatingCooling"

SOURCE_LABEL = "vm2"  # embedded in every outgoing envelope
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
   # SEAT_HEAT_VSS_PATH: "seat.heating",   # SEAT_HEAT_VSS_PATH is broken (absent in VSS spec)
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


def build_zenoh_config(router_endpoint: str) -> zenoh.Config:
    # Client mode: dial the router on the primary node and open NO
    # inbound listener. Pub/sub still flows both ways over the outbound
    # link, so no inbound port is exposed and the ECU stays reachable
    # no matter which node it migrates to.
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
    _dashboard_forwarder (Kuksa subscription), which fires for any
    write to the path regardless of which writer made it.
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
                log(
                    f"WARN cannot cast {raw_value!r} -> {cast.__name__} for {path}: {exc}"
                )
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
    paths = list(VSS_TO_DASH_KEY.keys())  # Vehicle.Cabin.Seat.Row1.DriverSide.Heating is absent
    async for updates in kuksa.subscribe_current_values(paths):
        for path, dp in updates.items():
            if dp is None or dp.value is None:
                continue
            dash_key = VSS_TO_DASH_KEY.get(path)
            if dash_key is None:
                continue
            status = _seat_status(path, dp.value)
            payload = json.dumps(
                {
                    "key": dash_key,
                    "value": (
                        int(dp.value)
                        if isinstance(dp.value, (int, float))
                        else dp.value
                    ),
                    "status": status,
                    "source": SOURCE_LABEL,
                    "ts": datetime.now(timezone.utc).isoformat(),
                }
            ).encode("utf-8")
            try:
                dash_pub.put(payload)
            except Exception as exc:
                log(f"ERROR forwarding {path} to dashboard: {exc}")
                continue
            changed = last_status.get(path) != status
            last_status[path] = status
            tag = "ACT " if changed else "act "
            log(f"{tag} {path} = {dp.value}  -> dashboard {dash_key} (status={status})")


async def run(router: str, kuksa_host: str, kuksa_port: int) -> None:
    # Single shared Kuksa broker on the primary node: the ECU writes
    # seat values straight into Kuksa over gRPC. No kuksa-bridge.
    await _run_with_kuksa(router, kuksa_host, kuksa_port)


async def _run_with_kuksa(router: str, kuksa_host: str, kuksa_port: int) -> None:
    log(f"Connecting to Kuksa Databroker at {kuksa_host}:{kuksa_port}...")
    async with VSSClient(kuksa_host, kuksa_port) as kuksa:
        log("Connected to Kuksa.")
        log("Subscribed Zenoh keys -> VSS paths:")
        for k, (vss, cast) in KEY_TO_VSS.items():
            log(f"    {k}  ->  {vss}  ({cast.__name__})")

        loop = asyncio.get_running_loop()
        queue = _LatestValueQueue(loop)
        log(
            f"Opening Zenoh session (client mode) -> router {router}, subscribed to '{KEY_PREFIX}'"
        )
        with zenoh.open(build_zenoh_config(router)) as session:

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

            # Retain the subscriber handle for the session's lifetime. If
            # this reference is dropped, Zenoh garbage-collects the
            # subscription and ingest stops with no error. Kept in a list
            # (and referenced below) so it survives lint/autoflake passes.
            subscribers = [session.declare_subscriber(KEY_PREFIX, listener)]

            # Reverse channel to the host dashboard - declared on the SAME
            # Zenoh session so it shares the ECU's single client connection
            # to the router (command and status ride the one outbound link).
            dash_pub = session.declare_publisher(DASH_STATUS_KEY)
            log(
                f"Reverse channel publisher on '{DASH_STATUS_KEY}' ready "
                f"({len(subscribers)} subscriber active)."
            )

            consumer_task = asyncio.create_task(_consumer(queue, kuksa))

            forwarder_task = asyncio.create_task(_dashboard_forwarder(kuksa, dash_pub))
            log(
                f"Kuksa->dashboard forwarder subscribed to: "
                f"{', '.join(VSS_TO_DASH_KEY.keys())}"
            )

            log(
                "Seat ECU running. Drive values from the host PyTk dashboard. Ctrl+C to stop."
            )
            tasks = {consumer_task, forwarder_task}
            try:
                # Fail fast: if either task exits — almost always because
                # the Kuksa subscribe stream broke — surface the error so
                # main() logs FATAL and the process exits for the
                # supervisor to restart. A dead task must never be left
                # running unobserved (which would be a half-working ECU
                # with no crash and no restart).
                done, _ = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            except asyncio.CancelledError:
                done = set()
            finally:
                for t in tasks:
                    t.cancel()
                await asyncio.gather(*tasks, return_exceptions=True)
            for t in done:
                exc = t.exception()
                if exc is not None:
                    raise exc


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Seat Control Module. Connects (Zenoh client mode) to "
        "the router on the primary node for sim/cabin/seat/* "
        "samples driven by the host PyTk dashboard, and writes "
        "the values into the shared Kuksa Databroker. Opens no "
        "inbound listener."
    )
    p.add_argument(
        "--router",
        default=DEFAULT_ROUTER,
        help=f"Zenoh router endpoint on the primary node "
        f"(default: {DEFAULT_ROUTER})",
    )
    p.add_argument(
        "--kuksa-host",
        default=DEFAULT_KUKSA_HOST,
        help=f"Kuksa Databroker host (default: {DEFAULT_KUKSA_HOST})",
    )
    p.add_argument(
        "--kuksa-port",
        type=int,
        default=DEFAULT_KUKSA_PORT,
        help=f"Kuksa Databroker port (default: {DEFAULT_KUKSA_PORT})",
    )
    return p.parse_args()


def main() -> int:
    args = parse_args()
    try:
        asyncio.run(run(args.router, args.kuksa_host, args.kuksa_port))
    except KeyboardInterrupt:
        log("Stopping.")
        return 0
    except Exception as exc:
        import traceback
        traceback.print_exc()
        log(f"FATAL: {exc} type={type(exc)}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
