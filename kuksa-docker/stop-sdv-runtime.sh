#!/bin/bash
# Copyright (c) 2026 Eclipse Foundation.
# SPDX-License-Identifier: MIT

# Stop SDV Runtime environment started by start-sdv-runtime.sh.

echo "Stopping SDV Runtime environment..."

if [ -f /tmp/kuksa-bridge.pid ]; then
  kill "$(cat /tmp/kuksa-bridge.pid)" 2>/dev/null && echo "  Bridge stopped"
  rm -f /tmp/kuksa-bridge.pid
fi

docker stop sdv-runtime 2>/dev/null && echo "  SDV Runtime stopped"

echo "Done."
