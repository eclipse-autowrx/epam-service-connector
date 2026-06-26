# aos-edge-toolchain

Docker toolkit for AosEdge Python service development: build, sign, upload, and deploy to AosCloud.

## Quick Start

```bash
# 1. Build the image
docker build -t aos-edge-toolchain:latest .

# 2. Start the orchestrator (multi-tenant mode)
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
  --entrypoint sh \
  aos-edge-toolchain:latest \
  -c 'unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY && exec node /usr/local/bin/aos-orchestrator.js'

# 3. Open the standalone UI, upload your .p12, and deploy
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

Mount your `.p12` file and set `CERT_FILE`:

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

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CERT_FILE` | For sign/upload (local) | _(unset)_ | Path to a mounted `.p12` file |
| `AZURE_KEY_VAULT_NAME` | For sign/upload (cloud) | _(unset)_ | Azure Key Vault name |
| `CERT_NAME` | No | `aos-user-sp` | Certificate name in Key Vault |

---

## Orchestrator Configuration

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
| `BROADCASTER_SCRIPT_HOST` | _(unset)_ | Host path to bind-mount broadcaster script |
| `AOSCLOUD_URL` | `https://aoscloud.io:10000` | AosCloud API URL |
| `NODE_TLS_REJECT_UNAUTHORIZED` | `1` | Set to `0` for corporate proxy |

## Worker Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `WORKER_MODE` | `true` | Enables worker mode |
| `INSTANCE_ID` | Auto-generated | Worker instance ID |
| `SIGNAL_RELAY_PORT` | Auto-allocated | Worker port |
| `ORCHESTRATOR_URL` | `http://127.0.0.1:9100` | Heartbeat endpoint |
| `AOSCLOUD_URL` | `https://aoscloud.io:10000` | AosCloud API URL |

---

## Commands (CLI Mode)

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
| `/api/v11/units/` | GET | List all units |
| `/api/v11/units/{id}/` | GET | Get unit status with services |
| `/api/v11/subjects/` | GET, POST | List or create subjects |
| `/api/v11/subjects/{id}/services/` | POST | Add service to subject (deploy) |
| `/api/v11/subjects/{id}/units/` | POST | Add unit to subject |

All endpoints use `https://aoscloud.io:10000` with TLS client certificate authentication.

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

## Building the Docker Image

```bash
docker build -t aos-edge-toolchain .
```

**Note:** The image does **not** contain certificates. They are uploaded by users
at runtime or fetched from Azure Key Vault.

---

## Requirements

- Docker 20.10+
- Azure subscription with Key Vault (for signing and API access) — optional
- Docker socket access (for orchestrator worker management)

---

## License

MIT — see [LICENSE](LICENSE).
