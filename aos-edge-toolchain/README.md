# aos-edge-toolchain

Docker toolkit for AosEdge Python service development: build, sign, upload, and deploy to AosCloud.

## Quick Start

```bash
# 1. Build the image (skip if already built)
docker build -t aos-edge-toolchain:latest .

# 2. Start the orchestrator (multi-tenant mode)
#    IMPORTANT: BROADCASTER_SCRIPT_HOST must be a HOST path (not a container path).
#    The scripts volume mount below maps $(pwd)/scripts → /usr/local/bin inside the container,
#    so the host path is $(pwd)/scripts/aos-broadcaster.js, NOT /usr/local/bin/aos-broadcaster.js.
docker run -d --network host --restart unless-stopped \
  --name aos-orchestrator \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(pwd)/scripts/:/usr/local/bin/:ro \
  -e INSTANCE_ID=AET-ORCHESTRATOR \
  -e KIT_MANAGER_URL=https://kit.digitalauto.tech \
  -e SIGNAL_RELAY_PORT=9100 \
  -e MAX_WORKERS=5 \
  -e IDLE_TIMEOUT_MINUTES=30 \
  -e AOSCLOUD_URL=https://aoscloud.io:10000 \
  -e NODE_TLS_REJECT_UNAUTHORIZED=0 \
  -e BROADCASTER_SCRIPT_HOST=$(pwd)/scripts/aos-broadcaster.js \
  --entrypoint sh \
  aos-edge-toolchain:latest \
  -c 'unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY && exec node /usr/local/bin/aos-orchestrator.js'

# 3. Start the standalone dev UI (local development)
cd ../aos-cloud-deployment
npm run standalone:dev
# Open http://localhost:3011/standalone-python.html

# 4. Upload your .p12 certificate via the UI, select a preset, and deploy
```

---

## Architecture

```
digital.auto (Kit Manager)
      │
      │ websocket (socket.io)
      ▼
┌──────────────────────────────────────────────┐
│  Orchestrator (aos-orchestrator.js)          │
│                                              │
│  • Single Kit Manager entry point            │
│  • Extracts CN from uploaded .p12            │
│  • Creates per-user worker containers        │
│  • Routes commands to correct worker         │
│  • Auto-stops idle workers (30 min)          │
│  • Enforces MAX_WORKERS limit                │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  Worker Container (user A)             │  │
│  │  • Dedicated cert volume               │  │
│  │  • Isolated build workspace            │  │
│  │  • aos-broadcaster.js (worker mode)    │  │
│  │  • Port: auto-allocated (9101-9199)    │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  Worker Container (user B)             │  │
│  │  ...                                   │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
      │
      │ REST API (TLS client cert auth)
      ▼
   aoscloud.io:10000
      │
      ▼
   AosEdge Unit (VM / RPi5)
```

### Components

| Component | Script | Description |
|-----------|--------|-------------|
| **Orchestrator** | `aos-orchestrator.js` | Multi-tenant gateway: manages worker lifecycle, routes commands |
| **Broadcaster** | `aos-broadcaster.js` | Build service: compiles, signs, uploads. Runs in standalone or worker mode |
| **Toolkit** | `aos-toolkit.sh` | CLI for manual build/sign/upload operations |
| **Cert init** | `init-certs.py` | Fetches certificates from Azure Key Vault or local file |

### Modes

| Mode | Script | Description |
|------|--------|-------------|
| **Orchestrator** | `aos-orchestrator.js` | Multi-tenant production mode — one entry point, many workers |
| **Standalone** | `aos-broadcaster.js` | Single-user mode — broadcaster registers directly with Kit Manager |
| **Worker** | `aos-broadcaster.js` (`WORKER_MODE=true`) | Per-user mode — HTTP API, no Kit Manager registration |

---

## Development Workflow

### Standalone UI (local dev)

```bash
cd aos-cloud-deployment
npm install
npm run standalone:dev
# → http://localhost:3011/standalone-python.html
```

The UI has a preset dropdown with ready-to-deploy services. Select a preset, upload your `.p12` certificate, and click Deploy.

### How deployment works

1. **YAML is the single source of truth** — the preset's YAML config contains everything: codename, title, version, quotas, cmd, env, dependencies
2. The UI sends only `{ language, pythonCode, yamlConfig }` to the orchestrator
3. The broadcaster parses the codename from the YAML, builds the package, signs it with `aos-signer`, and uploads via `aos-signer upload`
4. AosCloud reads the codename from the uploaded package's embedded YAML and routes it to the correct service — no separate service creation API call needed

