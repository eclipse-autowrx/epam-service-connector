#!/bin/bash
# Copyright (c) 2026 Eclipse Foundation.
# 
# This program and the accompanying materials are made available under the
# terms of the MIT License which is available at
# https://opensource.org/licenses/MIT.
#
# SPDX-License-Identifier: MIT

set -e

VERSION="1.0.0"
CERTS_DIR="/root/.aos/security"
OUTPUT_DIR="/workspace/output"

# Broadcaster configuration
BROADCASTER_ENABLED="${BROADCASTER_ENABLED:-true}"
KIT_MANAGER_URL="${KIT_MANAGER_URL:-https://kit.digitalauto.tech}"
INSTANCE_PREFIX="${INSTANCE_PREFIX:-AET}"
INSTANCE_ID="${INSTANCE_ID:-}"

# Generate instance ID if not provided
if [ -z "$INSTANCE_ID" ]; then
    RANDOM_STR=$(cat /proc/sys/kernel/random/uuid 2>/dev/null | cut -d'-' -f1 | tr '[:lower:]' '[:upper:]' || echo "TOOLCHAIN")
    INSTANCE_ID="${INSTANCE_PREFIX}-${RANDOM_STR}"
fi
export INSTANCE_ID

# Proxy: normalize env vars so curl, pip, npm, and aos-signer all see them.
# Accepts either upper or lowercase; exports both forms for maximum compat.
if [ -n "${HTTPS_PROXY:-${https_proxy:-}}" ]; then
    export HTTPS_PROXY="${HTTPS_PROXY:-$https_proxy}"
    export https_proxy="$HTTPS_PROXY"
fi
if [ -n "${HTTP_PROXY:-${http_proxy:-}}" ]; then
    export HTTP_PROXY="${HTTP_PROXY:-$http_proxy}"
    export http_proxy="$HTTP_PROXY"
fi
if [ -n "${NO_PROXY:-${no_proxy:-}}" ]; then
    export NO_PROXY="${NO_PROXY:-$no_proxy}"
    export no_proxy="$NO_PROXY"
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

# Start status broadcaster if enabled
start_broadcaster() {
    if [ "$BROADCASTER_ENABLED" = "true" ]; then
        log_info "Starting status broadcaster..."
        log_info "Instance ID: $INSTANCE_ID"
        log_info "Kit Manager: $KIT_MANAGER_URL"
        if [ -n "${HTTPS_PROXY:-}" ]; then
            log_info "Proxy: $HTTPS_PROXY"
        fi

        # Start broadcaster in background
        /usr/local/bin/aos-broadcaster.js &
        BROADCASTER_PID=$!
        echo "$BROADCASTER_PID" > /tmp/broadcaster.pid
        log_info "Broadcaster started (PID: $BROADCASTER_PID)"
    fi
}

# Stop status broadcaster
stop_broadcaster() {
    if [ -f /tmp/broadcaster.pid ]; then
        PID=$(cat /tmp/broadcaster.pid)
        if kill -0 "$PID" 2>/dev/null; then
            kill "$PID" 2>/dev/null || true
            log_info "Broadcaster stopped"
        fi
        rm -f /tmp/broadcaster.pid
    fi
}

# Trap signals to stop broadcaster
trap stop_broadcaster EXIT INT TERM

# Initialize certificates from Azure Key Vault (if configured)
# Also runs as part of Docker entrypoint, but this covers non-Docker usage
if [ "$SKIP_INIT_CERTS" != "true" ]; then
    python3 /usr/local/bin/init-certs.py || true
fi

