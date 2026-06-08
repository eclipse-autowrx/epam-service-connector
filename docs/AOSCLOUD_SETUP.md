# AosCloud Setup Guide

Step-by-step guide to configure AosCloud for the Eclipse SDV Blueprint demo.

**Portal URLs:**
- OEM Portal: https://oem.aoscloud.io
- SP Portal: https://sp.aoscloud.io
- API: https://oem.aoscloud.io:10000/api/v10/docs

**Certificates required:**
- `~/.aos/security/aos-user-oem.p12` — OEM certificate (unit management, subjects)
- `~/.aos/security/aos-user-sp.p12` — SP certificate (service upload, signing)

---

## 1. Create Services (SP Portal)

Login to https://sp.aoscloud.io with the SP certificate.

Create **3 services** with these settings:

### Service 1: Signal Writer — Zonal Domain

```
Title:       Signal Writer - Zonal Domain
Description: Writes vehicle sensor data (Speed, SoC, AmbientTemp) to KUKSA Databroker
```

Resource quotas:
```
CPU:     1000
Memory:  10 MB
Storage: 5 MB
State:   512 KB
```

After creation, note the **Service UUID** (e.g. `242a46c7-f237-40e3-a37e-40529a39bf85`)
and **Service ID** (e.g. `67064`).

### Service 2: EV Range Extender — HPC Domain

```
Title:       EV Range Extender - HPC Domain
Description: Battery management, range computation, and power-saving mode control
```

Same resource quotas as above.

### Service 3: Signal Reporter — Dashboard Relay

```
Title:       Signal Reporter - Dashboard Relay
Description: Subscribes to all vehicle signals and relays them to dashboard via HTTP
```

Same resource quotas as above.

### Update YAML configs with Service UUIDs

After creating the services, update each preset YAML with the assigned UUID:

```
sdv-blueprint/presets/signal-writer.yaml      → service_uid: <Signal Writer UUID>
sdv-blueprint/presets/ev-range-extender.yaml   → service_uid: <EV Range Extender UUID>
sdv-blueprint/presets/signal-reporter.yaml     → service_uid: <Signal Reporter UUID>
```

---

## 2. Create Subjects (OEM Portal)

Login to https://oem.aoscloud.io with the OEM certificate.

Create **2 subjects** and assign services to them:

### Subject: hpc-subject

```
Label:    hpc-subject
Services: EV Range Extender, Signal Reporter
```

This subject deploys battery management and signal relay to the HPC node.

### Subject: zonal-subject

```
Label:    zonal-subject
Services: Signal Writer
```

This subject deploys sensor signal generation to the Zonal node.

### Subject-Service mapping

```
hpc-subject
├── EV Range Extender   → reads SoC, computes Range, actuates Lights/Heating
└── Signal Reporter     → subscribes 9 signals, HTTP POST to broadcaster

zonal-subject
└── Signal Writer       → writes Speed, SoC, AmbientTemp every 2s
```

---

## 3. Provision Units

Use `aos-prov` to create VirtualBox VMs and register them with AosCloud:

```bash
source ~/.aos/venv/bin/activate
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY

# Zonal Unit (2 VMs: main + secondary)
aos-prov unit-new -N zonal-unit --nodes 2 --skip-check-version

# HPC Unit (2 VMs: main + secondary)
aos-prov unit-new -N hpc-unit --nodes 2 --skip-check-version
```

Each command outputs:
- **System ID** — unique identifier for the unit
- **Unit URL** — link to the unit page on AosCloud
- **SSH ports** — for main and secondary VMs

### Post-provisioning (required after every VM boot)

```bash
# For EACH VM (replace <SSH_PORT> with actual port):
sshpass -p 'Password1' ssh -p <SSH_PORT> root@localhost "
  setenforce 0
  mount -o remount,rw /
  mkdir -p /etc/systemd/resolved.conf.d
  printf '[Resolve]\nDNS=8.8.8.8 1.1.1.1\n' > /etc/systemd/resolved.conf.d/public-dns.conf
  systemctl restart systemd-resolved"
```

---

## 4. Assign Units to Subjects

### Via OEM Portal UI

1. Go to https://oem.aoscloud.io → Subjects
2. Open **hpc-subject** → Units tab → Add Unit → select HPC unit
3. Open **zonal-subject** → Units tab → Add Unit → select Zonal unit

### Via API

