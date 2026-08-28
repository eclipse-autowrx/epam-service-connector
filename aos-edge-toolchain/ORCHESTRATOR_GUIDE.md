# AOS Edge Toolchain — Orchestrator Guide

> **Audience**: Developers who need to run the AOS Edge Toolchain orchestrator locally with a specific orchestrator ID, and adapt the AOS Cloud Deployment UI to connect to that orchestrator.

---

## Table of Contents

1. [What Is the Orchestrator?](#1-what-is-the-orchestrator)
2. [Architecture](#2-architecture)
3. [Prerequisites](#3-prerequisites)
4. [Running the Orchestrator Locally](#4-running-the-orchestrator-locally)
5. [Orchestrator ID — How It Works](#5-orchestrator-id--how-it-works)
6. [Adapting the AOS Cloud Deployment UI](#6-adapting-the-aos-cloud-deployment-ui)
7. [Worker Lifecycle](#7-worker-lifecycle)
8. [HTTP API Endpoints](#8-http-api-endpoints)
9. [Configuration Reference](#9-configuration-reference)
10. [Standalone Broadcaster Mode (No Orchestrator)](#10-standalone-broadcaster-mode-no-orchestrator)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. What Is the Orchestrator?

The orchestrator (`aos-orchestrator.js`) is a **multi-tenant build manager** that:

- Connects to the Kit Manager (Socket.IO) and registers itself with a unique **instance ID**.
- Receives commands from browser clients via the Kit Manager.
- Dynamically creates and manages **Docker worker containers** — one per user (identified by certificate CN).
- Forwards commands to the appropriate worker via HTTP.
- Auto-evicts idle workers after a configurable timeout.
- Provides an HTTP API for health checks, worker management, and signal relay.

The orchestrator is the **single entry point** for all UI clients. It abstracts away per-user isolation — each user gets their own Docker container with their own certificate, and the orchestrator routes messages to the right worker automatically.

---

## 2. Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                    Browser (AOS Cloud Deployment UI)                   │
│                                                                       │
│  AosService(websocketUrl, targetId)                                  │
│    │                                                                  │
│    │ socket.emit('messageToKit', {                                    │
│    │   cmd: 'aos_build_deploy',                                       │
│    │   to_kit_id: 'AET-ORCHESTRATOR',  ← target ID                    │
│    │   request_from: '<session-id>',                                  │
│    │   ...payload                                                     │
│    │ })                                                               │
│    └──────────────────────────────────┬───────────────────────────────┘
└────────────────────────────────────────┼───────────────────────────────┘
                                         │
                              Kit Manager (Socket.IO)
                          kit.digitalauto.tech (or self-hosted)
                                         │
┌────────────────────────────────────────┼───────────────────────────────┐
│              Orchestrator               │                               │
│         aos-orchestrator.js            │                               │
│         INSTANCE_ID=AET-ORCHESTRATOR   │                               │
│                                        │                               │
│  ┌─────────────────────────────────────▼──────────────────────────┐   │
│  │ socket.on('messageToKit', handler)                              │   │
│  │                                                                 │   │
│  │  1. If cmd is cert-related (upload/check/remove):               │   │
│  │     → extract CN from .p12                                      │   │
│  │     → get-or-create worker for that CN                          │   │
│  │     → map session → CN                                          │   │
│  │                                                                 │   │
│  │  2. For all other commands:                                     │   │
│  │     → look up CN from sessionMap[request_from]                  │   │
│  │     → find worker by CN                                         │   │
│  │     → httpForward(worker.port, data)  ──────┐                   │   │
│  │                                              │                   │   │
│  │  3. socket.emit('messageToKit-kitReply',     │                   │   │
│  │     response)  → back to browser via Kit Mgr  │                   │   │
│  └──────────────────────────────────────────────┼───────────────────┘   │
│                                                 │                     │
│  HTTP Server (port 9100):                       │                     │
│    /health           → health check             │                     │
│    /api/workers      → list workers             │                     │
│    /api/worker-heartbeat → worker heartbeat     │                     │
│    /signal            → signal relay            │                     │
│                                                 │                     │
│  ┌──────────────────────────────────────────────▼──────────────────┐   │
│  │              Worker Container (Docker)                           │   │
│  │  name: aos-worker-<hash>                                        │   │
│  │  INSTANCE_ID=AET-<hash>                                         │   │
│  │  WORKER_MODE=true                                               │   │
│  │                                                                  │   │
│  │  aos-broadcaster.js (worker mode)                               │   │
│  │    Listens on allocated port (9101-9199)                        │   │
│  │    /api/command → receives from orchestrator                    │   │
│  │    /health      → health check                                  │   │
│  │                                                                  │   │
│  │  Executes: build, sign, upload to AosCloud REST API            │   │
│  │  Has: user's .p12 cert, aos-signer, gcc, python                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 3. Prerequisites

### 3.1 Docker

The orchestrator manages Docker containers, so Docker must be installed and the Docker socket accessible:

```bash
# Verify Docker is running
docker info

# The orchestrator accesses Docker via /var/run/docker.sock
ls -la /var/run/docker.sock
```

### 3.2 Build the Worker Image

The orchestrator launches worker containers from the `aos-edge-toolchain:latest` image:

```bash
cd aos-edge-toolchain
docker build -t aos-edge-toolchain:latest .
```

This image contains:
- Ubuntu 24.04 + ARM64 cross-compiler (`gcc-aarch64-linux-gnu`)
- Python 3 + Conan 2 + `aos-signer==2.0.1`, `aos-keys==1.10.0`, `aos-prov==5.4.2`
- Node.js + Socket.IO + dockerode
- `aos-broadcaster.js` (copied to `/usr/local/bin/`)
- gRPC/protobuf cross-compiled for aarch64

### 3.3 Node.js Dependencies

The orchestrator needs `dockerode` and `socket.io-client`. If running outside Docker:

```bash
npm install -g dockerode socket.io-client socket.io https-proxy-agent
```

### 3.4 Certificate (.p12)

Each user must have a valid `.p12` certificate for AosCloud TLS auth. The orchestrator extracts the **Common Name (CN)** from the uploaded cert to identify users and create dedicated workers.

---

## 4. Running the Orchestrator Locally

### 4.1 Quick Start

```bash
cd aos-edge-toolchain

# Set environment variables
export INSTANCE_ID=AET-ORCHESTRATOR
export KIT_MANAGER_URL=https://kit.digitalauto.tech
export AOSCLOUD_URL=https://aoscloud.io:10000
export MAX_WORKERS=10
export WORKER_IMAGE=aos-edge-toolchain:latest

# Run the orchestrator
node scripts/aos-orchestrator.js
```

### 4.2 Using a Custom Orchestrator ID

The orchestrator ID is set via the `INSTANCE_ID` environment variable. You can use any unique string:

```bash
# Example: custom orchestrator ID
export INSTANCE_ID=MY-CUSTOM-ORCHESTRATOR-01
node scripts/aos-orchestrator.js
```

Output:
```
[Orchestrator] Starting: MY-CUSTOM-ORCHESTRATOR-01
[Orchestrator] Kit Manager: https://kit.digitalauto.tech
[Orchestrator] Max workers: 10
[Orchestrator] Idle timeout: 30 min
[Orchestrator] Port range: 9101-9199
[Orchestrator] Worker image: aos-edge-toolchain:latest
[Orchestrator] Checking for orphaned workers from previous run...
[Orchestrator] No orphaned workers found
[Orchestrator] Connected to Kit Manager
[Orchestrator] Registration sent
[Orchestrator] HTTP + Signal relay on port 9100
[Orchestrator] Idle monitor started (check interval: 5 min, timeout: 30 min)
```

### 4.3 Running Inside Docker

```bash
docker run -d \
  --name aos-orchestrator \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e INSTANCE_ID=AET-ORCHESTRATOR \
  -e KIT_MANAGER_URL=https://kit.digitalauto.tech \
  -e AOSCLOUD_URL=https://aoscloud.io:10000 \
  -e MAX_WORKERS=10 \
  -e WORKER_IMAGE=aos-edge-toolchain:latest \
  -p 9100:9100 \
  aos-edge-toolchain:latest \
  node /usr/local/bin/aos-orchestrator.js
```

> **Important**: Mount the Docker socket (`/var/run/docker.sock`) so the orchestrator can create and manage worker containers. Use `--network host` on the worker containers (the orchestrator already sets `NetworkMode: 'host'`), so ensure no port conflicts.

### 4.4 Using a .env File

Create `aos-edge-toolchain/.env`:

```bash
# Orchestrator identity
INSTANCE_ID=AET-ORCHESTRATOR
INSTANCE_NAME=AOS Edge Toolchain

# Kit Manager (Socket.IO)
KIT_MANAGER_URL=https://kit.digitalauto.tech

# AosCloud REST API
AOSCLOUD_URL=https://aoscloud.io:10000

# Worker management
MAX_WORKERS=10
IDLE_TIMEOUT_MINUTES=30
WORKER_PORT_START=9101
WORKER_PORT_END=9199
WORKER_IMAGE=aos-edge-toolchain:latest

# Optional: mount host broadcaster script for live updates
# BROADCASTER_SCRIPT_HOST=/path/to/aos-broadcaster.js

# Optional: proxy
# HTTPS_PROXY=http://127.0.0.1:3128

# Optional: default AosCloud entities
# SERVICE_UUID=c0528145-b393-44c6-aeaa-b26bc560acee
# UNIT_UID=8c85e914e91c4947be78f86889ca9444
# SUBJECT_ID=96d45a48-400d-4207-b67b-4665dce72a33
```

Then run with env loaded:

```bash
cd aos-edge-toolchain
export $(cat .env | grep -v '^#' | xargs) && node scripts/aos-orchestrator.js
```

### 4.5 Verifying the Orchestrator Is Running

```bash
# Health check
curl http://localhost:9100/health
# → {"ok":true,"instanceId":"AET-ORCHESTRATOR","uptime":42,"workers":0,"maxWorkers":10,"portsUsed":0}

# List workers
curl http://localhost:9100/api/workers
# → {"workers":[],"total":0,"maxWorkers":10}
```

---

## 5. Orchestrator ID — How It Works

### 5.1 Registration with Kit Manager

When the orchestrator starts, it connects to the Kit Manager via Socket.IO and registers itself:

```javascript
// aos-orchestrator.js:601-632
socket.emit('register_kit', {
  kit_id: instanceId,                    // e.g. "AET-ORCHESTRATOR"
  name: instanceName,
  desc: 'AOS Edge Toolchain — Multi-tenant orchestrator',
  support_apis: [
    'aos_build_deploy', 'aos_list_apps', 'aos_start_app', ...
  ],
  type: 'aos-edge-toolchain',
  suffix: 'AET',
  online: true
});
```

The Kit Manager now knows that a toolchain with `kit_id = "AET-ORCHESTRATOR"` is online and can handle the listed commands.

### 5.2 How the UI Targets an Orchestrator

The AOS Cloud Deployment UI creates an `AosService` with a **target ID**:

```typescript
// aos-cloud-deployment/src/components/Page.tsx:620
const service = new AosService(serviceUrl, selectedInstance || 'AET-ORCHESTRATOR')
```

The `targetId` (second argument) is sent as `to_kit_id` in every message:

```typescript
// aos-cloud-deployment/src/services/aos.service.ts:173
const message = {
  id: messageId,
  cmd,
  to_kit_id: this.targetId || 'default',   // ← targets specific orchestrator
  type: cmd,
  ...data
}
this.socket.emit('messageToKit', message)
```

The Kit Manager routes the message to the registered kit matching `to_kit_id`.

### 5.3 Custom Orchestrator ID Flow

If you set `INSTANCE_ID=MY-CUSTOM-ORCHESTRATOR-01`:

1. Orchestrator registers with Kit Manager as `kit_id = "MY-CUSTOM-ORCHESTRATOR-01"`.
2. The UI must send `to_kit_id = "MY-CUSTOM-ORCHESTRATOR-01"` in every message.
3. This is done by passing the same ID as the `targetId` to `AosService`.

---

## 6. Adapting the AOS Cloud Deployment UI

### 6.1 Change the Default Orchestrator ID in the UI

There are two places to change the target orchestrator ID:

#### Option A: Change the hardcoded default (simplest)

In `aos-cloud-deployment/src/components/Page.tsx`:

**Line 620** — service initialization:
```typescript
// Before:
const service = new AosService(serviceUrl, selectedInstance || 'AET-ORCHESTRATOR')

// After:
const service = new AosService(serviceUrl, selectedInstance || 'MY-CUSTOM-ORCHESTRATOR-01')
```

**Line 751** — Docker instance list:
```typescript
// Before:
const orchestratorId = 'AET-ORCHESTRATOR';

// After:
const orchestratorId = 'MY-CUSTOM-ORCHESTRATOR-01';
```

#### Option B: Make it configurable via props (recommended for flexibility)

Pass the orchestrator ID from the host page via `config`:

**Step 1** — Add to `types/index.ts`:
```typescript
export interface PluginProps {
  config?: {
    plugin_id?: string
    runtimeUrl?: string
    kitManagerUrl?: string
    aosServiceUrl?: string
    orchestratorId?: string    // ← add this
  }
  // ...
}
```

**Step 2** — Use it in `Page.tsx:618-620`:
```typescript
const serviceUrl = config?.aosServiceUrl || config?.runtimeUrl || 'https://kit.digitalauto.tech'
const orchestratorId = config?.orchestratorId || 'AET-ORCHESTRATOR'
const service = new AosService(serviceUrl, selectedInstance || orchestratorId)
```

**Step 3** — Use it in `fetchDockerInstances()` at `Page.tsx:751`:
```typescript
const orchestratorId = config?.orchestratorId || 'AET-ORCHESTRATOR';
```

**Step 4** — Pass it from the host page or standalone entry:

For standalone (`standalone-python.ts` or `standalone.ts`):
```typescript
root.render(
  React.createElement(Page as any, {
    data: { prototype: { name: 'Standalone Mode' } },
    config: {
      aosServiceUrl: 'https://kit.digitalauto.tech',
      orchestratorId: 'MY-CUSTOM-ORCHESTRATOR-01',
    },
  })
)
```

For digital.auto host page, pass via `mount(el, { config: { orchestratorId: '...' } })`.

#### Option C: Make it user-selectable in the UI

Add a dropdown or text input in the UI header:

```typescript
// In Page.tsx, add state:
const [customOrchestratorId, setCustomOrchestratorId] = React.useState('AET-ORCHESTRATOR')

// In the header JSX, add an input:
<input
  type="text"
  value={customOrchestratorId}
  onChange={(e: any) => setCustomOrchestratorId(e.target.value)}
  placeholder="Orchestrator ID"
  style={styles.input}
/>

// Use it when creating the service:
const service = new AosService(serviceUrl, selectedInstance || customOrchestratorId)
```

### 6.2 Change the Kit Manager URL

The UI connects to the Kit Manager via Socket.IO. The default is `https://kit.digitalauto.tech`.

**In `Page.tsx:619`:**
```typescript
const serviceUrl = config?.aosServiceUrl || config?.runtimeUrl || 'https://kit.digitalauto.tech'
```

To point to a self-hosted Kit Manager:

For standalone mode, edit `standalone-python.ts`:
```typescript
root.render(
  React.createElement(Page as any, {
    data: { prototype: { name: 'Standalone Mode' } },
    config: {
      aosServiceUrl: 'https://my-kitmanager.example.com',
      orchestratorId: 'MY-CUSTOM-ORCHESTRATOR-01',
    },
  })
)
```

For plugin mode, pass via `mount(el, { config: { ... } })`.

### 6.3 Change Both (Orchestrator ID + Kit Manager URL)

If you are running both a self-hosted Kit Manager and a custom orchestrator:

1. **Orchestrator**: Set `INSTANCE_ID` and `KIT_MANAGER_URL` env vars when starting the orchestrator.
2. **UI**: Pass both via `config` props or edit the defaults in `Page.tsx`.

```typescript
// Page.tsx
const serviceUrl = config?.aosServiceUrl || config?.runtimeUrl || 'https://my-kitmanager.example.com'
const orchestratorId = config?.orchestratorId || 'MY-CUSTOM-ORCHESTRATOR-01'
const service = new AosService(serviceUrl, selectedInstance || orchestratorId)
```

### 6.4 Rebuild After Changes

After editing the UI source, rebuild:

```bash
cd aos-cloud-deployment

# Rebuild plugin (index.js)
npm run build

# Or rebuild standalone bundle
npm run standalone

# Or run in watch mode during development
npm run dev
```

---

## 7. Worker Lifecycle

### 7.1 Worker Creation Flow

```
1. User uploads .p12 certificate via UI
   → cmd: 'aos_upload_cert', certData: '<base64>'

2. Orchestrator receives the cert
   → extractCertCN(p12Base64) extracts CN from the cert
   → e.g. CN = "user@example.com"

3. Orchestrator calls getOrCreateWorker(userCN, p12Base64)
   → Checks if a worker already exists for this CN
   → If yes: updates the cert in the existing container, returns
   → If no: creates a new Docker container

4. New container creation:
   a. Allocate port from pool (9101-9199)
   b. Create Docker volume: aos-worker-<hash>-certs
   c. Create container: aos-worker-<hash>
      Image: aos-edge-toolchain:latest
      Env: WORKER_MODE=true, INSTANCE_ID=AET-<hash>, SIGNAL_RELAY_PORT=<port>, ...
      NetworkMode: host
   d. Start container
   e. Wait for health check (up to 20s)
   f. Copy .p12 cert into container via docker cp
   g. Generate PEM from p12 via openssl

5. Map session → CN
   sessionMap.set(request_from, userCN)

6. Return success to UI
   → "Certificate loaded. Dedicated build environment ready (port <port>)."
```

### 7.2 Command Routing Flow

```
1. User triggers an action (e.g. build & deploy)
   → cmd: 'aos_build_deploy', request_from: '<session>'

2. Orchestrator receives the command
   → Looks up CN: sessionMap.get(request_from)
   → Looks up worker: userMap.get(CN)
   → If no CN: "No certificate uploaded. Please upload your .p12 first."
   → If no worker: "Build environment no longer available."

3. Forward to worker
   → httpForward(worker.port, data)
   → POST http://127.0.0.1:<port>/api/command
   → Worker processes the command (build, sign, upload, query AosCloud)

4. Response relayed back
   → response.kit_id = instanceId  (orchestrator's ID, not worker's)
   → socket.emit('messageToKit-kitReply', response)
   → Kit Manager routes to browser
```

### 7.3 Worker Eviction

- **Idle timeout**: Workers with no activity for `IDLE_TIMEOUT_MINUTES` (default 30) are stopped.
- **Max workers**: When `MAX_WORKERS` is reached, the oldest idle worker is evicted to make room.
- **Orphan cleanup**: On startup, the orchestrator removes any leftover `aos-worker-*` containers and volumes from a previous run.

### 7.4 Manual Worker Management

```bash
# List all workers (via orchestrator HTTP API)
curl http://localhost:9100/api/workers

# Check running worker containers
docker ps --filter "name=aos-worker-"

# Stop a specific worker
docker stop aos-worker-<hash> && docker rm aos-worker-<hash>

# View worker logs
docker logs aos-worker-<hash>
```

---

## 8. HTTP API Endpoints

The orchestrator exposes an HTTP server on `SIGNAL_RELAY_PORT` (default 9100):

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check — returns instanceId, uptime, worker count |
| GET | `/api/workers` | List all active workers (CN, container name, port, status, idle minutes) |
| POST | `/api/worker-heartbeat` | Worker heartbeat — updates `lastActivity` for the worker |
| POST | `/signal` | Signal relay — receives signals and broadcasts to browser clients |
| GET | `/signals` | Get signal history (last 100) |

### Health Response

```json
{
  "ok": true,
  "instanceId": "AET-ORCHESTRATOR",
  "uptime": 42.5,
  "workers": 2,
  "maxWorkers": 10,
  "portsUsed": 2
}
```

### Workers List Response

```json
{
  "workers": [
    {
      "userCN": "user1@example.com",
      "containerName": "aos-worker-a1b2c3d4",
      "port": 9101,
      "status": "running",
      "idleMinutes": 5
    }
  ],
  "total": 1,
  "maxWorkers": 10
}
```

---

## 9. Configuration Reference

### 9.1 Orchestrator Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `INSTANCE_ID` | `AET-ORCHESTRATOR` | Unique orchestrator ID. Must match the `to_kit_id` used by the UI. |
| `INSTANCE_NAME` | `AOS Edge Toolchain` | Display name (shown in Kit Manager registration). |
| `KIT_MANAGER_URL` | `https://kit.digitalauto.tech` | Socket.IO server URL for Kit Manager. |
| `AOSCLOUD_URL` | `https://aoscloud.io:10000` | AosCloud REST API base URL (passed to workers). |
| `MAX_WORKERS` | `10` | Maximum concurrent worker containers. |
| `IDLE_TIMEOUT_MINUTES` | `30` | Minutes of inactivity before a worker is evicted. |
| `WORKER_PORT_START` | `9101` | Start of port range for worker HTTP servers. |
| `WORKER_PORT_END` | `9199` | End of port range for worker HTTP servers. |
| `WORKER_IMAGE` | `aos-edge-toolchain:latest` | Docker image for worker containers. |
| `BROADCASTER_SCRIPT_HOST` | (empty) | Host path to `aos-broadcaster.js` for live script updates (bind-mounted into workers). |
| `SIGNAL_RELAY_PORT` | `9100` | HTTP server port for health checks, worker API, signal relay. |
| `HTTPS_PROXY` | (empty) | Proxy for outbound HTTP(S) from orchestrator. |

### 9.2 Worker Container Environment (set by orchestrator)

These are set automatically when the orchestrator creates a worker:

| Variable | Value | Description |
|----------|-------|-------------|
| `WORKER_MODE` | `true` | Tells broadcaster to run in worker mode (HTTP, no Kit Manager). |
| `INSTANCE_ID` | `AET-<hash>` | Unique worker instance ID (hash of CN). |
| `INSTANCE_NAME` | `AOS Edge Toolchain (<CN>)` | Display name. |
| `SIGNAL_RELAY_PORT` | `<allocated port>` | Port the worker listens on. |
| `ORCHESTRATOR_URL` | `http://127.0.0.1:<relay_port>` | Orchestrator URL for heartbeats. |
| `AOSCLOUD_URL` | (from orchestrator env) | Passed through from orchestrator. |
| `NODE_TLS_REJECT_UNAUTHORIZED` | `0` | Disable TLS verification in worker. |

### 9.3 Port Map

| Port | Component | Purpose |
|------|-----------|---------|
| 9100 | Orchestrator HTTP | Health, workers API, signal relay |
| 9101-9199 | Worker containers | Per-worker HTTP command endpoint |
| 9090 | (reserved) | Legacy orchestrator URL (not used by default) |
| 10000 | AosCloud API | External AosCloud REST API |

---

## 10. Standalone Broadcaster Mode (No Orchestrator)

If you don't need multi-tenant isolation, you can run the broadcaster directly (without the orchestrator). In this mode, the broadcaster connects to the Kit Manager itself and handles all commands in a single process.

### 10.1 Run Broadcaster in Standalone Mode

```bash
# Do NOT set WORKER_MODE — standalone mode is the default
export INSTANCE_ID=AET-ORCHESTRATOR
export KIT_MANAGER_URL=https://kit.digitalauto.tech
export AOSCLOUD_URL=https://aoscloud.io:10000

# Optional: pre-load a certificate
export CERT_FILE=/certs/aos-user-sp.p12

node aos-edge-toolchain/scripts/aos-broadcaster.js
```

In standalone mode, the broadcaster:
- Connects to Kit Manager directly via Socket.IO
- Registers with `INSTANCE_ID`
- Handles all commands itself (no Docker containers, no per-user isolation)
- Uses the cert from `CERT_FILE` env or `/root/.aos/security/aos-user-sp.p12`

### 10.2 Standalone Mode Registration

```javascript
// aos-broadcaster.js:398-431 (standalone mode)
socket.emit('register_kit', {
  kit_id: instanceId,    // e.g. "AET-ORCHESTRATOR"
  name: instanceName,
  desc: 'AOS Edge Toolchain - Docker build service for AOS applications',
  support_apis: [...],
  type: 'aos-edge-toolchain',
  suffix: instanceId.split('-')[0],
  online: true
});
```

### 10.3 When to Use Standalone vs Orchestrator

| Mode | Multi-user | Per-user isolation | Cert management | Use case |
|------|-----------|-------------------|-----------------|----------|
| **Standalone** | No | No | Single cert via env/file | Single-user dev, CI/CD |
| **Orchestrator** | Yes | Yes (Docker containers) | Per-user cert upload via UI | Multi-user production |

### 10.4 Standalone Mode in Docker

```bash
docker run -d \
  --name aos-broadcaster \
  -e INSTANCE_ID=AET-ORCHESTRATOR \
  -e KIT_MANAGER_URL=https://kit.digitalauto.tech \
  -e AOSCLOUD_URL=https://aoscloud.io:10000 \
  -e CERT_FILE=/certs/aos-user-sp.p12 \
  -v /path/to/aos-user-sp.p12:/certs/aos-user-sp.p12:ro \
  -p 9100:9100 \
  aos-edge-toolchain:latest \
  node /usr/local/bin/aos-broadcaster.js
```

---

## 11. Troubleshooting

### 11.1 Orchestrator Not Receiving Messages

**Symptom**: UI shows "connecting..." but never connects, or commands timeout.

**Check**:
1. Is the orchestrator registered with Kit Manager?
   ```bash
   # Check orchestrator logs for "Connected to Kit Manager" and "Registration sent"
   ```

2. Does the UI target the correct orchestrator ID?
   - The `to_kit_id` in the UI must match `INSTANCE_ID` of the orchestrator.
   - Default in UI: `AET-ORCHESTRATOR` (Page.tsx:620, 751).
   - If you set `INSTANCE_ID=MY-CUSTOM-ORCHESTRATOR-01`, update the UI accordingly (see [Section 6](#6-adapting-the-aos-cloud-deployment-ui)).

3. Is the Kit Manager URL correct?
   - Both orchestrator and UI must connect to the same Kit Manager.

### 11.2 Worker Creation Fails

**Symptom**: Certificate upload fails with "Failed to write certificate" or "No available ports".

**Check**:
1. Is Docker running?
   ```bash
   docker info
   ```

2. Is the worker image built?
   ```bash
   docker images | grep aos-edge-toolchain
   ```

3. Are all ports in use?
   ```bash
   curl http://localhost:9100/api/workers
   # Check if portsUsed == maxWorkers
   ```

4. Check orchestrator logs for Docker errors.

### 11.3 Worker Is Unresponsive

**Symptom**: "Worker did not respond in time" or "Build environment was lost".

**Check**:
1. Is the worker container running?
   ```bash
   docker ps --filter "name=aos-worker-"
   ```

2. Check worker health:
   ```bash
   curl http://localhost:<worker-port>/health
   ```

3. Check worker logs:
   ```bash
   docker logs aos-worker-<hash>
   ```

4. The orchestrator will auto-clean dead workers. Re-upload your certificate to create a new one.

### 11.4 Certificate CN Extraction Fails

**Symptom**: "Could not extract identity from certificate".

**Check**:
1. Is the `.p12` file valid and not password-protected?
   ```bash
   openssl pkcs12 -in cert.p12 -nokeys -nodes -passin pass: -info
   ```

2. Does it have a CN?
   ```bash
   openssl pkcs12 -in cert.p12 -nokeys -nodes -passin pass: | openssl x509 -noout -subject
   ```

### 11.5 Orphaned Workers After Restart

If the orchestrator was killed uncleanly, orphaned worker containers may remain. The orchestrator cleans these up automatically on startup (`reconcileOrphans()`), but you can also clean manually:

```bash
# Stop and remove all worker containers
docker ps -a --filter "name=aos-worker-" --format "{{.Names}}" | xargs -r docker rm -f

# Remove worker volumes
docker volume ls --filter "name=aos-worker-" --format "{{.Name}}" | xargs -r docker volume rm
```

---

## Quick Reference: Key File Locations

| What | File | Key Lines |
|------|------|-----------|
| Orchestrator script | `aos-edge-toolchain/scripts/aos-orchestrator.js` | all (917 lines) |
| Broadcaster script | `aos-edge-toolchain/scripts/aos-broadcaster.js` | all (1845 lines) |
| Dockerfile (worker image) | `aos-edge-toolchain/Dockerfile` | all (102 lines) |
| Environment template | `aos-edge-toolchain/.env.example` | all (55 lines) |
| UI — service initialization | `aos-cloud-deployment/src/components/Page.tsx` | 618-622 |
| UI — Docker instance list | `aos-cloud-deployment/src/components/Page.tsx` | 748-764 |
| UI — Socket.IO service | `aos-cloud-deployment/src/services/aos.service.ts` | 27-35, 153-188 |
| UI — types | `aos-cloud-deployment/src/types/index.ts` | 21-33 |
| Dev server | `sdv-blueprint/server.js` | all (74 lines) |
