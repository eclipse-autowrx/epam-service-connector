# AOS Cloud Deployment Plugin — Adaptation Guide

> **Audience**: Developers who need to adapt the `aos-cloud-deployment` plugin for their own needs — custom automation, custom UI, or custom API commands against an AosCloud instance.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Building the Plugin (index.js) and Standalone Mode](#2-building-the-plugin-indexjs-and-standalone-mode)
3. [Adapting the UI](#3-adapting-the-ui)
4. [AosCloud API Call Map](#4-aoscloud-api-call-map)
5. [Adapting for Automation](#5-adapting-for-automation)
6. [Configuration Reference](#6-configuration-reference)
7. [End-to-End Message Flow](#7-end-to-end-message-flow)
8. [Common Customization Recipes](#8-common-customization-recipes)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser (User)                                │
│                                                                      │
│  ┌──────────────────────────────┐   ┌───────────────────────────┐  │
│  │ aos-cloud-deployment          │   │ Host page (digital.auto)    │  │
│  │ (React plugin / index.js)     │   │ provides React + mounts     │  │
│  │                              │   │ the plugin via mount(el)    │  │
│  └──────────┬───────────────────┘   └───────────────────────────┘  │
│             │ Socket.IO                                              │
└─────────────┼───────────────────────────────────────────────────────┘
              │  (messageToKit / broadcastToClient)
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Kit Manager / Orchestrator                              │
│              (kit.digitalauto.tech or self-hosted)                   │
│                                                                      │
│  ┌─────────────────────┐    ┌────────────────────────────────────┐  │
│  │ aos-orchestrator.js  │───▶│ Worker container (aos-broadcaster) │  │
│  │ Port 9090            │    │ Port 9101-9199 (per-tenant)        │  │
│  │ Routes messages to   │    │                                    │  │
│  │ workers              │    │ - Builds code (gcc / python)       │  │
│  │                      │    │ - Signs with aos-signer            │  │
│  │                      │    │ - Uploads to AosCloud REST API     │  │
│  │                      │    │ - Queries AosCloud REST API         │  │
│  └─────────────────────┘    └──────────────┬─────────────────────┘  │
└────────────────────────────────────────────┼─────────────────────────┘
                                             │  curl (TLS client cert)
                                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              AosCloud REST API                                       │
│              https://aoscloud.io:10000/api/v11/                       │
│                                                                      │
│  services/  · units/  · subjects/  · service-logs/  · alerts/        │
│  (TLS mTLS auth with .p12 client certificate)                        │
└─────────────────────────────────────────────────────────────────────┘
```

**Three layers:**

| Layer | What | Where |
|-------|------|------|
| **Frontend** | React plugin (UI) | `aos-cloud-deployment/src/` |
| **Backend** | Node.js orchestrator + worker (Docker) | `aos-edge-toolchain/scripts/` |
| **Cloud API** | AosCloud REST API (external) | `https://aoscloud.io:10000/api/v11/` |

The frontend talks to the backend via **Socket.IO** (Kit Manager protocol).
The backend talks to AosCloud via **curl with TLS client certificates**.

---

## 2. Building the Plugin (index.js) and Standalone Mode

### 2.1 Prerequisites

```bash
cd aos-cloud-deployment
npm install
```

Dependencies:
- **esbuild** — bundler (dev dependency)
- **React 19** + react-dom (dev dependency, treated as **external** — not bundled into `index.js`)
- **socket.io-client** — bundled into the output
- **react-icons** — bundled into the output

### 2.2 Build the Plugin (index.js)

The `index.js` is an **IIFE bundle** designed to be loaded inside a host page (e.g. digital.auto) that already provides React.

```bash
npm run build
# Output: aos-cloud-deployment/index.js
```

**What `build.sh` does:**

```bash
npx esbuild src/index.ts \
  --bundle \
  --format=iife \
  --platform=browser \
  --jsx=automatic \
  --external:react \
  --external:react-dom \
  --external:react-dom/client \
  --sourcemap \
  --outfile=index.js
```

Key points:
- `--format=iife` — runs immediately on load, no module system required by the host.
- `--external:react` etc. — React is **not** bundled; the host page provides it globally.
- The entry point `src/index.ts` registers itself on `window.DAPlugins['page-plugin']` with `mount(el, props)` and `unmount(el)` functions.

### 2.3 Build the Standalone Bundle

The standalone bundle **includes React** (via `src/setup-react.ts`) so it runs on its own in a browser without a host page.

```bash
# Build standalone bundle (Python-default mode)
npm run standalone
# Output: aos-cloud-deployment/standalone_python.js

# Or run with live dev server on port 3011
npm run standalone:dev
# Open http://localhost:3011/standalone.html in your browser
```

> **Note**: `standalone.html` references `standalone.js` — rename `standalone_python.js` to `standalone.js` or update the script tag.

### 2.4 Watch Mode (Development)

```bash
# Rebuild index.js on every file change
npm run dev
```

### 2.5 Entry Points Explained

| Entry File | Purpose | React Included? |
|-----------|---------|-----------------|
| `src/index.ts` | Plugin entry for digital.auto host. Registers `window.DAPlugins['page-plugin']` with `mount(el, props)` / `unmount(el)`. | No (external) |
| `src/standalone.ts` | Standalone entry (C++ default). Imports `setup-react.ts` to inject React onto `globalThis`. | Yes (via setup-react) |
| `src/standalone-python.ts` | Standalone entry (Python default). Same as above but forces Python mode in `mount()`. | Yes (via setup-react) |

### 2.6 How the Plugin Mounts

```typescript
// src/index.ts (simplified)
export function mount(el: HTMLElement, props?: any) {
  constrainHostElement(el)          // ensure scrollable container
  const root = ReactDOM.createRoot(el)
  root.render(React.createElement(Page, {
    ...(props || {}),
    config: { ...(props?.config || {}), language: 'python' }
  }))
}

export function unmount(el: HTMLElement) {
  // cleanup root, restore host element styles
}

// Auto-register on global window
window.DAPlugins = window.DAPlugins || {}
window.DAPlugins['page-plugin'] = { mount, unmount }
```

---

## 3. Adapting the UI

### 3.1 File Structure

```
aos-cloud-deployment/src/
├── index.ts                    # Plugin entry (mount/unmount)
├── standalone.ts               # Standalone entry (C++ default)
├── standalone-python.ts        # Standalone entry (Python default)
├── setup-react.ts             # Injects React onto globalThis (for standalone)
├── components/
│   └── Page.tsx               # MAIN UI component (~2700 lines, single-file)
├── services/
│   └── aos.service.ts         # Socket.IO client — all commands to backend
├── presets/
│   ├── index.ts               # Code + YAML presets (C++ and Python templates)
│   ├── config.yaml            # Example AOS service config
│   └── hello-aos.cpp          # Example C++ source
└── types/
    └── index.ts               # TypeScript interfaces
```

### 3.2 The Main Component: `Page.tsx`

`Page.tsx` is the entire UI in one file. It receives `PluginProps`:

```typescript
interface PluginProps {
  data?: { model?: any; prototype?: any }
  config?: {
    plugin_id?: string
    runtimeUrl?: string        // Socket.IO URL (fallback)
    kitManagerUrl?: string     // Kit Manager URL
    aosServiceUrl?: string     // AOS service URL (highest priority)
  }
  api?: PluginAPI              // Host-provided API (digital.auto specific)
}
```

**Key sections of Page.tsx:**

| Section | Approx. Lines | What It Does |
|---------|---------------|-------------|
| State management | 28-120 | React state for code, YAML, build status, apps, connection |
| Service initialization | 618-700 | Creates `AosService`, connects Socket.IO, sets up event listeners |
| Build & Deploy | ~700-900 | Handles build request, progress, deploy status |
| App management | ~900-1100 | Start/stop/restart/uninstall apps |
| Docker instance polling | ~1100-1300 | Polls for available toolchain instances |
| Monitoring & logs | ~1300-1600 | Unit monitoring, alerts, service logs |
| Certificate management | ~1600-1800 | Upload/check/remove .p12 certificates |
| Render (JSX) | ~1800-2733 | All UI elements, tabs, editors |

### 3.3 How to Customize the UI

#### Add a new tab or panel

1. Add a state variable: `const [activeTab, setActiveTab] = React.useState('myTab')`
2. Add a tab button in the JSX render section
3. Render content conditionally: `{activeTab === 'myTab' && (<div>...</div>)}`

#### Add a new command button

```typescript
// In Page.tsx, inside the component:
const handleMyAction = async () => {
  if (!aosServiceRef.current) return
  try {
    const result = await aosServiceRef.current.sendCommand('my_custom_command', {
      myParam: 'value'
    })
    // handle result
  } catch (e) {
    // handle error
  }
}

// In JSX:
<button onClick={handleMyAction}>My Action</button>
```

> Note: `sendCommand` is private in `AosService`. Either make it public or add a new public method in `aos.service.ts`.

#### Change the default connection URL

In `Page.tsx:619`:
```typescript
const serviceUrl = config?.aosServiceUrl || config?.runtimeUrl || 'https://kit.digitalauto.tech'
```
Change the fallback, or pass `config.aosServiceUrl` from the host page.

#### Add new code presets

In `presets/index.ts`:
```typescript
export const PRESETS = {
  helloAos: { name: '...', cpp: '...', yaml: '...' },
  // Add your preset:
  myCustomApp: {
    name: 'My Custom App',
    appName: 'my-app',
    description: 'Custom service template',
    python: `print("Hello from my custom app")`,
    yaml: `schemaVersion: 2
publisher:
  author: "dev@example.com"
  company: "My Corp"
publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"
items:
  - identity:
      type: "service"
      codename: "my-app"
      title: "My App"
    version: "1.0.0"
    ...`
  }
}
```

#### Change the YAML domain or service identity

All preset YAMLs use `domain: "aoscloud.io"`. To target a different AosCloud instance:
- Edit the `domain` field in `presets/index.ts` for each preset.
- Or make it dynamic by injecting from config.

---

## 4. AosCloud API Call Map

This is the complete map of how API calls flow from the UI to AosCloud.

### 4.1 UI → Backend (Socket.IO — Kit Manager Protocol)

All UI commands go through `AosService.sendCommand()` in `aos-cloud-deployment/src/services/aos.service.ts`.

**Connection**: `aos.service.ts:52`
```typescript
this.socket = ioClient(this.websocketUrl, {
  transports: ['websocket', 'polling'],
  reconnection: true,
})
```

**Send pattern**: `aos.service.ts:153-188`
```typescript
// Every command follows this pattern:
const message = {
  id: messageId,                    // unique request ID
  cmd: 'aos_build_deploy',          // command name
  to_kit_id: this.targetId,         // target worker/orchestrator ID
  type: cmd,
  ...data                           // command-specific payload
}
this.socket.emit('messageToKit', message)
```

**Receive pattern**: `aos.service.ts:106-113`
```typescript
this.socket.on('messageToKit-kitReply', (message) => this.handleMessage(message))
this.socket.on('broadcastToClient', (message) => this.handleMessage(message))
```

### 4.2 Command Catalog

Every method in `AosService` maps to a command name. Here is the complete list:

| Method in `aos.service.ts` | Command (`cmd`) | Payload | Backend Handler |
|---------------------------|-----------------|---------|----------------|
| `buildAndDeploy()` | `aos_build_deploy` | `yamlConfig`, `language`, `pythonCode`/`cppCode` | `handleBuildDeploy()` |
| `getDeployedApps()` | `aos_list_apps` | — | `handleListApps()` |
| `startApp()` | `aos_start_app` | `appId` | `handleStartApp()` |
| `stopApp()` | `aos_stop_app` | `appId` | `handleStopApp()` |
| `restartApp()` | `aos_restart_app` | `appId` | `handleRestartApp()` |
| `uninstallApp()` | `aos_uninstall_app` | `appId` | `handleUninstallApp()` |
| `getDeploymentStatus()` | `aos_get_deployment_status` | `serviceUuid`, `unitUid`, `subjectId` | `handleGetDeploymentStatus()` |
| `listServices()` | `aos_list_services` | — | `handleListAosCloud(data, 'services')` |
| `listUnits()` | `aos_list_units` | — | `handleListAosCloud(data, 'units')` |
| `listSubjects()` | `aos_list_subjects` | — | `handleListAosCloud(data, 'subjects')` |
| `getServiceUnits()` | `aos_get_service_units` | `serviceUuid` | `handleGetServiceUnits()` |
| `getServiceVersions()` | `aos_get_service_versions` | `serviceUuid` | `handleGetServiceVersions()` |
| `getUnitMonitoring()` | `aos_get_unit_monitoring` | `unitUid` | `handleGetUnitMonitoring()` |
| `getAlerts()` | `aos_get_alerts` | — | `handleGetAlerts()` |
| `requestServiceLog()` | `aos_request_service_log` | `serviceUuid`, `unitUid`, `subjectId`, `minutes` | `handleRequestServiceLog()` |
| `getServiceLogStatus()` | `aos_get_service_log_status` | — | `handleGetServiceLogStatus()` |
| `getBuildStatus()` | `aos_get_build_status` | `buildId` | `handleGetBuildStatus()` |
| `getServiceStdout()` | `aos_get_service_stdout` | `sshPort`, `lines`, `filter`, `serviceUuid`, `unitUid`, `subjectId` | `handleGetServiceStdout()` |
| `uploadCertificate()` | `aos_upload_cert` | `certData` (base64), `certName` | `handleUploadCert()` |
| `checkCertificate()` | `aos_check_cert` | `certName` | `handleCheckCert()` |
| `removeCertificate()` | `aos_remove_cert` | `certName` | `handleRemoveCert()` |
| `getToolchainInfo()` | `aos_get_toolchain_info` | — | `handleGetToolchainInfo()` |
| `getUnitInfo()` | `aos_get_unit_info` | `unitUid` | `handleGetUnitInfo()` |
| `subscribeConsole()` | `aos_console_subscribe` | `appId` | `handleConsoleSubscribe()` |
| `unsubscribeConsole()` | `aos_console_unsubscribe` | `appId` | `handleConsoleUnsubscribe()` |
| `getAppOutput()` | `aos_app_output` | `appId`, `lines` | `handleAppOutput()` |

### 4.3 Backend → AosCloud REST API

The backend (`aos-broadcaster.js`) translates Socket.IO commands into **curl** calls to the AosCloud REST API.

**Base URL**: `process.env.AOSCLOUD_URL || 'https://aoscloud.io:10000'`
**API prefix**: `/api/v11/`
**Auth**: TLS client certificate (`.p12` file via `--cert` curl flag)

**Generic caller** — `aos-broadcaster.js:1216-1224`:
```javascript
async function curlAosCloud(apiPath, useOemCert) {
  const cert = useOemCert ? resolveOemCertPath() : certPath;  // .p12 file path
  const { stdout } = await execAsync(
    `curl -k --http1.1 ${aoscloudUrl}/api/v11/${apiPath} ` +
    `--cert ${cert} --cert-type P12 ` +
    `-H "accept: application/json"`,
    { env: { ...process.env }, timeout: 15000 }
  );
  return JSON.parse(stdout);
}
```

### 4.4 AosCloud REST Endpoints Used

All under `${AOSCLOUD_URL}/api/v11/`:

| Endpoint | Method | Auth | Purpose | Called From (broadcaster.js) |
|----------|--------|------|---------|------------------------------|
| `services/` | GET | SP cert | List all services | `:1230` |
| `services/` | POST | SP cert | Create a service | `aos-toolkit.sh:312` |
| `services/{uuid}/` | GET | SP cert | Get service detail + versions | `:1302` |
| `services/{uuid}/units/` | GET | SP cert | Units assigned to a service | `:1530` |
| `units/` | GET | SP cert | List all units | `:1307` |
| `units/{uid}/` | GET | **OEM cert** | Unit detail | `:918`, `:1537` |
| `units/{uid}/monitoring/` | GET | **OEM cert** | Unit monitoring (CPU/RAM/disk) | `:1620` |
| `subjects/` | GET | SP cert | List subjects | `:1316` |
| `service-logs/` | POST | SP cert | Request service log collection | `:282`, `:1768` |
| `service-logs/` | GET | SP cert | Get service log status | `:1793` |
| `service-logs/{id}/download-log-file/` | GET | SP cert | Download collected log file | `:256` |
| `alerts/?limit=20` | GET | SP cert | Recent alerts | `:1725` |

> **Certificate types**:
> - **SP cert** (`aos-user-sp.p12`) — Service Provider certificate, used for most API calls.
> - **OEM cert** (`aos-user-oem.p12`) — OEM certificate, required for unit detail and monitoring. Falls back to SP cert if OEM cert is not present.

### 4.5 Toolkit CLI (Direct AosCloud Calls)

`aos-edge-toolchain/scripts/aos-toolkit.sh` also calls AosCloud directly (outside the broadcaster):

| Line | Endpoint | Method | Purpose |
|------|----------|--------|---------|
| `:312` | `services/` | POST | Create/register a new service |
| `:320` | `services/` | GET | List services |
| `:327` | `units/` | GET | List units |

### 4.6 Adding a New API Command (End-to-End)

To add a completely new command that calls a new AosCloud endpoint:

**Step 1 — Frontend** (`aos.service.ts`): Add a new method:
```typescript
async getMyData(param: string): Promise<any> {
  return this.sendCommand('aos_get_my_data', { param })
}
```

**Step 2 — Backend** (`aos-broadcaster.js`): Add a handler in the message dispatcher:
```javascript
case 'aos_get_my_data':
  result = await handleGetMyData(data);
  break;
```

```javascript
async function handleGetMyData(data) {
  const result = await curlAosCloud(`my-endpoint/${data.param}/`);
  return {
    kit_id: instanceId,
    type: 'aos_get_my_data',
    status: 'success',
    data: result
  };
}
```

**Step 3 — UI** (`Page.tsx`): Call it and display the result:
```typescript
const result = await aosServiceRef.current.getMyData('example')
setMyState(result.data)
```

---

## 5. Adapting for Automation

### 5.1 Headless Build & Deploy (No UI)

If you want to automate builds without the UI, you can bypass the plugin entirely and talk to the backend directly via Socket.IO:

```javascript
const io = require('socket.io-client')
const socket = io('https://kit.digitalauto.tech', {
  transports: ['websocket', 'polling']
})

socket.on('connect', () => {
  socket.emit('messageToKit', {
    id: 'auto-' + Date.now(),
    cmd: 'aos_build_deploy',
    to_kit_id: 'AET-ORCHESTRATOR',
    type: 'aos_build_deploy',
    language: 'python',
    pythonCode: 'print("Hello from automation")',
    yamlConfig: `schemaVersion: 2
publisher:
  author: "automation@example.com"
  company: "My Corp"
publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"
items:
  - identity:
      type: "service"
      codename: "my-auto-service"
    version: "1.0.0"
    ...`
  })
})

socket.on('messageToKit-kitReply', (msg) => {
  if (msg.status === 'success') {
    console.log('Build deployed:', msg)
  }
})
```

### 5.2 Direct AosCloud API (No Backend)

If the toolchain is not needed (e.g. just querying AosCloud), you can call the REST API directly with curl:

```bash
# List services
curl -k --http1.1 https://aoscloud.io:10000/api/v11/services/ \
  --cert aos-user-sp.p12 --cert-type P12 \
  -H "accept: application/json"

# Get unit monitoring (requires OEM cert)
curl -k --http1.1 https://aoscloud.io:10000/api/v11/units/{uid}/monitoring/ \
  --cert aos-user-oem.p12 --cert-type P12 \
  -H "accept: application/json"

# Get recent alerts
curl -k --http1.1 "https://aoscloud.io:10000/api/v11/alerts/?limit=20" \
  --cert aos-user-sp.p12 --cert-type P12 \
  -H "accept: application/json"
```

### 5.3 Custom API Client (Python)

```python
import requests

AOSCLOUD_URL = "https://aoscloud.io:10000"
CERT = ("aos-user-sp.pem", "aos-user-sp-key.pem")  # extracted from .p12

# List services
resp = requests.get(
    f"{AOSCLOUD_URL}/api/v11/services/",
    cert=CERT,
    headers={"accept": "application/json"},
    verify=False  # equivalent to curl -k
)
print(resp.json())
```

> Note: Python `requests` uses PEM format, not P12. Convert with:
> ```bash
> openssl pkcs12 -in aos-user-sp.p12 -out aos-user-sp.pem -nodes
> ```

### 5.4 Orchestrator-Only Mode

To run the orchestrator without the full toolchain Docker image:

```bash
# Set environment
export KIT_MANAGER_URL=https://kit.digitalauto.tech
export AOSCLOUD_URL=https://aoscloud.io:10000
export INSTANCE_ID=AET-ORCHESTRATOR

# Start orchestrator (manages worker containers)
node aos-edge-toolchain/scripts/aos-orchestrator.js
```

Workers register with the orchestrator and receive commands via HTTP `/api/command`.

---

## 6. Configuration Reference

### 6.1 Environment Variables (`.env`)

| Variable | Default | Where Used | Purpose |
|----------|---------|------------|---------|
| `KIT_MANAGER_URL` | `https://kit.digitalauto.tech` | broadcaster.js, orchestrator.js, syncer.py, aos.service.ts, signal.service.ts | Socket.IO server URL for Kit Manager protocol |
| `AOSCLOUD_URL` | `https://aoscloud.io:10000` | broadcaster.js, orchestrator.js, aos-toolkit.sh | AosCloud REST API base URL |
| `INSTANCE_ID` | `AET-unknown` | broadcaster.js | Unique ID for this toolchain instance |
| `INSTANCE_NAME` | `AOS Edge Toolchain` | broadcaster.js | Display name |
| `CERT_FILE` | `/certs/aos-user-sp.p12` | broadcaster.js (via mount) | Path to SP .p12 certificate (inside container) |
| `OEM_CERT_PATH` | `/root/.aos/security/aos-user-oem.p12` | broadcaster.js | Path to OEM .p12 certificate |
| `SERVICE_UUID` | (empty) | broadcaster.js | Default service UUID for API calls |
| `UNIT_UID` | (empty) | broadcaster.js | Default unit UID |
| `SUBJECT_ID` | (empty) | broadcaster.js | Default subject ID |
| `AZURE_KEY_VAULT_NAME` | (unset) | init-certs.py | Azure Key Vault name for cert fetching |
| `HTTPS_PROXY` | (empty) | broadcaster.js | Proxy for outbound HTTP(S) |
| `NODE_TLS_REJECT_UNAUTHORIZED` | (unset) | Node.js processes | Set to `0` to disable TLS verification |
| `SIGNAL_RELAY_PORT` | `9100` | broadcaster.js | HTTP relay port for signal forwarding |
| `ORCHESTRATOR_URL` | `http://localhost:9090` | broadcaster.js (worker mode) | Orchestrator URL for worker heartbeat |
| `WORKER_MODE` | `false` | broadcaster.js | If `true`, runs as worker (registers with orchestrator) |
| `BROADCAST_INTERVAL` | `30000` | broadcaster.js | Status broadcast interval (ms) |

### 6.2 Plugin Config Props

Passed from the host page to `mount(el, props)`:

```typescript
{
  config: {
    plugin_id: 'my-plugin',
    runtimeUrl: 'https://kit.digitalauto.tech',     // fallback
    kitManagerUrl: 'https://kit.digitalauto.tech',   // Kit Manager
    aosServiceUrl: 'https://kit.digitalauto.tech',   // highest priority
  },
  data: {
    model: { /* ... */ },
    prototype: { name: 'My Prototype' }
  },
  api: {
    updateModel: async (updates) => { /* ... */ },
    updatePrototype: async (updates) => { /* ... */ },
    // ... digital.auto host API
  }
}
```

URL resolution priority in `Page.tsx:619`:
```
config.aosServiceUrl  →  config.runtimeUrl  →  'https://kit.digitalauto.tech'
```

### 6.3 Ports

| Port | Service | Default |
|------|---------|---------|
| 3010 | Dev server (sdv-blueprint/server.js) | 3010 |
| 3011 | Standalone dev server (esbuild) | 3011 |
| 9090 | Orchestrator | 9090 |
| 9100 | Signal relay (broadcaster HTTP) | 9100 |
| 9101-9199 | Worker containers | 9101-9199 |
| 55555 | KUKSA databroker (HPC) | 55555 |
| 55556 | KUKSA databroker (zonal) | 55556 |
| 8888 | KUKSA HTTP bridge | 8888 |
| 10000 | AosCloud API | 10000 |

### 6.4 Preset YAML Fields

All preset YAMLs in `presets/index.ts` contain:

```yaml
schemaVersion: 2
publisher:
  author: "developer@example.com"
  company: "Example Corp"
publish:
  tlsKey: "aos-user-sp.p12"     # certificate filename
  domain: "aoscloud.io"          # AosCloud domain
items:
  - identity:
      type: "service"
      codename: "hello-aos"      # service codename (must match AosCloud)
      title: "Hello AOS Service"
      description: "..."
    version: "1.0.0"
    sourceFolder: "hello-aos"
    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"
    configuration:
      workingDir: "/"
      cmd: "/hello-aos"
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 1000
        ramLimit: 10MB
        storageLimit: 5MB
        stateLimit: 512KB
        tmpLimit: 256MiB
```

---

## 7. End-to-End Message Flow

Here is the complete lifecycle of a build & deploy operation:

```
1. USER CLICKS "Build & Deploy" IN THE UI
   └─ Page.tsx → AosService.buildAndDeploy(request)
      └─ sendCommand('aos_build_deploy', { yamlConfig, language, pythonCode })
         └─ socket.emit('messageToKit', { id, cmd, to_kit_id, type, ...data })

2. KIT MANAGER / ORCHESTRATOR RECEIVES
   └─ aos-orchestrator.js receives 'messageToKit'
      └─ routes to worker container via HTTP POST /api/command

3. WORKER (BROADCASTER) PROCESSES
   └─ aos-broadcaster.js handleBuildDeploy(data)
      ├─ writes source code to /workspace
      ├─ compiles (gcc for C++ / copies for Python)
      ├─ creates AOS update bundle (YAML manifest)
      ├─ signs bundle with aos-signer
      ├─ uploads to AosCloud via curl
      │   └─ curl -k --cert aos-user-sp.p12 https://aoscloud.io:10000/api/v11/...
      └─ emits 'messageToKit-kitReply' with status

4. BROADCAST TO UI
   └─ broadcaster emits 'broadcastToClient' with progress stages:
      init → config → proto → compile → bundle → sign → upload

5. UI UPDATES
   └─ AosService.onBuildProgress callback → Page.tsx updates buildLogs + buildStatus
   └─ AosService.onDeployStatus callback → Page.tsx shows success/failure
```

### Other flows follow the same pattern:

- **List services**: `aos_list_services` → `curlAosCloud('services/')` → mapped response
- **Get monitoring**: `aos_get_unit_monitoring` → `curlAosCloud('units/{uid}/monitoring/', true)` (OEM cert)
- **Get alerts**: `aos_get_alerts` → `curlAosCloud('alerts/?limit=20')`

---

## 8. Common Customization Recipes

### 8.1 Point to a Self-Hosted AosCloud

1. **Backend**: Set in `.env`:
   ```bash
   AOSCLOUD_URL=https://my-aoscloud.example.com:10000
   ```

2. **Presets**: Change `domain` in all YAML templates in `presets/index.ts`:
   ```yaml
   domain: "my-aoscloud.example.com"
   ```

3. **Toolkit**: Update hardcoded URLs in `aos-toolkit.sh` (lines 312, 320, 327).

4. **Certificates**: Use your own `.p12` files (SP + OEM).

### 8.2 Point to a Self-Hosted Kit Manager

1. **Backend**: Set in `.env`:
   ```bash
   KIT_MANAGER_URL=https://my-kitmanager.example.com
   ```

2. **Frontend**: Change default in `aos.service.ts:28`:
   ```typescript
   private websocketUrl: string = 'https://my-kitmanager.example.com'
   ```

3. **Python service**: Change in `syncer.py:32`:
   ```python
   DEFAULT_KIT_SERVER = 'https://my-kitmanager.example.com'
   ```

### 8.3 Add a New AosCloud API Endpoint

1. Add a method in `aos.service.ts` (frontend)
2. Add a handler in `aos-broadcaster.js` (backend)
3. Use `curlAosCloud()` for GET requests or `execAsync(curl ...)` for POST
4. Call the method from `Page.tsx` and render the result

See [Section 4.6](#46-adding-a-new-api-command-end-to-end) for a full example.

### 8.4 Replace the UI Framework

The plugin uses React 19 with inline styles (no CSS framework). To adapt:

- **Keep React, change styling**: Replace inline style objects in `Page.tsx` with CSS modules, Tailwind, or styled-components. The component is self-contained.
- **Replace React entirely**: Reimplement `mount(el, props)` in `src/index.ts` with any framework. The contract is: receive an HTML element + props, render UI, clean up on `unmount()`. The `AosService` class is framework-agnostic and can be reused.
- **Use the service layer standalone**: `AosService` (aos.service.ts) has zero React dependencies. Import it into any TypeScript/JavaScript project to get a typed Socket.IO client for the AOS backend.

### 8.5 Add CI/CD Automation

```bash
#!/bin/bash
# ci-deploy.sh — automate build + deploy without UI

export KIT_MANAGER_URL=https://kit.digitalauto.tech
export AOSCLOUD_URL=https://aoscloud.io:10000

# Use the toolkit CLI directly
aos-edge-toolchain/scripts/aos-toolkit.sh deploy \
  --service-uuid $SERVICE_UUID \
  --source ./my-service \
  --config ./config.yaml \
  --cert /certs/aos-user-sp.p12
```

Or use the Socket.IO protocol from a script (see [Section 5.1](#51-headless-build--deploy-no-ui)).

### 8.6 Custom Monitoring Dashboard

Reuse `AosService` to build a custom monitoring view:

```typescript
import { AosService } from './services/aos.service'

const service = new AosService('https://kit.digitalauto.tech', 'AET-ORCHESTRATOR')
await service.connect()

// Poll monitoring every 30s
setInterval(async () => {
  const monitoring = await service.getUnitMonitoring('my-unit-uid')
  const alerts = await service.getAlerts()
  // render in your own UI
}, 30000)
```

---

## Quick Reference: Key File Locations

| What | File | Key Lines |
|------|------|-----------|
| Plugin entry (mount/unmount) | `aos-cloud-deployment/src/index.ts` | 52-71 |
| Main UI component | `aos-cloud-deployment/src/components/Page.tsx` | all (~2700 lines) |
| Socket.IO service client | `aos-cloud-deployment/src/services/aos.service.ts` | all |
| Code presets (C++ + Python + YAML) | `aos-cloud-deployment/src/presets/index.ts` | all |
| TypeScript types | `aos-cloud-deployment/src/types/index.ts` | all |
| Build script | `aos-cloud-deployment/build.sh` | all |
| Package config | `aos-cloud-deployment/package.json` | all |
| Backend broadcaster | `aos-edge-toolchain/scripts/aos-broadcaster.js` | all |
| Backend orchestrator | `aos-edge-toolchain/scripts/aos-orchestrator.js` | all |
| CLI toolkit | `aos-edge-toolchain/scripts/aos-toolkit.sh` | all |
| Environment template | `aos-edge-toolchain/.env.example` | all |
| Cert initializer | `aos-edge-toolchain/scripts/init-certs.py` | all |
| Python service (edge) | `service/src/app/syncer.py` | all |
| Dev server | `sdv-blueprint/server.js` | all |
