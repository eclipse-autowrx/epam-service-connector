cmake_minimum_required(VERSION 3.16)
project(kuksa-vehicle-app-grpc CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find cross-compiled gRPC and protobuf (from Conan)
find_package(gRPC REQUIRED CONFIG)
find_package(protobuf REQUIRED CONFIG)

# Use system protoc + grpc_cpp_plugin (host binaries, not cross-compiled)
find_program(PROTOC protoc PATHS /usr/bin REQUIRED NO_CMAKE_FIND_ROOT_PATH)
find_program(GRPC_CPP_PLUGIN grpc_cpp_plugin
    PATHS /usr/bin /root/.conan2/p REQUIRED NO_CMAKE_FIND_ROOT_PATH)

set(PROTO_DIR "/usr/local/share/kuksa-proto")
set(PROTO_GEN_DIR "${CMAKE_BINARY_DIR}/generated/kuksa/val/v1")
file(MAKE_DIRECTORY ${PROTO_GEN_DIR})

# Generate C++ from KUKSA proto files using host protoc
foreach(proto_name types val)
    add_custom_command(
        OUTPUT
            ${PROTO_GEN_DIR}/${proto_name}.pb.cc
            ${PROTO_GEN_DIR}/${proto_name}.pb.h
            ${PROTO_GEN_DIR}/${proto_name}.grpc.pb.cc
            ${PROTO_GEN_DIR}/${proto_name}.grpc.pb.h
        COMMAND ${PROTOC}
            --proto_path=${PROTO_DIR}
            --cpp_out=${CMAKE_BINARY_DIR}/generated
            --grpc_out=${CMAKE_BINARY_DIR}/generated
            --plugin=protoc-gen-grpc=${GRPC_CPP_PLUGIN}
            ${PROTO_DIR}/kuksa/val/v1/${proto_name}.proto
        DEPENDS ${PROTO_DIR}/kuksa/val/v1/${proto_name}.proto
        COMMENT "Generating C++ for ${proto_name}.proto"
    )
endforeach()

add_executable(kuksa-vehicle-app
    src/main.cpp
    ${PROTO_GEN_DIR}/types.pb.cc
    ${PROTO_GEN_DIR}/types.grpc.pb.cc
    ${PROTO_GEN_DIR}/val.pb.cc
    ${PROTO_GEN_DIR}/val.grpc.pb.cc
)

target_include_directories(kuksa-vehicle-app PRIVATE ${CMAKE_BINARY_DIR}/generated)
target_link_libraries(kuksa-vehicle-app gRPC::grpc++ protobuf::libprotobuf)
