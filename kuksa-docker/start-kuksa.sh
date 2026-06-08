#!/bin/bash
# Copyright (c) 2026 Eclipse Foundation.
# SPDX-License-Identifier: MIT

# Start KUKSA Databroker + REST Bridge + Signal Feeder for testing.
# Usage: ./start-kuksa.sh [bridge_port]

set -e

BRIDGE_PORT="${1:-8888}"
KUKSA_PORT="${KUKSA_DATABROKER_PORT:-55555}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== KUKSA Vehicle Signal Test Environment ==="
echo "  KUKSA Databroker port: $KUKSA_PORT"
echo "  REST Bridge port:     $BRIDGE_PORT"
echo ""

# 1. Start KUKSA Databroker
echo "[1/3] Starting KUKSA Databroker..."
docker run -d --rm \
  --name kuksa-databroker \
  --network host \
  ghcr.io/eclipse-kuksa/kuksa-databroker:latest \
  --insecure --port "$KUKSA_PORT"

echo "      Waiting for databroker to be ready..."
sleep 3

# 2. Install Python dependency if needed
if ! python3 -c "import kuksa_client" 2>/dev/null; then
  echo "      Installing kuksa-client..."
  pip3 install --quiet kuksa-client 2>/dev/null || pip install --quiet kuksa-client 2>/dev/null
fi

# 3. Start REST Bridge
echo "[2/3] Starting REST Bridge..."
KUKSA_DATABROKER_HOST=127.0.0.1 \
KUKSA_DATABROKER_PORT="$KUKSA_PORT" \
BRIDGE_PORT="$BRIDGE_PORT" \
  python3 "$SCRIPT_DIR/bridge.py" &
BRIDGE_PID=$!
echo "$BRIDGE_PID" > /tmp/kuksa-bridge.pid
sleep 1

# 4. Start Signal Feeder
echo "[3/3] Starting Signal Feeder..."
KUKSA_DATABROKER_HOST=127.0.0.1 \
KUKSA_DATABROKER_PORT="$KUKSA_PORT" \
  python3 "$SCRIPT_DIR/feeder.py" &
FEEDER_PID=$!
echo "$FEEDER_PID" > /tmp/kuksa-feeder.pid

echo ""
echo "=== All services running ==="
echo "  KUKSA Databroker : localhost:$KUKSA_PORT  (docker: kuksa-databroker)"
echo "  REST Bridge      : localhost:$BRIDGE_PORT  (pid: $BRIDGE_PID)"
echo "  Signal Feeder    : (pid: $FEEDER_PID)"
echo ""
echo "Test:  curl http://localhost:$BRIDGE_PORT/api/v1/signals/Vehicle.Speed"
echo "Stop:  ./stop-kuksa.sh"
