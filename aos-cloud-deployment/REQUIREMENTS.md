# AOS Cloud Deployment Plugin - Requirements

## Overview

Create a plugin for building and deploying C++ applications to AOS (Automotive Open System) Cloud edge devices, based on the aoscloud concept.

## References

- **AOS Build Definition**: [aos-edge-toolchain](https://github.com/aosedge/aos-edge-toolchain)

## Requirements

### 1. Plugin Identity

| Property | Value |
|----------|-------|
| Plugin Name | AOS Cloud Deployment |
| Plugin Slug | `aos-cloud-deployment` |
| Location | `aos-cloud-deployment/` |

### 2. Code Editor

| Requirement | Choice |
|-------------|--------|
| Editor Type | CodeMirror 6 |
| Languages Supported | C++, YAML |
| Reason | Lightweight (~200KB), good for embedded use |

### 3. Editable Files

The plugin provides editors for:

1. **C++ Source Code** (`main.cpp`)
   - Full C++ syntax highlighting
   - Code completion
   - Error highlighting (linting)

2. **AOS Configuration** (`config.yaml`)
   - YAML syntax highlighting
   - Based on aos-edge-toolchain format
   - Includes: publisher, build, publish, configuration sections

### 4. Build Definition Format

Based on aos-edge-toolchain config format:

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
    service_uid: 84d98700-694c-45f6-a00b-3423a7523b95
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

### 5. Communication Protocol

| Aspect | Implementation |
|--------|----------------|
| Protocol | WebSocket (Socket.IO) |
| Pattern | Same as Kit Manager (`vehicle-edge-runtime`) |
| Base URL | `ws://localhost:3002/runtime` (configurable) |
| Message Format | Kit Manager protocol (`messageToKit` / `messageToKit-kitReply`) |

### 6. WebSocket Commands

| Command | Purpose |
|---------|---------|
| `aos_build_deploy` | Build and deploy C++ application |
| `aos_list_apps` | List deployed applications |
| `aos_start_app` | Start an application |
| `aos_stop_app` | Stop an application |
| `aos_restart_app` | Restart an application |
| `aos_console_subscribe` | Subscribe to console output |
| `aos_console_unsubscribe` | Unsubscribe from console output |
| `aos_app_output` | Get application output |

### 7. UI Layout

**Single Page Layout** - All functionality in one view:

```
┌─────────────────────────────────────────────────────────────────────┐
│  AOS Cloud Deployment                    [Connected ●]              │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ [Preset: Hello AOS ▼] [App Name: hello-aos          ]          ││
│  └─────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ main.cpp                               [C++]                    ││
│  │ ┌─────────────────────────────────────────────────────────────┐││
│  │ │ #include <iostream>                                        │││
│  │ │ ...                                                         │││
│  │ └─────────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ config.yaml                             [YAML]                  ││
│  │ ┌─────────────────────────────────────────────────────────────┐││
│  │ │ publisher:                                                  │││
│  │ │   author: "..."                                            │││
│  │ │ ...                                                         │││
│  │ └─────────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ [⚡ Build & Deploy]    [Refresh Apps]                         ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Build Status: Building... 60%                                  ││
│  ├─────────────────────────────────────────────────────────────────┤│
│  │ Deployed Applications                    [↻]                   ││
│  │ ┌─────────────────────────────────────────────────────────────┐││
│  │ │ hello-aos      [Running]                    [▶] [■]        │││
│  │ └─────────────────────────────────────────────────────────────┘││
│  ├─────────────────────────────────────────────────────────────────┤│
│  │ Build Logs                                              [✕]    ││
│  │ ┌─────────────────────────────────────────────────────────────┐││
│  │ │ [15:30:00] [Build] Starting build...                       │││
│  │ │ [15:30:05] [Build] Compiling...                            │││
│  │ └─────────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### 8. Application Controls

| Control | Status | Priority |
|---------|--------|----------|
| Start Button | ✅ Implemented (MVP) | High |
| Stop Button | ⏳ Later | Medium |
| Restart Button | ⏳ Later | Low |
| Uninstall/Delete | ⏳ Later | Low |

### 9. Status Information

| Information | Status | Priority |
|-------------|--------|----------|
| Running status (running/stopped/error) | ✅ Implemented (MVP) | High |
| Console logs | ✅ Implemented | High |
| Resource usage (CPU, memory) | ⏳ Later | Low |
| Container details (ID, ports, env) | ⏳ Later | Low |

**Note**: User said "later, after i can see the app be deployed" for detailed status info.

### 10. Preset Examples

Include the "Hello AOS" example from aos-edge-toolchain:

```cpp
#include <iostream>
#include <thread>
#include <chrono>

#define VERSION "1.0.0"

int main() {
    std::cout << "========================================" << std::endl;
    std::cout << "AosEdge Hello Service" << std::endl;
    std::cout << "Version: " << VERSION << std::endl;
    std::cout << "Deployed via aos-edge-toolchain!" << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout.flush();

    int count = 0;
    while (true) {
        std::this_thread::sleep_for(std::chrono::seconds(10));
        count++;
        std::cout << "[" << count << "] Hello from AosEdge! v" << VERSION << std::endl;
        std::cout.flush();
    }

    return 0;
}
```

### 11. Tech Stack

| Component | Technology |
|-----------|------------|
| Language | TypeScript |
| UI Framework | React (via global host) |
| Build Tool | esbuild |
| Editor | CodeMirror 6 |
| WebSocket | Socket.IO Client |
| Icons | React Icons |

### 12. Plugin Registration

Follows the standard plugin pattern:

```typescript
window.DAPlugins['page-plugin'] = {
  components: { Page },
  mount: (el, props) => { /* ... */ },
  unmount: (el) => { /* ... */ }
}
```

### 13. External Dependencies (Not Bundled)

- `react`
- `react-dom`
- `react-dom/client`
- `react/jsx-runtime`

## Development Status

| Feature | Status |
|---------|--------|
| Plugin Structure | ✅ Complete |
| CodeMirror 6 Editor | ✅ Complete |
| YAML Editor | ✅ Complete |
| WebSocket Service | ✅ Complete |
| Build & Deploy Flow | ✅ Complete |
| Start Button | ✅ Complete |
| Preset Examples | ✅ Complete |
| Plugin Build | ✅ Complete |

## Next Steps (Future Work)

1. ✅ Create plugin structure
2. ✅ Implement C++ editor with CodeMirror 6
3. ✅ Implement YAML editor
4. ✅ Create WebSocket service (Kit Manager protocol)
5. ✅ Implement Build & Deploy functionality
6. ✅ Add Start/Stop controls
7. ⏳ Test with actual Docker backend service
8. ⏳ Add more detailed status information (resources, container details)
9. ⏳ Add more app controls (restart, uninstall)
10. ⏳ Add more preset examples

---

*Document Version: 1.0*
*Last Updated: 2026-03-11*
