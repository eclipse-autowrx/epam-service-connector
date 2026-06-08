#!/bin/bash
# Copyright (c) 2026 Eclipse Foundation.
# SPDX-License-Identifier: MIT

# Stop KUKSA test environment started by start-kuksa.sh.

echo "Stopping KUKSA test environment..."

if [ -f /tmp/kuksa-feeder.pid ]; then
  kill "$(cat /tmp/kuksa-feeder.pid)" 2>/dev/null && echo "  Feeder stopped"
  rm -f /tmp/kuksa-feeder.pid
fi

if [ -f /tmp/kuksa-bridge.pid ]; then
  kill "$(cat /tmp/kuksa-bridge.pid)" 2>/dev/null && echo "  Bridge stopped"
  rm -f /tmp/kuksa-bridge.pid
fi

docker stop kuksa-databroker 2>/dev/null && echo "  KUKSA Databroker stopped"

echo "Done."
