# aos-edge-toolchain - Self-contained Docker image for AosEdge service development
# Base: Ubuntu 24.04 with ARM64 cross-compiler and aos-signer
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV NODE_PATH=/usr/local/lib/node_modules

# Build-time proxy support
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ARG http_proxy
ARG https_proxy
ARG no_proxy

# Install build tools + ARM64 cross-compiler + Python + Node.js + gRPC deps
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    gcc-aarch64-linux-gnu \
    g++-aarch64-linux-gnu \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    curl \
    wget \
    git \
    jq \
    file \
    openssl \
    libnss3-tools \
    ca-certificates \
    docker.io \
    autoconf automake libtool pkg-config \
    protobuf-compiler libprotobuf-dev \
    libgrpc++-dev protobuf-compiler-grpc \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Socket.IO tooling + dockerode for coordinator
RUN npm install --global --prefix=/usr/local \
    socket.io-client \
    socket.io \
    https-proxy-agent \
    js-yaml \
    dockerode \
    && npm cache clean --force

# Create symlinks for easier access
RUN ln -sf /usr/bin/aarch64-linux-gnu-g++ /usr/local/bin/aarch64-linux-gnu-g++ && \
    ln -sf /usr/bin/aarch64-linux-gnu-gcc /usr/local/bin/aarch64-linux-gnu-gcc

# Install Conan 2 + aos-signer + aos-keys + Azure SDK
RUN pip3 install --no-cache-dir --break-system-packages \
    "conan>=2.0" \
    aos-signer==2.0.1 \
    aos-keys==1.10.0 \
    aos-prov==5.4.2 \
    azure-identity \
    azure-keyvault-secrets

# Setup Conan default profile and aarch64 cross-compile profile
RUN conan profile detect --force
COPY conan-profiles/ /root/.conan2/profiles/

# Cross-compile gRPC + protobuf + abseil for aarch64 (cached in image)
COPY conanfile-grpc.txt /tmp/conanfile-grpc.txt
RUN cd /tmp && conan install conanfile-grpc.txt \
    --profile:host aarch64-linux-gnu \
    --profile:build default \
    --build=missing \
    --output-folder /opt/grpc-aarch64 \
    || echo "gRPC cross-compile will be done on first build if this fails"

# Install Aos Root CA as trusted (for aos-signer TLS uploads)
RUN python3 -m aos_keys install-root 2>/dev/null || true

RUN if [ -f /root/.aos/scripts/install_aos_root_ca.sh ]; then \
      bash /root/.aos/scripts/install_aos_root_ca.sh; \
    fi

# Optional: KUKSA proto definitions
COPY proto/ /usr/local/share/kuksa-proto/

# Toolkit scripts
COPY scripts/ /usr/local/bin/

RUN chmod +x \
    /usr/local/bin/*.sh \
    /usr/local/bin/*.py \
    /usr/local/bin/*.js

WORKDIR /workspace

# Fetch certs from Key Vault, then launch toolkit
ENTRYPOINT ["sh", "-c", "python3 /usr/local/bin/init-certs.py && export SKIP_INIT_CERTS=true && exec /usr/local/bin/aos-toolkit.sh \"$@\"", "--"]

CMD ["help"]
