#!/bin/bash
# Eclipse SDV Blueprint — Start all services
# Usage: ./start.sh [--no-vm]   (skip VM startup if already running)

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY FTP_PROXY ftp_proxy

INSTANCE_ID="${INSTANCE_ID:-AET-TOOLCHAIN-001}"
HPC_SSH="${HPC_SSH_PORT:-8942}"
ZONAL_SSH="${ZONAL_SSH_PORT:-8139}"
HPC_SEC_SSH="${HPC_SEC_SSH_PORT:-8667}"
ZONAL_SEC_SSH="${ZONAL_SEC_SSH_PORT:-8222}"
VM_PASSWORD="${VM_PASSWORD:-Password1}"

echo "============================================"
echo "  Eclipse SDV Blueprint — Startup"
echo "  Instance: $INSTANCE_ID"
echo "============================================"

# --- Step 1: Start VMs ---
if [[ "$1" != "--no-vm" ]]; then
  echo "[1/6] Starting VMs..."
  for vm in $(VBoxManage list vms | grep -oP '"\K[^"]+' | head -10); do
    state=$(VBoxManage showvminfo "$vm" --machinereadable 2>/dev/null | grep VMState= | head -1 | cut -d'"' -f2)
    network=$(VBoxManage showvminfo "$vm" --machinereadable 2>/dev/null | grep nat-network1 | head -1)
    if [[ "$network" == *"hpc-unit"* || "$network" == *"zonal-unit"* ]] && [[ "$state" != "running" ]]; then
      VBoxManage startvm "$vm" --type headless 2>/dev/null && echo "  Started: $vm" || true
    fi
  done
  echo "  Waiting 60s for VMs to boot..."
  sleep 60
else
  echo "[1/6] Skipping VM startup (--no-vm)"
fi

# --- Step 2: Fix SELinux + DNS ---
echo "[2/6] Configuring VMs (SELinux + DNS)..."
for PORT in $HPC_SSH $HPC_SEC_SSH $ZONAL_SSH $ZONAL_SEC_SSH; do
  sshpass -p "$VM_PASSWORD" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 -p $PORT root@localhost \
    "setenforce 0 2>/dev/null; mount -o remount,rw / 2>/dev/null; \
     mkdir -p /etc/systemd/resolved.conf.d; \
     printf '[Resolve]\nDNS=8.8.8.8 1.1.1.1\n' > /etc/systemd/resolved.conf.d/public-dns.conf; \
     systemctl restart systemd-resolved" 2>/dev/null && echo "  Port $PORT: OK" || echo "  Port $PORT: SKIP"
done

# --- Step 3: SSH tunnels ---
echo "[3/6] Setting up SSH tunnels..."
pkill -f "ssh.*-L.*55555" 2>/dev/null || true
pkill -f "ssh.*-L.*55556" 2>/dev/null || true
sleep 1
sshpass -p "$VM_PASSWORD" ssh -o StrictHostKeyChecking=no -f -N -L 55555:localhost:55555 -p $HPC_SSH root@localhost
sshpass -p "$VM_PASSWORD" ssh -o StrictHostKeyChecking=no -f -N -L 55556:localhost:55556 -p $ZONAL_SSH root@localhost
echo "  KUKSA HPC:   localhost:55555"
echo "  KUKSA Zonal: localhost:55556"

# --- Step 4: Broadcaster ---
echo "[4/6] Starting broadcaster ($INSTANCE_ID)..."
docker rm -f aos-broadcaster 2>/dev/null || true
sleep 1
docker run -d --network host \
  --name aos-broadcaster \
  -v ~/.aos/security/aos-user-sp.p12:/certs/aos-user-sp.p12:ro \
  -v "$ROOT_DIR/aos-edge-toolchain/scripts/aos-broadcaster.js:/usr/local/bin/aos-broadcaster.js:ro" \
  -e INSTANCE_ID="$INSTANCE_ID" \
  -e INSTANCE_NAME="AOS Edge Toolchain" \
  -e KIT_MANAGER_URL=https://kit.digitalauto.tech \
  -e CERT_FILE=/certs/aos-user-sp.p12 \
  -e AOSCLOUD_URL=https://aoscloud.io:10000 \
  -e SIGNAL_RELAY_PORT=9100 \
  -e NODE_TLS_REJECT_UNAUTHORIZED=0 \
  --entrypoint sh \
  aos-edge-toolchain:latest \
  -c "unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY && \
      python3 /usr/local/bin/init-certs.py && \
      exec node /usr/local/bin/aos-broadcaster.js" >/dev/null
sleep 5
echo "  Signal relay: localhost:9100"

# --- Step 5: Bridge + Simulator ---
echo "[5/6] Starting bridge + simulator..."
pkill -f kuksa-bridge.py 2>/dev/null || true
pkill -f simulator.py 2>/dev/null || true
sleep 1
env -i PATH="$PATH" HOME="$HOME" PYTHONUNBUFFERED=1 \
  ZONAL_KUKSA_ADDR=localhost:55556 HPC_KUKSA_ADDR=localhost:55555 \
  python3 sdv-blueprint/kuksa-sync/kuksa-bridge.py > /tmp/sdv-bridge.log 2>&1 &
env -i PATH="$PATH" HOME="$HOME" PYTHONUNBUFFERED=1 \
  KUKSA_ADDR=localhost:55556 \
  python3 sdv-blueprint/end-simulator/simulator.py > /tmp/sdv-endsim.log 2>&1 &
echo "  Bridge: Zonal → HPC"
echo "  Simulator: End sensors → Zonal"

# --- Step 6: Web server ---
echo "[6/6] Starting web server..."
pkill -f "node server.js" 2>/dev/null || true
sleep 1
cd sdv-blueprint && node server.js > /tmp/sdv-server.log 2>&1 &
sleep 2

echo ""
echo "============================================"
echo "  All services started!"
echo ""
echo "  Dashboard:  http://localhost:3010/dashboard"
echo "  Deployment: http://localhost:3010/deploy"
echo "  Broadcaster: $INSTANCE_ID"
echo "============================================"
