# AOS Cloud Deployment Plugin

Web UI for building and deploying C++ applications to AOS edge devices via
[Eclipse AosEdge](https://docs.aosedge.tech).

Runs in two modes:
- **Standalone** — runs in any browser for local development
- **Plugin** — embedded inside the [digital.auto](https://digitalauto.tech) platform

## End-to-End Quick Start

This gets you from zero to a deployed service on an AosEdge VM.

### Prerequisites

- Docker installed
- AosEdge VM running, provisioned, and online on AosCloud
  (see [docs/AOSEDGE-VM-SETUP.md](../docs/AOSEDGE-VM-SETUP.md))
- SP certificate at `~/.aos/security/aos-user-sp.p12`
- AosCloud setup: service created, subject with service assigned to unit,
  unit in a validation unit-set

### 1. Build the Docker image

```bash
cd aos-edge-toolchain
docker build -t aos-edge-toolchain:latest .
```

### 2. Start the broadcaster

```bash
docker run -d --network host \
  -e INSTANCE_ID=AET-TOOLCHAIN-001 \
  -e INSTANCE_NAME="AOS Edge Toolchain" \
  -e KIT_MANAGER_URL=https://kit.digitalauto.tech \
  -e CERT_FILE=/certs/aos-user-sp.p12 \
  -e AOSCLOUD_URL=https://aoscloud.io:10000 \
  -v ~/.aos/security/aos-user-sp.p12:/certs/aos-user-sp.p12:ro \
  --name aos-broadcaster \
  --entrypoint "node" \
  aos-edge-toolchain:latest /usr/local/bin/aos-broadcaster.js
```

Verify it connects:

```bash
docker logs aos-broadcaster
# Should show: [Broadcaster] Connected to Kit Manager
```

### 3. Build and serve the standalone UI

```bash
cd aos-cloud-deployment
npm install
npm run standalone
python3 -m http.server 3011
```

### 4. Open and deploy

1. Open **http://localhost:3011/standalone.html**
2. Select **AET-TOOLCHAIN-001** from Docker Instances
3. Pick a preset:
   - **Hello AOS** — simple test app
   - **KUKSA Writer** — writes simulated vehicle signals via gRPC `Set()`
   - **KUKSA Reader** — subscribes to signals via gRPC `Subscribe()` streaming
4. Click **Build & Deploy**

The toolchain compiles for the target architecture (auto-detected from
`config.yaml`), signs with your SP certificate, uploads to AosCloud, and the
VM automatically pulls and runs the new version.

### 5. Two-app communication demo

Deploy both Writer and Reader to see them communicate through the databroker:

1. Select **KUKSA Writer** preset → set version → **Build & Deploy**
2. Select **KUKSA Reader** preset → set version → **Build & Deploy**
3. Both apps run in separate crun containers on the same VM
4. Writer writes signals every 2s, Reader receives them instantly via streaming

### 6. Verify on the VM

```bash
# See both Writer and Reader interleaved
sshpass -p 'Password1' ssh -p <SSH_PORT> root@localhost \
  "journalctl -f | grep -E 'Writer|Reader'"
```

Expected output showing cause → effect:

```
crun[1578]: [Writer] t=160 Speed=31.36 Temp=26.95 SoC=78.4
crun[1596]: [Reader] #479: Vehicle.Speed=31.362900
crun[1596]: [Reader] #480: Vehicle.Cabin.HVAC.AmbientAirTemperature=26.946791
crun[1596]: [Reader] #481: Vehicle.Powertrain.TractionBattery.StateOfCharge.Current=78.400002
```

---

## How It Works

```
Browser (standalone.html)
   │  Socket.IO
   ▼
Kit Manager (kit.digitalauto.tech)
   │  Socket.IO
   ▼
aos-broadcaster.js (Docker container)
   ├── Detects target arch from config.yaml (x86_64 / aarch64)
   ├── Compiles C++ with g++ or aarch64-linux-gnu-g++
   ├── For gRPC apps: generates proto stubs, bundles shared libs + ld-linux
   ├── Signs with aos-signer (uses SP certificate)
   └── Uploads to AosCloud
          │  AMQP
          ▼
       AosEdge VM (crun container)
```

### Architecture auto-detection

The broadcaster reads the `arch` field from `config.yaml`:

| `arch` value | Compiler used | Notes |
|---|---|---|
| `x86_64` or `amd64` | Native `g++` | For AosEdge VMs |
| `aarch64` or `arm64` | `aarch64-linux-gnu-g++` | For RPi5 / ARM devices |
| _(not set)_ | Matches host architecture | |

### Dynamic library bundling

gRPC apps can't be statically linked easily. When the broadcaster detects a
dynamically linked binary, it automatically:

1. Copies all shared libraries (`ldd` output) into `src/libs/`
2. Copies the dynamic linker (`ld-linux-x86-64.so.2`) into `src/libs/`
3. Creates a wrapper script that invokes the bundled `ld-linux` with
   `--library-path`, making the binary fully self-contained
4. Packages everything into the service archive

This is required because AosCore runs services inside `crun` containers with
a minimal rootfs that has no shared libraries.

---

## Presets

| Preset | Service | Description |
|---|---|---|
| **Hello AOS** | `digital-auto-aos-service1` | Simple static C++ app that prints a message every 10s |
| **KUKSA Writer** | `kuksa-signal-writer` | Writes simulated Speed, Temp, SoC signals via gRPC `Set()` every 2s |
| **KUKSA Reader** | `kuksa-signal-reader` | Subscribes to signals via gRPC `Subscribe()` streaming, prints received updates |

Writer and Reader use separate AosCloud services so both run simultaneously
in separate crun containers, communicating through the shared KUKSA Databroker.

---

## Certificate Setup

A `.p12` SP certificate is required for signing and uploading services.

| Method | How |
|---|---|
| **Local file** | Mount with `-v` and set `CERT_FILE` (recommended) |
| **UI upload** | Use the Certificate panel in the standalone UI |
| **Azure Key Vault** | Set `AZURE_KEY_VAULT_NAME` env var |

---

## Docker Environment Variables

| Variable | Default | Description |
|---|---|---|
| `INSTANCE_ID` | Auto-generated | Instance ID shown in the UI (e.g. `AET-TOOLCHAIN-001`) |
| `INSTANCE_NAME` | `AOS Edge Toolchain` | Display name |
| `KIT_MANAGER_URL` | `https://kit.digitalauto.tech` | Kit Manager WebSocket URL |
| `BROADCAST_INTERVAL` | `30000` | Heartbeat interval (ms) |
| `CERT_FILE` | _(unset)_ | Path to mounted `.p12` certificate |
| `AOSCLOUD_URL` | `https://aoscloud.io:10000` | AosCloud API URL |
| `AZURE_KEY_VAULT_NAME` | _(unset)_ | Azure Key Vault name (production) |
| `NODE_TLS_REJECT_UNAUTHORIZED` | `1` | Set to `0` for corporate proxy TLS interception |

---

## npm Scripts

| Script | Description |
|---|---|
| `npm run build` | Build plugin for digital.auto (`index.js`, React external) |
| `npm run standalone` | Build standalone (`standalone.js`, React bundled) |
| `npm run standalone:dev` | Dev server with watch at `http://localhost:3011` |

---

## AosEdge VM Notes

### SELinux

AosCore VMs ship with SELinux in Enforcing mode, which blocks `crun` from
running unsigned service binaries. Set it to Permissive on the VM:

```bash
ssh root@VM "setenforce 0"
```

### DNS

VirtualBox NAT Network DNS often fails. Fix by adding public DNS:

```bash
ssh root@VM "mount -o remount,rw / && \
  mkdir -p /etc/systemd/resolved.conf.d && \
  printf '[Resolve]\nDNS=8.8.8.8 1.1.1.1\n' > /etc/systemd/resolved.conf.d/public-dns.conf && \
  systemctl restart systemd-resolved"
```

### Container networking

Services run inside `crun` containers with isolated networking. To reach
services on the host (like KUKSA Databroker), use the IP from the AosCore
resource config, not `localhost`. The VM's unit config maps the `kuksa`
resource host to `Server` in the container's `/etc/hosts`.

---

## File Structure

```
aos-cloud-deployment/
├── src/
│   ├── index.ts              # Plugin entry (window.DAPlugins)
│   ├── standalone.ts         # Standalone entry (bundles React)
│   ├── setup-react.ts        # Sets globalThis.React
│   ├── components/
│   │   └── Page.tsx          # Main UI component
│   ├── services/
│   │   └── aos.service.ts    # Socket.IO client
│   ├── types/
│   │   └── index.ts          # TypeScript types
│   └── presets/
│       ├── index.ts          # Hello AOS + KUKSA Writer + KUKSA Reader presets
│       ├── config.yaml       # Example config
│       └── hello-aos.cpp     # Example source
├── standalone.html
├── build.sh
├── package.json
└── tsconfig.json
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Broadcaster shows `xhr poll error` | Add `-e NODE_TLS_REJECT_UNAUTHORIZED=0` (corporate proxy) |
| Build succeeds, upload fails | Check SP certificate is mounted and valid |
| Service shows "Key has expired" on VM | Set `setenforce 0` on the VM (SELinux) |
| Reader shows `N/A` values | Writer not deployed yet, or databroker not running |
| gRPC app says "Connection refused" | Start databroker: `ssh root@VM "/usr/bin/databroker --insecure --port 55556 --address 0.0.0.0 --vss /usr/share/vss/vss.json &"` |
| Only one app runs, not both | Each app needs a separate AosCloud service UUID. Both services must be in the subject |
| gRPC app says "required file not found" | Dynamic libs not bundled — rebuild Docker image to include `libgrpc++-dev` |
| VM unit is Offline on AosCloud | Fix DNS on the VM (see VM Notes above) |
| No Docker instances in UI | Check broadcaster logs; verify Kit Manager URL |
