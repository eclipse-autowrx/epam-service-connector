#!/bin/bash
# Setup build environment inside aos-broadcaster container
# This script installs all dependencies needed to build C++ SDV Blueprint services

set -e

echo "[Setup] Installing build dependencies..."

# Unset proxy to avoid connection issues
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY

# Update package lists
apt update

# Install protobuf compiler and gRPC development libraries
apt install -y \
    protobuf-compiler \
    protobuf-compiler-grpc \
    libgrpc++-dev \
    libprotobuf-dev \
    pkg-config

echo "[Setup] Build tools installed successfully!"
echo "[Setup] Versions:"
protoc --version
g++ --version | head -1
aarch64-linux-gnu-g++ --version | head -1 || echo "ARM64 cross-compiler already available"

echo ""
echo "[Setup] Ready to build C++ services with:"
echo "  cd /workspace/sdv-blueprint"
echo "  make all"