# Build ARM64 static binary
build() {
    local input="${1:-/workspace/src/main.cpp}"
    local output="${2:-/workspace/output/app}"

    # Resolve to absolute paths before any cd
    [[ "$input" != /* ]] && input="$(pwd)/$input"
    [[ "$output" != /* ]] && output="$(pwd)/$output"

    mkdir -p "$(dirname "$output")"

    # Case 1: Input is a directory
    if [ -d "$input" ]; then
        log_info "Building from directory: $input"

        # Check for CMakeLists.txt
        if [ -f "$input/CMakeLists.txt" ]; then
            log_info "Found CMakeLists.txt, using CMake..."
            mkdir -p /workspace/build
            cd /workspace/build

            # If conanfile.txt exists, use Conan for dependency management
            if [ -f "$input/conanfile.txt" ] || [ -f "$input/conanfile.py" ]; then
                log_info "Found Conan file, installing dependencies for aarch64..."
                conan install "$input" \
                    --profile:host aarch64-linux-gnu \
                    --profile:build default \
                    --build=missing \
                    --output-folder /workspace/build 2>&1 || true
                cmake -DCMAKE_BUILD_TYPE=Release \
                      -DCMAKE_TOOLCHAIN_FILE=/workspace/build/conan_toolchain.cmake \
                      "$input"
            else
                cmake -DCMAKE_BUILD_TYPE=Release \
                      -DCMAKE_CXX_COMPILER=aarch64-linux-gnu-g++ \
                      -DCMAKE_CXX_FLAGS="-static -std=c++17 -O2" \
                      "$input"
            fi

            cmake --build . --config Release -j$(nproc)
            find . -maxdepth 2 -type f -executable ! -name "*.sh" -exec cp {} "$output" \; 2>/dev/null || \
            find . -name "kuksa-vehicle-app*" -type f -executable -exec cp {} "$output" \; 2>/dev/null
            log_info "Built: $output"
            file "$output"
            ls -lh "$output"
            return 0
        fi

        # Check for Makefile
        if [ -f "$input/Makefile" ]; then
            log_info "Found Makefile, using make..."
            cd "$input"
            make CC=aarch64-linux-gnu-gcc CXX=aarch64-linux-gnu-g++ \
                 CXXFLAGS="-static -std=c++17 -O2" -j$(nproc)
            for f in $(find . -maxdepth 1 -type f -executable); do
                cp "$f" "$output"
                break
            done
            log_info "Built: $output"
            file "$output"
            ls -lh "$output"
            return 0
        fi

        # No CMake or Makefile - compile all .cpp files
        log_info "No CMakeLists.txt or Makefile found, compiling all .cpp files..."
        local cpp_files=$(find "$input" -maxdepth 1 -name "*.cpp" -type f)
        local cpp_count=$(echo "$cpp_files" | grep -c "." || echo "0")

        if [ "$cpp_count" -eq 0 ]; then
            log_error "No .cpp files found in $input"
            return 1
        fi

        if [ "$cpp_count" -eq 1 ]; then
            log_info "Single .cpp file found, compiling..."
            aarch64-linux-gnu-g++ -static -std=c++17 -O2 \
                $cpp_files -o "$output"
        else
            log_info "Multiple .cpp files found ($cpp_count), linking together..."
            aarch64-linux-gnu-g++ -static -std=c++17 -O2 \
                $cpp_files -o "$output"
        fi
        log_info "Built: $output"
        file "$output"
        ls -lh "$output"
        return 0
    fi

    # Case 2: Input is a single file
    if [ -f "$input" ]; then
        log_info "Building single file: $input"
        aarch64-linux-gnu-g++ -static -std=c++17 -O2 \
            "$input" -o "$output"
        log_info "Built: $output"
        file "$output"
        ls -lh "$output"
        return 0
    fi

    log_error "Input not found: $input"
    return 1
}

# Sign service package using aos-signer
sign() {
    log_info "Signing service package..."

    # Check for required files
    if [ ! -f "/workspace/meta/config.yaml" ]; then
        log_error "meta/config.yaml not found"
        return 1
    fi

    if [ ! -f "/workspace/meta/default_state.dat" ]; then
        log_error "meta/default_state.dat not found"
        return 1
    fi

    # ⭐ CRITICAL: Check if binary exists in src/ for packaging
    # aos-signer packages files from src/ - binary MUST be there!
    local binary_name
    binary_name=$(grep -oP 'cmd:\s*/\K[\w-]+' /workspace/meta/config.yaml 2>/dev/null || echo "")
    if [ -n "$binary_name" ] && [ ! -f "/workspace/src/$binary_name" ]; then
        log_error "Binary NOT found in src/ directory!"
        echo ""
        echo "${YELLOW}=== CRITICAL STEP MISSING ===${NC}"
        echo "Your binary must be in src/ for aos-signer to package it."
        echo ""
        echo "After building, copy the binary to src/:"
        echo "  cp $binary_name src/"
        echo ""
        echo "Then run 'sign' again."
        echo "${YELLOW}============================${NC}"
        return 1
    fi

    if [ -f "/workspace/src/$binary_name" ]; then
        log_info "✓ Binary found in src/: $binary_name"
    fi

    # Copy certificate to workspace if referenced in config
    if grep -q "sign_pkcs12.*aos-user-sp.p12" /workspace/meta/config.yaml; then
        if [ ! -f "/workspace/aos-user-sp.p12" ]; then
            if [ -f "$CERTS_DIR/aos-user-sp.p12" ]; then
                log_info "Copying SP certificate to workspace..."
                cp "$CERTS_DIR/aos-user-sp.p12" /workspace/
            else
                log_error "Certificate not found at $CERTS_DIR/aos-user-sp.p12"
                log_error "Set AZURE_KEY_VAULT_NAME to fetch certificate from Azure Key Vault"
                return 1
            fi
        fi
    fi

    # Run aos-signer sign
    cd /workspace && aos-signer sign

    log_info "Service package signed: /workspace/service.tar.gz"
    local pkg_size
    pkg_size=$(stat -c%s /workspace/service.tar.gz 2>/dev/null || stat -f%z /workspace/service.tar.gz)
    ls -lh /workspace/service.tar.gz

    # ⭐ Warn if package is too small (likely only source, no binary)
    if [ "$pkg_size" -lt 100000 ]; then
        log_error "Package size suspiciously small ($(du -h /workspace/service.tar.gz | cut -f1))"
        echo ""
        echo "${RED}=== WARNING ===${NC}"
        echo "Package is too small - binary may NOT be included!"
        echo "Expected: ~900KB (with binary) | Got: <100KB (source only)"
        echo ""
        echo "Make sure you copied the binary to src/ before signing:"
        echo "  cp your-binary src/"
        echo "${RED}================${NC}"
    fi
}

# Upload service to AosCloud using aos-signer
upload() {
    log_info "Uploading service to AosCloud..."

    if [ ! -f "/workspace/service.tar.gz" ]; then
        log_error "service.tar.gz not found. Run 'sign' first."
        return 1
    fi

    # Run aos-signer upload
    cd /workspace && aos-signer upload

    log_info "Upload complete!"
}

# Build, sign, and upload in one command
deploy() {
    log_info "=== Full Deployment Pipeline ==="
    build "$@"
    sign
    upload
}

# Show help
show_help() {
    cat << HELP
aos-edge-toolchain v${VERSION}

Self-contained Docker image for AosEdge service development.
Cross-compiler, aos-signer, and Azure Key Vault certificate management.

USAGE (in Docker):
    # Build ARM64 binary (no certificate needed)
    docker run --rm -v \$(pwd):/workspace aos-edge-toolchain build [source] [output]

    # Sign service package (requires AZURE_KEY_VAULT_NAME)
    docker run --rm -e AZURE_KEY_VAULT_NAME=<vault> -v \$(pwd):/workspace aos-edge-toolchain sign

    # Upload to AosCloud (requires AZURE_KEY_VAULT_NAME)
    docker run --rm -e AZURE_KEY_VAULT_NAME=<vault> -v \$(pwd):/workspace aos-edge-toolchain upload

    # Full pipeline (build + sign + upload)
    docker run --rm -e AZURE_KEY_VAULT_NAME=<vault> -v \$(pwd):/workspace aos-edge-toolchain deploy [source] [output]

COMMANDS:
    build [source] [output]    Build ARM64 static binary
                              source can be: file.cpp, folder/, or folder/with/CMakeLists.txt
    sign                       Sign service package (uses aos-signer)
    upload                     Upload to AosCloud (uses aos-signer)
    deploy [source] [output]   Full pipeline: build + sign + upload

BUILD EXAMPLES:
    # Single file
    docker run --rm -v \$(pwd):/workspace aos-edge-toolchain build src/main.cpp app

    # Folder with multiple .cpp files (auto-link all)
    docker run --rm -v \$(pwd):/workspace aos-edge-toolchain build src/ app

    # Folder with CMakeLists.txt
    docker run --rm -v \$(pwd):/workspace aos-edge-toolchain build . build/myapp

    # Folder with Makefile
    docker run --rm -v \$(pwd):/workspace aos-edge-toolchain build . app

AOSCLOUD API (requires Key Vault certificate):
    # Create new service
    docker run --rm -e AZURE_KEY_VAULT_NAME=<vault> --entrypoint "" aos-edge-toolchain \
      sh -c "python3 /usr/local/bin/init-certs.py && \
      curl -k --http1.1 -X POST https://aoscloud.io:10000/api/v10/services/ \
      --cert /root/.aos/security/aos-user-sp.p12 --cert-type P12 \
      -H 'Content-Type: application/json' \
      -d '{title:\"My Service\"}'"

    # List services
    docker run --rm -e AZURE_KEY_VAULT_NAME=<vault> --entrypoint "" aos-edge-toolchain \
      sh -c "python3 /usr/local/bin/init-certs.py && \
      curl -k --http1.1 https://aoscloud.io:10000/api/v10/services/ \
      --cert /root/.aos/security/aos-user-sp.p12 --cert-type P12 \
      -H 'accept: application/json' | jq '.items[] | {uuid, title}'"

    # List units
    docker run --rm -e AZURE_KEY_VAULT_NAME=<vault> --entrypoint "" aos-edge-toolchain \
      sh -c "python3 /usr/local/bin/init-certs.py && \
      curl -k --http1.1 https://aoscloud.io:10000/api/v10/units/ \
      --cert /root/.aos/security/aos-user-sp.p12 --cert-type P12 \
      -H 'accept: application/json' | jq '.items[] | {id, system_uid, online_status}'"

PROXY (for corporate networks):
    docker run --rm \\
      -e HTTPS_PROXY=http://proxy.corp.example.com:8080 \\
      -e HTTP_PROXY=http://proxy.corp.example.com:8080 \\
      -e NO_PROXY=localhost,127.0.0.1,.corp.example.com \\
      ...

    All tools (curl, pip, npm, Socket.IO broadcaster, Azure SDK) honour
    HTTPS_PROXY / HTTP_PROXY / NO_PROXY environment variables.

CERTIFICATES (fetched from Azure Key Vault at runtime):
    - Set AZURE_KEY_VAULT_NAME to enable certificate fetch
    - Without it, only build works (sign/upload/API require certificate)
    - Certificate path after fetch: /root/.aos/security/aos-user-sp.p12

SERVICE STRUCTURE:
    /workspace/
    ├── hello-aos              # Compiled binary (ARM64)
    ├── meta/
    │   ├── config.yaml        # Service configuration
    │   └── default_state.dat  # State file
    └── aos-user-sp.p12        # SP certificate (auto-copied during sign)

HELP
}

case "${1:-help}" in
    build)   build "$2" "$3" ;;
    sign)    sign ;;
    upload)  upload ;;
    deploy)  shift; deploy "$@" ;;
    *)       show_help ;;
esac
