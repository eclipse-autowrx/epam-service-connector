# AOS Cloud Deployment Architecture

## Overview

End-to-edge deployment pipeline for AOS applications - from development in browser to execution on edge devices.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DEVELOPER WORKFLOW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐             │
│  │   Write      │  →   │   Build      │  →   │   Deploy    │             │
│  │   C++ Code   │      │   & Sign     │      │   to Device  │             │
│  └──────────────┘      └──────────────┘      └──────────────┘             │
│       ↑                      ↑                       ↑                      │
│       │                      │                       │                      │
│  digital.auto           aos-edge-               aoscloud.io              │
│    Plugin               toolchain                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## System Components

| Component | Role | Technology |
|-----------|------|------------|
| **digital.auto Plugin** | Web UI for code editing & deployment control | React, Socket.IO |
| **aos-edge-toolchain** | ARM64 cross-compiler, package signer | Docker, aarch64-g++ |
| **Kit Manager** | Message broker between plugin and toolchain | Socket.IO Server |
| **aoscloud.io** | Cloud service registry & distribution | REST API |
| **RPi5 (Unit)** | Edge device running deployed applications | AosEdge Runtime |

## Communication Flow

```
1. DEVELOPER → PLUGIN (digital.auto)
   ┌─────────────────────────────────────┐
   │ "Build & Deploy" clicked            │
   │ - C++ source code                   │
   │ - YAML configuration                │
   │ - Version number                    │
   └─────────────────────────────────────┘
                    │
                    ▼
2. PLUGIN → KIT MANAGER → BROADCASTER (Docker)
   ┌─────────────────────────────────────┐
   │ WebSocket: messageToKit            │
   │ { cmd: "aos_build_deploy",          │
   │   cppCode: "...",                   │
   │   yamlConfig: "...",                │
   │   to_kit_id: "AET-TOOLCHAIN-001" }  │
   └─────────────────────────────────────┘
                    │
                    ▼
3. BROADCASTER → BUILD PIPELINE
   ┌─────────────────────────────────────┐
   │ 1. Compile: aarch64-linux-gnu-g++   │
   │    Source → ARM64 Binary            │
   │                                     │
   │ 2. Sign: aos-signer                │
   │    Binary + Config → service.tar.gz │
   │                                     │
   │ 3. Upload: curl aoscloud.io API    │
   │    service.tar.gz → Cloud Registry  │
   └─────────────────────────────────────┘
                    │
                    ▼
4. AOSCLOUD.IO → RPI5 (UNIT)
   ┌─────────────────────────────────────┐
   │ Unit auto-pulls new version         │
   │ - Downloads service.tar.gz          │
   │ - Verifies signature                │
   │ - Starts application                │
   └─────────────────────────────────────┘
```

## Key Technologies

- **Socket.IO**: Real-time bidirectional communication (plugin ↔ kit manager ↔ toolchain)
- **Docker**: Containerized build environment with ARM64 cross-compiler
- **aos-signer**: Python package for AOS service signing
- **REST API**: AosCloud service/subject/unit management

## Resource Identifiers

| Resource | ID |
|----------|-----|
| Service | `c0528145-b393-44c6-aeaa-b26bc560acee` |
| Subject | `96d45a48-400d-4207-b67b-4665dce72a33` |
| Unit (RPi5) | `8c85e914e91c4947be78f86889ca9444` |
| Toolchain | `AET-TOOLCHAIN-001` |
