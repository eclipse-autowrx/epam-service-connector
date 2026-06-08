# AosCloud Deployment Configuration

This document contains example AosCloud configuration for the deployment pipeline.
All UUIDs and IDs below are examples — replace with your own.

## Service Information

| Field | Value |
|-------|-------|
| **Service Name** | `digital-auto-aos-service1` |
| **Service UUID** | `c0528145-b393-44c6-aeaa-b26bc560acee` |
| **Description** | Digital.auto AosEdge C++ service |
| **Service Provider** | SP developer@example.com |

## AosCloud Resources

### Service
```
UUID: c0528145-b393-44c6-aeaa-b26bc560acee
Title: digital-auto-aos-service1
URL: https://aoscloud.io:10000
Status: Active with version 1.0.0 (ready)
Unit Count: 1
```

### Subject (vm-azure)
```
Subject ID: 96d45a48-400d-4207-b67b-4665dce72a33
Name: vm-azure
Purpose: Contains the service and assigns units
```

### Unit (RPi5)
```
System UID: 8c85e914e91c4947be78f86889ca9444
IP Address: <unit-ip>
Status: Online
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

### Docker Broadcaster
```
Instance ID: AET-TOOLCHAIN-001
Kit Manager: https://kit.digitalauto.tech
Status: Running
Container: aos-broadcaster
```

## Complete config.yaml Template

```yaml
publisher:
    author: "developer@example.com"
    company: "Example Corp"

build:
    os: linux
    arch: aarch64
    sign_pkcs12: aos-user-sp.p12
    symlinks: copy

publish:
    url: aoscloud.io
    service_uid: c0528145-b393-44c6-aeaa-b26bc560acee
    tls_pkcs12: aos-user-sp.p12
    version: "1.0.0"

configuration:
    cmd: /hello-aos
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

## Deployment Workflow

### Method 1: Using the Plugin (Recommended)

1. Open the AOS Cloud Deployment plugin in digital.auto
2. Select "Hello AOS Example" preset
3. Modify C++ code or version number as needed
4. Click **Build & Deploy**
5. The AET-TOOLCHAIN-001 Docker instance will:
   - Compile your C++ code for ARM64
   - Sign the package
   - Upload to AosCloud
6. The unit automatically deploys the new version

### Method 2: Manual Command Line

```bash
# Create workspace
mkdir -p my-service/src my-service/meta

# 1. Create C++ source (src/main.cpp)
# 2. Create config.yaml with your service_uid
# 3. Create empty state file
touch my-service/meta/default_state.dat

# Build, sign, and upload in one command
docker run --rm -v $(pwd):/workspace aos-edge-toolchain \
  deploy src/main.cpp hello-aos
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

Baked into aos-edge-toolchain Docker image at `/root/.aos/security/`:

| Certificate | Purpose | API Usage |
|------------|---------|-----------|
| `aos-user-sp.p12` | Service Provider | /services/ API (create, upload) |
| `aos-user-oem.p12` | OEM | /units/, /subjects/ API (assign devices) |

## Quick Reference Commands

### List Services
```bash
docker run --rm --entrypoint "" aos-edge-toolchain \
  curl -k --http1.1 https://aoscloud.io:10000/api/v10/services/ \
  --cert /root/.aos/security/aos-user-sp.p12 --cert-type P12 \
  -H "accept: application/json" | jq '.items[] | {uuid, title}'
```

### Check Service Status
```bash
docker run --rm --entrypoint "" aos-edge-toolchain \
  curl -k --http1.1 https://aoscloud.io:10000/api/v10/services/c0528145-b393-44c6-aeaa-b26bc560acee/ \
  --cert /root/.aos/security/aos-user-sp.p12 --cert-type P12 \
  -H "accept: application/json"
```

### Check Unit Logs (SSH to RPi5)
```bash
ssh user@<unit-ip> \
  "sudo journalctl -u aos-servicemanager -f | grep -E '(digital-auto|Version)'"
```

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
│              AET-TOOLCHAIN-001                            │
│           (aos-edge-toolchain Docker)                       │
│                                                              │
│  • Receives build commands from plugin                        │
│  • Compiles C++ to ARM64 using aarch64-linux-gnu-g++         │
│  • Signs package with aos-signer                             │
│  • Uploads to AosCloud                                      │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   AosCloud                                   │
│              (aoscloud.io:10000)                             │
│                                                              │
│  • Service: digital-auto-aos-service1                        │
│  • UUID: c0528145-b393-44c6-aeaa-b26bc560acee                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Subject (vm-azure)                            │
│                                                               │
│  • Subject ID: 96d45a48-400d-4207-b67b-4665dce72a33          │
│  • Contains: Service + Unit                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Unit (RPi5)                                    │
│                                                               │
│  • System UID: 8c85e914e91c4947be78f86889ca9444               │
│  • IP: <unit-ip>                                             │
│  • Runs deployed AOS applications                           │
└─────────────────────────────────────────────────────────────┘
```

## Troubleshooting

### Service not deploying
1. Check if version is in "ready" state
2. Verify unit is online: `curl https://aoscloud.io:10000/api/v10/units/`
3. Check service has at least 1 unit assigned

### Build failures
1. Check broadcaster logs: `docker logs aos-broadcaster`
2. Verify C++ code compiles: must have `#include <thread>` and `#include <chrono>`
3. Binary must be copied to `src/` before signing

### Connection issues
1. Verify broadcaster is running: `docker ps | grep aos-broadcaster`
2. Check plugin shows "● Connected"
3. Verify Kit Manager: https://kit.digitalauto.tech is accessible
