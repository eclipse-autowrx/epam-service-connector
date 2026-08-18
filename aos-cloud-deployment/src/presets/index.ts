// Copyright (c) 2026 Eclipse Foundation.
//
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

// Preset examples for AOS Cloud Deployment Plugin

export const PRESETS = {
  // ── C++ Presets ──

  helloAos: {
    name: 'Hello AOS',
    appName: 'hello-aos',
    description: 'Simple hello world application (aos-signer 2.x format)',
    cpp: `#include <iostream>
#include <thread>
#include <chrono>

#define VERSION "1.0.0"

int main() {
    std::cout << "========================================" << std::endl;
    std::cout << "AosEdge Hello Service" << std::endl;
    std::cout << "Version: " << VERSION << std::endl;
    std::cout << "Deployed via aos-edge-toolchain!" << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout.flush();

    int count = 0;
    while (true) {
        std::this_thread::sleep_for(std::chrono::seconds(10));
        count++;
        std::cout << "[" << count << "] Hello from AosEdge! v" << VERSION << std::endl;
        std::cout.flush();
    }

    return 0;
}`,
    yaml: `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
schemaVersion: 2

publisher:
  author: "developer@example.com"
  company: "Example Corp"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: "service"
      codename: "hello-aos"
      title: "Hello AOS Service"
      description: "Simple hello world application"
    version: "1.0.0"
    sourceFolder: "hello-aos"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: "/hello-aos"
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 1000
        ramLimit: 10MB
        storageLimit: 5MB
        stateLimit: 512KB
        tmpLimit: 256MiB`
  },

  kuksaWriter: {
    name: 'Signal Writer - Zonal Domain',
    appName: 'signal-writer',
    description: 'Writes Speed, SoC, AmbientTemp to KUKSA Databroker on Zonal node',
    cpp: `#include <iostream>
#include <string>
#include <thread>
#include <chrono>
#include <cstdlib>
#include <cmath>

#include <grpcpp/grpcpp.h>
#include "kuksa/val/v1/val.grpc.pb.h"
#include "kuksa/val/v1/types.pb.h"

#define VERSION "1.0.0"

static bool set_signal(kuksa::val::v1::VAL::Stub* stub,
                       const std::string& path, float value) {
    kuksa::val::v1::SetRequest request;
    auto* update = request.add_updates();
    update->mutable_entry()->set_path(path);
    update->mutable_entry()->mutable_value()->set_float_(value);
    update->add_fields(kuksa::val::v1::FIELD_VALUE);
    kuksa::val::v1::SetResponse response;
    grpc::ClientContext context;
    return stub->Set(&context, request, &response).ok();
}

int main(int argc, char* argv[]) {
    std::string target = "10.0.0.100:55556";
    int interval = 2;

    if (auto t = std::getenv("KUKSA_DATABROKER_ADDR")) target = t;
    if (auto i = std::getenv("WRITE_INTERVAL"))        interval = std::atoi(i);
    if (argc > 1) target   = argv[1];
    if (argc > 2) interval = std::atoi(argv[2]);

    std::cout << "========================================" << std::endl;
    std::cout << "  KUKSA Signal Writer" << std::endl;
    std::cout << "  Version:    " << VERSION << std::endl;
    std::cout << "  Databroker: " << target << std::endl;
    std::cout << "  Interval:   " << interval << "s" << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout.flush();

    auto channel = grpc::CreateChannel(target, grpc::InsecureChannelCredentials());
    auto stub = kuksa::val::v1::VAL::NewStub(channel);

    for (int r = 1; r <= 15; r++) {
        kuksa::val::v1::GetServerInfoRequest req;
        kuksa::val::v1::GetServerInfoResponse resp;
        grpc::ClientContext ctx;
        ctx.set_deadline(std::chrono::system_clock::now() + std::chrono::seconds(3));
        auto st = stub->GetServerInfo(&ctx, req, &resp);
        if (st.ok()) {
            std::cout << "[Writer] Connected: " << resp.name()
                      << " " << resp.version() << std::endl;
            break;
        }
        if (r == 15) std::cerr << "[Writer] Unreachable: " << target << std::endl;
        std::cout << "[Writer] Waiting (" << r << "/15)..." << std::endl;
        std::cout.flush();
        std::this_thread::sleep_for(std::chrono::seconds(2));
    }

    int t = 0;
    while (true) {
        float speed = 40.0f + 30.0f * std::sin(t * 0.1f);
        float temp  = 22.0f +  5.0f * std::sin(t * 0.05f);
        float soc   = std::fmax(0.0f, std::fmin(100.0f, 80.0f - t * 0.01f));

        set_signal(stub.get(), "Vehicle.Speed", speed);
        set_signal(stub.get(), "Vehicle.Cabin.HVAC.AmbientAirTemperature", temp);
        set_signal(stub.get(), "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current", soc);

        if (t % 5 == 0) {
            std::cout << "[Writer] t=" << t
                      << " Speed=" << speed
                      << " Temp=" << temp
                      << " SoC=" << soc << std::endl;
            std::cout.flush();
        }
        t++;
        std::this_thread::sleep_for(std::chrono::seconds(interval));
    }
    return 0;
}`,
    yaml: `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
schemaVersion: 2

publisher:
  author: "developer@example.com"
  company: "Example Corp"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: "service"
      codename: "signal-writer"
      title: "Signal Writer - Zonal Domain"
      description: "Writes Speed, SoC, AmbientTemp to KUKSA Databroker"
    version: "1.0.0"
    sourceFolder: "signal-writer"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: "/signal-writer"
      env:
        - "KUKSA_DATABROKER_ADDR=172.17.0.1:55556"
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 1000
        ramLimit: 10MB
        storageLimit: 5MB
        stateLimit: 512KB
        tmpLimit: 256MiB`
  },

  kuksaReader: {
    name: 'KUKSA Reader',
    appName: 'kuksa-reader',
    description: 'Subscribes to vehicle signals from KUKSA Databroker via gRPC Subscribe() streaming',
    cpp: `#include <iostream>
#include <string>
#include <thread>
#include <chrono>
#include <cstdlib>

#include <grpcpp/grpcpp.h>
#include "kuksa/val/v1/val.grpc.pb.h"
#include "kuksa/val/v1/types.pb.h"

#define VERSION "1.0.0"

static std::string format_value(const kuksa::val::v1::Datapoint& dp) {
    switch (dp.value_case()) {
        case kuksa::val::v1::Datapoint::kFloat:  return std::to_string(dp.float_());
        case kuksa::val::v1::Datapoint::kDouble: return std::to_string(dp.double_());
        case kuksa::val::v1::Datapoint::kInt32:  return std::to_string(dp.int32());
        case kuksa::val::v1::Datapoint::kUint32: return std::to_string(dp.uint32());
        case kuksa::val::v1::Datapoint::kBool:   return dp.bool_() ? "true" : "false";
        case kuksa::val::v1::Datapoint::kString: return dp.string();
        default: return "N/A";
    }
}

int main(int argc, char* argv[]) {
    std::string target = "10.0.0.100:55556";
    if (auto t = std::getenv("KUKSA_DATABROKER_ADDR")) target = t;
    if (argc > 1) target = argv[1];

    std::cout << "========================================" << std::endl;
    std::cout << "  KUKSA Signal Reader (Subscribe)" << std::endl;
    std::cout << "  Version:    " << VERSION << std::endl;
    std::cout << "  Databroker: " << target << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout.flush();

    auto channel = grpc::CreateChannel(target, grpc::InsecureChannelCredentials());
    auto stub = kuksa::val::v1::VAL::NewStub(channel);

    for (int r = 1; r <= 15; r++) {
        kuksa::val::v1::GetServerInfoRequest req;
        kuksa::val::v1::GetServerInfoResponse resp;
        grpc::ClientContext ctx;
        ctx.set_deadline(std::chrono::system_clock::now() + std::chrono::seconds(3));
        auto st = stub->GetServerInfo(&ctx, req, &resp);
        if (st.ok()) {
            std::cout << "[Reader] Connected: " << resp.name()
                      << " " << resp.version() << std::endl;
            break;
        }
        if (r == 15) { std::cerr << "[Reader] Unreachable: " << target << std::endl; return 1; }
        std::cout << "[Reader] Waiting (" << r << "/15)..." << std::endl;
        std::cout.flush();
        std::this_thread::sleep_for(std::chrono::seconds(2));
    }

    kuksa::val::v1::SubscribeRequest sub_req;
    for (const auto& path : {"Vehicle.Speed",
                              "Vehicle.Cabin.HVAC.AmbientAirTemperature",
                              "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current"}) {
        auto* entry = sub_req.add_entries();
        entry->set_path(path);
        entry->set_view(kuksa::val::v1::VIEW_CURRENT_VALUE);
        entry->add_fields(kuksa::val::v1::FIELD_VALUE);
    }

    std::cout << "[Reader] Subscribing to 3 signals..." << std::endl;
    std::cout.flush();

    int msg_count = 0;
    while (true) {
        grpc::ClientContext ctx;
        auto reader = stub->Subscribe(&ctx, sub_req);
        kuksa::val::v1::SubscribeResponse response;
        while (reader->Read(&response)) {
            msg_count++;
            std::cout << "[Reader] #" << msg_count << ":";
            for (const auto& update : response.updates())
                std::cout << " " << update.entry().path()
                          << "=" << format_value(update.entry().value());
            std::cout << std::endl;
            std::cout.flush();
        }
        auto status = reader->Finish();
        std::cerr << "[Reader] Stream ended: " << status.error_message() << std::endl;
        std::cout << "[Reader] Reconnecting in 5s..." << std::endl;
        std::cout.flush();
        std::this_thread::sleep_for(std::chrono::seconds(5));
    }
    return 0;
}`,
    yaml: `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
schemaVersion: 2

publisher:
  author: "developer@example.com"
  company: "Example Corp"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: "service"
      codename: "kuksa-reader"
      title: "KUKSA Reader"
      description: "Subscribes to vehicle signals from KUKSA Databroker"
    version: "1.0.0"
    sourceFolder: "kuksa-reader"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: "/kuksa-reader"
      env:
        - "KUKSA_DATABROKER_ADDR=172.17.0.1:55555"
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 1000
        ramLimit: 10MB
        storageLimit: 5MB
        stateLimit: 512KB
        tmpLimit: 256MiB`
  },

  evRangeExtender: {
    name: 'EV Range Extender - HPC Domain',
    appName: 'ev-range-extender',
    description: 'Battery management, range computation, power-saving mode control for HPC node',
    cpp: `#include <iostream>
#include <string>
#include <thread>
#include <chrono>
#include <cstdlib>
#include <cmath>
#include <atomic>
#include <csignal>
#include <grpcpp/grpcpp.h>
#include "kuksa/val/v1/val.grpc.pb.h"
#include "kuksa/val/v1/types.pb.h"
#define VERSION "1.0.7"
#define SOC_THRESHOLD 30.0f
#define SOC_THRESHOLD_1 50.0f
#define NORMAL_EFFICIENCY 5.5f
#define DEGRADED_EFFICIENCY 4.0f

static const char* RANGE_PATH     = "Vehicle.Powertrain.Range";
static const char* SOC_PATH       = "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current";
static const char* HVAC_PATH      = "Vehicle.Cabin.HVAC.AmbientAirTemperature";
static const char* SEAT_HEAT_PATH = "Vehicle.Cabin.Seat.Row1.DriverSide.Heating";
static const char* SEAT_HC_PATH   = "Vehicle.Cabin.Seat.Row1.DriverSide.HeatingCooling";

static std::atomic<bool> g_running{true};

static float get_signal(kuksa::val::v1::VAL::Stub* stub,
                        const std::string& path) {
    kuksa::val::v1::GetRequest request;
    auto* entry = request.add_entries();
    entry->set_path(path);
    entry->set_view(kuksa::val::v1::VIEW_CURRENT_VALUE);
    entry->add_fields(kuksa::val::v1::FIELD_VALUE);
    kuksa::val::v1::GetResponse response;
    grpc::ClientContext context;
    context.set_deadline(std::chrono::system_clock::now() +
                         std::chrono::seconds(3));
    auto status = stub->Get(&context, request, &response);
    if (!status.ok() || response.entries_size() == 0) return -1.0f;
    const auto& dp = response.entries(0).value();
    switch (dp.value_case()) {
        case kuksa::val::v1::Datapoint::kFloat:  return dp.float_();
        case kuksa::val::v1::Datapoint::kDouble: return static_cast<float>(dp.double_());
        case kuksa::val::v1::Datapoint::kInt32:  return static_cast<float>(dp.int32());
        case kuksa::val::v1::Datapoint::kUint32: return static_cast<float>(dp.uint32());
        default: return -1.0f;
    }
}

static bool set_signal(kuksa::val::v1::VAL::Stub* stub,
                       const std::string& path, float value) {
    kuksa::val::v1::SetRequest request;
    auto* update = request.add_updates();
    update->mutable_entry()->set_path(path);
    update->mutable_entry()->mutable_value()->set_float_(value);
    update->add_fields(kuksa::val::v1::FIELD_VALUE);
    kuksa::val::v1::SetResponse response;
    grpc::ClientContext context;
    context.set_deadline(std::chrono::system_clock::now() +
                         std::chrono::seconds(3));
    return stub->Set(&context, request, &response).ok();
}

static bool set_acct_signal(kuksa::val::v1::VAL::Stub* stub,
                       const std::string& path, int value) {
    kuksa::val::v1::SetRequest request;
    auto* update = request.add_updates();
    update->mutable_entry()->set_path(path);
    update->mutable_entry()->mutable_value()->set_int32(value);
    update->add_fields(kuksa::val::v1::FIELD_VALUE);
    kuksa::val::v1::SetResponse response;
    grpc::ClientContext context;
    context.set_deadline(std::chrono::system_clock::now() +
                         std::chrono::seconds(3));
    return stub->Set(&context, request, &response).ok();
}

static float as_float(const kuksa::val::v1::Datapoint& dp) {
    switch (dp.value_case()) {
        case kuksa::val::v1::Datapoint::kFloat:  return dp.float_();
        case kuksa::val::v1::Datapoint::kDouble: return static_cast<float>(dp.double_());
        case kuksa::val::v1::Datapoint::kInt32:  return static_cast<float>(dp.int32());
        case kuksa::val::v1::Datapoint::kUint32: return static_cast<float>(dp.uint32());
        default: return 0.0f;
    }
}

static int as_int(const kuksa::val::v1::Datapoint& dp) {
    switch (dp.value_case()) {
        case kuksa::val::v1::Datapoint::kInt32: return dp.int32();
        case kuksa::val::v1::Datapoint::kUint32: return static_cast<int>(dp.uint32());
        case kuksa::val::v1::Datapoint::kFloat: return static_cast<int>(dp.float_());
        case kuksa::val::v1::Datapoint::kBool: return dp.bool_() ? 1 : 0;
        default: return 0;
    }
}

static void run(kuksa::val::v1::VAL::Stub* stub,
                float hvac_threshold, float seat_threshold) {
    float soc = 100.0f;
    float vehicle_range = 0.0f;
    bool hvac_cut = false;
    bool seat_cut = false;

    kuksa::val::v1::SubscribeRequest sub_req;
    for (const char* path : { RANGE_PATH, SOC_PATH, HVAC_PATH, SEAT_HEAT_PATH, SEAT_HC_PATH }) {
        auto* entry = sub_req.add_entries();
        entry->set_path(path);
        entry->set_view(kuksa::val::v1::VIEW_CURRENT_VALUE);
        entry->add_fields(kuksa::val::v1::FIELD_VALUE);
    }

    while (g_running) {
        grpc::ClientContext ctx;
        auto reader = stub->Subscribe(&ctx, sub_req);
        kuksa::val::v1::SubscribeResponse response;

        while (g_running && reader->Read(&response)) {
            for (const auto& update : response.updates()) {
                const std::string& path = update.entry().path();
                const auto& dp = update.entry().value();

                if (path == RANGE_PATH) {
                    vehicle_range = as_float(dp);
                } else if (path == SOC_PATH) {
                    soc = as_float(dp);
                    std::cout << "Charge: " << soc << "% | Range: " << vehicle_range << std::endl;

                    if (soc < hvac_threshold && !hvac_cut) {
                        std::cout << "[!] Charge=" << soc << "% | Range=" << vehicle_range
                                  << " < " << hvac_threshold << "% -> Turning HVAC off" << std::endl;
                        set_signal(stub, HVAC_PATH, 0.0f);
                        hvac_cut = true;
                    } else if (soc >= hvac_threshold && hvac_cut) {
                        std::cout << "[+] Charge=" << soc << "% | Range=" << vehicle_range
                                  << " >= " << hvac_threshold << "% -> HVAC restriction lifted" << std::endl;
                        hvac_cut = false;
                    }

                    if (soc < seat_threshold && !seat_cut) {
                        std::cout << "[!] Charge=" << soc << "% | Range=" << vehicle_range
                                  << " < " << seat_threshold << "% -> Turning Seat Heating/Cooling off" << std::endl;
                        set_acct_signal(stub, SEAT_HEAT_PATH, 0);
                        set_acct_signal(stub, SEAT_HC_PATH, 0);
                        seat_cut = true;
                    } else if (soc >= seat_threshold && seat_cut) {
                        std::cout << "[+] Charge=" << soc << "% | Range=" << vehicle_range
                                  << " >= " << seat_threshold << "% -> Seat restriction lifted" << std::endl;
                        seat_cut = false;
                    }
                } else if (path == HVAC_PATH && hvac_cut && as_float(dp) != 0.0f) {
                    std::cout << "[!] Battery low -> blocking HVAC re-activation" << std::endl;
                    set_signal(stub, HVAC_PATH, 0.0f);
                } else if (path == SEAT_HEAT_PATH && seat_cut && as_int(dp) != 0) {
                    std::cout << "[!] Battery low -> blocking Seat Heating re-activation" << std::endl;
                    set_acct_signal(stub, SEAT_HEAT_PATH, 0);
                } else if (path == SEAT_HC_PATH && seat_cut && as_int(dp) != 0) {
                    std::cout << "[!] Battery low -> blocking Seat HeatingCooling re-activation" << std::endl;
                    set_acct_signal(stub, SEAT_HC_PATH, 0);
                }
            }
        }

        if (!g_running) break;
        auto status = reader->Finish();
        std::cerr << "[RangeExt] Stream ended: " << status.error_message() << std::endl;
        std::cout << "[RangeExt] Reconnecting in 5s..." << std::endl;
        std::this_thread::sleep_for(std::chrono::seconds(5));
    }
}

int main(int argc, char* argv[]) {
    std::string target = "10.0.0.100:55555";
    float hvac_threshold = std::getenv("HVAC_OFF_THRESHOLD")
        ? std::atof(std::getenv("HVAC_OFF_THRESHOLD")) : 50.0f;
    float seat_threshold = std::getenv("SEAT_OFF_THRESHOLD")
        ? std::atof(std::getenv("SEAT_OFF_THRESHOLD")) : 30.0f;
    if (auto t = std::getenv("KUKSA_DATABROKER_ADDR")) target = t;
    if (argc > 1) target = argv[1];
    if (argc > 2) hvac_threshold = std::atof(argv[2]);
    if (argc > 3) seat_threshold = std::atof(argv[3]);

    std::signal(SIGINT, [](int) { g_running = false; });
    std::signal(SIGTERM, [](int) { g_running = false; });

    std::cout << "========================================" << std::endl;
    std::cout << "  EV Range Extender" << std::endl;
    std::cout << "  Version:       " << VERSION << std::endl;
    std::cout << "  Databroker:    " << target << std::endl;
    std::cout << "  HVAC off below: " << hvac_threshold << "%" << std::endl;
    std::cout << "  Seat off below: " << seat_threshold << "%" << std::endl;
    std::cout << "========================================" << std::endl;

    auto channel = grpc::CreateChannel(target, grpc::InsecureChannelCredentials());
    auto stub = kuksa::val::v1::VAL::NewStub(channel);
    for (int r = 1; r <= 15; r++) {
        kuksa::val::v1::GetServerInfoRequest req;
        kuksa::val::v1::GetServerInfoResponse resp;
        grpc::ClientContext ctx;
        ctx.set_deadline(std::chrono::system_clock::now() + std::chrono::seconds(3));
        auto status = stub->GetServerInfo(&ctx, req, &resp);
        if (status.ok()) {
            std::cout << "[RangeExt] Connected: " << resp.name() << " " << resp.version() << std::endl;
            break;
        }
        if (r == 15) {
            std::cerr << "[RangeExt] Unreachable: " << target << std::endl;
            return 1;
        }
        std::cout << "[RangeExt] Waiting (" << r << "/15)..." << std::endl;
        std::this_thread::sleep_for(std::chrono::seconds(2));
    }

    run(stub.get(), hvac_threshold, seat_threshold);
    std::cout << "EV Range Extender: shutdown, no signal reset needed." << std::endl;
    return 0;
}`,
    yaml: `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
schemaVersion: 2

publisher:
  author: "developer@example.com"
  company: "Example Corp"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: "service"
      codename: "ev-range-extender"
      title: "EV Range Extender - HPC Domain"
      description: "Battery management, range computation, power-saving mode control"
    version: "3.0.1"
    sourceFolder: "ev-range-extender"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: "/ev-range-extender"
      env:
        - "KUKSA_DATABROKER_ADDR=10.0.0.100:55555"
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 1000
        ramLimit: 10MB
        storageLimit: 5MB
        stateLimit: 512KB
        tmpLimit: 256MiB`
  },

  batteryEnergySaver: {
    name: 'Battery Energy Saver - HPC Domain',
    appName: 'battery-energy-saver',
    description: 'Forces HVAC and seat heating/cooling off when SoC drops below configurable thresholds; blocks re-activation while battery is low',
    cpp: `#include <iostream>
#include <string>
#include <thread>
#include <chrono>
#include <cstdlib>
#include <csignal>
#include <atomic>

#include <grpcpp/grpcpp.h>
#include "kuksa/val/v1/val.grpc.pb.h"
#include "kuksa/val/v1/types.pb.h"

#define VERSION "1.0.0"
#define DEFAULT_HVAC_OFF_THRESHOLD 50.0f
#define DEFAULT_SEAT_OFF_THRESHOLD 30.0f

static const char* RANGE_PATH     = "Vehicle.Powertrain.Range";
static const char* SOC_PATH       = "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current";
static const char* HVAC_PATH      = "Vehicle.Cabin.HVAC.AmbientAirTemperature";
static const char* SEAT_HEAT_PATH = "Vehicle.Cabin.Seat.Row1.DriverSide.Heating";
static const char* SEAT_HC_PATH   = "Vehicle.Cabin.Seat.Row1.DriverSide.HeatingCooling";

static std::atomic<bool> g_running{true};

static float as_float(const kuksa::val::v1::Datapoint& dp) {
    switch (dp.value_case()) {
        case kuksa::val::v1::Datapoint::kFloat:  return dp.float_();
        case kuksa::val::v1::Datapoint::kDouble: return static_cast<float>(dp.double_());
        case kuksa::val::v1::Datapoint::kInt32:  return static_cast<float>(dp.int32());
        case kuksa::val::v1::Datapoint::kUint32: return static_cast<float>(dp.uint32());
        default: return 0.0f;
    }
}

static int as_int(const kuksa::val::v1::Datapoint& dp) {
    switch (dp.value_case()) {
        case kuksa::val::v1::Datapoint::kInt32:  return dp.int32();
        case kuksa::val::v1::Datapoint::kUint32: return static_cast<int>(dp.uint32());
        case kuksa::val::v1::Datapoint::kFloat:  return static_cast<int>(dp.float_());
        case kuksa::val::v1::Datapoint::kBool:   return dp.bool_() ? 1 : 0;
        default: return 0;
    }
}

static bool set_float(kuksa::val::v1::VAL::Stub* stub,
                      const std::string& path, float value) {
    kuksa::val::v1::SetRequest request;
    auto* update = request.add_updates();
    update->mutable_entry()->set_path(path);
    update->mutable_entry()->mutable_value()->set_float_(value);
    update->add_fields(kuksa::val::v1::FIELD_VALUE);
    kuksa::val::v1::SetResponse response;
    grpc::ClientContext context;
    context.set_deadline(std::chrono::system_clock::now() + std::chrono::seconds(3));
    return stub->Set(&context, request, &response).ok();
}

static bool set_int(kuksa::val::v1::VAL::Stub* stub,
                    const std::string& path, int value) {
    kuksa::val::v1::SetRequest request;
    auto* update = request.add_updates();
    update->mutable_entry()->set_path(path);
    update->mutable_entry()->mutable_value()->set_int32(value);
    update->add_fields(kuksa::val::v1::FIELD_VALUE);
    kuksa::val::v1::SetResponse response;
    grpc::ClientContext context;
    context.set_deadline(std::chrono::system_clock::now() + std::chrono::seconds(3));
    return stub->Set(&context, request, &response).ok();
}

static void run(kuksa::val::v1::VAL::Stub* stub,
                float hvac_threshold, float seat_threshold) {
    float soc = 100.0f, vehicle_range = 0.0f;
    bool  hvac_cut = false, seat_cut = false;

    kuksa::val::v1::SubscribeRequest sub_req;
    for (const char* path : { RANGE_PATH, SOC_PATH, HVAC_PATH, SEAT_HEAT_PATH, SEAT_HC_PATH }) {
        auto* entry = sub_req.add_entries();
        entry->set_path(path);
        entry->set_view(kuksa::val::v1::VIEW_CURRENT_VALUE);
        entry->add_fields(kuksa::val::v1::FIELD_VALUE);
    }

    while (g_running) {
        grpc::ClientContext ctx;
        auto reader = stub->Subscribe(&ctx, sub_req);
        kuksa::val::v1::SubscribeResponse response;

        while (g_running && reader->Read(&response)) {
            for (const auto& update : response.updates()) {
                const std::string& path = update.entry().path();
                const auto& dp = update.entry().value();

                if (path == RANGE_PATH) {
                    vehicle_range = as_float(dp);
                } else if (path == SOC_PATH) {
                    soc = as_float(dp);
                    std::cout << "Charge: " << soc << "% | Range: " << vehicle_range << std::endl;

                    if (soc < hvac_threshold && !hvac_cut) {
                        std::cout << "[!] SoC=" << soc << "% < " << hvac_threshold << "%  ->  Turning HVAC off" << std::endl;
                        set_float(stub, HVAC_PATH, 0.0f);
                        hvac_cut = true;
                    } else if (soc >= hvac_threshold && hvac_cut) {
                        std::cout << "[+] SoC=" << soc << "%  ->  HVAC restriction lifted" << std::endl;
                        hvac_cut = false;
                    }
                    if (soc < seat_threshold && !seat_cut) {
                        std::cout << "[!] SoC=" << soc << "% < " << seat_threshold << "%  ->  Turning Seat Heating/Cooling off" << std::endl;
                        set_int(stub, SEAT_HEAT_PATH, 0);
                        set_int(stub, SEAT_HC_PATH, 0);
                        seat_cut = true;
                    } else if (soc >= seat_threshold && seat_cut) {
                        std::cout << "[+] SoC=" << soc << "%  ->  Seat restriction lifted" << std::endl;
                        seat_cut = false;
                    }
                } else if (path == HVAC_PATH && hvac_cut) {
                    if (as_float(dp) != 0.0f) {
                        std::cout << "[!] Battery low  ->  blocking HVAC re-activation" << std::endl;
                        set_float(stub, HVAC_PATH, 0.0f);
                    }
                } else if (path == SEAT_HEAT_PATH && seat_cut) {
                    if (as_int(dp) != 0) {
                        std::cout << "[!] Battery low  ->  blocking Seat Heating re-activation" << std::endl;
                        set_int(stub, SEAT_HEAT_PATH, 0);
                    }
                } else if (path == SEAT_HC_PATH && seat_cut) {
                    if (as_int(dp) != 0) {
                        std::cout << "[!] Battery low  ->  blocking Seat HeatingCooling re-activation" << std::endl;
                        set_int(stub, SEAT_HC_PATH, 0);
                    }
                }
            }
        }

        if (!g_running) break;
        auto status = reader->Finish();
        std::cerr << "[EnergySaver] Stream ended: " << status.error_message() << std::endl;
        std::cout << "[EnergySaver] Reconnecting in 5s..." << std::endl;
        std::cout.flush();
        std::this_thread::sleep_for(std::chrono::seconds(5));
    }
}

int main(int argc, char* argv[]) {
    std::string target   = "172.17.0.1:55555";
    float hvac_threshold = DEFAULT_HVAC_OFF_THRESHOLD;
    float seat_threshold = DEFAULT_SEAT_OFF_THRESHOLD;

    if (auto t = std::getenv("KUKSA_DATABROKER_ADDR")) target         = t;
    if (auto h = std::getenv("HVAC_OFF_THRESHOLD"))    hvac_threshold = std::atof(h);
    if (auto s = std::getenv("SEAT_OFF_THRESHOLD"))    seat_threshold = std::atof(s);
    if (argc > 1) target         = argv[1];
    if (argc > 2) hvac_threshold = std::atof(argv[2]);
    if (argc > 3) seat_threshold = std::atof(argv[3]);

    std::signal(SIGINT,  [](int) { g_running = false; });
    std::signal(SIGTERM, [](int) { g_running = false; });

    std::cout << "======================================================" << std::endl;
    std::cout << "  Battery Energy Saver" << std::endl;
    std::cout << "  Version:         " << VERSION << std::endl;
    std::cout << "  Databroker:      " << target << std::endl;
    std::cout << "  HVAC off below:  " << hvac_threshold << "%" << std::endl;
    std::cout << "  Seat off below:  " << seat_threshold << "%" << std::endl;
    std::cout << "  TLS:             Disabled (insecure)" << std::endl;
    std::cout << "======================================================" << std::endl;
    std::cout.flush();

    auto channel = grpc::CreateChannel(target, grpc::InsecureChannelCredentials());
    auto stub = kuksa::val::v1::VAL::NewStub(channel);

    for (int r = 1; r <= 15; r++) {
        kuksa::val::v1::GetServerInfoRequest req;
        kuksa::val::v1::GetServerInfoResponse resp;
        grpc::ClientContext ctx;
        ctx.set_deadline(std::chrono::system_clock::now() + std::chrono::seconds(3));
        auto st = stub->GetServerInfo(&ctx, req, &resp);
        if (st.ok()) {
            std::cout << "[EnergySaver] Connected: " << resp.name()
                      << " " << resp.version() << std::endl;
            break;
        }
        if (r == 15) { std::cerr << "[EnergySaver] Unreachable: " << target << std::endl; return 1; }
        std::cout << "[EnergySaver] Waiting (" << r << "/15)..." << std::endl;
        std::cout.flush();
        std::this_thread::sleep_for(std::chrono::seconds(2));
    }

    std::cout << "[EnergySaver] Subscribing to signals..." << std::endl;
    std::cout.flush();

    run(stub.get(), hvac_threshold, seat_threshold);

    std::cout << "Battery Energy Saver: shutdown, no signal reset needed." << std::endl;
    return 0;
}`,
    yaml: `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
schemaVersion: 2

publisher:
  author: "developer@example.com"
  company: "Example Corp"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: "service"
      codename: "battery-energy-saver"
      title: "Battery Energy Saver - HPC Domain"
      description: "Forces HVAC and seat heating/cooling off when SoC drops below thresholds"
    version: "1.0.0"
    sourceFolder: "battery-energy-saver"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: "/battery-energy-saver"
      env:
        - "KUKSA_DATABROKER_ADDR=172.17.0.1:55555"
        - "HVAC_OFF_THRESHOLD=50.0"
        - "SEAT_OFF_THRESHOLD=30.0"
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 1000
        ramLimit: 10MB
        storageLimit: 5MB
        stateLimit: 512KB
        tmpLimit: 256MiB`
  },

  signalReporter: {
    name: 'Signal Reporter - Dashboard Relay',
    appName: 'signal-reporter',
    description: 'Subscribes to all 9 vehicle signals and relays to dashboard via HTTP on HPC node',
    cpp: `#include <iostream>
#include <string>
#include <thread>
#include <chrono>
#include <cstdlib>
#include <sstream>
#include <cstring>
#include <sys/socket.h>
#include <netdb.h>
#include <unistd.h>

#include <grpcpp/grpcpp.h>
#include "kuksa/val/v1/val.grpc.pb.h"
#include "kuksa/val/v1/types.pb.h"

#define VERSION "1.0.17"

static std::string format_value(const kuksa::val::v1::Datapoint& dp) {
    switch (dp.value_case()) {
        case kuksa::val::v1::Datapoint::kFloat:
            return std::to_string(dp.float_());
        case kuksa::val::v1::Datapoint::kDouble:
            return std::to_string(dp.double_());
        case kuksa::val::v1::Datapoint::kInt32:
            return std::to_string(dp.int32());
        case kuksa::val::v1::Datapoint::kUint32:
            return std::to_string(dp.uint32());
        case kuksa::val::v1::Datapoint::kBool:
            return dp.bool_() ? "true" : "false";
        case kuksa::val::v1::Datapoint::kString:
            return dp.string();
        default:
            return "null";
    }
}

static bool http_post(const std::string& host, int port,
                      const std::string& path, const std::string& body) {
    struct addrinfo hints{}, *res;
    hints.ai_family   = AF_UNSPEC;
    hints.ai_socktype = SOCK_STREAM;

    if (getaddrinfo(host.c_str(), std::to_string(port).c_str(),
                    &hints, &res) != 0)
        return false;

    int fd = socket(res->ai_family, res->ai_socktype, res->ai_protocol);
    if (fd < 0) { freeaddrinfo(res); return false; }

    struct timeval tv{2, 0};
    setsockopt(fd, SOL_SOCKET, SO_SNDTIMEO, &tv, sizeof(tv));
    setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));

    if (connect(fd, res->ai_addr, res->ai_addrlen) < 0) {
        close(fd); freeaddrinfo(res); return false;
    }
    freeaddrinfo(res);

    std::ostringstream req;
    req << "POST " << path << " HTTP/1.1\\r\\n"
        << "Host: " << host << ":" << port << "\\r\\n"
        << "Content-Type: application/json\\r\\n"
        << "Content-Length: " << body.size() << "\\r\\n"
        << "Connection: close\\r\\n\\r\\n"
        << body;

    std::string s = req.str();
    send(fd, s.c_str(), s.size(), 0);

    char buf[256];
    recv(fd, buf, sizeof(buf) - 1, 0);
    close(fd);
    return true;
}

static void parse_host_port(const std::string& url,
                            std::string& host, int& port) {
    auto colon = url.rfind(':');
    if (colon != std::string::npos) {
        host = url.substr(0, colon);
        port = std::atoi(url.substr(colon + 1).c_str());
    } else {
        host = url;
        port = 9100;
    }
}

int main(int argc, char* argv[]) {
    std::string kuksa_target = "10.0.0.100:55555";
    std::string relay_url    = "10.0.0.1:9100";

    if (auto t = std::getenv("KUKSA_DATABROKER_ADDR")) kuksa_target = t;
    if (auto r = std::getenv("SIGNAL_RELAY_URL"))      relay_url    = r;
    if (argc > 1) kuksa_target = argv[1];
    if (argc > 2) relay_url    = argv[2];

    std::string relay_host;
    int relay_port;
    parse_host_port(relay_url, relay_host, relay_port);

    std::cout << "========================================" << std::endl;
    std::cout << "  Signal Reporter" << std::endl;
    std::cout << "  Version:    " << VERSION << std::endl;
    std::cout << "  Databroker: " << kuksa_target << std::endl;
    std::cout << "  Relay:      " << relay_host << ":" << relay_port << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout.flush();

    auto channel = grpc::CreateChannel(kuksa_target,
                                       grpc::InsecureChannelCredentials());
    auto stub = kuksa::val::v1::VAL::NewStub(channel);

    for (int r = 1; r <= 15; r++) {
        kuksa::val::v1::GetServerInfoRequest req;
        kuksa::val::v1::GetServerInfoResponse resp;
        grpc::ClientContext ctx;
        ctx.set_deadline(std::chrono::system_clock::now() +
                         std::chrono::seconds(3));
        if (stub->GetServerInfo(&ctx, req, &resp).ok()) {
            std::cout << "[Reporter] Connected: " << resp.name()
                      << " " << resp.version() << std::endl;
            break;
        }
        if (r == 15) {
            std::cerr << "[Reporter] Unreachable: " << kuksa_target << std::endl;
            return 1;
        }
        std::cout << "[Reporter] Waiting (" << r << "/15)..." << std::endl;
        std::cout.flush();
        std::this_thread::sleep_for(std::chrono::seconds(2));
    }

    const char* paths[] = {
        "Vehicle.Speed",
        "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current",
        "Vehicle.Powertrain.Range",
        "Vehicle.Cabin.HVAC.AmbientAirTemperature",
        "Vehicle.Cabin.HVAC.TargetTemperature",
        "Vehicle.Cabin.Lights.AmbientLight.Intensity",
        "Vehicle.Cabin.Seat.Heating",
        "Vehicle.Cabin.Seat.VentilationLevel",
        "Vehicle.Infotainment.Display.Brightness"
    };

    kuksa::val::v1::SubscribeRequest sub_req;
    for (const auto& p : paths) {
        auto* entry = sub_req.add_entries();
        entry->set_path(p);
        entry->set_view(kuksa::val::v1::VIEW_CURRENT_VALUE);
        entry->add_fields(kuksa::val::v1::FIELD_VALUE);
    }

    std::cout << "[Reporter] Subscribing to " << sub_req.entries_size()
              << " signals..." << std::endl;
    std::cout.flush();

    int msg_count = 0;
    int post_ok   = 0;
    int post_fail = 0;

    while (true) {
        grpc::ClientContext ctx;
        auto reader = stub->Subscribe(&ctx, sub_req);
        kuksa::val::v1::SubscribeResponse response;

        while (reader->Read(&response)) {
            msg_count++;

            for (const auto& update : response.updates()) {
                const auto& path = update.entry().path();
                std::string val  = format_value(update.entry().value());

                auto now = std::chrono::system_clock::now();
                auto ms  = std::chrono::duration_cast<std::chrono::milliseconds>(
                    now.time_since_epoch()).count();

                std::ostringstream json;
                json << "{\\"signal\\":\\"" << path
                     << "\\",\\"value\\":" << val
                     << ",\\"ts\\":" << ms << "}";

                if (http_post(relay_host, relay_port,
                              "/signal", json.str())) {
                    post_ok++;
                } else {
                    post_fail++;
                }
            }

            if (msg_count % 50 == 0) {
                std::cout << "[Reporter] msgs=" << msg_count
                          << " posted=" << post_ok
                          << " failed=" << post_fail << std::endl;
                std::cout.flush();
            }
        }

        auto status = reader->Finish();
        std::cerr << "[Reporter] Stream ended: "
                  << status.error_message() << std::endl;
        std::cout << "[Reporter] Reconnecting in 5s..." << std::endl;
        std::cout.flush();
        std::this_thread::sleep_for(std::chrono::seconds(5));
    }
    return 0;
}`,
    yaml: `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
schemaVersion: 2

publisher:
  author: "developer@example.com"
  company: "Example Corp"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: service
      id: 242dd4d4-7236-432d-88b9-ba9bbb3288f8
      title: "Signal Reporter - Dashboard Relay"
      description: "Subscribes to all 9 vehicle signals and relays to dashboard via HTTP"
    version: "1.0.17"
    sourceFolder: "signal-reporter"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: "/signal-reporter"
      env:
        - "KUKSA_DATABROKER_ADDR=172.17.0.1:55555"
        - "SIGNAL_RELAY_URL=172.17.0.1:9100"
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 1000
        ramLimit: 10MB
        storageLimit: 5MB
        stateLimit: 512KB
        tmpLimit: 256MiB`
  },

  batteryEnergySaverSdvRuntime: {
    name: 'Battery Energy Saver - sdv-runtime / VSS 4.0',
    appName: 'battery-energy-saver-sdv',
    description: 'Same HVAC/seat cutoff logic as the HPC variant but corrected for sdv-runtime: HVAC path is IsAirConditioningActive (bool actuator) and all actuator writes target actuator_target instead of value',
    cpp: `/*
 * Battery Energy Saver — sdv-runtime / VSS 4.0
 * ===============================================
 *
 * WHAT THIS SERVICE DOES
 * ----------------------
 * Subscribes to the vehicle's State-of-Charge (SoC) via KUKSA Databroker.
 * When SoC drops below configurable thresholds it commands actuators off:
 *   - SoC < HVAC_OFF_THRESHOLD (default 50%) -> set IsAirConditioningActive = false
 *   - SoC < SEAT_OFF_THRESHOLD (default 30%) -> set Seat.Row1.DriverSide.Heating = 0
 * While the battery is low it also blocks any attempt to re-enable those actuators.
 *
 * ARCHITECTURE
 * ------------
 *
 *   ┌─────────────────────────────────────┐
 *   │  Host machine                       │
 *   │                                     │
 *   │  docker run -p 55555:55555          │
 *   │    ghcr.io/eclipse-autowrx/         │
 *   │    sdv-runtime:latest               │
 *   │         │                           │
 *   │         │  KUKSA Databroker :55555  │
 *   │         │  (gRPC, VSS 4.0)          │
 *   └─────────┼───────────────────────────┘
 *             │
 *   ┌─────────┼───────────────────────────┐
 *   │  AOS HPC VM                         │
 *   │         │                           │
 *   │  battery-energy-saver-sdv           │
 *   │  (this service, deployed via        │
 *   │   AosCloud onto the HPC node)       │
 *   │                                     │
 *   │  env: KUKSA_DATABROKER_ADDR=        │
 *   │       <host-ip>:55555               │
 *   └─────────────────────────────────────┘
 *
 * SETUP
 * -----
 * 1. Start sdv-runtime on the host:
 *      docker run -d -p 55555:55555 ghcr.io/eclipse-autowrx/sdv-runtime:latest
 *
 * 2. Find the host IP reachable from the AOS VM.
 *    From inside the VM the Docker bridge gateway is typically 172.17.0.1,
 *    but if the VM is on a separate NAT network use the host's LAN IP instead
 *    (e.g. 10.x.x.x).  Confirm reachability:
 *      nc -zv <host-ip> 55555
 *
 * 3. In the YAML config below, set KUKSA_DATABROKER_ADDR to that IP:
 *      env:
 *        - "KUKSA_DATABROKER_ADDR=<host-ip>:55555"
 *
 * 4. Build and deploy via AosCloud (Build -> Deploy in this UI).
 *
 * VERIFYING THE COMMUNICATION (Python client on the host)
 * -------------------------------------------------------
 * Install:  pip install kuksa-client
 *
 *   from kuksa_client.grpc import VSSClient, Datapoint
 *   import time
 *
 *   SOC  = 'Vehicle.Powertrain.TractionBattery.StateOfCharge.Current'
 *   RANGE= 'Vehicle.Powertrain.Range'
 *   HVAC = 'Vehicle.Cabin.HVAC.IsAirConditioningActive'
 *   SEAT = 'Vehicle.Cabin.Seat.Row1.DriverSide.Heating'
 *
 *   with VSSClient('<host-ip>', 55555) as c:
 *       # 1. Normal charge — no cutoff
 *       c.set_current_values({SOC: Datapoint(80.0), RANGE: Datapoint(250)})
 *       time.sleep(1)
 *
 *       # 2. Drop SoC below HVAC threshold — service sets HVAC target = False
 *       c.set_current_values({SOC: Datapoint(40.0)})
 *       time.sleep(1)
 *
 *       # 3. Try to re-enable HVAC while battery is still low
 *       c.set_target_values({HVAC: Datapoint(True)})
 *       time.sleep(1)
 *       # Service detects it and forces HVAC target back to False
 *
 *       # 4. Read back what the service wrote
 *       tgt = c.get_target_values([HVAC, SEAT])
 *       print(tgt[HVAC].value)   # False  (service enforced it)
 *
 *       # 5. Drop below seat threshold too
 *       c.set_current_values({SOC: Datapoint(25.0)})
 *       time.sleep(1)
 *       tgt = c.get_target_values([HVAC, SEAT])
 *       print(tgt[SEAT].value)   # 0  (seat heating cut)
 *
 * SERVICE LOGS ON THE AOS VM
 * --------------------------
 * Find the service PID:
 *   cat /run/aos/runtime/<instance-id>/.pid
 * Stream its output:
 *   journalctl _PID=<pid> -f
 *
 * You should see:
 *   Charge: 80% | Range: 250
 *   Charge: 40% | Range: 250
 *   [!] SoC=40% < 50%  ->  Turning HVAC off
 *   [!] Battery low    ->  blocking HVAC re-activation   <- after step 3
 *   [!] SoC=25% < 30%  ->  Turning Seat Heating off
 *   [+] SoC=55%        ->  HVAC restriction lifted
 */

#include <iostream>
#include <string>
#include <thread>
#include <chrono>
#include <cstdlib>
#include <csignal>
#include <atomic>

#include <grpcpp/grpcpp.h>
#include "kuksa/val/v1/val.grpc.pb.h"
#include "kuksa/val/v1/types.pb.h"

#define VERSION "1.0.0"
#define DEFAULT_HVAC_OFF_THRESHOLD 50.0f
#define DEFAULT_SEAT_OFF_THRESHOLD 30.0f

static const char* RANGE_PATH     = "Vehicle.Powertrain.Range";
static const char* SOC_PATH       = "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current";
static const char* HVAC_PATH      = "Vehicle.Cabin.HVAC.IsAirConditioningActive";
static const char* SEAT_HEAT_PATH = "Vehicle.Cabin.Seat.Row1.DriverSide.Heating";

static std::atomic<bool> g_running{true};

static float as_float(const kuksa::val::v1::Datapoint& dp) {
    switch (dp.value_case()) {
        case kuksa::val::v1::Datapoint::kFloat:  return dp.float_();
        case kuksa::val::v1::Datapoint::kDouble: return static_cast<float>(dp.double_());
        case kuksa::val::v1::Datapoint::kInt32:  return static_cast<float>(dp.int32());
        case kuksa::val::v1::Datapoint::kUint32: return static_cast<float>(dp.uint32());
        default: return 0.0f;
    }
}

static bool as_bool(const kuksa::val::v1::Datapoint& dp) {
    switch (dp.value_case()) {
        case kuksa::val::v1::Datapoint::kBool:   return dp.bool_();
        case kuksa::val::v1::Datapoint::kInt32:  return dp.int32() != 0;
        case kuksa::val::v1::Datapoint::kUint32: return dp.uint32() != 0;
        case kuksa::val::v1::Datapoint::kFloat:  return dp.float_() != 0.0f;
        default: return false;
    }
}

static int as_int(const kuksa::val::v1::Datapoint& dp) {
    switch (dp.value_case()) {
        case kuksa::val::v1::Datapoint::kInt32:  return dp.int32();
        case kuksa::val::v1::Datapoint::kUint32: return static_cast<int>(dp.uint32());
        case kuksa::val::v1::Datapoint::kFloat:  return static_cast<int>(dp.float_());
        case kuksa::val::v1::Datapoint::kBool:   return dp.bool_() ? 1 : 0;
        default: return 0;
    }
}

// sdv-runtime requires actuator writes to go to actuator_target, not value
static bool set_bool(kuksa::val::v1::VAL::Stub* stub,
                     const std::string& path, bool value) {
    kuksa::val::v1::SetRequest request;
    auto* update = request.add_updates();
    update->mutable_entry()->set_path(path);
    update->mutable_entry()->mutable_actuator_target()->set_bool_(value);
    update->add_fields(kuksa::val::v1::FIELD_ACTUATOR_TARGET);
    kuksa::val::v1::SetResponse response;
    grpc::ClientContext context;
    context.set_deadline(std::chrono::system_clock::now() + std::chrono::seconds(3));
    return stub->Set(&context, request, &response).ok();
}

static bool set_int(kuksa::val::v1::VAL::Stub* stub,
                    const std::string& path, int value) {
    kuksa::val::v1::SetRequest request;
    auto* update = request.add_updates();
    update->mutable_entry()->set_path(path);
    update->mutable_entry()->mutable_actuator_target()->set_int32(value);
    update->add_fields(kuksa::val::v1::FIELD_ACTUATOR_TARGET);
    kuksa::val::v1::SetResponse response;
    grpc::ClientContext context;
    context.set_deadline(std::chrono::system_clock::now() + std::chrono::seconds(3));
    return stub->Set(&context, request, &response).ok();
}

static void run(kuksa::val::v1::VAL::Stub* stub,
                float hvac_threshold, float seat_threshold) {
    float soc = 100.0f, vehicle_range = 0.0f;
    bool  hvac_cut = false, seat_cut = false;

    kuksa::val::v1::SubscribeRequest sub_req;
    // Sensors: read current value
    for (const char* path : { RANGE_PATH, SOC_PATH }) {
        auto* entry = sub_req.add_entries();
        entry->set_path(path);
        entry->set_view(kuksa::val::v1::VIEW_CURRENT_VALUE);
        entry->add_fields(kuksa::val::v1::FIELD_VALUE);
    }
    // Actuators: watch actuator_target to block re-activation while battery is low
    for (const char* path : { HVAC_PATH, SEAT_HEAT_PATH }) {
        auto* entry = sub_req.add_entries();
        entry->set_path(path);
        entry->set_view(kuksa::val::v1::VIEW_TARGET_VALUE);
        entry->add_fields(kuksa::val::v1::FIELD_ACTUATOR_TARGET);
    }

    while (g_running) {
        grpc::ClientContext ctx;
        auto reader = stub->Subscribe(&ctx, sub_req);
        kuksa::val::v1::SubscribeResponse response;

        while (g_running && reader->Read(&response)) {
            for (const auto& update : response.updates()) {
                const std::string& path = update.entry().path();

                if (path == RANGE_PATH) {
                    vehicle_range = as_float(update.entry().value());
                } else if (path == SOC_PATH) {
                    soc = as_float(update.entry().value());
                    std::cout << "Charge: " << soc << "% | Range: " << vehicle_range << std::endl;

                    if (soc < hvac_threshold && !hvac_cut) {
                        std::cout << "[!] SoC=" << soc << "% < " << hvac_threshold << "%  ->  Turning HVAC off" << std::endl;
                        set_bool(stub, HVAC_PATH, false);
                        hvac_cut = true;
                    } else if (soc >= hvac_threshold && hvac_cut) {
                        std::cout << "[+] SoC=" << soc << "%  ->  HVAC restriction lifted" << std::endl;
                        hvac_cut = false;
                    }
                    if (soc < seat_threshold && !seat_cut) {
                        std::cout << "[!] SoC=" << soc << "% < " << seat_threshold << "%  ->  Turning Seat Heating off" << std::endl;
                        set_int(stub, SEAT_HEAT_PATH, 0);
                        seat_cut = true;
                    } else if (soc >= seat_threshold && seat_cut) {
                        std::cout << "[+] SoC=" << soc << "%  ->  Seat restriction lifted" << std::endl;
                        seat_cut = false;
                    }
                } else if (path == HVAC_PATH && hvac_cut) {
                    if (as_bool(update.entry().actuator_target())) {
                        std::cout << "[!] Battery low  ->  blocking HVAC re-activation" << std::endl;
                        set_bool(stub, HVAC_PATH, false);
                    }
                } else if (path == SEAT_HEAT_PATH && seat_cut) {
                    if (as_int(update.entry().actuator_target()) != 0) {
                        std::cout << "[!] Battery low  ->  blocking Seat Heating re-activation" << std::endl;
                        set_int(stub, SEAT_HEAT_PATH, 0);
                    }
                }
            }
        }

        if (!g_running) break;
        auto status = reader->Finish();
        std::cerr << "[EnergySaver] Stream ended: " << status.error_message() << std::endl;
        std::cout << "[EnergySaver] Reconnecting in 5s..." << std::endl;
        std::cout.flush();
        std::this_thread::sleep_for(std::chrono::seconds(5));
    }
}

int main(int argc, char* argv[]) {
    std::string target   = "172.17.0.1:55555";
    float hvac_threshold = DEFAULT_HVAC_OFF_THRESHOLD;
    float seat_threshold = DEFAULT_SEAT_OFF_THRESHOLD;

    if (auto t = std::getenv("KUKSA_DATABROKER_ADDR")) target         = t;
    if (auto h = std::getenv("HVAC_OFF_THRESHOLD"))    hvac_threshold = std::atof(h);
    if (auto s = std::getenv("SEAT_OFF_THRESHOLD"))    seat_threshold = std::atof(s);
    if (argc > 1) target         = argv[1];
    if (argc > 2) hvac_threshold = std::atof(argv[2]);
    if (argc > 3) seat_threshold = std::atof(argv[3]);

    std::signal(SIGINT,  [](int) { g_running = false; });
    std::signal(SIGTERM, [](int) { g_running = false; });

    std::cout << "======================================================" << std::endl;
    std::cout << "  Battery Energy Saver (sdv-runtime / VSS 4.0)" << std::endl;
    std::cout << "  Version:         " << VERSION << std::endl;
    std::cout << "  Databroker:      " << target << std::endl;
    std::cout << "  HVAC off below:  " << hvac_threshold << "%" << std::endl;
    std::cout << "  Seat off below:  " << seat_threshold << "%" << std::endl;
    std::cout << "  HVAC signal:     IsAirConditioningActive (bool actuator)" << std::endl;
    std::cout << "  TLS:             Disabled (insecure)" << std::endl;
    std::cout << "======================================================" << std::endl;
    std::cout.flush();

    auto channel = grpc::CreateChannel(target, grpc::InsecureChannelCredentials());
    auto stub = kuksa::val::v1::VAL::NewStub(channel);

    for (int r = 1; r <= 15; r++) {
        kuksa::val::v1::GetServerInfoRequest req;
        kuksa::val::v1::GetServerInfoResponse resp;
        grpc::ClientContext ctx;
        ctx.set_deadline(std::chrono::system_clock::now() + std::chrono::seconds(3));
        auto st = stub->GetServerInfo(&ctx, req, &resp);
        if (st.ok()) {
            std::cout << "[EnergySaver] Connected: " << resp.name()
                      << " " << resp.version() << std::endl;
            break;
        }
        if (r == 15) { std::cerr << "[EnergySaver] Unreachable: " << target << std::endl; return 1; }
        std::cout << "[EnergySaver] Waiting (" << r << "/15)..." << std::endl;
        std::cout.flush();
        std::this_thread::sleep_for(std::chrono::seconds(2));
    }

    std::cout << "[EnergySaver] Subscribing to signals..." << std::endl;
    std::cout.flush();

    run(stub.get(), hvac_threshold, seat_threshold);

    std::cout << "Battery Energy Saver: shutdown, no signal reset needed." << std::endl;
    return 0;
}`,
    yaml: `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
schemaVersion: 2

publisher:
  author: "developer@example.com"
  company: "Example Corp"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: "service"
      codename: "battery-energy-saver-sdv"
      title: "Battery Energy Saver - sdv-runtime / VSS 4.0"
      description: "HVAC/seat cutoff logic corrected for sdv-runtime with actuator_target writes"
    version: "1.0.0"
    sourceFolder: "battery-energy-saver-sdv"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: "/battery-energy-saver-sdv"
      env:
        - "KUKSA_DATABROKER_ADDR=172.17.0.1:55555"
        - "HVAC_OFF_THRESHOLD=50.0"
        - "SEAT_OFF_THRESHOLD=30.0"
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 1000
        ramLimit: 10MB
        storageLimit: 5MB
        stateLimit: 512KB
        tmpLimit: 256MiB`
  },

  // ── Python Presets ──

  helloPython: {
    name: 'Hello Python',
    appName: 'hello-world-python',
    description: 'Simple demo service in Python',
    language: 'python' as const,
    python: `#!/usr/bin/env python3
# Copyright (c) 2018-2025 EPAM Systems
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import time
import json
import datetime
import logging

from urllib import request

logger = logging.getLogger(__name__)

# Go to https://webhook.site/#/
#   and copy from "Your unique URL (Please copy it from here, not from the address bar!)" field
#   and paste server link to HTTP_REQUEST_RECEIVER_URL

HTTP_REQUEST_RECEIVER_URL = "https://webhook.site/21a820fd-df75-4286-b9e4-67ca4ee2af70"

DATA_SENDING_DELAY = 2
WAIT_TIMEOUT = 5
DELAY_AFTER_ERROR = 2


def main():
    # Initialize data accessor to "VIN" attribute and get this attribute.
    greetings = 'Hello world!'

    # Send information to HTTP server.
    while True:
        try:
            logger.info("Sending telemetry to '{url}'".format(url=HTTP_REQUEST_RECEIVER_URL))
            json_data={"Unit said": greetings, "datetime": datetime.datetime.now().isoformat()}

            params = json.dumps(json_data).encode('utf8')
            request_data = request.Request(
                HTTP_REQUEST_RECEIVER_URL,
                data=params,
                headers={'content-type': 'application/json'}
            )
            request.urlopen(request_data)
            time.sleep(DATA_SENDING_DELAY)

        except KeyboardInterrupt:
            logger.info("Received Keyboard interrupt. shutting down")
            break
        except Exception as exc:
            logger.error(
                "Unhandled exception: {exc_name}".format(exc_name=exc.__class__.__name__),
                exc_info=True,
            )
            time.sleep(DELAY_AFTER_ERROR)
            continue


if __name__ == '__main__':
    main()
`,
    yaml: `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
# Documentation: https://docs.aosedge.tech/docs/reference/file-formats/service-config

# Schema version (required, must be 2)
schemaVersion: 2

# Publisher information (optional)
publisher:
  author: "Developer Name"
  company: "Company Name"

# Publishing information (required: tlsKey; optional: domain, signKey)
publish:
  tlsKey: "aos-user-sp.p12"
  # signKey: "/path/to/sign-key.pem"  # Optional: separate signing key
  # domain: "aoscloud.io"             # Optional: if not specified, will be extracted from tlsKey certificate

# List of deployable items (like services) to include in the deployment bundle
items:
  # First service item
  - identity:
      type: "service"
      codename: "hello-world-python"
      title: "Hello World Service (Python)"
      description: "Simple demo service in Python"
    version: "1.0.2"
    sourceFolder: "hello-world-python"

    # Images for different architectures
    images:
      # x86 architecture image under service source folder
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    # Service configuration
    configuration:
      workingDir: "/"
      cmd: /usr/bin/python3 -u /main.py
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 5000           # DMIPS
        ramLimit: 512MiB         # 256 MiB
        storageLimit: 32MiB       # 32 MiB
        stateLimit: 1MiB         # 100 MiB
        tmpLimit: 256MiB         # 256 MiB`
  },

  seatEcu: {
    name: 'Seat ECU (EV Range Extender)',
    appName: 'demo-ev-range-extender-seat-ecu',
    description: 'Seat Control Module — consumes dashboard seat heating/cooling commands over Zenoh, writes to Kuksa Databroker',
    language: 'python' as const,
    python: `"""Seat ECU (SCM) service.

Consumes the host dashboard's seat heating/cooling commands over Zenoh,
writes corresponding values directly into the shared Kuksa Databroker on
the primary node, and sends status updates back to the dashboard's
indicator panel.

Connectivity: runs as a Zenoh *client* that dials the router on the
primary node (no inbound listener), and a Kuksa gRPC client pointed at
the single broker. The service is stateless and may migrate between
nodes; both endpoints are fixed on the primary node, so its current
node does not matter.

Signal flow (inbound — dashboard control)
-----------------------------------------
  pytk_dashboard.py
    ├─ sim/cabin/seat/heating ─┐
    └─ sim/cabin/seat/hc       ┴─Zenoh─► router ─► seat_ecu.py
                                                       │
                                           write VSS over gRPC ▼
                      Kuksa: Vehicle.Cabin.Seat.Row1.DriverSide.Heating
                             Vehicle.Cabin.Seat.Row1.DriverSide.HeatingCooling

Dashboard update
----------------
    Kuksa change (this ECU's write, or any other writer)
        └─► _dashboard_forwarder (Kuksa subscription)
                └─► Zenoh dash/status/seat ─► router ─► dashboard indicator

Note: heating is 0–100 %; hc is –100 (cooling) to +100 (heating).
"""

import argparse
import asyncio
import json
import sys
import threading
from datetime import datetime, timezone
from typing import Any

import zenoh
from kuksa_client.grpc import Datapoint
from kuksa_client.grpc.aio import VSSClient

DEFAULT_ROUTER = "tcp/zenoh:7447"  # zenoh router (resolves to primary node)
DEFAULT_KUKSA_HOST = "kuksa"
DEFAULT_KUKSA_PORT = 55555
SEAT_HEAT_VSS_PATH = "Vehicle.Cabin.Seat.Row1.DriverSide.Heating"
SEAT_HC_VSS_PATH = "Vehicle.Cabin.Seat.Row1.DriverSide.HeatingCooling"

SOURCE_LABEL = "vm2"  # embedded in every outgoing envelope
DASH_STATUS_KEY = "dash/status/seat"  # reverse channel to dashboard


KEY_TO_VSS = {
    "sim/cabin/seat/heating": (
        SEAT_HEAT_VSS_PATH,
        int,
    ),
    "sim/cabin/seat/hc": (
        SEAT_HC_VSS_PATH,
        int,
    ),
}

KEY_PREFIX = "sim/cabin/seat/**"


# VSS path -> dashboard indicator key used by IndicatorPanel.
VSS_TO_DASH_KEY = {
   # SEAT_HEAT_VSS_PATH: "seat.heating",   # SEAT_HEAT_VSS_PATH is broken (absent in VSS spec)
    SEAT_HC_VSS_PATH: "seat.heating_cooling",
}


def _seat_status(vss_path: str, value: Any) -> str:
    """Map a (path, value) pair to the dashboard indicator state.

    Indicator semantics (see module docstring):
       Heating          > 0  -> "heating"  (dashboard renders red)
       HeatingCooling   > 0  -> "heating"  (dashboard renders red)
       HeatingCooling   < 0  -> "cooling"  (dashboard renders blue)
       all other (=== 0)     -> "off"      (dashboard renders blue/idle)
    """
    try:
        v = float(value)
    except (TypeError, ValueError):
        return "off"
    if v > 0:
        return "heating"
    if vss_path.endswith("HeatingCooling") and v < 0:
        return "cooling"
    return "off"


def log(msg: str) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    print(f"[{ts}] [seat] {msg}", flush=True)


def build_zenoh_config(router_endpoint: str) -> zenoh.Config:
    # Client mode: dial the router on the primary node and open NO
    # inbound listener. Pub/sub still flows both ways over the outbound
    # link, so no inbound port is exposed and the ECU stays reachable
    # no matter which node it migrates to.
    #
    # Scouting is disabled so the client connects ONLY to the configured
    # router and never auto-discovers or meshes with other peers/routers
    # (deterministic connectivity; no rogue-router vector). Verify these
    # key names against the Zenoh version in the runtime image.
    config = zenoh.Config()
    config.insert_json5("mode", '"client"')
    config.insert_json5("connect/endpoints", f'["{router_endpoint}"]')
    config.insert_json5("scouting/multicast/enabled", "false")
    config.insert_json5("scouting/gossip/enabled", "false")
    return config


class _LatestValueQueue:
    """Coalescing latest-value queue for a small number of VSS paths.

    Producers (the Zenoh worker thread) call \`offer(path, value, cast,
    src)\` on every incoming sample. When multiple samples for the same
    path arrive before the consumer drains, only the LAST one survives.
    The single consumer (one asyncio task) calls \`take()\` and gets a
    snapshot of all pending paths, then clears the slot.

    For seat the queue is especially useful because Heating and
    HeatingCooling toggles can flip near-simultaneously (the host
    dashboard's mutex publishes them in quick succession). Both end
    up in the same snapshot and are written to Kuksa in a single
    batched RPC.
    """

    def __init__(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop
        self._lock = threading.Lock()
        self._pending: dict[str, tuple[Any, Any, str]] = {}
        self._evt = asyncio.Event()

    def offer(self, path: str, value: Any, cast: Any, src: str) -> None:
        """Producer side. Safe to call from any thread; never blocks."""
        with self._lock:
            self._pending[path] = (value, cast, src)
        self._loop.call_soon_threadsafe(self._evt.set)

    async def take(self) -> dict[str, tuple[Any, Any, str]]:
        """Consumer side. Awaits at least one offered value, returns snapshot."""
        while True:
            await self._evt.wait()
            with self._lock:
                if self._pending:
                    snapshot = self._pending
                    self._pending = {}
                    self._evt.clear()
                    return snapshot
                self._evt.clear()


async def _consumer(
    queue: "_LatestValueQueue",
    kuksa: VSSClient,
) -> None:
    """Drain the latest-value queue and write to Kuksa with dedup.

    Only writes to Kuksa. Dashboard updates come exclusively from
    _dashboard_forwarder (Kuksa subscription), which fires for any
    write to the path regardless of which writer made it.
    """
    last_sent: dict[str, Any] = {}
    while True:
        pending = await queue.take()
        updates: dict[str, Datapoint] = {}
        log_lines: list[str] = []
        for path, (raw_value, cast, src) in pending.items():
            try:
                coerced = cast(raw_value)
            except (TypeError, ValueError) as exc:
                log(
                    f"WARN cannot cast {raw_value!r} -> {cast.__name__} for {path}: {exc}"
                )
                continue
            if last_sent.get(path) == coerced:
                continue
            updates[path] = Datapoint(coerced)
            last_sent[path] = coerced
            log_lines.append(f"OK   {path} = {coerced} (from {src})")
        if updates:
            try:
                await kuksa.set_current_values(updates)
            except Exception as exc:
                log(f"ERROR writing {len(updates)} key(s) to Kuksa: {exc}")
                continue
        for line in log_lines:
            log(line)


async def _dashboard_forwarder(
    kuksa: VSSClient,
    dash_pub: "zenoh.Publisher",
) -> None:
    """Subscribe to both seat VSS paths on local Kuksa and forward each
    change to the host dashboard as a \`{key, value, status}\` envelope.

    See module docstring for the surface contract; semantics are kept
    intentionally tiny on this side so the dashboard can stay a dumb
    renderer that just maps \`status\` to a color.
    """
    last_status: dict[str, str] = {}
    paths = list(VSS_TO_DASH_KEY.keys())  # Vehicle.Cabin.Seat.Row1.DriverSide.Heating is absent
    async for updates in kuksa.subscribe_current_values(paths):
        for path, dp in updates.items():
            if dp is None or dp.value is None:
                continue
            dash_key = VSS_TO_DASH_KEY.get(path)
            if dash_key is None:
                continue
            status = _seat_status(path, dp.value)
            payload = json.dumps(
                {
                    "key": dash_key,
                    "value": (
                        int(dp.value)
                        if isinstance(dp.value, (int, float))
                        else dp.value
                    ),
                    "status": status,
                    "source": SOURCE_LABEL,
                    "ts": datetime.now(timezone.utc).isoformat(),
                }
            ).encode("utf-8")
            try:
                dash_pub.put(payload)
            except Exception as exc:
                log(f"ERROR forwarding {path} to dashboard: {exc}")
                continue
            changed = last_status.get(path) != status
            last_status[path] = status
            tag = "ACT " if changed else "act "
            log(f"{tag} {path} = {dp.value}  -> dashboard {dash_key} (status={status})")


async def run(router: str, kuksa_host: str, kuksa_port: int) -> None:
    # Single shared Kuksa broker on the primary node: the ECU writes
    # seat values straight into Kuksa over gRPC. No kuksa-bridge.
    await _run_with_kuksa(router, kuksa_host, kuksa_port)


async def _run_with_kuksa(router: str, kuksa_host: str, kuksa_port: int) -> None:
    log(f"Connecting to Kuksa Databroker at {kuksa_host}:{kuksa_port}...")
    async with VSSClient(kuksa_host, kuksa_port) as kuksa:
        log("Connected to Kuksa.")
        log("Subscribed Zenoh keys -> VSS paths:")
        for k, (vss, cast) in KEY_TO_VSS.items():
            log(f"    {k}  ->  {vss}  ({cast.__name__})")

        loop = asyncio.get_running_loop()
        queue = _LatestValueQueue(loop)
        log(
            f"Opening Zenoh session (client mode) -> router {router}, subscribed to '{KEY_PREFIX}'"
        )
        with zenoh.open(build_zenoh_config(router)) as session:

            def listener(sample: zenoh.Sample) -> None:
                key = str(sample.key_expr)
                cfg = KEY_TO_VSS.get(key)
                if cfg is None:
                    log(f"WARN ignoring unknown key '{key}'")
                    return
                vss_path, cast = cfg
                try:
                    raw = sample.payload.to_string()
                    msg = json.loads(raw)
                except Exception as exc:
                    log(f"WARN bad payload on '{key}': {exc}")
                    return
                value = msg.get("value")
                src = msg.get("source", "?")
                if value is None:
                    log(f"WARN payload missing 'value' on '{key}': {msg}")
                    return
                queue.offer(vss_path, value, cast, src)

            # Retain the subscriber handle for the session's lifetime. If
            # this reference is dropped, Zenoh garbage-collects the
            # subscription and ingest stops with no error. Kept in a list
            # (and referenced below) so it survives lint/autoflake passes.
            subscribers = [session.declare_subscriber(KEY_PREFIX, listener)]

            # Reverse channel to the host dashboard - declared on the SAME
            # Zenoh session so it shares the ECU's single client connection
            # to the router (command and status ride the one outbound link).
            dash_pub = session.declare_publisher(DASH_STATUS_KEY)
            log(
                f"Reverse channel publisher on '{DASH_STATUS_KEY}' ready "
                f"({len(subscribers)} subscriber active)."
            )

            consumer_task = asyncio.create_task(_consumer(queue, kuksa))

            forwarder_task = asyncio.create_task(_dashboard_forwarder(kuksa, dash_pub))
            log(
                f"Kuksa->dashboard forwarder subscribed to: "
                f"{', '.join(VSS_TO_DASH_KEY.keys())}"
            )

            log(
                "Seat ECU running. Drive values from the host PyTk dashboard. Ctrl+C to stop."
            )
            tasks = {consumer_task, forwarder_task}
            try:
                # Fail fast: if either task exits — almost always because
                # the Kuksa subscribe stream broke — surface the error so
                # main() logs FATAL and the process exits for the
                # supervisor to restart. A dead task must never be left
                # running unobserved (which would be a half-working ECU
                # with no crash and no restart).
                done, _ = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            except asyncio.CancelledError:
                done = set()
            finally:
                for t in tasks:
                    t.cancel()
                await asyncio.gather(*tasks, return_exceptions=True)
            for t in done:
                exc = t.exception()
                if exc is not None:
                    raise exc


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Seat Control Module. Connects (Zenoh client mode) to "
        "the router on the primary node for sim/cabin/seat/* "
        "samples driven by the host PyTk dashboard, and writes "
        "the values into the shared Kuksa Databroker. Opens no "
        "inbound listener."
    )
    p.add_argument(
        "--router",
        default=DEFAULT_ROUTER,
        help=f"Zenoh router endpoint on the primary node "
        f"(default: {DEFAULT_ROUTER})",
    )
    p.add_argument(
        "--kuksa-host",
        default=DEFAULT_KUKSA_HOST,
        help=f"Kuksa Databroker host (default: {DEFAULT_KUKSA_HOST})",
    )
    p.add_argument(
        "--kuksa-port",
        type=int,
        default=DEFAULT_KUKSA_PORT,
        help=f"Kuksa Databroker port (default: {DEFAULT_KUKSA_PORT})",
    )
    return p.parse_args()


def main() -> int:
    args = parse_args()
    try:
        asyncio.run(run(args.router, args.kuksa_host, args.kuksa_port))
    except KeyboardInterrupt:
        log("Stopping.")
        return 0
    except Exception as exc:
        import traceback
        traceback.print_exc()
        log(f"FATAL: {exc} type={type(exc)}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
`,
    yaml: `# Seat ECU — EV Range Extender (schemaVersion: 2)
schemaVersion: 2

publisher:
  author: "AosCloud team"
  company: "EPAM Systems"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: service
      codename: "demo-ev-range-extender-seat-ecu"
      title: "Demo EV Range Extender Seat ECU"
      description: "Seat Control Module — consumes dashboard commands over Zenoh, writes to Kuksa"
    version: "2.0.0"
    sourceFolder: "demo-ev-range-extender-seat-ecu"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: /usr/bin/python3 -u /main.py
      instances:
        minInstances: 1
        priority: 10
        labels:
          - secondary
      quotas:
        cpuLimit: 1000
        ramLimit: 128MiB
        storageLimit: 32MiB
      resources:
        - name: kuksa
          mode: rw
        - name: zenoh
          mode: rw
    dependencies:
      - identity:
          type: layer
          codename: kuksa-client
        versions: '>=6.1.0-bosch.2'
      - identity:
          type: layer
          codename: zenoh-client
        versions: '>=6.1.0-bosch.2'`
  },

  hvacEcu: {
    name: 'HVAC ECU (EV Range Extender)',
    appName: 'demo-ev-range-extender-hvac-ecu',
    description: 'HVAC ECU — consumes dashboard fan-speed commands over Zenoh, writes to Kuksa Databroker',
    language: 'python' as const,
    python: `"""HVAC ECU service.

Consumes the host dashboard's fan-speed command over Zenoh, writes it
directly into the shared Kuksa Databroker on the primary node, and sends
status updates back to the dashboard's indicator panel.

Connectivity: runs as a Zenoh *client* that dials the router on the
primary node (no inbound listener), and a Kuksa gRPC client pointed at
the single broker. The service is stateless and may migrate between
nodes; both endpoints are fixed on the primary node, so its current
node does not matter.

Signal flow (inbound — dashboard control)
-----------------------------------------
  pytk_dashboard.py ─Zenoh sim/cabin/temp─► router ─► hvac_ecu.py
                                                          │
                                              write VSS over gRPC ▼
                      Kuksa: Vehicle.Cabin.HVAC.AmbientAirTemperature

Dashboard update
----------------
    Kuksa change (this ECU's write, or any other writer)
        └─► _dashboard_forwarder (Kuksa subscription)
                └─► Zenoh dash/status/hvac ─► router ─► dashboard indicator

Note: 'sim/cabin/temp' carries a 0–100 fan-speed % value.
"""

import argparse
import asyncio
import json
import sys
import threading
from datetime import datetime, timezone
from typing import Any

import zenoh
from kuksa_client.grpc import Datapoint
from kuksa_client.grpc.aio import VSSClient


DEFAULT_ROUTER = "tcp/zenoh:7447"  # zenoh router (resolves to primary node)
DEFAULT_KUKSA_HOST = "kuksa"
DEFAULT_KUKSA_PORT = 55555
HVAC_VSS_PATH = "Vehicle.Cabin.HVAC.AmbientAirTemperature"

SOURCE_LABEL = "vm2"           # embedded in every outgoing envelope
DASH_STATUS_KEY = "dash/status/hvac"  # reverse channel to dashboard
DASH_KEY_PAIR = "hvac.fan_speed"      # logical key used by dashboard indicator


KEY_TO_VSS = {
    "sim/cabin/temp": (
        HVAC_VSS_PATH,
        float,
    ),
}

KEY_PREFIX = "sim/cabin/temp"


# VSS paths the ECU subscribes to on its local Kuksa to drive the
# dashboard indicator. Listed separately from KEY_TO_VSS because the
# dashboard-forward path is independent of the host-Zenoh ingest path.
VSS_TO_DASH = (HVAC_VSS_PATH,)


def _hvac_status(value: float) -> str:
    """Map a fan-speed value (0..100) to the dashboard indicator state.

    Per the demo narrative the HVAC indicator is binary:
       fan > 0  -> "on"   (dashboard renders green)
       fan == 0 -> "off"  (dashboard renders red)
    """
    try:
        return "on" if float(value) > 0 else "off"
    except (TypeError, ValueError):
        return "off"


def log(msg: str) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    print(f"[{ts}] [hvac] {msg}", flush=True)


def build_zenoh_config(router_endpoint: str) -> zenoh.Config:
    # Client mode: dial the router on the primary node and open NO
    # inbound listener. Pub/sub still flows both ways over the outbound
    # link, so no inbound port is exposed and the ECU stays reachable
    # no matter which node it migrates to.
    #
    # Scouting is disabled so the client connects ONLY to the configured
    # router and never auto-discovers or meshes with other peers/routers
    # (deterministic connectivity; no rogue-router vector). Verify these
    # key names against the Zenoh version in the runtime image.
    config = zenoh.Config()
    config.insert_json5("mode", '"client"')
    config.insert_json5("connect/endpoints", f'["{router_endpoint}"]')
    config.insert_json5("scouting/multicast/enabled", "false")
    config.insert_json5("scouting/gossip/enabled", "false")
    return config


class _LatestValueQueue:
    """Coalescing latest-value queue for a small number of VSS paths.

    Producers (the Zenoh worker thread) call \`offer(path, value, cast,
    src)\` on every incoming sample. When multiple samples for the same
    path arrive before the consumer drains, only the LAST one survives.
    The single consumer (one asyncio task) calls \`take()\` and gets a
    snapshot of all pending paths, then clears the slot.

    This caps Kuksa RPC traffic at the asyncio loop tick rate, no matter
    how fast the dashboard's slider drags fire, so a fast drag never
    queues up a backlog of stale writes - the user always sees the
    most recent value land in Kuksa with ~asyncio-tick latency.
    """

    def __init__(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop
        self._lock = threading.Lock()
        self._pending: dict[str, tuple[Any, Any, str]] = {}
        self._evt = asyncio.Event()

    def offer(self, path: str, value: Any, cast: Any, src: str) -> None:
        """Producer side. Safe to call from any thread; never blocks."""
        with self._lock:
            self._pending[path] = (value, cast, src)
        # Wake the consumer task on the asyncio loop thread.
        self._loop.call_soon_threadsafe(self._evt.set)

    async def take(self) -> dict[str, tuple[Any, Any, str]]:
        """Consumer side. Awaits at least one offered value, returns snapshot."""
        while True:
            await self._evt.wait()
            with self._lock:
                if self._pending:
                    snapshot = self._pending
                    self._pending = {}
                    self._evt.clear()
                    return snapshot
                # Spurious wake-up (offer raced with a previous take's
                # critical section). Clear and re-await.
                self._evt.clear()


async def _consumer(
    queue: "_LatestValueQueue",
    kuksa: VSSClient,
) -> None:
    """Drain the latest-value queue and write to Kuksa with dedup.

    Only writes to Kuksa. Dashboard updates come exclusively from
    _dashboard_forwarder (Kuksa subscription), which fires for any
    write to the path regardless of which writer made it.
    """
    last_sent: dict[str, Any] = {}
    while True:
        pending = await queue.take()
        updates: dict[str, Datapoint] = {}
        log_lines: list[str] = []
        for path, (raw_value, cast, src) in pending.items():
            try:
                coerced = cast(raw_value)
            except (TypeError, ValueError) as exc:
                log(f"WARN cannot cast {raw_value!r} -> {cast.__name__} for {path}: {exc}")
                continue
            if last_sent.get(path) == coerced:
                continue
            updates[path] = Datapoint(coerced)
            last_sent[path] = coerced
            log_lines.append(f"OK   {path} = {coerced} (from {src})")
        if updates:
            try:
                await kuksa.set_current_values(updates)
            except Exception as exc:
                log(f"ERROR writing {len(updates)} key(s) to Kuksa: {exc}")
                continue
        for line in log_lines:
            log(line)


async def _dashboard_forwarder(
    kuksa: VSSClient,
    dash_pub: "zenoh.Publisher",
) -> None:
    """Subscribe to the HVAC VSS path on local Kuksa and forward
    each change to the host dashboard as a \`{key, value, status}\`
    envelope. Logs an \`ACT\` line per change so the actuation is
    visible in the ECU log.

    This is the path that surfaces writes made by the range-compute
    app: it writes to Kuksa, this subscriber fires, the dashboard
    indicator updates. Since cabin values now land in Kuksa directly
    (this ECU writes them over gRPC), a single broker holds the truth
    and every writer is reflected the same way.

    For the host-dashboard slider path the same subscriber also
    fires (since we write to Kuksa from \`_consumer\`), which means
    every slider movement results in a single dashboard-side echo.
    That is intentional: the indicator should reflect the current
    Kuksa state regardless of who wrote it.
    """
    last_status: dict[str, str] = {}
    async for updates in kuksa.subscribe_current_values(list(VSS_TO_DASH)):
        for path, dp in updates.items():
            if dp is None or dp.value is None:
                continue
            status = _hvac_status(dp.value)
            payload = json.dumps({
                "key": DASH_KEY_PAIR,
                "value": float(dp.value),
                "status": status,
                "source": SOURCE_LABEL,
                "ts": datetime.now(timezone.utc).isoformat(),
            }).encode("utf-8")
            try:
                dash_pub.put(payload)
            except Exception as exc:
                log(f"ERROR forwarding {path} to dashboard: {exc}")
                continue
            changed = last_status.get(path) != status
            last_status[path] = status
            tag = "ACT " if changed else "act "
            log(f"{tag} {path} = {dp.value}  -> dashboard {DASH_KEY_PAIR} (status={status})")


async def run(router: str, kuksa_host: str, kuksa_port: int) -> None:
    # Single shared Kuksa broker on the primary node: the ECU writes
    # cabin values straight into Kuksa over gRPC. No kuksa-bridge.
    await _run_with_kuksa(router, kuksa_host, kuksa_port)


async def _run_with_kuksa(router: str, kuksa_host: str, kuksa_port: int) -> None:
    log(f"Connecting to Kuksa Databroker at {kuksa_host}:{kuksa_port}...")
    async with VSSClient(kuksa_host, kuksa_port) as kuksa:
        log("Connected to Kuksa.")
        log("Subscribed Zenoh keys -> VSS paths:")
        for k, (vss, cast) in KEY_TO_VSS.items():
            log(f"    {k}  ->  {vss}  ({cast.__name__})")

        loop = asyncio.get_running_loop()
        queue = _LatestValueQueue(loop)
        log(f"Opening Zenoh session (client mode) -> router {router}, subscribed to '{KEY_PREFIX}'")
        with zenoh.open(build_zenoh_config(router)) as session:

            def listener(sample: zenoh.Sample) -> None:
                key = str(sample.key_expr)
                cfg = KEY_TO_VSS.get(key)
                if cfg is None:
                    log(f"WARN ignoring unknown key '{key}'")
                    return
                vss_path, cast = cfg
                try:
                    raw = sample.payload.to_string()
                    msg = json.loads(raw)
                except Exception as exc:
                    log(f"WARN bad payload on '{key}': {exc}")
                    return
                value = msg.get("value")
                src = msg.get("source", "?")
                if value is None:
                    log(f"WARN payload missing 'value' on '{key}': {msg}")
                    return
                queue.offer(vss_path, value, cast, src)

            # Retain the subscriber handle for the session's lifetime. If
            # this reference is dropped, Zenoh garbage-collects the
            # subscription and ingest stops with no error. Kept in a list
            # (and referenced below) so it survives lint/autoflake passes.
            subscribers = [session.declare_subscriber(KEY_PREFIX, listener)]

            # Reverse channel to the host dashboard - declared on the SAME
            # Zenoh session so it shares the ECU's single client connection
            # to the router (command and status ride the one outbound link).
            dash_pub = session.declare_publisher(DASH_STATUS_KEY)
            log(f"Reverse channel publisher on '{DASH_STATUS_KEY}' ready "
                f"({len(subscribers)} subscriber active).")

            consumer_task = asyncio.create_task(_consumer(queue, kuksa))

            forwarder_task = asyncio.create_task(
                _dashboard_forwarder(kuksa, dash_pub)
            )
            log(f"Kuksa->dashboard forwarder subscribed to: "
                f"{', '.join(VSS_TO_DASH)}")

            log("HVAC ECU running. Drive values from the host PyTk dashboard. Ctrl+C to stop.")
            tasks = {consumer_task, forwarder_task}
            try:
                # Fail fast: if either task exits — almost always because
                # the Kuksa subscribe stream broke — surface the error so
                # main() logs FATAL and the process exits for the
                # supervisor to restart. A dead task must never be left
                # running unobserved (which would be a half-working ECU
                # with no crash and no restart).
                done, _ = await asyncio.wait(
                    tasks, return_when=asyncio.FIRST_COMPLETED
                )
            except asyncio.CancelledError:
                done = set()
            finally:
                for t in tasks:
                    t.cancel()
                await asyncio.gather(*tasks, return_exceptions=True)
            for t in done:
                exc = t.exception()
                if exc is not None:
                    raise exc


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="HVAC ECU. Connects (Zenoh client mode) to the router "
                    "on the primary node for sim/cabin/temp samples driven "
                    "by the host PyTk dashboard, and writes the values into "
                    "the shared Kuksa Databroker. Opens no inbound listener."
    )
    p.add_argument("--router", default=DEFAULT_ROUTER,
                   help=f"Zenoh router endpoint on the primary node "
                        f"(default: {DEFAULT_ROUTER})")
    p.add_argument("--kuksa-host", default=DEFAULT_KUKSA_HOST,
                   help=f"Kuksa Databroker host (default: {DEFAULT_KUKSA_HOST})")
    p.add_argument("--kuksa-port", type=int, default=DEFAULT_KUKSA_PORT,
                   help=f"Kuksa Databroker port (default: {DEFAULT_KUKSA_PORT})")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    try:
        asyncio.run(run(args.router, args.kuksa_host, args.kuksa_port))
    except KeyboardInterrupt:
        log("Stopping.")
        return 0
    except Exception as exc:
        import traceback
        traceback.print_exc()
        log(f"FATAL: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
`,
    yaml: `# HVAC ECU — EV Range Extender (schemaVersion: 2)
schemaVersion: 2

publisher:
  author: "AosCloud team"
  company: "EPAM Systems"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: service
      codename: "demo-ev-range-extender-hvac-ecu"
      title: "Demo EV Range Extender HVAC ECU"
      description: "HVAC ECU — consumes dashboard fan-speed commands over Zenoh, writes to Kuksa"
    version: "2.0.0"
    sourceFolder: "demo-ev-range-extender-hvac-ecu"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: /usr/bin/python3 -u /main.py
      instances:
        minInstances: 1
        priority: 10
        labels:
          - secondary
      quotas:
        cpuLimit: 1000
        ramLimit: 128MiB
        storageLimit: 32MiB
      resources:
        - name: kuksa
          mode: rw
        - name: zenoh
          mode: rw
    dependencies:
      - identity:
          type: layer
          codename: kuksa-client
        versions: '>=6.1.0-bosch.2'
      - identity:
          type: layer
          codename: zenoh-client
        versions: '>=6.1.0-bosch.2'`
  },

  bms: {
    name: 'BMS (EV Range Extender)',
    appName: 'demo-ev-range-extender-bms',
    description: 'Battery Monitoring System — receives battery telemetry over Zenoh, writes to Kuksa Databroker',
    language: 'python' as const,
    python: `"""BMS (Battery Monitoring System) service.

Receives raw battery telemetry from the host dashboard over Zenoh and
writes it to the shared Kuksa Databroker (sdv-runtime).

Signal flow
-----------
  pytk_dashboard.py (host)
    ├─ sim/battery/voltage  ─┐
    ├─ sim/battery/current  ─┼─Zenoh─►  bms.py (this)
    └─ sim/battery/soc      ─┘              │
                                write VSS over gRPC ▼
                             Kuksa: Vehicle.Powertrain.TractionBattery.*
                                            │
                                            ▼
                             range_ai.py ─► Vehicle.Powertrain.Range

Zenoh wire format: {"value": <number>, "source": "host", "ts": "<iso>"}
"""

import argparse
import asyncio
import json
import sys
from datetime import datetime

import zenoh
from kuksa_client.grpc import Datapoint
from kuksa_client.grpc.aio import VSSClient

DEFAULT_ROUTER = "tcp/zenoh:7447"  # zenoh router (resolves to primary node)
DEFAULT_KUKSA_HOST = "kuksa"
DEFAULT_KUKSA_PORT = 55555


# Zenoh key -> (VSS path, cast). Keep in sync with pytk_dashboard.py PUBLISHED_KEYS.
KEY_TO_VSS = {
    "sim/battery/voltage": (
        "Vehicle.Powertrain.TractionBattery.CurrentVoltage",
        float,
    ),
    "sim/battery/current": (
        "Vehicle.Powertrain.TractionBattery.CurrentCurrent",
        float,
    ),
    "sim/battery/soc": (
        "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current",
        float,
    ),
}

KEY_PREFIX = "sim/battery/**"


def log(msg: str) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    print(f"[{ts}] [bms] {msg}", flush=True)


def build_zenoh_config(router_endpoint: str) -> zenoh.Config:
    # Client mode: dial the router on the primary node and open NO
    # inbound listener. Pub/sub still flows both ways over the outbound
    # link, so no inbound port is exposed and the service stays
    # reachable no matter which node it migrates to.
    #
    # Scouting is disabled so the client connects ONLY to the configured
    # router and never auto-discovers or meshes with other peers/routers
    # (deterministic connectivity; no rogue-router vector). Verify these
    # key names against the Zenoh version in the runtime image.
    config = zenoh.Config()
    config.insert_json5("mode", '"client"')
    config.insert_json5("connect/endpoints", f'["{router_endpoint}"]')
    config.insert_json5("scouting/multicast/enabled", "false")
    config.insert_json5("scouting/gossip/enabled", "false")
    return config


async def push_to_kuksa(client: VSSClient, path: str, value, cast, src: str) -> None:
    try:
        coerced = cast(value)
    except (TypeError, ValueError) as exc:
        log(f"WARN cannot cast {value!r} -> {cast.__name__} for {path}: {exc}")
        return
    try:
        await client.set_current_values({path: Datapoint(coerced)})
    except Exception as exc:
        log(f"ERROR writing {path}={coerced} to Kuksa: {exc}")
        return
    log(f"OK   {path} = {coerced} (from {src})")


async def run(router: str, kuksa_host: str, kuksa_port: int) -> None:
    log(f"Connecting to Kuksa Databroker at {kuksa_host}:{kuksa_port}...")
    async with VSSClient(kuksa_host, kuksa_port) as kuksa:
        log("Connected to Kuksa.")
        log("Subscribed Zenoh keys -> VSS paths:")
        for k, (vss, cast) in KEY_TO_VSS.items():
            log(f"    {k}  ->  {vss}  ({cast.__name__})")

        loop = asyncio.get_running_loop()
        log(f"Opening Zenoh session (client mode) -> router {router}, subscribed to '{KEY_PREFIX}'")
        with zenoh.open(build_zenoh_config(router)) as session:
            stop_event = asyncio.Event()

            def listener(sample: zenoh.Sample) -> None:
                key = str(sample.key_expr)
                cfg = KEY_TO_VSS.get(key)
                if cfg is None:
                    log(f"WARN ignoring unknown key '{key}'")
                    return
                vss_path, cast = cfg
                try:
                    raw = sample.payload.to_string()
                    msg = json.loads(raw)
                except Exception as exc:
                    log(f"WARN bad payload on '{key}': {exc}")
                    return
                value = msg.get("value")
                src = msg.get("source", "?")
                if value is None:
                    log(f"WARN payload missing 'value' on '{key}': {msg}")
                    return
                asyncio.run_coroutine_threadsafe(
                    push_to_kuksa(kuksa, vss_path, value, cast, src), loop
                )

            # Retain the subscriber handle for the session's lifetime. If
            # this reference is dropped, Zenoh garbage-collects the
            # subscription and ingest stops with no error. Kept in a list
            # (and referenced below) so it survives lint/autoflake passes.
            subscribers = [session.declare_subscriber(KEY_PREFIX, listener)]
            log(f"BMS running ({len(subscribers)} subscriber). Drive values "
                f"from the host PyTk dashboard. Ctrl+C to stop.")
            try:
                await stop_event.wait()
            except asyncio.CancelledError:
                pass


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Battery Monitoring System (BMS). Connects (Zenoh "
                    "client mode) to the router on the primary node for "
                    "sim/battery/* keys driven by the host PyTk dashboard, "
                    "and writes the values into the ev-range Kuksa "
                    "Databroker. Opens no inbound listener."
    )
    p.add_argument("--router", default=DEFAULT_ROUTER,
                   help=f"Zenoh router endpoint on the primary node "
                        f"(default: {DEFAULT_ROUTER})")
    p.add_argument("--kuksa-host", default=DEFAULT_KUKSA_HOST,
                   help=f"Kuksa Databroker host (default: {DEFAULT_KUKSA_HOST})")
    p.add_argument("--kuksa-port", type=int, default=DEFAULT_KUKSA_PORT,
                   help=f"Kuksa Databroker port (default: {DEFAULT_KUKSA_PORT})")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    try:
        asyncio.run(run(args.router, args.kuksa_host, args.kuksa_port))
    except KeyboardInterrupt:
        log("Stopping.")
        return 0
    except Exception as exc:
        log(f"FATAL: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
`,
    yaml: `# BMS — EV Range Extender (schemaVersion: 2)
schemaVersion: 2

publisher:
  author: "AosCloud team"
  company: "EPAM Systems"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: service
      codename: "demo-ev-range-extender-bms"
      title: "Demo EV Range Extender BMS"
      description: "Battery Monitoring System — receives battery telemetry over Zenoh, writes to Kuksa"
    version: "2.0.0"
    sourceFolder: "demo-ev-range-extender-bms"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: /usr/bin/python3 -u /main.py
      instances:
        minInstances: 1
        priority: 10
        labels:
          - main
      quotas:
        cpuLimit: 1000
        ramLimit: 128MiB
        storageLimit: 32MiB
      resources:
        - name: kuksa
          mode: rw
        - name: zenoh
          mode: rw
    dependencies:
      - identity:
          type: layer
          codename: kuksa-client
        versions: '>=6.1.0-bosch.2'
      - identity:
          type: layer
          codename: zenoh-client
        versions: '>=6.1.0-bosch.2'`
  },

  rangeAi: {
    name: 'Range AI (EV Range Extender)',
    appName: 'demo-ev-range-extender-range-ai',
    description: 'Range Compute AI — subscribes to battery/cabin signals from Kuksa, computes driving range',
    language: 'python' as const,
    python: `# Copyright (c) 2026 Eclipse Foundation.
#
# This program and the accompanying materials are made available under the
# terms of the MIT License which is available at
# https://opensource.org/licenses/MIT.
#
# SPDX-License-Identifier: MIT
"""Range Compute AI service.

Subscribes to battery and cabin VSS signals from the shared Kuksa
Databroker (sdv-runtime), computes estimated driving range, and writes
the result back as Vehicle.Powertrain.Range.

Signal flow
-----------
  Kuksa Databroker (shared, on the primary node)
    ├─ Vehicle.Powertrain.TractionBattery.CurrentVoltage      (written by bms.py)
    ├─ Vehicle.Powertrain.TractionBattery.CurrentCurrent      (written by bms.py)
    ├─ Vehicle.Powertrain.TractionBattery.StateOfCharge.Current  (written by bms.py)
    ├─ Vehicle.Cabin.HVAC.AmbientAirTemperature               (written by hvac_ecu.py)
    ├─ Vehicle.Cabin.Seat.Row1.DriverSide.Heating             (written by seat_ecu.py)
    └─ Vehicle.Cabin.Seat.Row1.DriverSide.HeatingCooling      (written by seat_ecu.py)
          │
          ▼
      range_ai.py  computes  range_km = available_kWh / effective_consumption
          │
          ▼
      Vehicle.Powertrain.Range  (Uint32, km)

Note: AmbientAirTemperature (0–100 %) is reused as HVAC fan-speed for the
demo; a higher fan value increases cabin power draw and lowers range.
"""

import argparse
import asyncio
import sys
from datetime import datetime

from kuksa_client.grpc import Datapoint
from kuksa_client.grpc.aio import VSSClient


# Battery signals (written by bms.py)
SIGNAL_CURRENT = "Vehicle.Powertrain.TractionBattery.CurrentCurrent"
SIGNAL_VOLTAGE = "Vehicle.Powertrain.TractionBattery.CurrentVoltage"
SIGNAL_SOC     = "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current"

# Cabin signals (written to Kuksa directly by the cabin ECUs; fan speed uses AmbientAirTemperature)
SIGNAL_HVAC_FAN  = "Vehicle.Cabin.HVAC.AmbientAirTemperature"
SIGNAL_SEAT_HEAT = "Vehicle.Cabin.Seat.Row1.DriverSide.Heating"
SIGNAL_SEAT_HC   = "Vehicle.Cabin.Seat.Row1.DriverSide.HeatingCooling"

BATTERY_SIGNALS    = [SIGNAL_CURRENT, SIGNAL_VOLTAGE, SIGNAL_SOC]
# CABIN_SIGNALS      = [SIGNAL_HVAC_FAN, SIGNAL_SEAT_HEAT, SIGNAL_SEAT_HC]
CABIN_SIGNALS      = [SIGNAL_HVAC_FAN, SIGNAL_SEAT_HC]
SUBSCRIBED_SIGNALS = BATTERY_SIGNALS + CABIN_SIGNALS

RANGE_SIGNAL = "Vehicle.Powertrain.Range"

# ---- Vehicle model parameters ----------------------------------------
BATTERY_CAPACITY_KWH = 75.0
NOMINAL_CONSUMPTION_KWH_PER_KM = 0.18
NOMINAL_CRUISE_POWER_KW = 18.0

# Cabin actuator power model. Each load is additive in kW and converted
# to kWh/km via AVG_SPEED_KMH so it can be folded into the per-km
# consumption term.
#
#   * HVAC fan : aggregate of A/C compressor + heater core + blower for
#                the driver-side HVAC station. ~2 kW at 100 % is realistic
#                for a passenger EV with the climate system at full tilt.
#   * Seat     : driver-zone aggregate (seat pad + footwell PTC heater +
#                steering-wheel heater + cabin fan budget for that zone).
#                Higher than a bare seat element on purpose so the demo
#                visibly moves the range number.
HVAC_FAN_FULL_KW    = 2.0
SEAT_HEATER_FULL_KW = 2.0
SEAT_VENT_FULL_KW   = 0.5
AVG_SPEED_KMH       = 60.0


def log(msg: str) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    print(f"[{ts}] [range-ai] {msg}", flush=True)


def _format(value) -> str:
    if value is None:
        return "<unset>"
    if isinstance(value, float):
        return f"{value:.3f}"
    return str(value)


class VehicleState:
    """Latest values for everything range_ai cares about."""

    def __init__(self) -> None:
        self.current = None          # battery current (A)
        self.voltage = None          # battery voltage (V)
        self.state_of_charge = None  # SoC (%)
        self.hvac_fan = None         # HVAC fan speed (%, 0..100), by hvac_ecu.py
                                     # (carried on AmbientAirTemperature; see docstring)
        self.seat_heat = None        # seat heating (%, 0..100), by seat_ecu.py
        self.seat_hc = None          # seat HeatingCooling (%, -100..100), by seat_ecu.py

    def update(self, path: str, value) -> None:
        if path == SIGNAL_CURRENT:
            self.current = value
        elif path == SIGNAL_VOLTAGE:
            self.voltage = value
        elif path == SIGNAL_SOC:
            self.state_of_charge = value
        elif path == SIGNAL_HVAC_FAN:
            self.hvac_fan = value
        elif path == SIGNAL_SEAT_HEAT:
            self.seat_heat = value
        elif path == SIGNAL_SEAT_HC:
            self.seat_hc = value


def hvac_load_kw(state: "VehicleState") -> float:
    """HVAC station power draw scaled by fan speed (kW). Always >= 0.

    Fan speed is the dashboard's relabel of \`AmbientAirTemperature\`
    (0..100). Values outside that range are clamped, not rejected,
    so the model degrades gracefully if a stray reading slips in.
    """
    if state.hvac_fan is None:
        return 0.0
    try:
        pct = max(0.0, min(100.0, float(state.hvac_fan)))
    except (TypeError, ValueError):
        return 0.0
    return HVAC_FAN_FULL_KW * (pct / 100.0)


def seat_load_kw(state: "VehicleState") -> float:
    """Seat-zone actuator power (kW). Always >= 0.

    * Seat.Heating         : 0..100 %  -> 0..SEAT_HEATER_FULL_KW
    * Seat.HeatingCooling  : -100..100 %
        positive (heating) -> SEAT_HEATER_FULL_KW * pct/100
        negative (cooling) -> SEAT_VENT_FULL_KW   * |pct|/100

    The dashboard's mutex guarantees Heating and HeatingCooling are
    never both non-zero at the same time, so this can't double-count
    in practice, but the formula handles both being set independently
    in case someone drives Kuksa directly.
    """
    total = 0.0
    if state.seat_heat is not None:
        try:
            pct = max(0.0, min(100.0, float(state.seat_heat)))
            total += SEAT_HEATER_FULL_KW * (pct / 100.0)
        except (TypeError, ValueError):
            pass
    if state.seat_hc is not None:
        try:
            hc = max(-100.0, min(100.0, float(state.seat_hc)))
            if hc > 0:
                total += SEAT_HEATER_FULL_KW * (hc / 100.0)
            elif hc < 0:
                total += SEAT_VENT_FULL_KW * (-hc / 100.0)
        except (TypeError, ValueError):
            pass
    return total


def cabin_load_kw(state: "VehicleState") -> float:
    """Total cabin draw (kW) = HVAC fan + seat actuators."""
    return hvac_load_kw(state) + seat_load_kw(state)


def compute_range(state: VehicleState):
    """Return estimated remaining range in km, or None if SoC is unknown."""
    if state.state_of_charge is None:
        return None

    try:
        soc = float(state.state_of_charge)
    except (TypeError, ValueError):
        return None

    soc = max(0.0, min(100.0, soc))
    available_kwh = (soc / 100.0) * BATTERY_CAPACITY_KWH

    consumption = NOMINAL_CONSUMPTION_KWH_PER_KM

    # Hard-acceleration penalty (instantaneous traction power).
    if state.current is not None and state.voltage is not None:
        try:
            power_kw = abs(float(state.current) * float(state.voltage)) / 1000.0
            if power_kw > NOMINAL_CRUISE_POWER_KW:
                load_factor = power_kw / NOMINAL_CRUISE_POWER_KW
                consumption = NOMINAL_CONSUMPTION_KWH_PER_KM * load_factor
        except (TypeError, ValueError):
            pass

    # Cabin actuator load (additive - HVAC fan + seat heater + ventilation).
    consumption += cabin_load_kw(state) / AVG_SPEED_KMH

    if consumption <= 0:
        return None

    return available_kwh / consumption


async def run(host: str, port: int) -> None:
    log(f"Connecting to Kuksa Databroker at {host}:{port}...")
    async with VSSClient(host, port) as client:
        log("Connected.")
        log(f"  Subscribing to {len(SUBSCRIBED_SIGNALS)} signal(s):")
        for s in BATTERY_SIGNALS:
            log(f"    - {s}                     (battery, written by bms.py)")
        for s in CABIN_SIGNALS:
            log(f"    - {s}     (cabin, written by the cabin ECUs)")
        log("  Will publish to:")
        log(f"    - {RANGE_SIGNAL}")
        log(
            f"  Model: capacity={BATTERY_CAPACITY_KWH} kWh, "
            f"consumption={NOMINAL_CONSUMPTION_KWH_PER_KM} kWh/km, "
            f"cruise={NOMINAL_CRUISE_POWER_KW} kW, "
            f"hvac-fan-max={HVAC_FAN_FULL_KW * 1000:.0f} W, "
            f"seat-heater-max={SEAT_HEATER_FULL_KW * 1000:.0f} W, "
            f"seat-vent-max={SEAT_VENT_FULL_KW * 1000:.0f} W"
        )

        state = VehicleState()
        async for updates in client.subscribe_current_values(SUBSCRIBED_SIGNALS):
            for path, dp in updates.items():
                value = dp.value if dp is not None else None
                state.update(path, value)
                log(f"input  : {path} = {_format(value)}")

            range_km = compute_range(state)
            if range_km is None:
                log("output : <waiting for StateOfCharge to be set>")
                continue

            # Vehicle.Powertrain.Range is declared as Uint32 in the
            # ev-range VSS catalog, so we must publish an int (not a
            # float) - otherwise the broker rejects the write.
            range_km_int = max(0, int(round(range_km)))
            hvac_kw = hvac_load_kw(state)
            seat_kw = seat_load_kw(state)

            try:
                await client.set_current_values({
                    RANGE_SIGNAL: Datapoint(range_km_int),
                })
            except Exception as exc:
                log(f"ERROR publishing {RANGE_SIGNAL}: {exc}")
                continue

            log(
                f"output : {RANGE_SIGNAL} = {range_km_int} km "
                f"(computed {range_km:.1f} km; "
                f"SoC={_format(state.state_of_charge)} %, "
                f"I={_format(state.current)} A, "
                f"U={_format(state.voltage)} V, "
                f"fan={_format(state.hvac_fan)} %, hvac={hvac_kw * 1000:.0f} W, "
                f"seatHeat={_format(state.seat_heat)} %, "
                f"seatHC={_format(state.seat_hc)} %, seat={seat_kw * 1000:.0f} W)"
            )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="EV Range Extender - Range Compute AI"
    )
    parser.add_argument(
        "--host",
        default="kuksa",
        help="Kuksa Databroker host (default: kuksa)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=55555,
        help="Kuksa Databroker port (default: 55555)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        asyncio.run(run(args.host, args.port))
    except KeyboardInterrupt:
        log("Stopping.")
        return 0
    except Exception as exc:
        log(f"FATAL: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
`,
    yaml: `# Range AI — EV Range Extender (schemaVersion: 2)
schemaVersion: 2

publisher:
  author: "AosCloud team"
  company: "EPAM Systems"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: service
      codename: "demo-ev-range-extender-range-ai"
      title: "Demo EV Range Extender Range AI"
      description: "Range Compute AI — subscribes to battery/cabin signals from Kuksa, computes driving range"
    version: "2.0.0"
    sourceFolder: "demo-ev-range-extender-range-ai"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: /usr/bin/python3 -u /main.py
      instances:
        minInstances: 1
        priority: 10
        labels:
          - main
      quotas:
        cpuLimit: 1000
        ramLimit: 128MiB
        storageLimit: 32MiB
      resources:
        - name: kuksa
          mode: rw
    dependencies:
      - identity:
          type: layer
          codename: kuksa-client
        versions: '>=6.1.0-bosch.2'`
  }
}
