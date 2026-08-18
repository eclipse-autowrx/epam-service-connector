# AOS Cloud Deployment Plugin

Web UI for building and deploying Python applications to AOS edge devices via
[Eclipse AosEdge](https://docs.aosedge.tech).

Runs in two modes:
- **Standalone** — runs in any browser for local development
- **Plugin** — embedded inside the [digital.auto](https://digitalauto.tech) platform

## End-to-End Quick Start

This gets you from zero to a deployed service on an AosEdge VM.

### Prerequisites

- Docker installed
- AosEdge VM running, provisioned, and online on AosCloud
- SP certificate at `~/.aos/security/aos-user-sp.p12`
- AosCloud setup: service created, subject with service assigned to unit,
  unit in a validation unit-set

### 1. Build the Docker image

```bash
cd aos-edge-toolchain
docker build -t aos-edge-toolchain:latest .
```

### 2. Start the Orchestrator

The orchestrator manages per-user worker containers automatically. Each user
gets a dedicated build environment when they upload their .p12 certificate.

```bash
docker run -d --network host --restart unless-stopped \
  --name aos-orchestrator \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(pwd)/scripts/:/usr/local/bin/:ro \
  -e INSTANCE_ID=AET-ORCHESTRATOR \
  -e INSTANCE_NAME="AOS Edge Toolchain" \
  -e KIT_MANAGER_URL=https://kit.digitalauto.tech \
  -e SIGNAL_RELAY_PORT=9100 \
  -e MAX_WORKERS=5 \
  -e IDLE_TIMEOUT_MINUTES=30 \
  -e AOSCLOUD_URL=https://aoscloud.io:10000 \
  -e NODE_TLS_REJECT_UNAUTHORIZED=0 \
  --entrypoint sh \
  aos-edge-toolchain:latest \
  -c 'unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY && exec node /usr/local/bin/aos-orchestrator.js'
```

Verify it connects:

```bash
docker logs aos-orchestrator
# Should show: [Orchestrator] Connected to Kit Manager
```

### 3. Build and serve the standalone UI

```bash
cd aos-cloud-deployment
npm install
npm run standalone:dev
```

### 4. Open and deploy

1. Open **http://localhost:3011/standalone-python.html**
2. Upload your `.p12` certificate — the orchestrator auto-creates a dedicated worker
3. Pick a preset:
   - **Hello Python** — simple test app
   - **KUKSA Writer Python** — writes simulated vehicle signals
   - **KUKSA Reader Python** — subscribes to signals
4. Click **Build & Deploy**

The toolchain signs with your certificate, uploads to AosCloud, and the
VM automatically pulls and runs the new version.

---

## How It Works

```
Browser (standalone-python.html)
   │  Socket.IO
   ▼
Kit Manager (kit.digitalauto.tech)
   │  Socket.IO
   ▼
aos-orchestrator.js (Docker container)        ← single entry point
   │
   ├── Extracts CN from uploaded .p12
   ├── Creates per-user worker container
   ├── Routes commands to correct worker
   └── Auto-stops idle workers (30 min timeout)
        │
        ▼
   Worker container (per user, auto-created)
   ├── Dedicated cert storage (Docker volume)
   ├── Isolated build workspace
   ├── Signs with aos-signer (user's certificate)
   └── Uploads to AosCloud
          │  AMQP
          ▼
       AosEdge VM (crun container)
```

### Multi-Tenant Isolation

Each user who uploads a .p12 certificate gets their own **worker container**:
- **Dedicated certificate** — stored in a per-container Docker volume
- **Isolated workspace** — builds never collide between users
- **Auto-cleanup** — idle workers are stopped after 30 minutes, freeing resources
- **Resource limits** — configurable `MAX_WORKERS` prevents overloading the VM

### Architecture auto-detection

Python services are architecture-independent (`arch: any`). The broadcaster
generates the correct `config.yaml` with `src_any` source folder.

---

## Presets

| Preset | Description |
|---|---|
| **Hello Python** | Simple Python app that prints a message every 10s |
| **KUKSA Writer Python** | Writes simulated Speed, Temp, SoC signals every 2s |
| **KUKSA Reader Python** | Subscribes to signals and prints received updates |
| **EV Range Extender Python** | Range extension logic |
| **Battery Energy Saver Python** | HVAC/seat cutoff energy saving logic |
| **Signal Reporter Python** | Reports vehicle signals to external endpoint |

---

## Certificate Setup

A `.p12` SP certificate is required for signing and uploading services.

| Method | How |
|---|---|
| **UI upload** | Use the Certificate step in the Setup panel (recommended) |
| **Local file** | Mount with `-v` and set `CERT_FILE` (for worker containers) |
| **Azure Key Vault** | Set `AZURE_KEY_VAULT_NAME` env var |

With the orchestrator, each user uploads their own .p12 via the UI. The
orchestrator extracts the CN, creates a dedicated worker, and stores the
cert in an isolated Docker volume. No more cert collisions between users.

An **OEM certificate** (`aos-user-oem.p12`) is required in addition to the SP
certificate for the **AosEdge Setup** automation button below — AosCloud
rejects unit-config/unit-set/subject writes from an SP-only identity with
`403 Forbidden`.

---

## AosEdge Setup Automation

The **AosEdge Setup** card (below the Units list) runs the same provisioning
sequence as the `aos-automation.py` script in
`eclipse-sdv-blueprint/Aosedge-Automation/`, natively in the toolchain backend
(no Python process is invoked):

1. Update the target unit's config from the bundled `unitconfig.json` template and verify it
2. Create the unit set (`ev-range-extender-unitset`) if it doesn't exist
3. Assign the selected unit to that unit set
4. Create the subject (`ev-range-extender-subject`) if it doesn't exist
5. Assign the unit to the subject
6. Assign the required services (by codename) to the subject

Steps are idempotent — re-running after a partial success treats "already
exists/assigned" responses as success, same as the Python script. Select a
unit from the Units list first (the button stays disabled until one is
selected), then upload your **OEM certificate** and click **Run AosEdge
Setup**. Progress and the final Playground dashboard link appear inline.

---

## Orchestrator Environment Variables

| Variable | Default | Description |
|---|---|---|
| `INSTANCE_ID` | `AET-ORCHESTRATOR` | Instance ID registered with Kit Manager |
| `INSTANCE_NAME` | `AOS Edge Toolchain` | Display name |
| `KIT_MANAGER_URL` | `https://kit.digitalauto.tech` | Kit Manager WebSocket URL |
| `SIGNAL_RELAY_PORT` | `9100` | HTTP + Socket.IO port for signal relay |
| `MAX_WORKERS` | `5` | Maximum concurrent worker containers |
| `IDLE_TIMEOUT_MINUTES` | `30` | Minutes before idle worker is stopped |
| `WORKER_PORT_START` | `9101` | First port in worker port pool |
| `WORKER_PORT_END` | `9199` | Last port in worker port pool |
| `WORKER_IMAGE` | `aos-edge-toolchain:latest` | Docker image for worker containers |
| `AOSCLOUD_URL` | `https://aoscloud.io:10000` | AosCloud API URL |
| `NODE_TLS_REJECT_UNAUTHORIZED` | `1` | Set to `0` for corporate proxy TLS interception |

## Worker Environment Variables

| Variable | Default | Description |
|---|---|---|
| `WORKER_MODE` | `true` | Enables worker mode (HTTP endpoint, no Kit Manager) |
| `INSTANCE_ID` | Auto-generated | Unique worker instance ID |
| `SIGNAL_RELAY_PORT` | Auto-allocated | Port for signal relay and HTTP API |
| `ORCHESTRATOR_URL` | `http://127.0.0.1:9100` | Orchestrator heartbeat URL |
| `AOSCLOUD_URL` | `https://aoscloud.io:10000` | AosCloud API URL |

---

## npm Scripts

| Script | Description |
|---|---|
| `npm run build` | Build plugin for digital.auto (`index.js`, React external) |
| `npm run standalone` | Build standalone Python (`standalone_python.js`, React bundled) |
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
│   ├── index.ts                  # Plugin entry (window.DAPlugins)
│   ├── standalone-python.ts      # Standalone entry (bundles React, Python-only)
│   ├── setup-react.ts            # Sets globalThis.React
│   ├── components/
│   │   └── Page.tsx              # Main UI component
│   ├── services/
│   │   └── aos.service.ts        # Socket.IO client
│   ├── types/
│   │   └── index.ts              # TypeScript types
│   └── presets/
│       └── index.ts              # Python presets
├── standalone-python.html
├── build.sh
├── package.json
└── tsconfig.json

aos-edge-toolchain/
├── scripts/
│   ├── aos-orchestrator.js       # Multi-tenant orchestrator
│   ├── aos-broadcaster.js        # Build service (standalone + worker mode)
│   ├── aos-toolkit.sh            # CLI build pipeline
│   └── init-certs.py             # Certificate initialization
├── Dockerfile
└── README.md
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Orchestrator shows `xhr poll error` | Add `-e NODE_TLS_REJECT_UNAUTHORIZED=0` (corporate proxy) |
| Build succeeds, upload fails | Check SP certificate is valid and not expired |
| "No certificate uploaded" error | Upload your .p12 via the Setup panel first |
| Worker not created | Check `MAX_WORKERS` limit; check Docker socket is mounted |
| Service shows "Key has expired" on VM | Set `setenforce 0` on the VM (SELinux) |
| VM unit is Offline on AosCloud | Fix DNS on the VM (see VM Notes above) |
| No connection in UI | Check orchestrator logs; verify Kit Manager URL |
| Double scrollbar in editor | Fixed — only the textarea scrolls |
