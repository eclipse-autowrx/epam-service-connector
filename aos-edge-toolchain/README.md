# aos-edge-toolchain

Docker toolkit for AosEdge C++ service development: cross-compile, sign, upload, and deploy to AosCloud.

## Quick Start

```bash
# 1. Create project structure
mkdir -p my-service/src my-service/meta && cd my-service

# 2. Create your C++ source (src/main.cpp), config (meta/config.yaml), and state file
touch meta/default_state.dat

# 3. Build, sign, and upload in one command
docker run --rm \
  -e AZURE_KEY_VAULT_NAME=<your-vault-name> \
  -v $(pwd):/workspace \
  aos-edge-toolchain deploy src/main.cpp my-binary
```

---

## Architecture

```
digital.auto (Kit Manager)
      │
      │ websocket (socket.io)
      ▼
┌─────────────────────────────────┐
│  aos-edge-toolchain (Docker)    │
│                                 │
│  aos-broadcaster.js ──────────► │  Kit Manager connection
│  aos-toolkit.sh                │  Build pipeline
│  aos-signer (pip)              │  Sign + upload
│  init-certs.py ◄── Key Vault   │  Certificate management
│                                 │
│  ARM64 cross-compiler          │
│  (aarch64-linux-gnu-g++)       │
└─────────────────────────────────┘
      │
      │ REST API (TLS client cert auth)
      ▼
   aoscloud.io:10000
      │
      ▼
   AosEdge Unit (RPi5 / VM)
```

---

## Certificate Management

Certificates are **not stored** in the Docker image or source repo. They are fetched at runtime from **Azure Key Vault** using Managed Identity.

### Azure Setup (one-time)

1. **Import your certificate into Key Vault:**
   ```bash
   az keyvault certificate import \
     --vault-name <your-vault-name> \
     --name aos-user-sp \
     --file aos-user-sp.p12 \
     --password <pfx-password>
   ```

2. **Enable Managed Identity** on your container host (Container Apps / AKS):
   ```bash
   az containerapp identity assign --name <app-name> --resource-group <rg>
   ```

3. **Grant Key Vault access** to the managed identity:
   ```bash
   # Using RBAC (recommended)
   az role assignment create \
     --assignee <principal-id> \
     --role "Key Vault Secrets User" \
     --scope <key-vault-resource-id>

   az role assignment create \
     --assignee <principal-id> \
     --role "Key Vault Certificate User" \
     --scope <key-vault-resource-id>
   ```

4. **Pass the vault name** as an environment variable when running the container:
   ```bash
   docker run -e AZURE_KEY_VAULT_NAME=<your-vault-name> ...
   ```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CERT_FILE` | For sign/upload (local) | _(unset)_ | Path to a mounted `.p12` file |
| `AZURE_KEY_VAULT_NAME` | For sign/upload (cloud) | _(unset)_ | Azure Key Vault name |
| `CERT_NAME` | No | `aos-user-sp` | Certificate name in Key Vault |

Certificate sources are checked in order: `CERT_FILE` first, then `AZURE_KEY_VAULT_NAME`.

### Using a local certificate (no Key Vault)

Mount your `.p12` file and set `CERT_FILE`:

```bash
docker run --rm \
  -e CERT_FILE=/certs/aos-user-sp.p12 \
  -v /path/to/aos-user-sp.p12:/certs/aos-user-sp.p12:ro \
  -v $(pwd):/workspace \
  aos-edge-toolchain deploy src/main.cpp my-binary
```

### Without any certificate

If neither `CERT_FILE` nor `AZURE_KEY_VAULT_NAME` is set, the container runs in **build-only mode**:
- `build` command works (no certificate needed)
- `sign`, `upload`, and API calls will fail (certificate required)

---

## Commands

### Build

```bash
# Single file
docker run --rm -v $(pwd):/workspace aos-edge-toolchain build src/main.cpp my-binary

# Folder with CMakeLists.txt
docker run --rm -v $(pwd):/workspace aos-edge-toolchain build . build/app

# Folder with Makefile
docker run --rm -v $(pwd):/workspace aos-edge-toolchain build . app
```

### Sign

```bash
docker run --rm \
  -e AZURE_KEY_VAULT_NAME=<vault-name> \
  -v $(pwd):/workspace \
  aos-edge-toolchain sign
```

Creates `service.tar.gz` in the workspace.

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
  aos-edge-toolchain deploy src/main.cpp my-binary
```

---

## Complete Workflow

### Step 1: Create Service via AosCloud API

```bash
docker run --rm \
  -e AZURE_KEY_VAULT_NAME=<vault-name> \
  --entrypoint "" aos-edge-toolchain \
  curl -k --http1.1 -X POST https://aoscloud.io:10000/api/v10/services/ \
  --cert /root/.aos/security/aos-user-sp.p12 --cert-type P12 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My-Service",
    "description": "My AosEdge C++ service",
    "default_quotas": {
      "cpu_limit": 5000,
      "cpu_dmips_limit": 5000,
      "memory_limit": 50000,
      "storage_disk_limit": 10000,
      "state_disk_limit": 1000
    }
  }' | jq '{uuid, title}'
```

