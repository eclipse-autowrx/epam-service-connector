# Copyright (c) 2026 Eclipse Foundation.
#
# This program and the accompanying materials are made available under the
# terms of the MIT License which is available at
# https://opensource.org/licenses/MIT.
#
# SPDX-License-Identifier: MIT
"""HVAC ECU service.

Consumes the host dashboard's fan-speed command over Zenoh, writes it
directly into the shared Kuksa Databroker on the primary node, and sends
status updates back to the dashboard's indicator panel.

Connectivity: runs as a Zenoh *client* that dials the router on the
primary node (no inbound listener), and a Kuksa gRPC client pointed at
the single broker. The service is stateless and may migrate between
nodes; both endpoints are fixed on the primary node, so its current
node does not matter.

Signal flow (inbound — dashboard control)
-----------------------------------------
  pytk_dashboard.py ─Zenoh sim/cabin/temp─► router ─► hvac_ecu.py
                                                          │
                                              write VSS over gRPC ▼
                      Kuksa: Vehicle.Cabin.HVAC.AmbientAirTemperature

Dashboard update
----------------
    Kuksa change (this ECU's write, or any other writer)
        └─► _dashboard_forwarder (Kuksa subscription)
                └─► Zenoh dash/status/hvac ─► router ─► dashboard indicator

Note: 'sim/cabin/temp' carries a 0–100 fan-speed % value.
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
HVAC_VSS_PATH = "Vehicle.Cabin.HVAC.AmbientAirTemperature"

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

    This is the path that surfaces writes made by the range-compute
    app: it writes to Kuksa, this subscriber fires, the dashboard
    indicator updates. Since cabin values now land in Kuksa directly
    (this ECU writes them over gRPC), a single broker holds the truth
    and every writer is reflected the same way.

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


async def run(router: str, kuksa_host: str, kuksa_port: int) -> None:
    # Single shared Kuksa broker on the primary node: the ECU writes
    # cabin values straight into Kuksa over gRPC. No kuksa-bridge.
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
        log(f"Opening Zenoh session (client mode) -> router {router}, subscribed to '{KEY_PREFIX}'")
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
            log(f"Reverse channel publisher on '{DASH_STATUS_KEY}' ready "
                f"({len(subscribers)} subscriber active).")

            consumer_task = asyncio.create_task(_consumer(queue, kuksa))

            forwarder_task = asyncio.create_task(
                _dashboard_forwarder(kuksa, dash_pub)
            )
            log(f"Kuksa->dashboard forwarder subscribed to: "
                f"{', '.join(VSS_TO_DASH)}")

            log("HVAC ECU running. Drive values from the host PyTk dashboard. Ctrl+C to stop.")
            tasks = {consumer_task, forwarder_task}
            try:
                # Fail fast: if either task exits — almost always because
                # the Kuksa subscribe stream broke — surface the error so
                # main() logs FATAL and the process exits for the
                # supervisor to restart. A dead task must never be left
                # running unobserved (which would be a half-working ECU
                # with no crash and no restart).
                done, _ = await asyncio.wait(
                    tasks, return_when=asyncio.FIRST_COMPLETED
                )
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
        description="HVAC ECU. Connects (Zenoh client mode) to the router "
                    "on the primary node for sim/cabin/temp samples driven "
                    "by the host PyTk dashboard, and writes the values into "
                    "the shared Kuksa Databroker. Opens no inbound listener."
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
        import traceback
        traceback.print_exc()
        log(f"FATAL: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
