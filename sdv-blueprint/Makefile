# Eclipse SDV Blueprint — Build C++ presets as STATIC binaries for AOS

KUKSA_PROTO_REPO  := https://raw.githubusercontent.com/eclipse-kuksa/kuksa-databroker/main/proto
PROTO_DIR         := generated
CXX               := g++
CXXFLAGS          := -std=c++17 -O2 -static -static-libgcc -static-libstdc++
PROTOC            := protoc
GRPC_PLUGIN       := /usr/bin/grpc_cpp_plugin

# Static linking flags - order matters!
STATIC_LIBS := -Wl,--whole-archive -lpthread -Wl,--no-whole-archive     -lgrpc++ -lgrpc -laddress_sorting -lupb -lcares_static -lz -lre2     -lgpr -lssl -lcrypto     -labsl_synchronization -labsl_graphcycles_internal     -labsl_time -labsl_time_zone -labsl_civil_time     -labsl_strings -labsl_strings_internal -labsl_str_format_internal     -labsl_cord -labsl_cordz_info -labsl_cord_internal -labsl_cordz_functions -labsl_cordz_handle     -labsl_hash -labsl_city -labsl_low_level_hash -labsl_raw_hash_set -labsl_hashtablez_sampler     -labsl_exponential_biased -labsl_statusor -labsl_status     -labsl_random_distributions -labsl_random_seed_sequences     -labsl_random_internal_pool_urbg -labsl_random_internal_randen -labsl_random_internal_randen_hwaes     -labsl_random_internal_randen_hwaes_impl -labsl_random_internal_randen_slow     -labsl_random_internal_platform -labsl_random_internal_seed_material -labsl_random_seed_gen_exception     -labsl_stacktrace -labsl_symbolize -labsl_debugging_internal -labsl_demangle_internal -labsl_malloc_internal     -labsl_base -labsl_spinlock_wait -labsl_int128 -labsl_throw_delegate -labsl_raw_logging_internal     -labsl_log_severity -labsl_bad_optional_access -labsl_bad_variant_access -labsl_strerror     -lprotobuf -latomic -lrt -ldl

BUILD_DIR := build
TARGETS := $(BUILD_DIR)/signal-writer $(BUILD_DIR)/ev-range-extender $(BUILD_DIR)/signal-reporter

.PHONY: all clean protos

all: protos $(TARGETS)

# ── Download KUKSA proto files ───────────────────────────────────────

protos: $(PROTO_DIR)/kuksa/val/v1/types.pb.cc $(PROTO_DIR)/kuksa/val/v1/val.pb.cc

$(PROTO_DIR)/kuksa/val/v1/%.proto:
	@mkdir -p $(PROTO_DIR)/kuksa/val/v1
	curl -sfL $(KUKSA_PROTO_REPO)/kuksa/val/v1/$*.proto -o $@

$(PROTO_DIR)/kuksa/val/v1/types.pb.cc: $(PROTO_DIR)/kuksa/val/v1/types.proto
	$(PROTOC) --proto_path=$(PROTO_DIR) --cpp_out=$(PROTO_DIR) --grpc_out=$(PROTO_DIR) --plugin=protoc-gen-grpc=$(GRPC_PLUGIN) $<

$(PROTO_DIR)/kuksa/val/v1/types.grpc.pb.cc: $(PROTO_DIR)/kuksa/val/v1/types.pb.cc
	@true

$(PROTO_DIR)/kuksa/val/v1/val.pb.cc: $(PROTO_DIR)/kuksa/val/v1/val.proto $(PROTO_DIR)/kuksa/val/v1/types.pb.cc
	$(PROTOC) --proto_path=$(PROTO_DIR) --cpp_out=$(PROTO_DIR) --grpc_out=$(PROTO_DIR) --plugin=protoc-gen-grpc=$(GRPC_PLUGIN) $<

$(PROTO_DIR)/kuksa/val/v1/val.grpc.pb.cc: $(PROTO_DIR)/kuksa/val/v1/val.pb.cc
	@true

# ── Build targets ──────────────────────────────────────────────────────

$(BUILD_DIR)/signal-writer: presets/signal-writer.cpp $(PROTO_DIR)/kuksa/val/v1/types.pb.cc $(PROTO_DIR)/kuksa/val/v1/types.grpc.pb.cc $(PROTO_DIR)/kuksa/val/v1/val.pb.cc $(PROTO_DIR)/kuksa/val/v1/val.grpc.pb.cc
	@mkdir -p $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) -I$(PROTO_DIR) $^ $(STATIC_LIBS) -o $@

$(BUILD_DIR)/ev-range-extender: presets/ev-range-extender.cpp $(PROTO_DIR)/kuksa/val/v1/types.pb.cc $(PROTO_DIR)/kuksa/val/v1/types.grpc.pb.cc $(PROTO_DIR)/kuksa/val/v1/val.pb.cc $(PROTO_DIR)/kuksa/val/v1/val.grpc.pb.cc
	@mkdir -p $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) -I$(PROTO_DIR) $^ $(STATIC_LIBS) -o $@

$(BUILD_DIR)/signal-reporter: presets/signal-reporter.cpp $(PROTO_DIR)/kuksa/val/v1/types.pb.cc $(PROTO_DIR)/kuksa/val/v1/types.grpc.pb.cc $(PROTO_DIR)/kuksa/val/v1/val.pb.cc $(PROTO_DIR)/kuksa/val/v1/val.grpc.pb.cc
	@mkdir -p $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) -I$(PROTO_DIR) $^ $(STATIC_LIBS) -o $@

clean:
	rm -rf $(PROTO_DIR) $(BUILD_DIR)