Save the returned `uuid` for `config.yaml`.

### Step 2: Create config.yaml

```yaml
publisher:
    author: "Your Name"
    company: "Your Company"

build:
    os: linux
    arch: aarch64
    sign_pkcs12: aos-user-sp.p12
    symlinks: copy

publish:
    url: aoscloud.io
    service_uid: <UUID-FROM-STEP-1>
    tls_pkcs12: aos-user-sp.p12
    version: "1.0.0"

configuration:
    cmd: /my-binary
    workingDir: '/'
    state:
        filename: default_state.dat
        required: true
    instances:
        minInstances: 1
        priority: 0
    isResourceLimits: true
    requestedResources:
        cpu: 1000
        ram: 10MB
        storage: 5MB
        state: 512KB
    quotas:
        cpu: 1000
        mem: 10MB
        state: 512KB
        storage: 5MB
```

### Step 3: Build, Sign, Upload

```bash
docker run --rm \
  -e AZURE_KEY_VAULT_NAME=<vault-name> \
  -v $(pwd):/workspace \
  aos-edge-toolchain deploy src/main.cpp my-binary
```

### Step 4: Deploy to Unit

```bash
# Add service to subject
docker run --rm \
  -e AZURE_KEY_VAULT_NAME=<vault-name> \
  --entrypoint "" aos-edge-toolchain \
  curl -k --http1.1 -X POST \
  https://aoscloud.io:10000/api/v10/subjects/<SUBJECT_ID>/services/ \
  --cert /root/.aos/security/aos-user-sp.p12 --cert-type P12 \
  -H "Content-Type: application/json" \
  -d '{"service_uuids": ["<SERVICE-UUID>"]}'
```

### Step 5: Verify

```bash
# Check service status
docker run --rm \
  -e AZURE_KEY_VAULT_NAME=<vault-name> \
  --entrypoint "" aos-edge-toolchain \
  curl -k --http1.1 https://aoscloud.io:10000/api/v10/services/<SERVICE-UUID>/ \
  --cert /root/.aos/security/aos-user-sp.p12 --cert-type P12 \
  -H "accept: application/json" | jq
```

---

## AosCloud API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v10/services/` | GET, POST | List or create services |
| `/api/v10/services/{id}/` | GET | Get service details (versions, status) |
| `/api/v10/units/` | GET | List all units |
| `/api/v10/units/{id}/` | GET | Get unit status with services |
| `/api/v10/subjects/` | GET, POST | List or create subjects |
| `/api/v10/subjects/{id}/services/` | POST | Add service to subject (deploy) |
| `/api/v10/subjects/{id}/units/` | POST | Add unit to subject |

All endpoints use `https://aoscloud.io:10000` with TLS client certificate authentication.

---

## Viewing Application Logs on the Edge Unit

Services run inside a `crun` container on the edge unit. Stdout is captured by the container
runtime and routed to **journald**, not directly to the serial console.

```bash
# Real-time log (follow mode)
sudo journalctl -f | grep AosEdge

# Recent logs (last 5 minutes)
sudo journalctl --since "5 min ago" | grep -i "hello\|AosEdge"

# Check if the service process is running
ps aux | grep hello-aos

# List running crun containers
sudo crun list
```

If connecting to the unit via USB-UART serial:

```bash
sudo minicom -b 115200 -D /dev/ttyUSB0
```

---

## Key Learnings

### Binary must be in src/ for packaging

`aos-signer` packages files from the `src/` directory. If your binary is only in the root, it won't be included:

- Package ~2-3KB = source only (broken)
- Package ~900KB = includes binary (correct)

The `deploy` command handles this automatically. If running steps manually, copy the binary to `src/` before signing.

### Service quotas are required

When creating a service via API, all quota fields must be included. Missing quotas cause `container_state: build failed`.

---

## Broadcaster (WebSocket)

The broadcaster connects to Kit Manager via Socket.IO, registers as a build node, and handles remote commands from the web UI.

Supported commands: `aos_build_deploy`, `aos_list_apps`, `aos_start_app`, `aos_stop_app`, `aos_get_deployment_status`, `aos_upload_cert`, `aos_check_cert`

### Start the broadcaster

```bash
# 1. Copy and edit .env
cp .env.example .env

# 2. Run with --env-file
docker run -d --network host \
  --env-file .env \
  -v ~/.aos/security/aos-user-sp.p12:/certs/aos-user-sp.p12:ro \
  --name aos-broadcaster \
  --entrypoint "node" \
  aos-edge-toolchain:proxy /usr/local/bin/aos-broadcaster.js
```

Or pass env vars individually:

