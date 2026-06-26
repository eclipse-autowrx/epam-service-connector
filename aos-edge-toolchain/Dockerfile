# aos-edge-toolkit - Runtime toolkit for AOS provisioning and deployment
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

# Runtime dependencies only
RUN apt-get update && apt-get install -y \
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

# Install AOS CLI tools
RUN pip3 install --no-cache-dir --break-system-packages \
    aos-signer==2.0.1 \
    aos-keys==1.10.0 \
    aos-prov==5.4.1 \
    azure-identity \
    azure-keyvault-secrets

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
