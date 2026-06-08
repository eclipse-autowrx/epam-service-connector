# KUKSA Vehicle Signal Test Environment

Local setup for testing vehicle signal apps against [Eclipse KUKSA Databroker](https://github.com/eclipse-kuksa/kuksa-databroker) before deploying to AosEdge.

Two modes are available:

| Mode | Script | What it runs | Best for |
|------|--------|-------------|----------|
| **Standalone** | `start-kuksa.sh` | KUKSA Databroker + Bridge + Feeder | Minimal setup, custom signal simulation |
| **SDV Runtime** | `start-sdv-runtime.sh` | [eclipse-autowrx/sdv-runtime](https://github.com/eclipse-autowrx/sdv-runtime) + Bridge | Full SDV stack with playground.digital.auto integration |

## Architecture

```
C++ Vehicle App (on edge device)
    │
    │  HTTP (port 8888)
    ▼
REST Bridge (bridge.py)
    │
    │  gRPC (port 55555)
    ▼
┌──────────────────────────────────────────────┐
│  Mode A: KUKSA Databroker (standalone)       │
│  OR                                          │
│  Mode B: SDV Runtime (all-in-one)            │
│    KUKSA Databroker + VSS 4.0 + Mock Provider│
│    + Kit Manager + Velocitas SDK             │
│    + playground.digital.auto connection      │
└──────────────────────────────────────────────┘
```

The **REST Bridge** translates simple HTTP GET/POST requests into KUKSA gRPC calls, so the C++ app can read vehicle signals without linking gRPC or protobuf libraries.

## Quick Start — Standalone Mode

```bash
# Start KUKSA Databroker + Bridge + Signal Feeder
./start-kuksa.sh

# Test
curl http://localhost:8888/api/v1/signals/Vehicle.Speed

# Stop
./stop-kuksa.sh
```

## Quick Start — SDV Runtime Mode

Uses the [eclipse-autowrx/sdv-runtime](https://github.com/eclipse-autowrx/sdv-runtime) all-in-one container which includes KUKSA Databroker 0.4.4, VSS 4.0, Mock Provider, Kit Manager, and connects to [playground.digital.auto](https://playground.digital.auto) automatically.

```bash
# Start SDV Runtime + Bridge (provide a runtime name for playground)
./start-sdv-runtime.sh MyRuntimeName

# Test
curl http://localhost:8888/api/v1/signals/Vehicle.Speed

# Stop
./stop-sdv-runtime.sh
```

After starting, your runtime appears on [playground.digital.auto](https://playground.digital.auto) as `MyRuntimeName`, where you can interact with vehicle signals from the browser.

### SDV Runtime Components

| Component | Version |
|-----------|---------|
| KUKSA Databroker | 0.4.4 |
| Vehicle Signal Specification | 4.0 |
| Kuksa Mock Provider | Built-in (auto-feeds signals) |
| Kit Manager | Built-in |
| Velocitas Python SDK | 0.14.1 |
| Python | 3.10 |

## Prerequisites

- Docker (for KUKSA Databroker or SDV Runtime container)
- Python 3 with pip (for bridge and feeder)
- `kuksa-client` pip package (installed automatically by start scripts)

## REST Bridge API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/signals/{vss-path}` | Read a signal value |
| POST | `/api/v1/signals/{vss-path}` | Set a signal value (body: `{"value": …}`) |

### Example responses

```json
// GET /api/v1/signals/Vehicle.Speed
{"path": "Vehicle.Speed", "value": "52.3", "timestamp": "2026-04-09T..."}

// GET /api/v1/health
{"status": "ok", "kuksa": "127.0.0.1:55555"}
```

## Simulated Signals

The feeder generates realistic test data for:

| Signal | Range | Unit |
|--------|-------|------|
| `Vehicle.Speed` | 10–70 | km/h |
| `Vehicle.Cabin.HVAC.AmbientAirTemperature` | 17–27 | °C |
| `Vehicle.Powertrain.TractionBattery.StateOfCharge.Current` | 0–100 | % |

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `KUKSA_DATABROKER_HOST` | `127.0.0.1` | Databroker host |
| `KUKSA_DATABROKER_PORT` | `55555` | Databroker gRPC port |
| `BRIDGE_PORT` | `8888` | REST bridge listen port |

## Running Components Individually

```bash
# Databroker only
docker run -it --rm --network host \
  ghcr.io/eclipse-kuksa/kuksa-databroker:latest --insecure

# Bridge only
pip install kuksa-client
python3 bridge.py

# Feeder only
python3 feeder.py
```

## Deploying to AosEdge (RPi 5)

### 1. Set the bridge host IP

Before building, update `DEFAULT_HOST` in the C++ code (via the standalone web UI preset editor) to the IP of the machine running the bridge, reachable from the RPi:

```cpp
static const char* DEFAULT_HOST = "10.0.0.1";  // your dev machine's IP
```

### 2. Open the firewall

The dev machine's firewall must allow incoming connections on port 8888:

```bash
sudo iptables -I INPUT -p tcp --dport 8888 -j ACCEPT
```

### 3. Build & deploy

Use the standalone web UI (`http://localhost:3011/standalone.html`):
1. Select **KUKSA Vehicle App** from the preset dropdown
2. Set the version in `config.yaml` (e.g., `1.3.0`)
3. Click **Build & Deploy**

### 4. Verify the app is running

SSH into the RPi and list running containers:

```bash
ssh pi@10.0.0.100

# List containers
sudo crun list
```

Expected output:

```
NAME                                 PID   STATUS   BUNDLE PATH          CREATED                     OWNER
5dbefe29-14f3-43ae-b1f8-6b6f9ab41966 1452  running  /run/aos/runtime/... 2026-04-10T02:55:06.949Z    root
```

### 5. View the app output

The app's stdout goes to a socket managed by the AOS service manager, not to syslog. Use `crun exec` to see live output:

```bash
# Run a second instance inside the container for 15 seconds
sudo timeout 15 crun exec <container-id> /kuksa-vehicle-app 10.0.0.1 8888 3
```

Expected output:

```
========================================
  KUKSA Vehicle Signal App
  Version:  1.2.12
  Bridge:   10.0.0.1:8888
  Interval: 3s
  Deployed via aos-edge-toolchain!
========================================
[KUKSA] Bridge connected

--- Cycle 1 ---
  Vehicle.Speed = 26.5
  Vehicle.Cabin.HVAC.AmbientAirTemperature = 24.0
  Vehicle.Powertrain.TractionBattery.StateOfCharge.Current = 78.2

--- Cycle 2 ---
  Vehicle.Speed = 21.4
  Vehicle.Cabin.HVAC.AmbientAirTemperature = 23.5
  Vehicle.Powertrain.TractionBattery.StateOfCharge.Current = 77.8
```

### 6. Quick signal check (without running the full app)

```bash
# Test bridge connectivity from inside the container
sudo crun exec <container-id> wget -q -O - http://10.0.0.1:8888/api/v1/signals/Vehicle.Speed
```

Expected:

```json
{"path": "Vehicle.Speed", "value": "51.5", "timestamp": "2026-04-10T02:20:43.809Z"}
```

### 7. Check from the RPi host (outside the container)

```bash
wget -q -O - http://10.0.0.1:8888/api/v1/signals/Vehicle.Speed
```

If the host can reach the bridge but `(unavailable)` shows in the app, the container's network namespace may not have access — check CNI bridge setup.

### 8. One-liner from your dev machine

```bash
ssh pi@<DEVICE_IP> \
  "sudo timeout 15 crun exec \$(sudo crun list -q) /kuksa-vehicle-app <BRIDGE_HOST> 8888 3 2>&1"
```

## Troubleshooting

See [TROUBLESHOOTING.md](../TROUBLESHOOTING.md) for common issues including clock resets, CNI plugin failures, firewall rules, and serial console tips.