```bash
# Without certificate (build-only)
docker run -d --network host \
  -e NODE_TLS_REJECT_UNAUTHORIZED=0 \
  -e INSTANCE_ID=AET-TOOLCHAIN-001 \
  --name aos-broadcaster \
  --entrypoint "node" \
  aos-edge-toolchain:proxy /usr/local/bin/aos-broadcaster.js

# With certificate
docker run -d --network host \
  -e NODE_TLS_REJECT_UNAUTHORIZED=0 \
  -e INSTANCE_ID=AET-TOOLCHAIN-001 \
  -e CERT_FILE=/certs/aos-user-sp.p12 \
  -v ~/.aos/security/aos-user-sp.p12:/certs/aos-user-sp.p12:ro \
  --name aos-broadcaster \
  --entrypoint "node" \
  aos-edge-toolchain:proxy /usr/local/bin/aos-broadcaster.js
```

### Broadcaster environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `INSTANCE_ID` | _(auto-generated)_ | Unique instance identifier (e.g. `AET-TOOLCHAIN-001`) |
| `INSTANCE_NAME` | `AOS Edge Toolchain` | Display name |
| `KIT_MANAGER_URL` | `https://kit.digitalauto.tech` | Kit Manager URL |
| `BROADCAST_INTERVAL` | `30000` | Status broadcast interval (ms) |
| `CERT_FILE` | _(unset)_ | Path to mounted `.p12` certificate |
| `NODE_TLS_REJECT_UNAUTHORIZED` | `1` | Set to `0` for corporate proxy TLS interception |

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

`--network host` is needed so the build container can reach `127.0.0.1:3128` on the host.

### Run commands through a proxy

```bash
# Build only (no certificate needed)
docker run --rm --network host \
  -e https_proxy=http://127.0.0.1:3128 \
  -e http_proxy=http://127.0.0.1:3128 \
  -v $(pwd):/workspace \
  aos-edge-toolchain build src/main.cpp my-binary

# Full pipeline (build + sign + upload)
docker run --rm --network host \
  -e https_proxy=http://127.0.0.1:3128 \
  -e http_proxy=http://127.0.0.1:3128 \
  -e AZURE_KEY_VAULT_NAME=<vault-name> \
  -v $(pwd):/workspace \
  aos-edge-toolchain deploy src/main.cpp my-binary

# Broadcaster mode
docker run -d --network host \
  -e https_proxy=http://127.0.0.1:3128 \
  -e http_proxy=http://127.0.0.1:3128 \
  -e INSTANCE_ID=AET-TOOLCHAIN-001 \
  --name aos-broadcaster \
  --entrypoint "node" \
  aos-edge-toolchain:proxy /usr/local/bin/aos-broadcaster.js
```

### What is proxy-aware

All tools inside the container respect the standard proxy environment variables:

| Tool | Mechanism |
|------|-----------|
| `curl` | Native `https_proxy` / `http_proxy` support |
| `apt-get` | Native proxy support (build-time only) |
| `pip` / `aos-signer` | Python `requests` respects `HTTPS_PROXY` |
| `npm` | Native `https-proxy` support (build-time only) |
| Socket.IO broadcaster | Uses `https-proxy-agent` when `HTTPS_PROXY` is set |
| Azure Key Vault SDK | Python `requests` respects `HTTPS_PROXY` |

### Proxy environment variables

| Variable | Example | Description |
|----------|---------|-------------|
| `https_proxy` | `http://127.0.0.1:3128` | Proxy for HTTPS traffic |
| `http_proxy` | `http://127.0.0.1:3128` | Proxy for HTTP traffic |
| `no_proxy` | `localhost,127.0.0.1,10.0.0.0/8` | Hosts that bypass the proxy |

Both lowercase and uppercase forms (`HTTPS_PROXY` / `https_proxy`) are accepted.

---

## Building the Docker Image

```bash
docker build -t aos-edge-toolchain .
```

**Note:** The image does **not** contain certificates. They are fetched at runtime from Azure Key Vault.

---

## Requirements

- Docker 20.10+
- Azure subscription with Key Vault (for signing and API access)
- Managed Identity configured on container host

---

## License

MIT — see [LICENSE](LICENSE).

---

## Building Static C++ Services

The base `aos-edge-toolchain:latest` image does **NOT** include C++ build tools.

For Eclipse SDV Blueprint or other C++ projects requiring gRPC/protobuf:

### Option 1: Use Enhanced Builder Image (Recommended)

```bash
# Build the enhanced image (one time)
cd aos-edge-toolchain
docker build -f Dockerfile.builder -t aos-edge-toolchain:builder .

# Use it for builds
docker run --rm \
    -v $(pwd)/../sdv-blueprint:/workspace/sdv-blueprint \
    aos-edge-toolchain:builder \
    bash -c "cd /workspace/sdv-blueprint && make all"
```

### Option 2: Install Build Tools Manually

Run `setup-build-env.sh` inside the container:

```bash
docker exec aos-broadcaster bash < setup-build-env.sh
```

**Note:** This must be repeated if the container is recreated.

---

## What's Included in Builder Image

- **Base tools:** ARM64 cross-compiler, aos-signer, broadcaster
- **C++ Build:**
  - protobuf-compiler + gRPC plugin
  - Static libraries: libgrpc++, libprotobuf, libabsl, libc-ares, libssl
  - pkg-config for dependency detection
  
**Ready to build static binaries for AOS deployment.**

