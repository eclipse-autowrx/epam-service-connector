# AosCloud Deployment Configuration

This document contains example AosCloud configuration for the deployment pipeline.
All UUIDs and IDs below are examples — replace with your own.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     digital.auto                            │
│                   (AOS Cloud Deployment Plugin)              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Kit Manager                               │
│              (kit.digitalauto.tech)                         │
│              WebSocket Gateway                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              AET-ORCHESTRATOR                              │
│           (aos-orchestrator.js)                              │
│                                                              │
│  • Single Kit Manager entry point                            │
│  • Creates per-user worker containers on cert upload         │
│  • Routes commands to correct worker                         │
│  • Auto-stops idle workers after 30 min                      │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Worker Container (per user)                        │     │
│  │  • Dedicated cert volume                            │     │
│  │  • Isolated build workspace                         │     │
│  │  • Signs with user's .p12                           │     │
│  │  • Uploads to AosCloud                              │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   AosCloud                                   │
│              (aoscloud.io:10000)                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Subject → Unit                                  │
│                                                               │
│  • Subject contains: Service + Unit                           │
│  • Unit runs deployed AOS applications                      │
└─────────────────────────────────────────────────────────────┘
```

## Service Information

| Field | Value |
|-------|-------|
| **Service Name** | `digital-auto-aos-service1` |
| **Service UUID** | `c0528145-b393-44c6-aeaa-b26bc560acee` |
| **Description** | Digital.auto AosEdge service |
| **Service Provider** | SP developer@example.com |

## AosCloud Resources

### Service
```
UUID: c0528145-b393-44c6-aeaa-b26bc560acee
Title: digital-auto-aos-service1
URL: https://aoscloud.io:10000
Status: Active with version 1.0.0 (ready)
```

### Subject (vm-azure)
```
Subject ID: 96d45a48-400d-4207-b67b-4665dce72a33
Name: vm-azure
Purpose: Contains the service and assigns units
```

## Plugin Configuration

### Service UUID (for config.yaml)
```yaml
publish:
    url: aoscloud.io
    service_uid: c0528145-b393-44c6-aeaa-b26bc560acee
    tls_pkcs12: aos-user-sp.p12
    version: "1.0.0"
```

### Orchestrator
```
Instance ID: AET-ORCHESTRATOR
Kit Manager: https://kit.digitalauto.tech
Container: aos-orchestrator
Workers: auto-created per user
```

## Complete config.yaml Template (schemaVersion: 2)

```yaml
schemaVersion: 2

publisher:
  author: "developer@example.com"
  company: "Example Corp"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: "service"
      codename: "hello-python"
      title: "Hello Python Service"
      description: "Simple hello world Python service"
    version: "1.0.0"
    sourceFolder: "hello-python"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: "/usr/bin/python3 -u /main.py"
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 5000
        ramLimit: 50MB
        storageLimit: 10MB
        stateLimit: 1MB
        tmpLimit: 256MiB
```

## Deployment Workflow

### Method 1: Using the Plugin (Recommended)

1. Open the AOS Cloud Deployment plugin in digital.auto
2. Upload your `.p12` certificate — orchestrator creates your worker
3. Select a preset or write your own Python code
4. Click **Build & Deploy**
5. The worker will:
   - Sign the package with your certificate
   - Upload to AosCloud
6. The unit automatically deploys the new version

### Method 2: Manual Command Line

```bash
# Create workspace
mkdir -p my-service/my-app/src_any && cd my-service

# 1. Create Python source (my-app/src_any/main.py)
# 2. Create config.yaml with your service UUID

# Build, sign, and upload in one command
docker run --rm -v $(pwd):/workspace aos-edge-toolchain \
  deploy src/main.py my-app
```

## Version Updates

To deploy a new version:

1. Update version in config.yaml:
   ```yaml
   version: "1.0.0"  →  version: "1.0.1"
   ```

2. Build and deploy

3. The unit will automatically pull and deploy the new version

## Certificates

With the orchestrator, each user uploads their own .p12 via the UI:

| Certificate | Purpose | API Usage |
|------------|---------|-----------|
| `aos-user-sp.p12` | Service Provider | /services/ API (create, upload) |
| `aos-user-oem.p12` | OEM | /units/, /subjects/ API (assign devices) |

Certificates are stored in per-worker Docker volumes — no collisions between users.

## Quick Reference Commands

### List Services
```bash
docker run --rm --entrypoint "" aos-edge-toolchain \
  curl -k --http1.1 https://aoscloud.io:10000/api/v11/services/ \
  --cert /root/.aos/security/aos-user-sp.p12 --cert-type P12 \
  -H "accept: application/json" | jq '.items[] | {uuid, title}'
```

### Check Service Status
```bash
docker run --rm --entrypoint "" aos-edge-toolchain \
  curl -k --http1.1 https://aoscloud.io:10000/api/v11/services/c0528145-b393-44c6-aeaa-b26bc560acee/ \
  --cert /root/.aos/security/aos-user-sp.p12 --cert-type P12 \
  -H "accept: application/json"
```

### Check Unit Logs (SSH to VM)
```bash
ssh user@<unit-ip> \
  "sudo journalctl -u aos-servicemanager -f | grep -E '(digital-auto|Version)'"
```

## Troubleshooting

### Service not deploying
1. Check if version is in "ready" state
2. Verify unit is online: `curl https://aoscloud.io:10000/api/v11/units/`
3. Check service has at least 1 unit assigned

### Build failures
1. Check orchestrator logs: `docker logs aos-orchestrator`
2. Check worker logs: `docker logs aos-worker-<hash>`
3. Verify Python code is valid

### Connection issues
1. Verify orchestrator is running: `docker ps | grep aos-orchestrator`
2. Check plugin shows "· Online" in the Orchestrator card
3. Verify Kit Manager: https://kit.digitalauto.tech is accessible

### Worker not created
1. Check `MAX_WORKERS` limit hasn't been reached
2. Verify Docker socket is mounted: `-v /var/run/docker.sock:/var/run/docker.sock`
3. Check orchestrator logs for errors
