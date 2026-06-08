# AOS Edge Toolchain - Enhanced with C++ Static Build Support
# Extends base aos-edge-toolchain with protobuf, gRPC, and static libraries

FROM aos-edge-toolchain:latest

# Install C++ build dependencies for static linking
RUN apt-get update && \
    apt-get install -y \
        protobuf-compiler \
        protobuf-compiler-grpc \
        libgrpc++-dev \
        libprotobuf-dev \
        libc-ares-dev \
        libssl-dev \
        zlib1g-dev \
        libre2-dev \
        libabsl-dev \
        pkg-config && \
    rm -rf /var/lib/apt/lists/*

# Verify installations
RUN protoc --version && \
    grpc_cpp_plugin --version && \
    g++ --version

# Ready to build static C++ services
WORKDIR /workspace

CMD ["/bin/bash"]
