# AosEdge C++ Service Deployment Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     DEVELOPMENT WORKSTATION                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │        Docker Container: aos-edge-toolchain         │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  • ARM64 Cross-compiler (aarch64-linux-gnu)  │  │    │
│  │  │  • aos-signer (signing tool)                 │  │    │
│  │  │  • Certificates (SP/OEM .p12)                │  │    │
│  │  │  • Build scripts                             │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │                        │                            │    │
│  │  C++ source → Build → Sign → Upload                │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         AosCloud                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  REST API (https://aoscloud.io:10000/api/v10/)     │    │
│  │  • Services management                             │    │
│  │  • Units/Subjects management                       │    │
│  │  • Service deployment                              │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      AosEdge Unit                            │
│                  (Raspberry Pi 5 - ARM64)                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Aos Service Manager                                │    │
│  │  ┌─────────────────────────────────────────────┐   │    │
│  │  │  Running Services:                           │   │    │
│  │  │  • digital-auto-aos-service1                 │   │    │
│  │  │  • da-service                                │   │    │
│  │  └─────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

| Component | Description |
|-----------|-------------|
| **Docker Toolkit** | Self-contained build environment with cross-compiler and aos-signer |
| **AosCloud API** | REST-based service and unit management (authenticated with .p12 certificates) |
| **AosEdge Unit** | Edge device (RPi5) running deployed services |

## Deployment Workflow

1. **Develop** C++ application
2. **Build** ARM64 binary in Docker container
3. **Sign** service package using aos-signer
4. **Upload** to AosCloud via REST API
5. **Deploy** to AosEdge unit through subject/service assignment

## AosCloud REST API Endpoints

| Endpoint | Method | Certificate |
|----------|--------|-------------|
| `/api/v10/services/` | GET, POST, DELETE | aos-user-sp.p12 |
| `/api/v10/units/` | GET | aos-user-oem.p12 |
| `/api/v10/subjects/` | GET, POST | aos-user-oem.p12 |
| `/api/v10/subjects/{id}/services/` | POST, DELETE | aos-user-oem.p12 |
| `/api/v10/subjects/{id}/units/` | POST | aos-user-oem.p12 |

## Current Services

| Service | UUID | Status |
|---------|------|--------|
| digital-auto-aos-service1 | `c0528145-b393-44c6-aeaa-b26bc560acee` | Ready for deployment |
| da-service | `54d0b98c-e986-4bec-b065-bef119b9aa0f` | Active (1 unit) |
| service101 | `f0bbd745-11af-4c89-a0a5-0aa975ee5139` | Available |
