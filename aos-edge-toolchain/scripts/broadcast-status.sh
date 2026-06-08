#!/bin/bash
# Copyright (c) 2026 Eclipse Foundation.
# 
# This program and the accompanying materials are made available under the
# terms of the MIT License which is available at
# https://opensource.org/licenses/MIT.
#
# SPDX-License-Identifier: MIT

# AOS Edge Toolchain - Online Status Broadcaster
# Broadcasts Docker instance online status to Kit Manager via Socket.IO

set -e

# Configuration
KIT_MANAGER_URL="${KIT_MANAGER_URL:-https://kit.digitalauto.tech}"
INSTANCE_PREFIX="${INSTANCE_PREFIX:-AET}"
INSTANCE_SUFFIX="${INSTANCE_SUFFIX:-toolchain}"
INSTANCE_ID="${INSTANCE_ID:-}"
NODE_SERVER_PORT="${NODE_SERVER_PORT:-3091}"

# Generate instance ID if not provided
if [ -z "$INSTANCE_ID" ]; then
    # Generate a short unique ID
    RANDOM_STR=$(cat /proc/sys/kernel/random/uuid | cut -d'-' -f1 | tr '[:lower:]' '[:upper:]')
    INSTANCE_ID="${INSTANCE_PREFIX}-${RANDOM_STR}"
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_debug() { echo -e "${BLUE}[DEBUG]${NC} $1"; }

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    log_error "Node.js not found. Installing..."
    apt-get update && apt-get install -y nodejs npm
fi

# Create the Node.js broadcaster script
BROADCASTER_SCRIPT="/usr/local/bin/aos-broadcaster.js"

cat > "$BROADCASTER_SCRIPT" << 'EOFSCRIPT'
const io = require('socket.io-client');

// Configuration from environment
const kitManagerUrl = process.env.KIT_MANAGER_URL || 'https://kit.digitalauto.tech';
const instanceId = process.env.INSTANCE_ID || 'AET-unknown';
const instanceName = process.env.INSTANCE_NAME || 'AOS Edge Toolchain';
const broadcastInterval = parseInt(process.env.BROADCAST_INTERVAL || '30000'); // 30 seconds

console.log(`[Broadcaster] Starting: ${instanceId}`);
console.log(`[Broadcaster] Kit Manager: ${kitManagerUrl}`);

// Socket.IO connection
const socket = io(kitManagerUrl, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 5000,
  reconnectionDelayMax: 10000
});

let broadcastTimer = null;

socket.on('connect', () => {
  console.log('[Broadcaster] Connected to Kit Manager');

  // Register this instance
  const registration = {
    kit_id: instanceId,
    name: instanceName,
    desc: 'AOS Edge Toolchain - Docker build service for AOS applications',
    support_apis: [
      'aos_build_deploy',
      'aos_list_apps',
      'aos_start_app',
      'aos_stop_app',
      'aos_restart_app',
      'aos_uninstall_app',
      'aos_console_subscribe',
      'aos_app_output'
    ],
    type: 'aos-edge-toolchain',
    suffix: instanceId.split('-')[0], // AET
    online: true
  };

  socket.emit('register_kit', registration);
  console.log('[Broadcaster] Registration sent:', registration.kit_id);

  // Start periodic status broadcasts
  startBroadcasting();
});

socket.on('connect_error', (error) => {
  console.error('[Broadcaster] Connection error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.warn('[Broadcaster] Disconnected:', reason);
  stopBroadcasting();
});

socket.on('reconnect', (attemptNumber) => {
  console.log('[Broadcaster] Reconnected after', attemptNumber, 'attempts');
  startBroadcasting();
});

// Handle incoming messages from Kit Manager
socket.on('messageToKit', async (data) => {
  console.log('[Broadcaster] Received message:', data.type, data.cmd);

  // Echo back a response for now (actual handling would be in the main toolkit)
  const response = {
    id: data.id,
    kit_id: instanceId,
    type: data.type,
    status: 'received',
    message: 'Message received by AOS Edge Toolchain'
  };

  socket.emit('messageToKit-kitReply', response);
});

socket.on('register_kit_confirmed', (data) => {
  console.log('[Broadcaster] Registration confirmed');
});

function startBroadcasting() {
  if (broadcastTimer) return;

  // Send initial status
  broadcastStatus();

  // Set up periodic broadcasts
  broadcastTimer = setInterval(() => {
    broadcastStatus();
  }, broadcastInterval);

  console.log(`[Broadcaster] Status broadcasting started (interval: ${broadcastInterval}ms)`);
}

function stopBroadcasting() {
  if (broadcastTimer) {
    clearInterval(broadcastTimer);
    broadcastTimer = null;
    console.log('[Broadcaster] Status broadcasting stopped');
  }
}

function broadcastStatus() {
  const statusUpdate = {
    kit_id: instanceId,
    data: {
      online: true,
      last_seen: new Date().toISOString()
    }
  };

  socket.emit('report-runtime-state', statusUpdate);
  console.log(`[Broadcaster] Status broadcast: online=${statusUpdate.data.online}`);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[Broadcaster] Shutting down...');
  stopBroadcasting();
  socket.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[Broadcaster] Received SIGTERM, shutting down...');
  stopBroadcasting();
  socket.disconnect();
  process.exit(0);
});
EOFSCRIPT

# Export environment for the Node script
export KIT_MANAGER_URL INSTANCE_ID INSTANCE_NAME

log_info "Starting AOS Edge Toolchain broadcaster..."
log_info "Instance ID: $INSTANCE_ID"
log_info "Kit Manager: $KIT_MANAGER_URL"

# Start the broadcaster in background
node "$BROADCASTER_SCRIPT" &
BROADCASTER_PID=$!

log_info "Broadcaster started (PID: $BROADCASTER_PID)"

# Keep the script running
wait $BROADCASTER_PID