### Adding new presets

Edit `aos-cloud-deployment/src/presets/index.ts`:

```ts
export const PRESETS = {
  myService: {
    name: 'My Service',
    appName: 'my-service-codename',
    description: 'What it does',
    language: 'python' as const,
    python: `# Python source code here`,
    yaml: `# YAML config here (schemaVersion: 2)`
  },
  // ...
}
```

Then update the dropdown in `aos-cloud-deployment/src/components/Page.tsx`.

---

## AosEdge Setup Automation (`aos_run_automation`)

`handleRunAutomation()` in `aos-broadcaster.js` is a native JS re-implementation
of `eclipse-sdv-blueprint/Aosedge-Automation/aos-automation.py` (no Python
process is spawned). It performs, against the real AosCloud API:

1. Update the target unit's config from `scripts/aos-unitconfig-template.json` and verify it
2. Create the unit set (idempotent lookup-by-title first)
3. Assign the unit to the unit set
4. Create the subject (idempotent lookup-by-label first)
5. Assign the unit to the subject
6. Resolve and assign each required service codename to the subject

This requires an **OEM certificate** (`aos-user-oem.p12`), not just the SP
cert — AosCloud returns `403 Forbidden` for these writes from an SP-only
identity. Upload it via `aos_upload_cert` with `certName: 'aos-user-oem'`
(the deployment UI has a dedicated "Upload OEM .p12" control for this).

Step 6 checks each service's current assignment via `GET subjects/{id}/services/`
before assigning — if already assigned, the `POST` is skipped entirely. AosCloud
redeploys the current version to the unit on every successful assignment `POST`,
even if the service was already assigned, so re-running the automation without
a version bump does not trigger a redundant redeploy.

---

## Certificate Management

Certificates are **not stored** in the Docker image or source repo. They are
uploaded by users via the UI or fetched from Azure Key Vault.

### Multi-tenant (Orchestrator)

Each user uploads their own .p12 via the UI. The orchestrator:
1. Extracts the CN (Common Name) from the certificate
2. Creates a dedicated worker container with an isolated Docker volume
3. Stores the cert at `/root/.aos/security/aos-user-sp.p12` inside the worker
4. Routes all subsequent requests from that user to their worker

### Single-user (Standalone Broadcaster)

```bash
docker run -d --network host \
  -e CERT_FILE=/certs/aos-user-sp.p12 \
  -e INSTANCE_ID=AET-TOOLCHAIN-001 \
  -v /path/to/aos-user-sp.p12:/certs/aos-user-sp.p12:ro \
  --name aos-broadcaster \
  --entrypoint sh \
  aos-edge-toolchain:latest \
  -c 'unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY && exec node /usr/local/bin/aos-broadcaster.js'
```

### Azure Key Vault

```bash
docker run -e AZURE_KEY_VAULT_NAME=<your-vault-name> ...
```

---

## Configuration Reference

### Orchestrator

| Variable | Default | Description |
|----------|---------|-------------|
| `INSTANCE_ID` | `AET-ORCHESTRATOR` | Kit Manager instance ID |
| `INSTANCE_NAME` | `AOS Edge Toolchain` | Display name |
| `KIT_MANAGER_URL` | `https://kit.digitalauto.tech` | Kit Manager URL |
| `SIGNAL_RELAY_PORT` | `9100` | HTTP + Socket.IO port |
| `MAX_WORKERS` | `5` | Max concurrent worker containers |
| `IDLE_TIMEOUT_MINUTES` | `30` | Idle timeout before stopping worker |
| `WORKER_PORT_START` | `9101` | Start of worker port pool |
| `WORKER_PORT_END` | `9199` | End of worker port pool |
| `WORKER_IMAGE` | `aos-edge-toolchain:latest` | Image for worker containers |
| `BROADCASTER_SCRIPT_HOST` | _(unset)_ | **Host** filesystem path to `aos-broadcaster.js` (e.g. `/home/fsti/epam-service-connector/aos-edge-toolchain/scripts/aos-broadcaster.js`). Bind-mounted into worker containers so they pick up script changes without an image rebuild. **Must be a host path, not a container path.** If unset, workers use the script baked into the image. |
| `AOSCLOUD_URL` | `https://aoscloud.io:10000` | AosCloud API URL |
| `NODE_TLS_REJECT_UNAUTHORIZED` | `1` | Set to `0` for corporate proxy |

