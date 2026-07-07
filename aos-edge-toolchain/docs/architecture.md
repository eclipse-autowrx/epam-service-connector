# AosEdge Service Deployment Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     DEVELOPMENT WORKSTATION                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │     Docker: aos-orchestrator (multi-tenant gateway) │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  • Kit Manager entry point (AET-ORCHESTRATOR)│  │    │
│  │  │  • Extracts CN from uploaded .p12             │  │    │
│  │  │  • Manages per-user worker containers         │  │    │
│  │  │  • Port pool: 9101-9199                       │  │    │
│  │  │  • Idle timeout: 30 min                        │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │                                                    │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  Worker Container (per user)                  │  │    │
│  │  │  • Dedicated cert volume                      │  │    │
│  │  │  • Isolated build workspace                   │  │    │
│  │  │  • aos-broadcaster.js (worker mode)           │  │    │
│  │  │  • aos-signer (signing tool)                  │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         AosCloud                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  REST API (https://aoscloud.io:10000/api/v11/)     │    │
│  │  • Services management                             │    │
│  │  • Units/Subjects management                       │    │
│  │  • Service deployment                              │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      AosEdge Unit                            │
│                  (VirtualBox VM / RPi5)                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Aos Service Manager                                │    │
│  │  ┌─────────────────────────────────────────────┐   │    │
│  │  │  Running Services (crun containers):          │   │    │
│  │  │  • Python services                            │   │    │
│  │  │  • KUKSA signal writer/reader                 │   │    │
│  │  └─────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Multi-Tenant Flow

```
User A (.p12) ──→ Orchestrator ──→ Worker A (port 9101, cert A)
User B (.p12) ──→ Orchestrator ──→ Worker B (port 9102, cert B)
User C (.p12) ──→ Orchestrator ──→ Worker C (port 9103, cert C)
                                       │
                                  Auto-stopped after 30 min idle
```

## Key Components

| Component | Description |
|-----------|-------------|
| **Orchestrator** | Multi-tenant gateway: manages worker lifecycle, routes commands, enforces limits |
| **Worker Container** | Per-user build environment with isolated cert and workspace |
| **Broadcaster (worker mode)** | HTTP API for build/sign/upload, no Kit Manager registration |
| **AosCloud API** | REST-based service and unit management (authenticated with .p12 certificates) |
| **AosEdge Unit** | Edge device running deployed services in crun containers |

## Deployment Workflow

1. **Upload .p12** — orchestrator extracts CN, creates dedicated worker
2. **Develop** Python application in the UI editor
3. **Build & Deploy** — worker signs with user's cert, uploads to AosCloud
4. **Deploy** to AosEdge unit through subject/service assignment
5. **Monitor** — unit status, monitoring, and logs via AosCloud API

## AosCloud REST API Endpoints

| Endpoint | Method | Certificate |
|----------|--------|-------------|
| `/api/v11/services/` | GET, POST, DELETE | aos-user-sp.p12 |
| `/api/v11/units/` | GET | aos-user-oem.p12 |
| `/api/v11/subjects/` | GET, POST | aos-user-oem.p12 |
| `/api/v11/subjects/{id}/services/` | POST, DELETE | aos-user-oem.p12 |
| `/api/v11/subjects/{id}/units/` | POST | aos-user-oem.p12 |
