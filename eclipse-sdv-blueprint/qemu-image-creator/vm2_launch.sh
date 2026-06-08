#!/bin/bash

# Copyright (c) 2026 Eclipse Foundation.
#
# This program and the accompanying materials are made available under the
# terms of the MIT License which is available at
# https://opensource.org/licenses/MIT.
#
# SPDX-License-Identifier: MIT

#!/bin/bash
set -e
echo "======================================"
echo "[INFO] LAUNCHING VM2"
echo "======================================"
VM_IMG="output/vm2.qcow2"
SEED_IMG="output/seed2.img"

if [ ! -f "$VM_IMG" ] || [ ! -f "$SEED_IMG" ]; then
    echo "[ERROR] VM2 files missing. Run ./setup.sh first"
    exit 1
fi

if [ -e /dev/kvm ] && groups | grep -q '\bkvm\b'; then
    KVM_FLAG="-enable-kvm"
    CPU_FLAG="-cpu host"
else
    KVM_FLAG=""
    CPU_FLAG="-cpu qemu64"
fi

echo "Starting VM2 silently in the background..."

qemu-system-x86_64 \
    $KVM_FLAG \
    $CPU_FLAG \
    -m 2048 \
    -smp 2 \
    -drive file=$VM_IMG,format=qcow2,if=virtio \
    -drive file=$SEED_IMG,format=raw,if=virtio \
    -netdev tap,id=net0,ifname=tap2,script=no,downscript=no \
    -device virtio-net-pci,netdev=net0,mac=52:54:00:12:34:52 \
    -netdev user,id=net1 \
    -device virtio-net-pci,netdev=net1,mac=52:54:00:12:34:62 \
    -display none \
    -daemonize