### Worker

| Variable | Default | Description |
|----------|---------|-------------|
| `WORKER_MODE` | `true` | Enables worker mode |
| `INSTANCE_ID` | Auto-generated | Worker instance ID |
| `SIGNAL_RELAY_PORT` | Auto-allocated | Worker port |
| `ORCHESTRATOR_URL` | `http://127.0.0.1:9100` | Heartbeat endpoint |
| `AOSCLOUD_URL` | `https://aoscloud.io:10000` | AosCloud API URL |

---

## CLI Commands

### Build

```bash
docker run --rm -v $(pwd):/workspace aos-edge-toolchain build src/main.py my-app
```

### Sign

```bash
docker run --rm \
  -e AZURE_KEY_VAULT_NAME=<vault-name> \
  -v $(pwd):/workspace \
  aos-edge-toolchain sign
```

Creates `batch.tar.gz` in the workspace.

### Upload

```bash
docker run --rm \
  -e AZURE_KEY_VAULT_NAME=<vault-name> \
  -v $(pwd):/workspace \
  aos-edge-toolchain upload
```

### Full Pipeline (build + sign + upload)

```bash
docker run --rm \
  -e AZURE_KEY_VAULT_NAME=<vault-name> \
  -v $(pwd):/workspace \
  aos-edge-toolchain deploy src/main.py my-app
```

---

## AosCloud API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v11/services/` | GET, POST | List or create services |
| `/api/v11/services/{id}/` | GET | Get service details (versions, status) |
| `/api/v11/services/versions/` | POST | Upload a new service version (multipart `batch.tar.gz`) |
| `/api/v11/units/` | GET | List all units |
| `/api/v11/units/{id}/` | GET | Get unit status with services |
| `/api/v11/subjects/` | GET, POST | List or create subjects |
| `/api/v11/subjects/{id}/services/` | POST | Add service to subject (deploy) |
| `/api/v11/subjects/{id}/units/` | POST | Add unit to subject |

All endpoints use `https://aoscloud.io:10000` with TLS client certificate authentication.

### Service creation vs upload

- **`POST /api/v11/services/`** — creates a service record (codename, title, quotas). Only needed if the service doesn't exist yet.
- **`POST /api/v11/services/versions/`** — uploads the signed `batch.tar.gz`. AosCloud reads the codename from the embedded YAML to route to the correct service. This is what `aos-signer upload` does.

---

## Corporate Proxy

If you are behind a corporate proxy (e.g. cntlm on `127.0.0.1:3128`), pass the proxy
environment variables at **build time** and/or **runtime**.

### Build the image through a proxy

```bash
docker build \
  --build-arg https_proxy=http://127.0.0.1:3128 \
  --build-arg http_proxy=http://127.0.0.1:3128 \
  --network host \
  -t aos-edge-toolchain .
```

### Run orchestrator through a proxy

```bash
docker run -d --network host \
  -e https_proxy=http://127.0.0.1:3128 \
  -e http_proxy=http://127.0.0.1:3128 \
  -e INSTANCE_ID=AET-ORCHESTRATOR \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --name aos-orchestrator \
  --entrypoint sh \
  aos-edge-toolchain:latest \
  -c 'exec node /usr/local/bin/aos-orchestrator.js'
```

### What is proxy-aware

| Tool | Mechanism |
|------|-----------|
| `curl` | Native `https_proxy` / `http_proxy` support |
| `apt-get` | Native proxy support (build-time only) |
| `pip` / `aos-signer` | Python `requests` respects `HTTPS_PROXY` |
| `npm` | Native `https-proxy` support (build-time only) |
| Socket.IO (orchestrator) | Uses `https-proxy-agent` when `HTTPS_PROXY` is set |
| Socket.IO (worker) | Uses `https-proxy-agent` when `HTTPS_PROXY` is set |
| Azure Key Vault SDK | Python `requests` respects `HTTPS_PROXY` |

---

## Requirements

- Docker 20.10+
- Azure subscription with Key Vault (for signing and API access) — optional
- Docker socket access (for orchestrator worker management)

---

## License

MIT — see [LICENSE](LICENSE).