```bash
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY
CERT=~/.aos/security/aos-user-oem.p12
API=https://oem.aoscloud.io:10000/api/v10

# Assign HPC unit to hpc-subject
curl -sk --cert-type P12 --cert $CERT -X POST \
  -H "Content-Type: application/json" \
  -d '{"system_uids": ["<HPC_SYSTEM_ID>"]}' \
  $API/subjects/<HPC_SUBJECT_UUID>/units/

# Assign Zonal unit to zonal-subject
curl -sk --cert-type P12 --cert $CERT -X POST \
  -H "Content-Type: application/json" \
  -d '{"system_uids": ["<ZONAL_SYSTEM_ID>"]}' \
  $API/subjects/<ZONAL_SUBJECT_UUID>/units/
```

Once assigned, AosCloud pushes services to units via AMQP OTA automatically.

---

## 5. Deploy Service Versions

### Build and upload via broadcaster

```bash
# Build all C++ services
docker cp ./sdv-blueprint aos-broadcaster:/workspace/sdv-blueprint
docker exec aos-broadcaster bash -c "cd /workspace/sdv-blueprint && make all"

# Deploy each service
for SERVICE in signal-writer ev-range-extender signal-reporter; do
    docker exec aos-broadcaster bash -c "
      rm -rf /workspace/src /workspace/meta /workspace/service.tar.gz
      mkdir -p /workspace/src /workspace/meta
      cp /workspace/sdv-blueprint/build/$SERVICE /workspace/src/$SERVICE
      cp /workspace/sdv-blueprint/presets/${SERVICE}.yaml /workspace/meta/config.yaml
      touch /workspace/meta/default_state.dat
      cp /root/.aos/security/aos-user-sp.p12 /workspace/aos-user-sp.p12
      cd /workspace
      /usr/local/bin/aos-toolkit.sh sign
      /usr/local/bin/aos-toolkit.sh upload"
done
```

### Or use the Deployment UI

Open http://localhost:3010/deploy/ → select preset → click **Build & Deploy**.

---

## 6. Verify Deployment

### Check unit status via API

```bash
# List units
curl -sk --cert-type P12 --cert $CERT $API/units/ | python3 -m json.tool

# Check specific unit
curl -sk --cert-type P12 --cert $CERT $API/units/<UNIT_ID>/ | \
  python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Status: {d[\"online_status\"]}')"

# Check services on unit
curl -sk --cert-type P12 --cert $CERT $API/units/<UNIT_ID>/subjects-services/ | \
  python3 -c "
import json,sys
for s in json.load(sys.stdin)['items']:
    name = s['service']['title']
    status = s['service_versions']['pending_service_version_status']
    print(f'  {name}: {status}')
"
```

### Expected result

```
Unit 36651 (HPC):    Online
  EV Range Extender: installed
  Signal Reporter:   installed

Unit 36647 (Zonal):  Online
  Signal Writer:     installed
```

---

## Quick Reference

### Current Deployment

| Service | UUID | ID | Version | Target |
|---|---|---|---|---|
| Signal Writer | `242a46c7-f237-40e3-a37e-40529a39bf85` | 67064 | v1.0.10 | Zonal (36647) |
| EV Range Extender | `bb539aaa-682c-4a35-b492-19abed3118ff` | 67065 | v1.0.15 | HPC (36651) |
| Signal Reporter | `242dd4d4-7236-432d-88b9-ba9bbb3288f8` | 67066 | v1.0.15 | HPC (36651) |

### Subjects

| Subject | UUID | Services |
|---|---|---|
| hpc-subject | `c3852bf3-472a-42b5-b326-835ce83a170a` | EV Range Extender, Signal Reporter |
| zonal-subject | `f4cd9709-e05c-439a-925d-b3b6e3ec6f1a` | Signal Writer |

### Units

| Unit | ID | System ID | SSH (main) | SSH (secondary) |
|---|---|---|---|---|
| HPC | 36651 | `3fa22dc2ccc742de9961464c42bb8483` | :8942 | :8667 |
| Zonal | 36647 | `97f9e61238654363978a754916d6c9cf` | :8139 | :8222 |

### API Endpoints

| Action | Method | Endpoint |
|---|---|---|
| List units | GET | `/api/v10/units/` |
| Unit detail | GET | `/api/v10/units/{id}/` |
| List subjects | GET | `/api/v10/subjects/` |
| Assign unit to subject | POST | `/api/v10/subjects/{id}/units/` |
| List services | GET | `/api/v10/services/` |
| Upload service version | POST | `/api/v10/services/versions/` |
| Unit services status | GET | `/api/v10/units/{id}/subjects-services/` |
| Unit connection info | GET | `/api/v10/units/{id}/connection-info/` |
