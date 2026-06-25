// Copyright (c) 2026 Eclipse Foundation.
// 
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

// Preset examples for AOS Cloud Deployment Plugin
// Writer and Reader use separate service UUIDs so both can run simultaneously.

export const PRESETS = {
  // ── Python Presets ──

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

  // ── Python equivalents of C++ presets ──

  kuksaWriterPython: {
    name: 'Signal Writer (Python)',
    appName: 'signal-writer-py',
    description: 'Writes Speed, SoC, AmbientTemp to KUKSA Databroker via kuksa-client',
    language: 'python' as const,
    python: `#!/usr/bin/env python3
"""
KUKSA Signal Writer (Python) for AosEdge.
Writes Speed, SoC, and AmbientTemp signals to KUKSA Databroker.
Uses kuksa-client VSSClient for gRPC communication.
"""
import time
import sys
import os
import math

VERSION = "1.0.0"

# kuksa-client may not be pre-installed; install with: pip install kuksa-client
try:
    from kuksa_client.grpc import VSSClient, Datapoint
except ImportError:
    print("[Writer] kuksa-client not found. Install: pip install kuksa-client", flush=True)
    sys.exit(1)

def main():
    target = os.environ.get("KUKSA_DATABROKER_ADDR", "172.17.0.1:55555")
    interval = int(os.environ.get("WRITE_INTERVAL", "2"))
    if len(sys.argv) > 1:
        target = sys.argv[1]
    if len(sys.argv) > 2:
        interval = int(sys.argv[2])

    host, port = target.rsplit(":", 1) if ":" in target else (target, "55555")

    print("=" * 50, flush=True)
    print("  KUKSA Signal Writer (Python)", flush=True)
    print(f"  Version:    {VERSION}", flush=True)
    print(f"  Databroker: {target}", flush=True)
    print(f"  Interval:   {interval}s", flush=True)
    print("=" * 50, flush=True)

    # Connect with retry
    client = VSSClient(host, int(port))
    for attempt in range(1, 16):
        try:
            client.connect()
            info = client.get_server_info()
            print(f"[Writer] Connected: {info.name} {info.version}", flush=True)
            break
        except Exception as e:
            if attempt == 15:
                print(f"[Writer] Unreachable: {target} — {e}", flush=True)
                sys.exit(1)
            print(f"[Writer] Waiting ({attempt}/15)...", flush=True)
            time.sleep(2)

    t = 0
    while True:
        speed = 40.0 + 30.0 * math.sin(t * 0.1)
        temp = 22.0 + 5.0 * math.sin(t * 0.05)
        soc = max(0.0, min(100.0, 80.0 - t * 0.01))

        try:
            client.set_current_values({
                "Vehicle.Speed": Datapoint(speed),
                "Vehicle.Cabin.HVAC.AmbientAirTemperature": Datapoint(temp),
                "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current": Datapoint(soc),
            })
        except Exception as e:
            print(f"[Writer] Set error: {e}", flush=True)

        if t % 5 == 0:
            print(f"[Writer] t={t} Speed={speed:.1f} Temp={temp:.1f} SoC={soc:.1f}", flush=True)

        t += 1
        time.sleep(interval)

if __name__ == "__main__":
    main()
`,
    yaml: `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
# Python service — architecture-independent
schemaVersion: 2

publisher:
  author: "developer@example.com"
  company: "Example Corp"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: service
      codename: "signal-writer-py"
      title: "Signal Writer (Python)"
      description: "Writes Speed, SoC, AmbientTemp to KUKSA Databroker via kuksa-client"
    version: "1.0.0"
    sourceFolder: "signal-writer-py"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: /usr/bin/python3 -u /main.py
      env:
        - "KUKSA_DATABROKER_ADDR=172.17.0.1:55556"
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 5000
        ramLimit: 512MiB
        storageLimit: 32MiB
        stateLimit: 1MiB
        tmpLimit: 256MiB`
  },

  kuksaReaderPython: {
    name: 'KUKSA Reader (Python)',
    appName: 'kuksa-reader-py',
    description: 'Subscribes to vehicle signals from KUKSA Databroker via kuksa-client',
    language: 'python' as const,
    python: `#!/usr/bin/env python3
"""
KUKSA Signal Reader (Python) for AosEdge.
Subscribes to Speed, SoC, and AmbientTemp from KUKSA Databroker.
Uses kuksa-client VSSClient subscribe() for streaming updates.
"""
import time
import sys
import os

VERSION = "1.0.0"

try:
    from kuksa_client.grpc import VSSClient, Datapoint
except ImportError:
    print("[Reader] kuksa-client not found. Install: pip install kuksa-client", flush=True)
    sys.exit(1)

SIGNALS = [
    "Vehicle.Speed",
    "Vehicle.Cabin.HVAC.AmbientAirTemperature",
    "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current",
]

def format_value(dp):
    """Extract a human-readable value from a Datapoint."""
    if dp is None:
        return "N/A"
    # Datapoint stores the value in .value attribute
    val = dp.value
    if isinstance(val, bool):
        return "true" if val else "false"
    return str(val)

def main():
    target = os.environ.get("KUKSA_DATABROKER_ADDR", "172.17.0.1:55555")
    if len(sys.argv) > 1:
        target = sys.argv[1]

    host, port = target.rsplit(":", 1) if ":" in target else (target, "55555")

    print("=" * 50, flush=True)
    print("  KUKSA Signal Reader (Python)", flush=True)
    print(f"  Version:    {VERSION}", flush=True)
    print(f"  Databroker: {target}", flush=True)
    print("=" * 50, flush=True)

    client = VSSClient(host, int(port))
    for attempt in range(1, 16):
        try:
            client.connect()
            info = client.get_server_info()
            print(f"[Reader] Connected: {info.name} {info.version}", flush=True)
            break
        except Exception as e:
            if attempt == 15:
                print(f"[Reader] Unreachable: {target} — {e}", flush=True)
                sys.exit(1)
            print(f"[Reader] Waiting ({attempt}/15)...", flush=True)
            time.sleep(2)

    print(f"[Reader] Subscribing to {len(SIGNALS)} signals...", flush=True)

    msg_count = 0
    while True:
        try:
            for updates in client.subscribe_current_values(SIGNALS):
                msg_count += 1
                parts = [f"[Reader] #{msg_count}:"]
                for update in updates:
                    parts.append(f" {update.entry.path}={format_value(update.entry.value)}")
                print("".join(parts), flush=True)
        except Exception as e:
            print(f"[Reader] Stream ended: {e}", flush=True)
            print("[Reader] Reconnecting in 5s...", flush=True)
            time.sleep(5)

if __name__ == "__main__":
    main()
`,
    yaml: `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
# Python service — architecture-independent
schemaVersion: 2

publisher:
  author: "developer@example.com"
  company: "Example Corp"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: service
      codename: "kuksa-reader-py"
      title: "KUKSA Reader (Python)"
      description: "Subscribes to vehicle signals from KUKSA Databroker via kuksa-client"
    version: "1.0.0"
    sourceFolder: "kuksa-reader-py"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: /usr/bin/python3 -u /main.py
      env:
        - "KUKSA_DATABROKER_ADDR=172.17.0.1:55555"
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 5000
        ramLimit: 512MiB
        storageLimit: 32MiB
        stateLimit: 1MiB
        tmpLimit: 256MiB`
  },

  evRangeExtenderPython: {
    name: 'EV Range Extender (Python)',
    appName: 'ev-range-extender-py',
    description: 'Battery management, range computation, power-saving mode control via kuksa-client',
    language: 'python' as const,
    python: `#!/usr/bin/env python3
"""
EV Range Extender (Python) for AosEdge.
Reads SoC and temperature from KUKSA Databroker, computes range,
and switches between NORMAL and POWER_SAVE modes.
"""
import time
import sys
import os
import math

VERSION = "1.0.0"
SOC_THRESHOLD = 20.0
NORMAL_EFFICIENCY = 5.5
DEGRADED_EFFICIENCY = 4.0

try:
    from kuksa_client.grpc import VSSClient, Datapoint
except ImportError:
    print("[RangeExt] kuksa-client not found. Install: pip install kuksa-client", flush=True)
    sys.exit(1)

SOC_PATH   = "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current"
TEMP_PATH  = "Vehicle.Cabin.HVAC.AmbientAirTemperature"
RANGE_PATH = "Vehicle.Powertrain.Range"
LIGHT_PATH = "Vehicle.Cabin.Lights.AmbientLight.Intensity"
SEAT_PATH  = "Vehicle.Cabin.Seat.Heating"

def get_float(client, path):
    try:
        entries = client.get_current_values([path])
        if entries:
            dp = entries[path]
            return float(dp.value) if dp.value is not None else -1.0
    except Exception:
        pass
    return -1.0

def main():
    target = os.environ.get("KUKSA_DATABROKER_ADDR", "172.17.0.1:55555")
    interval = int(os.environ.get("CHECK_INTERVAL", "2"))
    soc_threshold = float(os.environ.get("SOC_THRESHOLD", str(SOC_THRESHOLD)))
    if len(sys.argv) > 1:
        target = sys.argv[1]
    if len(sys.argv) > 2:
        interval = int(sys.argv[2])

    host, port = target.rsplit(":", 1) if ":" in target else (target, "55555")

    print("=" * 50, flush=True)
    print("  EV Range Extender (Python)", flush=True)
    print(f"  Version:       {VERSION}", flush=True)
    print(f"  Databroker:    {target}", flush=True)
    print(f"  Interval:      {interval}s", flush=True)
    print(f"  SoC threshold: {soc_threshold}%", flush=True)
    print("=" * 50, flush=True)

    client = VSSClient(host, int(port))
    for attempt in range(1, 16):
        try:
            client.connect()
            info = client.get_server_info()
            print(f"[RangeExt] Connected: {info.name} {info.version}", flush=True)
            break
        except Exception as e:
            if attempt == 15:
                print(f"[RangeExt] Unreachable: {target} — {e}", flush=True)
                sys.exit(1)
            print(f"[RangeExt] Waiting ({attempt}/15)...", flush=True)
            time.sleep(2)

    prev_mode = ""
    cycle = 0

    while True:
        cycle += 1

        soc = get_float(client, SOC_PATH)
        if soc < 0:
            soc = 50.0

        if soc < soc_threshold:
            mode = "POWER_SAVE"
            range_km = soc * DEGRADED_EFFICIENCY
            light_intensity = 30.0
            seat_heating = 0.0
        else:
            mode = "NORMAL"
            range_km = soc * NORMAL_EFFICIENCY
            light_intensity = 100.0
            seat_heating = 1.0

        try:
            client.set_current_values({
                RANGE_PATH: Datapoint(range_km),
                LIGHT_PATH: Datapoint(light_intensity),
                SEAT_PATH: Datapoint(seat_heating),
            })
        except Exception as e:
            print(f"[RangeExt] Set error: {e}", flush=True)

        if mode != prev_mode:
            print(f"[RangeExt] *** MODE CHANGE: {mode} ***", flush=True)
            prev_mode = mode

        if cycle % 5 == 1:
            temp = get_float(client, TEMP_PATH)
            temp_str = f"{int(temp)}C" if temp >= 0 else "N/A"
            print(f"[RangeExt] cycle={cycle} mode={mode} SoC={soc:.0f}% Temp={temp_str} Range={range_km:.0f}km Lights={light_intensity:.0f} SeatHeat={seat_heating:.0f}", flush=True)

        time.sleep(interval)

if __name__ == "__main__":
    main()
`,
    yaml: `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
# Python service — architecture-independent
schemaVersion: 2

publisher:
  author: "developer@example.com"
  company: "Example Corp"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: service
      codename: "ev-range-extender-py"
      title: "EV Range Extender (Python)"
      description: "Battery management, range computation, power-saving mode control"
    version: "1.0.0"
    sourceFolder: "ev-range-extender-py"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: /usr/bin/python3 -u /main.py
      env:
        - "KUKSA_DATABROKER_ADDR=172.17.0.1:55555"
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 5000
        ramLimit: 512MiB
        storageLimit: 32MiB
        stateLimit: 1MiB
        tmpLimit: 256MiB`
  },

  batteryEnergySaverPython: {
    name: 'Battery Energy Saver (Python)',
    appName: 'battery-energy-saver-py',
    description: 'Forces HVAC and seat heating off when SoC drops below thresholds via kuksa-client',
    language: 'python' as const,
    python: `#!/usr/bin/env python3
"""
Battery Energy Saver (Python) for AosEdge.
Subscribes to SoC and forces HVAC/seat heating off when battery is low.
Blocks re-activation while SoC remains below thresholds.
"""
import time
import sys
import os
import signal as sig_module

VERSION = "1.0.0"
DEFAULT_HVAC_OFF_THRESHOLD = 50.0
DEFAULT_SEAT_OFF_THRESHOLD = 30.0

try:
    from kuksa_client.grpc import VSSClient, Datapoint
except ImportError:
    print("[EnergySaver] kuksa-client not found. Install: pip install kuksa-client", flush=True)
    sys.exit(1)

RANGE_PATH     = "Vehicle.Powertrain.Range"
SOC_PATH       = "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current"
HVAC_PATH      = "Vehicle.Cabin.HVAC.IsAirConditioningActive"
SEAT_HEAT_PATH = "Vehicle.Cabin.Seat.Row1.DriverSide.Heating"

g_running = True

def signal_handler(signum, frame):
    global g_running
    g_running = False

def main():
    global g_running
    target = os.environ.get("KUKSA_DATABROKER_ADDR", "172.17.0.1:55555")
    hvac_threshold = float(os.environ.get("HVAC_OFF_THRESHOLD", str(DEFAULT_HVAC_OFF_THRESHOLD)))
    seat_threshold = float(os.environ.get("SEAT_OFF_THRESHOLD", str(DEFAULT_SEAT_OFF_THRESHOLD)))
    if len(sys.argv) > 1:
        target = sys.argv[1]
    if len(sys.argv) > 2:
        hvac_threshold = float(sys.argv[2])
    if len(sys.argv) > 3:
        seat_threshold = float(sys.argv[3])

    sig_module.signal(sig_module.SIGINT, signal_handler)
    sig_module.signal(sig_module.SIGTERM, signal_handler)

    host, port = target.rsplit(":", 1) if ":" in target else (target, "55555")

    print("=" * 60, flush=True)
    print("  Battery Energy Saver (Python)", flush=True)
    print(f"  Version:         {VERSION}", flush=True)
    print(f"  Databroker:      {target}", flush=True)
    print(f"  HVAC off below:  {hvac_threshold}%", flush=True)
    print(f"  Seat off below:  {seat_threshold}%", flush=True)
    print("=" * 60, flush=True)

    client = VSSClient(host, int(port))
    for attempt in range(1, 16):
        try:
            client.connect()
            info = client.get_server_info()
            print(f"[EnergySaver] Connected: {info.name} {info.version}", flush=True)
            break
        except Exception as e:
            if attempt == 15:
                print(f"[EnergySaver] Unreachable: {target} — {e}", flush=True)
                sys.exit(1)
            print(f"[EnergySaver] Waiting ({attempt}/15)...", flush=True)
            time.sleep(2)

    print("[EnergySaver] Subscribing to signals...", flush=True)

    soc = 100.0
    vehicle_range = 0.0
    hvac_cut = False
    seat_cut = False

    while g_running:
        try:
            for updates in client.subscribe_current_values([
                RANGE_PATH, SOC_PATH, HVAC_PATH, SEAT_HEAT_PATH
            ]):
                if not g_running:
                    break

                for update in updates:
                    path = update.entry.path
                    dp = update.entry.value

                    if path == RANGE_PATH:
                        vehicle_range = float(dp.value) if dp.value is not None else 0.0
                    elif path == SOC_PATH:
                        soc = float(dp.value) if dp.value is not None else 100.0
                        print(f"Charge: {soc:.0f}% | Range: {vehicle_range:.0f}", flush=True)

                        if soc < hvac_threshold and not hvac_cut:
                            print(f"[!] SoC={soc:.0f}% < {hvac_threshold:.0f}%  ->  Turning HVAC off", flush=True)
                            client.set_target_values({HVAC_PATH: Datapoint(False)})
                            hvac_cut = True
                        elif soc >= hvac_threshold and hvac_cut:
                            print(f"[+] SoC={soc:.0f}%  ->  HVAC restriction lifted", flush=True)
                            hvac_cut = False

                        if soc < seat_threshold and not seat_cut:
                            print(f"[!] SoC={soc:.0f}% < {seat_threshold:.0f}%  ->  Turning Seat Heating off", flush=True)
                            client.set_target_values({SEAT_HEAT_PATH: Datapoint(0)})
                            seat_cut = True
                        elif soc >= seat_threshold and seat_cut:
                            print(f"[+] SoC={soc:.0f}%  ->  Seat restriction lifted", flush=True)
                            seat_cut = False

                    elif path == HVAC_PATH and hvac_cut:
                        val = dp.value
                        if val is not None and bool(val):
                            print("[!] Battery low  ->  blocking HVAC re-activation", flush=True)
                            client.set_target_values({HVAC_PATH: Datapoint(False)})

                    elif path == SEAT_HEAT_PATH and seat_cut:
                        val = dp.value
                        if val is not None and int(val) != 0:
                            print("[!] Battery low  ->  blocking Seat Heating re-activation", flush=True)
                            client.set_target_values({SEAT_HEAT_PATH: Datapoint(0)})

        except Exception as e:
            if not g_running:
                break
            print(f"[EnergySaver] Stream ended: {e}", flush=True)
            print("[EnergySaver] Reconnecting in 5s...", flush=True)
            time.sleep(5)

    print("Battery Energy Saver: shutdown, no signal reset needed.", flush=True)

if __name__ == "__main__":
    main()
`,
    yaml: `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
# Python service — architecture-independent
schemaVersion: 2

publisher:
  author: "developer@example.com"
  company: "Example Corp"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: service
      codename: "battery-energy-saver-py"
      title: "Battery Energy Saver (Python)"
      description: "Forces HVAC and seat heating off when SoC drops below thresholds"
    version: "1.0.0"
    sourceFolder: "battery-energy-saver-py"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: /usr/bin/python3 -u /main.py
      env:
        - "KUKSA_DATABROKER_ADDR=172.17.0.1:55555"
        - "HVAC_OFF_THRESHOLD=50.0"
        - "SEAT_OFF_THRESHOLD=30.0"
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 5000
        ramLimit: 512MiB
        storageLimit: 32MiB
        stateLimit: 1MiB
        tmpLimit: 256MiB`
  },

  signalReporterPython: {
    name: 'Signal Reporter (Python)',
    appName: 'signal-reporter-py',
    description: 'Subscribes to 9 vehicle signals and relays to dashboard via HTTP',
    language: 'python' as const,
    python: `#!/usr/bin/env python3
"""
Signal Reporter (Python) for AosEdge.
Subscribes to 9 vehicle signals from KUKSA Databroker and relays
them as JSON to a dashboard HTTP endpoint.
"""
import time
import sys
import os
import json
import urllib.request

VERSION = "1.0.0"

try:
    from kuksa_client.grpc import VSSClient, Datapoint
except ImportError:
    print("[Reporter] kuksa-client not found. Install: pip install kuksa-client", flush=True)
    sys.exit(1)

SIGNALS = [
    "Vehicle.Speed",
    "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current",
    "Vehicle.Powertrain.Range",
    "Vehicle.Cabin.HVAC.AmbientAirTemperature",
    "Vehicle.Cabin.HVAC.TargetTemperature",
    "Vehicle.Cabin.Lights.AmbientLight.Intensity",
    "Vehicle.Cabin.Seat.Heating",
    "Vehicle.Cabin.Seat.VentilationLevel",
    "Vehicle.Infotainment.Display.Brightness",
]

def http_post(url, body):
    """Send a JSON POST request. Returns True on success."""
    try:
        data = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=2)
        return True
    except Exception:
        return False

def main():
    kuksa_target = os.environ.get("KUKSA_DATABROKER_ADDR", "172.17.0.1:55555")
    relay_url = os.environ.get("SIGNAL_RELAY_URL", "http://172.17.0.1:9100/signal")
    if len(sys.argv) > 1:
        kuksa_target = sys.argv[1]
    if len(sys.argv) > 2:
        relay_url = sys.argv[2]

    host, port = kuksa_target.rsplit(":", 1) if ":" in kuksa_target else (kuksa_target, "55555")

    print("=" * 50, flush=True)
    print("  Signal Reporter (Python)", flush=True)
    print(f"  Version:    {VERSION}", flush=True)
    print(f"  Databroker: {kuksa_target}", flush=True)
    print(f"  Relay:      {relay_url}", flush=True)
    print("=" * 50, flush=True)

    client = VSSClient(host, int(port))
    for attempt in range(1, 16):
        try:
            client.connect()
            info = client.get_server_info()
            print(f"[Reporter] Connected: {info.name} {info.version}", flush=True)
            break
        except Exception as e:
            if attempt == 15:
                print(f"[Reporter] Unreachable: {kuksa_target} — {e}", flush=True)
                sys.exit(1)
            print(f"[Reporter] Waiting ({attempt}/15)...", flush=True)
            time.sleep(2)

    print(f"[Reporter] Subscribing to {len(SIGNALS)} signals...", flush=True)

    msg_count = 0
    post_ok = 0
    post_fail = 0

    while True:
        try:
            for updates in client.subscribe_current_values(SIGNALS):
                msg_count += 1

                for update in updates:
                    path = update.entry.path
                    dp = update.entry.value
                    val = dp.value if dp is not None else None

                    payload = {
                        "signal": path,
                        "value": val,
                        "ts": int(time.time() * 1000),
                    }

                    if http_post(relay_url, payload):
                        post_ok += 1
                    else:
                        post_fail += 1

                if msg_count % 50 == 0:
                    print(f"[Reporter] msgs={msg_count} posted={post_ok} failed={post_fail}", flush=True)

        except Exception as e:
            print(f"[Reporter] Stream ended: {e}", flush=True)
            print("[Reporter] Reconnecting in 5s...", flush=True)
            time.sleep(5)

if __name__ == "__main__":
    main()
`,
    yaml: `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
# Python service — architecture-independent
schemaVersion: 2

publisher:
  author: "developer@example.com"
  company: "Example Corp"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: service
      codename: "signal-reporter-py"
      title: "Signal Reporter (Python)"
      description: "Subscribes to 9 vehicle signals and relays to dashboard via HTTP"
    version: "1.0.0"
    sourceFolder: "signal-reporter-py"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: /usr/bin/python3 -u /main.py
      env:
        - "KUKSA_DATABROKER_ADDR=172.17.0.1:55555"
        - "SIGNAL_RELAY_URL=http://172.17.0.1:9100/signal"
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 5000
        ramLimit: 512MiB
        storageLimit: 32MiB
        stateLimit: 1MiB
        tmpLimit: 256MiB`
  }
}
