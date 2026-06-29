// Copyright (c) 2026 Eclipse Foundation.
//
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

// Preset examples for AOS Cloud Deployment Plugin

export const PRESETS = {
  // ── Python Presets ──

  helloPython: {
    name: 'Hello Python',
    appName: 'hello-world-python',
    description: 'Simple demo service in Python',
    language: 'python' as const,
    python: `#!/usr/bin/env python3
# Copyright (c) 2018-2025 EPAM Systems
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import time
import json
import datetime
import logging

from urllib import request

logger = logging.getLogger(__name__)

# Go to https://webhook.site/#/
#   and copy from "Your unique URL (Please copy it from here, not from the address bar!)" field
#   and paste server link to HTTP_REQUEST_RECEIVER_URL

HTTP_REQUEST_RECEIVER_URL = "https://webhook.site/21a820fd-df75-4286-b9e4-67ca4ee2af70"

DATA_SENDING_DELAY = 2
WAIT_TIMEOUT = 5
DELAY_AFTER_ERROR = 2


def main():
    # Initialize data accessor to "VIN" attribute and get this attribute.
    greetings = 'Hello world!'

    # Send information to HTTP server.
    while True:
        try:
            logger.info("Sending telemetry to '{url}'".format(url=HTTP_REQUEST_RECEIVER_URL))
            json_data={"Unit said": greetings, "datetime": datetime.datetime.now().isoformat()}

            params = json.dumps(json_data).encode('utf8')
            request_data = request.Request(
                HTTP_REQUEST_RECEIVER_URL,
                data=params,
                headers={'content-type': 'application/json'}
            )
            request.urlopen(request_data)
            time.sleep(DATA_SENDING_DELAY)

        except KeyboardInterrupt:
            logger.info("Received Keyboard interrupt. shutting down")
            break
        except Exception as exc:
            logger.error(
                "Unhandled exception: {exc_name}".format(exc_name=exc.__class__.__name__),
                exc_info=True,
            )
            time.sleep(DELAY_AFTER_ERROR)
            continue


if __name__ == '__main__':
    main()
`,
    yaml: `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
# Documentation: https://docs.aosedge.tech/docs/reference/file-formats/service-config

# Schema version (required, must be 2)
schemaVersion: 2

# Publisher information (optional)
publisher:
  author: "Developer Name"
  company: "Company Name"

# Publishing information (required: tlsKey; optional: domain, signKey)
publish:
  tlsKey: "aos-user-sp.p12"
  # signKey: "/path/to/sign-key.pem"  # Optional: separate signing key
  # domain: "aoscloud.io"             # Optional: if not specified, will be extracted from tlsKey certificate

# List of deployable items (like services) to include in the deployment bundle
items:
  # First service item
  - identity:
      type: "service"
      codename: "hello-world-python"
      title: "Hello World Service (Python)"
      description: "Simple demo service in Python"
    version: "1.0.2"
    sourceFolder: "hello-world-python"

    # Images for different architectures
    images:
      # x86 architecture image under service source folder
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    # Service configuration
    configuration:
      workingDir: "/"
      cmd: /usr/bin/python3 -u /main.py
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 5000           # DMIPS
        ramLimit: 512MiB         # 256 MiB
        storageLimit: 32MiB       # 32 MiB
        stateLimit: 1MiB         # 100 MiB
        tmpLimit: 256MiB         # 256 MiB`
  },

  seatEcu: {
    name: 'Seat ECU (EV Range Extender)',
    appName: 'demo-ev-range-extender-seat-ecu',
    description: 'Seat Control Module — consumes dashboard seat heating/cooling commands over Zenoh, writes to Kuksa Databroker',
    language: 'python' as const,
    python: `"""Seat ECU (SCM) service.

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

    Producers (the Zenoh worker thread) call \`offer(path, value, cast,
    src)\` on every incoming sample. When multiple samples for the same
    path arrive before the consumer drains, only the LAST one survives.
    The single consumer (one asyncio task) calls \`take()\` and gets a
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
    change to the host dashboard as a \`{key, value, status}\` envelope.

    See module docstring for the surface contract; semantics are kept
    intentionally tiny on this side so the dashboard can stay a dumb
    renderer that just maps \`status\` to a color.
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
`,
    yaml: `# Seat ECU — EV Range Extender (schemaVersion: 2)
schemaVersion: 2

publisher:
  author: "AosCloud team"
  company: "EPAM Systems"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: service
      codename: "demo-ev-range-extender-seat-ecu"
      title: "Demo EV Range Extender Seat ECU"
      description: "Seat Control Module — consumes dashboard commands over Zenoh, writes to Kuksa"
    version: "2.0.0"
    sourceFolder: "demo-ev-range-extender-seat-ecu"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: /usr/bin/python3 -u /main.py
      instances:
        minInstances: 1
        priority: 10
        labels:
          - secondary
      quotas:
        cpuLimit: 1000
        ramLimit: 128MiB
        storageLimit: 32MiB
      resources:
        - name: kuksa
          mode: rw
        - name: zenoh
          mode: rw
    dependencies:
      - identity:
          type: layer
          codename: kuksa-client
        versions: '>=6.1.0-bosch.2'
      - identity:
          type: layer
          codename: zenoh-client
        versions: '>=6.1.0-bosch.2'`
  },

  hvacEcu: {
    name: 'HVAC ECU (EV Range Extender)',
    appName: 'demo-ev-range-extender-hvac-ecu',
    description: 'HVAC ECU — consumes dashboard fan-speed commands over Zenoh, writes to Kuksa Databroker',
    language: 'python' as const,
    python: `"""HVAC ECU service.

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

    Producers (the Zenoh worker thread) call \`offer(path, value, cast,
    src)\` on every incoming sample. When multiple samples for the same
    path arrive before the consumer drains, only the LAST one survives.
    The single consumer (one asyncio task) calls \`take()\` and gets a
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
    each change to the host dashboard as a \`{key, value, status}\`
    envelope. Logs an \`ACT\` line per change so the actuation is
    visible in the ECU log.

    This is the path that surfaces writes made by the range-compute
    app: it writes to Kuksa, this subscriber fires, the dashboard
    indicator updates. Since cabin values now land in Kuksa directly
    (this ECU writes them over gRPC), a single broker holds the truth
    and every writer is reflected the same way.

    For the host-dashboard slider path the same subscriber also
    fires (since we write to Kuksa from \`_consumer\`), which means
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
`,
    yaml: `# HVAC ECU — EV Range Extender (schemaVersion: 2)
schemaVersion: 2

publisher:
  author: "AosCloud team"
  company: "EPAM Systems"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: service
      codename: "demo-ev-range-extender-hvac-ecu"
      title: "Demo EV Range Extender HVAC ECU"
      description: "HVAC ECU — consumes dashboard fan-speed commands over Zenoh, writes to Kuksa"
    version: "2.0.0"
    sourceFolder: "demo-ev-range-extender-hvac-ecu"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: /usr/bin/python3 -u /main.py
      instances:
        minInstances: 1
        priority: 10
        labels:
          - secondary
      quotas:
        cpuLimit: 1000
        ramLimit: 128MiB
        storageLimit: 32MiB
      resources:
        - name: kuksa
          mode: rw
        - name: zenoh
          mode: rw
    dependencies:
      - identity:
          type: layer
          codename: kuksa-client
        versions: '>=6.1.0-bosch.2'
      - identity:
          type: layer
          codename: zenoh-client
        versions: '>=6.1.0-bosch.2'`
  },

  bms: {
    name: 'BMS (EV Range Extender)',
    appName: 'demo-ev-range-extender-bms',
    description: 'Battery Monitoring System — receives battery telemetry over Zenoh, writes to Kuksa Databroker',
    language: 'python' as const,
    python: `"""BMS (Battery Monitoring System) service.

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
`,
    yaml: `# BMS — EV Range Extender (schemaVersion: 2)
schemaVersion: 2

publisher:
  author: "AosCloud team"
  company: "EPAM Systems"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: service
      codename: "demo-ev-range-extender-bms"
      title: "Demo EV Range Extender BMS"
      description: "Battery Monitoring System — receives battery telemetry over Zenoh, writes to Kuksa"
    version: "2.0.0"
    sourceFolder: "demo-ev-range-extender-bms"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: /usr/bin/python3 -u /main.py
      instances:
        minInstances: 1
        priority: 10
        labels:
          - main
      quotas:
        cpuLimit: 1000
        ramLimit: 128MiB
        storageLimit: 32MiB
      resources:
        - name: kuksa
          mode: rw
        - name: zenoh
          mode: rw
    dependencies:
      - identity:
          type: layer
          codename: kuksa-client
        versions: '>=6.1.0-bosch.2'
      - identity:
          type: layer
          codename: zenoh-client
        versions: '>=6.1.0-bosch.2'`
  },

  rangeAi: {
    name: 'Range AI (EV Range Extender)',
    appName: 'demo-ev-range-extender-range-ai',
    description: 'Range Compute AI — subscribes to battery/cabin signals from Kuksa, computes driving range',
    language: 'python' as const,
    python: `# Copyright (c) 2026 Eclipse Foundation.
#
# This program and the accompanying materials are made available under the
# terms of the MIT License which is available at
# https://opensource.org/licenses/MIT.
#
# SPDX-License-Identifier: MIT
"""Range Compute AI service.

Subscribes to battery and cabin VSS signals from the shared Kuksa
Databroker (sdv-runtime), computes estimated driving range, and writes
the result back as Vehicle.Powertrain.Range.

Signal flow
-----------
  Kuksa Databroker (shared, on the primary node)
    ├─ Vehicle.Powertrain.TractionBattery.CurrentVoltage      (written by bms.py)
    ├─ Vehicle.Powertrain.TractionBattery.CurrentCurrent      (written by bms.py)
    ├─ Vehicle.Powertrain.TractionBattery.StateOfCharge.Current  (written by bms.py)
    ├─ Vehicle.Cabin.HVAC.AmbientAirTemperature               (written by hvac_ecu.py)
    ├─ Vehicle.Cabin.Seat.Row1.DriverSide.Heating             (written by seat_ecu.py)
    └─ Vehicle.Cabin.Seat.Row1.DriverSide.HeatingCooling      (written by seat_ecu.py)
          │
          ▼
      range_ai.py  computes  range_km = available_kWh / effective_consumption
          │
          ▼
      Vehicle.Powertrain.Range  (Uint32, km)

Note: AmbientAirTemperature (0–100 %) is reused as HVAC fan-speed for the
demo; a higher fan value increases cabin power draw and lowers range.
"""

import argparse
import asyncio
import sys
from datetime import datetime

from kuksa_client.grpc import Datapoint
from kuksa_client.grpc.aio import VSSClient


# Battery signals (written by bms.py)
SIGNAL_CURRENT = "Vehicle.Powertrain.TractionBattery.CurrentCurrent"
SIGNAL_VOLTAGE = "Vehicle.Powertrain.TractionBattery.CurrentVoltage"
SIGNAL_SOC     = "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current"

# Cabin signals (written to Kuksa directly by the cabin ECUs; fan speed uses AmbientAirTemperature)
SIGNAL_HVAC_FAN  = "Vehicle.Cabin.HVAC.AmbientAirTemperature"
SIGNAL_SEAT_HEAT = "Vehicle.Cabin.Seat.Row1.DriverSide.Heating"
SIGNAL_SEAT_HC   = "Vehicle.Cabin.Seat.Row1.DriverSide.HeatingCooling"

BATTERY_SIGNALS    = [SIGNAL_CURRENT, SIGNAL_VOLTAGE, SIGNAL_SOC]
# CABIN_SIGNALS      = [SIGNAL_HVAC_FAN, SIGNAL_SEAT_HEAT, SIGNAL_SEAT_HC]
CABIN_SIGNALS      = [SIGNAL_HVAC_FAN, SIGNAL_SEAT_HC]
SUBSCRIBED_SIGNALS = BATTERY_SIGNALS + CABIN_SIGNALS

RANGE_SIGNAL = "Vehicle.Powertrain.Range"

# ---- Vehicle model parameters ----------------------------------------
BATTERY_CAPACITY_KWH = 75.0
NOMINAL_CONSUMPTION_KWH_PER_KM = 0.18
NOMINAL_CRUISE_POWER_KW = 18.0

# Cabin actuator power model. Each load is additive in kW and converted
# to kWh/km via AVG_SPEED_KMH so it can be folded into the per-km
# consumption term.
#
#   * HVAC fan : aggregate of A/C compressor + heater core + blower for
#                the driver-side HVAC station. ~2 kW at 100 % is realistic
#                for a passenger EV with the climate system at full tilt.
#   * Seat     : driver-zone aggregate (seat pad + footwell PTC heater +
#                steering-wheel heater + cabin fan budget for that zone).
#                Higher than a bare seat element on purpose so the demo
#                visibly moves the range number.
HVAC_FAN_FULL_KW    = 2.0
SEAT_HEATER_FULL_KW = 2.0
SEAT_VENT_FULL_KW   = 0.5
AVG_SPEED_KMH       = 60.0


def log(msg: str) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    print(f"[{ts}] [range-ai] {msg}", flush=True)


def _format(value) -> str:
    if value is None:
        return "<unset>"
    if isinstance(value, float):
        return f"{value:.3f}"
    return str(value)


class VehicleState:
    """Latest values for everything range_ai cares about."""

    def __init__(self) -> None:
        self.current = None          # battery current (A)
        self.voltage = None          # battery voltage (V)
        self.state_of_charge = None  # SoC (%)
        self.hvac_fan = None         # HVAC fan speed (%, 0..100), by hvac_ecu.py
                                     # (carried on AmbientAirTemperature; see docstring)
        self.seat_heat = None        # seat heating (%, 0..100), by seat_ecu.py
        self.seat_hc = None          # seat HeatingCooling (%, -100..100), by seat_ecu.py

    def update(self, path: str, value) -> None:
        if path == SIGNAL_CURRENT:
            self.current = value
        elif path == SIGNAL_VOLTAGE:
            self.voltage = value
        elif path == SIGNAL_SOC:
            self.state_of_charge = value
        elif path == SIGNAL_HVAC_FAN:
            self.hvac_fan = value
        elif path == SIGNAL_SEAT_HEAT:
            self.seat_heat = value
        elif path == SIGNAL_SEAT_HC:
            self.seat_hc = value


def hvac_load_kw(state: "VehicleState") -> float:
    """HVAC station power draw scaled by fan speed (kW). Always >= 0.

    Fan speed is the dashboard's relabel of \`AmbientAirTemperature\`
    (0..100). Values outside that range are clamped, not rejected,
    so the model degrades gracefully if a stray reading slips in.
    """
    if state.hvac_fan is None:
        return 0.0
    try:
        pct = max(0.0, min(100.0, float(state.hvac_fan)))
    except (TypeError, ValueError):
        return 0.0
    return HVAC_FAN_FULL_KW * (pct / 100.0)


def seat_load_kw(state: "VehicleState") -> float:
    """Seat-zone actuator power (kW). Always >= 0.

    * Seat.Heating         : 0..100 %  -> 0..SEAT_HEATER_FULL_KW
    * Seat.HeatingCooling  : -100..100 %
        positive (heating) -> SEAT_HEATER_FULL_KW * pct/100
        negative (cooling) -> SEAT_VENT_FULL_KW   * |pct|/100

    The dashboard's mutex guarantees Heating and HeatingCooling are
    never both non-zero at the same time, so this can't double-count
    in practice, but the formula handles both being set independently
    in case someone drives Kuksa directly.
    """
    total = 0.0
    if state.seat_heat is not None:
        try:
            pct = max(0.0, min(100.0, float(state.seat_heat)))
            total += SEAT_HEATER_FULL_KW * (pct / 100.0)
        except (TypeError, ValueError):
            pass
    if state.seat_hc is not None:
        try:
            hc = max(-100.0, min(100.0, float(state.seat_hc)))
            if hc > 0:
                total += SEAT_HEATER_FULL_KW * (hc / 100.0)
            elif hc < 0:
                total += SEAT_VENT_FULL_KW * (-hc / 100.0)
        except (TypeError, ValueError):
            pass
    return total


def cabin_load_kw(state: "VehicleState") -> float:
    """Total cabin draw (kW) = HVAC fan + seat actuators."""
    return hvac_load_kw(state) + seat_load_kw(state)


def compute_range(state: VehicleState):
    """Return estimated remaining range in km, or None if SoC is unknown."""
    if state.state_of_charge is None:
        return None

    try:
        soc = float(state.state_of_charge)
    except (TypeError, ValueError):
        return None

    soc = max(0.0, min(100.0, soc))
    available_kwh = (soc / 100.0) * BATTERY_CAPACITY_KWH

    consumption = NOMINAL_CONSUMPTION_KWH_PER_KM

    # Hard-acceleration penalty (instantaneous traction power).
    if state.current is not None and state.voltage is not None:
        try:
            power_kw = abs(float(state.current) * float(state.voltage)) / 1000.0
            if power_kw > NOMINAL_CRUISE_POWER_KW:
                load_factor = power_kw / NOMINAL_CRUISE_POWER_KW
                consumption = NOMINAL_CONSUMPTION_KWH_PER_KM * load_factor
        except (TypeError, ValueError):
            pass

    # Cabin actuator load (additive - HVAC fan + seat heater + ventilation).
    consumption += cabin_load_kw(state) / AVG_SPEED_KMH

    if consumption <= 0:
        return None

    return available_kwh / consumption


async def run(host: str, port: int) -> None:
    log(f"Connecting to Kuksa Databroker at {host}:{port}...")
    async with VSSClient(host, port) as client:
        log("Connected.")
        log(f"  Subscribing to {len(SUBSCRIBED_SIGNALS)} signal(s):")
        for s in BATTERY_SIGNALS:
            log(f"    - {s}                     (battery, written by bms.py)")
        for s in CABIN_SIGNALS:
            log(f"    - {s}     (cabin, written by the cabin ECUs)")
        log("  Will publish to:")
        log(f"    - {RANGE_SIGNAL}")
        log(
            f"  Model: capacity={BATTERY_CAPACITY_KWH} kWh, "
            f"consumption={NOMINAL_CONSUMPTION_KWH_PER_KM} kWh/km, "
            f"cruise={NOMINAL_CRUISE_POWER_KW} kW, "
            f"hvac-fan-max={HVAC_FAN_FULL_KW * 1000:.0f} W, "
            f"seat-heater-max={SEAT_HEATER_FULL_KW * 1000:.0f} W, "
            f"seat-vent-max={SEAT_VENT_FULL_KW * 1000:.0f} W"
        )

        state = VehicleState()
        async for updates in client.subscribe_current_values(SUBSCRIBED_SIGNALS):
            for path, dp in updates.items():
                value = dp.value if dp is not None else None
                state.update(path, value)
                log(f"input  : {path} = {_format(value)}")

            range_km = compute_range(state)
            if range_km is None:
                log("output : <waiting for StateOfCharge to be set>")
                continue

            # Vehicle.Powertrain.Range is declared as Uint32 in the
            # ev-range VSS catalog, so we must publish an int (not a
            # float) - otherwise the broker rejects the write.
            range_km_int = max(0, int(round(range_km)))
            hvac_kw = hvac_load_kw(state)
            seat_kw = seat_load_kw(state)

            try:
                await client.set_current_values({
                    RANGE_SIGNAL: Datapoint(range_km_int),
                })
            except Exception as exc:
                log(f"ERROR publishing {RANGE_SIGNAL}: {exc}")
                continue

            log(
                f"output : {RANGE_SIGNAL} = {range_km_int} km "
                f"(computed {range_km:.1f} km; "
                f"SoC={_format(state.state_of_charge)} %, "
                f"I={_format(state.current)} A, "
                f"U={_format(state.voltage)} V, "
                f"fan={_format(state.hvac_fan)} %, hvac={hvac_kw * 1000:.0f} W, "
                f"seatHeat={_format(state.seat_heat)} %, "
                f"seatHC={_format(state.seat_hc)} %, seat={seat_kw * 1000:.0f} W)"
            )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="EV Range Extender - Range Compute AI"
    )
    parser.add_argument(
        "--host",
        default="kuksa",
        help="Kuksa Databroker host (default: kuksa)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=55555,
        help="Kuksa Databroker port (default: 55555)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        asyncio.run(run(args.host, args.port))
    except KeyboardInterrupt:
        log("Stopping.")
        return 0
    except Exception as exc:
        log(f"FATAL: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
`,
    yaml: `# Range AI — EV Range Extender (schemaVersion: 2)
schemaVersion: 2

publisher:
  author: "AosCloud team"
  company: "EPAM Systems"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: service
      codename: "demo-ev-range-extender-range-ai"
      title: "Demo EV Range Extender Range AI"
      description: "Range Compute AI — subscribes to battery/cabin signals from Kuksa, computes driving range"
    version: "2.0.0"
    sourceFolder: "demo-ev-range-extender-range-ai"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: /usr/bin/python3 -u /main.py
      instances:
        minInstances: 1
        priority: 10
        labels:
          - main
      quotas:
        cpuLimit: 1000
        ramLimit: 128MiB
        storageLimit: 32MiB
      resources:
        - name: kuksa
          mode: rw
    dependencies:
      - identity:
          type: layer
          codename: kuksa-client
        versions: '>=6.1.0-bosch.2'`
  }
}
