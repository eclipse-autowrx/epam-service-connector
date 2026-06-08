#!/bin/bash
# Copyright (c) 2026 Eclipse Foundation.
# SPDX-License-Identifier: MIT

# Start eclipse-autowrx/sdv-runtime (all-in-one SDV container) + REST Bridge.
# The sdv-runtime includes KUKSA Databroker, VSS 4.0, Mock Provider, Kit Manager,
# and connects to playground.digital.auto automatically.
#
# Usage: ./start-sdv-runtime.sh [runtime_name] [bridge_port]
# See: https://github.com/eclipse-autowrx/sdv-runtime

set -e

RUNTIME_NAME="${1:-AOS-KUKSA-Runtime}"
BRIDGE_PORT="${2:-8888}"
KUKSA_PORT="${KUKSA_DATABROKER_PORT:-55555}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== SDV Runtime + KUKSA Bridge ==="
echo "  Runtime name:         $RUNTIME_NAME"
echo "  KUKSA Databroker port: $KUKSA_PORT"
echo "  REST Bridge port:     $BRIDGE_PORT"
echo ""

# 1. Start sdv-runtime
echo "[1/2] Starting SDV Runtime (eclipse-autowrx/sdv-runtime)..."
docker run -d --rm \
  --name sdv-runtime \
  --network host \
  -e RUNTIME_NAME="$RUNTIME_NAME" \
  ghcr.io/eclipse-autowrx/sdv-runtime:latest

echo "      Container includes: KUKSA Databroker, VSS 4.0, Mock Provider, Kit Manager"
echo "      Waiting for databroker to be ready..."
sleep 5

# 2. Install Python dependency if needed
if ! python3 -c "import kuksa_client" 2>/dev/null; then
  echo "      Installing kuksa-client..."
  pip3 install --quiet kuksa-client 2>/dev/null || pip install --quiet kuksa-client 2>/dev/null
fi

# 3. Start REST Bridge
echo "[2/2] Starting REST Bridge..."
KUKSA_DATABROKER_HOST=127.0.0.1 \
KUKSA_DATABROKER_PORT="$KUKSA_PORT" \
BRIDGE_PORT="$BRIDGE_PORT" \
  python3 "$SCRIPT_DIR/bridge.py" &
BRIDGE_PID=$!
echo "$BRIDGE_PID" > /tmp/kuksa-bridge.pid
sleep 1

echo ""
echo "=== All services running ==="
echo "  SDV Runtime      : localhost:$KUKSA_PORT  (docker: sdv-runtime)"
echo "                     Mock signals auto-feeding via built-in provider"
echo "                     Connected to playground.digital.auto as '$RUNTIME_NAME'"
echo "  REST Bridge      : localhost:$BRIDGE_PORT  (pid: $BRIDGE_PID)"
echo ""
echo "Test:  curl http://localhost:$BRIDGE_PORT/api/v1/signals/Vehicle.Speed"
echo "Stop:  ./stop-sdv-runtime.sh"
echo ""
echo "Playground: https://playground.digital.auto  (look for runtime '$RUNTIME_NAME')"
