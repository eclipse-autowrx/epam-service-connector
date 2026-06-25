// Copyright (c) 2026 Eclipse Foundation.
// 
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

// Preset examples for AOS Cloud Deployment Plugin
// Writer and Reader use separate service UUIDs so both can run simultaneously.

export const PRESETS = {
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
      - sourceFolder: "src_x86_64"
        archInfo:
          architecture: "amd64"
        workingDir: "/"
        cmd: "/hello-aos"

      - sourceFolder: "src_aarch64"
        archInfo:
          architecture: "arm64"
        workingDir: "/"
        cmd: "/hello-aos"

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
      - sourceFolder: "src_x86_64"
        archInfo:
          architecture: "amd64"
        workingDir: "/"
        cmd: "/signal-writer"

      - sourceFolder: "src_aarch64"
        archInfo:
          architecture: "arm64"
        workingDir: "/"
        cmd: "/signal-writer"

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
      - sourceFolder: "src_x86_64"
        archInfo:
          architecture: "amd64"
        workingDir: "/"
        cmd: "/kuksa-reader"

      - sourceFolder: "src_aarch64"
        archInfo:
          architecture: "arm64"
        workingDir: "/"
        cmd: "/kuksa-reader"

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

#include <grpcpp/grpcpp.h>
#include "kuksa/val/v1/val.grpc.pb.h"
#include "kuksa/val/v1/types.pb.h"

#define VERSION "1.0.0"
#define SOC_THRESHOLD 20.0f
#define NORMAL_EFFICIENCY 5.5f
#define DEGRADED_EFFICIENCY 4.0f

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

int main(int argc, char* argv[]) {
    std::string target = "10.0.0.100:55555";
    int interval = 2;

    if (auto t = std::getenv("KUKSA_DATABROKER_ADDR")) target = t;
    if (auto i = std::getenv("CHECK_INTERVAL"))        interval = std::atoi(i);
    if (argc > 1) target   = argv[1];
    if (argc > 2) interval = std::atoi(argv[2]);

    const float soc_threshold = std::getenv("SOC_THRESHOLD")
        ? std::atof(std::getenv("SOC_THRESHOLD"))
        : SOC_THRESHOLD;

    std::cout << "========================================" << std::endl;
    std::cout << "  EV Range Extender" << std::endl;
    std::cout << "  Version:       " << VERSION << std::endl;
    std::cout << "  Databroker:    " << target << std::endl;
    std::cout << "  Interval:      " << interval << "s" << std::endl;
    std::cout << "  SoC threshold: " << soc_threshold << "%" << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout.flush();

    auto channel = grpc::CreateChannel(target,
                                       grpc::InsecureChannelCredentials());
    auto stub = kuksa::val::v1::VAL::NewStub(channel);

    for (int r = 1; r <= 15; r++) {
        kuksa::val::v1::GetServerInfoRequest req;
        kuksa::val::v1::GetServerInfoResponse resp;
        grpc::ClientContext ctx;
        ctx.set_deadline(std::chrono::system_clock::now() +
                         std::chrono::seconds(3));
        auto st = stub->GetServerInfo(&ctx, req, &resp);
        if (st.ok()) {
            std::cout << "[RangeExt] Connected: " << resp.name()
                      << " " << resp.version() << std::endl;
            break;
        }
        if (r == 15) {
            std::cerr << "[RangeExt] Unreachable: " << target << std::endl;
            return 1;
        }
        std::cout << "[RangeExt] Waiting (" << r << "/15)..." << std::endl;
        std::cout.flush();
        std::this_thread::sleep_for(std::chrono::seconds(2));
    }

    std::string prev_mode = "";
    int cycle = 0;

    while (true) {
        cycle++;

        float soc  = get_signal(stub.get(),
            "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current");
        float temp = get_signal(stub.get(),
            "Vehicle.Cabin.HVAC.AmbientAirTemperature");

        if (soc < 0) soc = 50.0f;

        std::string mode;
        float range;
        float light_intensity;
        float seat_heating;

        if (soc < soc_threshold) {
            mode = "POWER_SAVE";
            range = soc * DEGRADED_EFFICIENCY;
            light_intensity = 30.0f;
            seat_heating = 0.0f;
        } else {
            mode = "NORMAL";
            range = soc * NORMAL_EFFICIENCY;
            light_intensity = 100.0f;
            seat_heating = 1.0f;
        }

        set_signal(stub.get(), "Vehicle.Powertrain.Range", range);
        set_signal(stub.get(),
            "Vehicle.Cabin.Lights.AmbientLight.Intensity", light_intensity);
        set_signal(stub.get(), "Vehicle.Cabin.Seat.Heating", seat_heating);

        if (mode != prev_mode) {
            std::cout << "[RangeExt] *** MODE CHANGE: " << mode << " ***"
                      << std::endl;
            prev_mode = mode;
        }

        if (cycle % 5 == 1) {
            std::cout << "[RangeExt] cycle=" << cycle
                      << " mode=" << mode
                      << " SoC=" << soc << "%"
                      << " Temp=" << (temp >= 0 ? std::to_string((int)temp) : "N/A") << "C"
                      << " Range=" << range << "km"
                      << " Lights=" << light_intensity
                      << " SeatHeat=" << seat_heating
                      << std::endl;
            std::cout.flush();
        }

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
      codename: "ev-range-extender"
      title: "EV Range Extender - HPC Domain"
      description: "Battery management, range computation, power-saving mode control"
    version: "1.0.0"
    sourceFolder: "ev-range-extender"

    images:
      - sourceFolder: "src_x86_64"
        archInfo:
          architecture: "amd64"
        workingDir: "/"
        cmd: "/ev-range-extender"

      - sourceFolder: "src_aarch64"
        archInfo:
          architecture: "arm64"
        workingDir: "/"
        cmd: "/ev-range-extender"

    configuration:
      workingDir: "/"
      cmd: "/ev-range-extender"
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
    for (const char* path : { RANGE_PATH, SOC_PATH, HVAC_PATH, SEAT_HEAT_PATH }) {
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
                        std::cout << "[!] SoC=" << soc << "% < " << seat_threshold << "%  ->  Turning Seat Heating off" << std::endl;
                        set_int(stub, SEAT_HEAT_PATH, 0);
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
      - sourceFolder: "src_x86_64"
        archInfo:
          architecture: "amd64"
        workingDir: "/"
        cmd: "/battery-energy-saver"

      - sourceFolder: "src_aarch64"
        archInfo:
          architecture: "arm64"
        workingDir: "/"
        cmd: "/battery-energy-saver"

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
      - sourceFolder: "src_x86_64"
        archInfo:
          architecture: "amd64"
        workingDir: "/"
        cmd: "/signal-reporter"

      - sourceFolder: "src_aarch64"
        archInfo:
          architecture: "arm64"
        workingDir: "/"
        cmd: "/signal-reporter"

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
      - sourceFolder: "src_x86_64"
        archInfo:
          architecture: "amd64"
        workingDir: "/"
        cmd: "/battery-energy-saver-sdv"

      - sourceFolder: "src_aarch64"
        archInfo:
          architecture: "arm64"
        workingDir: "/"
        cmd: "/battery-energy-saver-sdv"

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

  // ── Python equivalents of C++ presets ──

  kuksaWriterPython: {
    name: 'Signal Writer (Python)',
    appName: 'signal-writer-py',
    description: 'Writes Speed, SoC, AmbientTemp to KUKSA Databroker via kuksa-client',
    language: 'python' as const,
    python: `#!/usr/bin/env python3
"""
KUKSA Signal Writer (Python) for AosEdge.
Writes Speed, SoC, and AmbientTemp signals to KUKSA Databroker.
Uses kuksa-client VSSClient for gRPC communication.
"""
import time
import sys
import os
import math

VERSION = "1.0.0"

# kuksa-client may not be pre-installed; install with: pip install kuksa-client
try:
    from kuksa_client.grpc import VSSClient, Datapoint
except ImportError:
    print("[Writer] kuksa-client not found. Install: pip install kuksa-client", flush=True)
    sys.exit(1)

def main():
    target = os.environ.get("KUKSA_DATABROKER_ADDR", "172.17.0.1:55555")
    interval = int(os.environ.get("WRITE_INTERVAL", "2"))
    if len(sys.argv) > 1:
        target = sys.argv[1]
    if len(sys.argv) > 2:
        interval = int(sys.argv[2])

    host, port = target.rsplit(":", 1) if ":" in target else (target, "55555")

    print("=" * 50, flush=True)
    print("  KUKSA Signal Writer (Python)", flush=True)
    print(f"  Version:    {VERSION}", flush=True)
    print(f"  Databroker: {target}", flush=True)
    print(f"  Interval:   {interval}s", flush=True)
    print("=" * 50, flush=True)

    # Connect with retry
    client = VSSClient(host, int(port))
    for attempt in range(1, 16):
        try:
            client.connect()
            info = client.get_server_info()
            print(f"[Writer] Connected: {info.name} {info.version}", flush=True)
            break
        except Exception as e:
            if attempt == 15:
                print(f"[Writer] Unreachable: {target} — {e}", flush=True)
                sys.exit(1)
            print(f"[Writer] Waiting ({attempt}/15)...", flush=True)
            time.sleep(2)

    t = 0
    while True:
        speed = 40.0 + 30.0 * math.sin(t * 0.1)
        temp = 22.0 + 5.0 * math.sin(t * 0.05)
        soc = max(0.0, min(100.0, 80.0 - t * 0.01))

        try:
            client.set_current_values({
                "Vehicle.Speed": Datapoint(speed),
                "Vehicle.Cabin.HVAC.AmbientAirTemperature": Datapoint(temp),
                "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current": Datapoint(soc),
            })
        except Exception as e:
            print(f"[Writer] Set error: {e}", flush=True)

        if t % 5 == 0:
            print(f"[Writer] t={t} Speed={speed:.1f} Temp={temp:.1f} SoC={soc:.1f}", flush=True)

        t += 1
        time.sleep(interval)

if __name__ == "__main__":
    main()
`,
    yaml: `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
# Python service — architecture-independent
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
      codename: "signal-writer-py"
      title: "Signal Writer (Python)"
      description: "Writes Speed, SoC, AmbientTemp to KUKSA Databroker via kuksa-client"
    version: "1.0.0"
    sourceFolder: "signal-writer-py"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: /usr/bin/python3 -u /main.py
      env:
        - "KUKSA_DATABROKER_ADDR=172.17.0.1:55556"
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 5000
        ramLimit: 512MiB
        storageLimit: 32MiB
        stateLimit: 1MiB
        tmpLimit: 256MiB`
  },

  kuksaReaderPython: {
    name: 'KUKSA Reader (Python)',
    appName: 'kuksa-reader-py',
    description: 'Subscribes to vehicle signals from KUKSA Databroker via kuksa-client',
    language: 'python' as const,
    python: `#!/usr/bin/env python3
"""
KUKSA Signal Reader (Python) for AosEdge.
Subscribes to Speed, SoC, and AmbientTemp from KUKSA Databroker.
Uses kuksa-client VSSClient subscribe() for streaming updates.
"""
import time
import sys
import os

VERSION = "1.0.0"

try:
    from kuksa_client.grpc import VSSClient, Datapoint
except ImportError:
    print("[Reader] kuksa-client not found. Install: pip install kuksa-client", flush=True)
    sys.exit(1)

SIGNALS = [
    "Vehicle.Speed",
    "Vehicle.Cabin.HVAC.AmbientAirTemperature",
    "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current",
]

def format_value(dp):
    """Extract a human-readable value from a Datapoint."""
    if dp is None:
        return "N/A"
    # Datapoint stores the value in .value attribute
    val = dp.value
    if isinstance(val, bool):
        return "true" if val else "false"
    return str(val)

def main():
    target = os.environ.get("KUKSA_DATABROKER_ADDR", "172.17.0.1:55555")
    if len(sys.argv) > 1:
        target = sys.argv[1]

    host, port = target.rsplit(":", 1) if ":" in target else (target, "55555")

    print("=" * 50, flush=True)
    print("  KUKSA Signal Reader (Python)", flush=True)
    print(f"  Version:    {VERSION}", flush=True)
    print(f"  Databroker: {target}", flush=True)
    print("=" * 50, flush=True)

    client = VSSClient(host, int(port))
    for attempt in range(1, 16):
        try:
            client.connect()
            info = client.get_server_info()
            print(f"[Reader] Connected: {info.name} {info.version}", flush=True)
            break
        except Exception as e:
            if attempt == 15:
                print(f"[Reader] Unreachable: {target} — {e}", flush=True)
                sys.exit(1)
            print(f"[Reader] Waiting ({attempt}/15)...", flush=True)
            time.sleep(2)

    print(f"[Reader] Subscribing to {len(SIGNALS)} signals...", flush=True)

    msg_count = 0
    while True:
        try:
            for updates in client.subscribe_current_values(SIGNALS):
                msg_count += 1
                parts = [f"[Reader] #{msg_count}:"]
                for update in updates:
                    parts.append(f" {update.entry.path}={format_value(update.entry.value)}")
                print("".join(parts), flush=True)
        except Exception as e:
            print(f"[Reader] Stream ended: {e}", flush=True)
            print("[Reader] Reconnecting in 5s...", flush=True)
            time.sleep(5)

if __name__ == "__main__":
    main()
`,
    yaml: `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
# Python service — architecture-independent
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
      codename: "kuksa-reader-py"
      title: "KUKSA Reader (Python)"
      description: "Subscribes to vehicle signals from KUKSA Databroker via kuksa-client"
    version: "1.0.0"
    sourceFolder: "kuksa-reader-py"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: /usr/bin/python3 -u /main.py
      env:
        - "KUKSA_DATABROKER_ADDR=172.17.0.1:55555"
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 5000
        ramLimit: 512MiB
        storageLimit: 32MiB
        stateLimit: 1MiB
        tmpLimit: 256MiB`
  },

  evRangeExtenderPython: {
    name: 'EV Range Extender (Python)',
    appName: 'ev-range-extender-py',
    description: 'Battery management, range computation, power-saving mode control via kuksa-client',
    language: 'python' as const,
    python: `#!/usr/bin/env python3
"""
EV Range Extender (Python) for AosEdge.
Reads SoC and temperature from KUKSA Databroker, computes range,
and switches between NORMAL and POWER_SAVE modes.
"""
import time
import sys
import os
import math

VERSION = "1.0.0"
SOC_THRESHOLD = 20.0
NORMAL_EFFICIENCY = 5.5
DEGRADED_EFFICIENCY = 4.0

try:
    from kuksa_client.grpc import VSSClient, Datapoint
except ImportError:
    print("[RangeExt] kuksa-client not found. Install: pip install kuksa-client", flush=True)
    sys.exit(1)

SOC_PATH   = "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current"
TEMP_PATH  = "Vehicle.Cabin.HVAC.AmbientAirTemperature"
RANGE_PATH = "Vehicle.Powertrain.Range"
LIGHT_PATH = "Vehicle.Cabin.Lights.AmbientLight.Intensity"
SEAT_PATH  = "Vehicle.Cabin.Seat.Heating"

def get_float(client, path):
    try:
        entries = client.get_current_values([path])
        if entries:
            dp = entries[path]
            return float(dp.value) if dp.value is not None else -1.0
    except Exception:
        pass
    return -1.0

def main():
    target = os.environ.get("KUKSA_DATABROKER_ADDR", "172.17.0.1:55555")
    interval = int(os.environ.get("CHECK_INTERVAL", "2"))
    soc_threshold = float(os.environ.get("SOC_THRESHOLD", str(SOC_THRESHOLD)))
    if len(sys.argv) > 1:
        target = sys.argv[1]
    if len(sys.argv) > 2:
        interval = int(sys.argv[2])

    host, port = target.rsplit(":", 1) if ":" in target else (target, "55555")

    print("=" * 50, flush=True)
    print("  EV Range Extender (Python)", flush=True)
    print(f"  Version:       {VERSION}", flush=True)
    print(f"  Databroker:    {target}", flush=True)
    print(f"  Interval:      {interval}s", flush=True)
    print(f"  SoC threshold: {soc_threshold}%", flush=True)
    print("=" * 50, flush=True)

    client = VSSClient(host, int(port))
    for attempt in range(1, 16):
        try:
            client.connect()
            info = client.get_server_info()
            print(f"[RangeExt] Connected: {info.name} {info.version}", flush=True)
            break
        except Exception as e:
            if attempt == 15:
                print(f"[RangeExt] Unreachable: {target} — {e}", flush=True)
                sys.exit(1)
            print(f"[RangeExt] Waiting ({attempt}/15)...", flush=True)
            time.sleep(2)

    prev_mode = ""
    cycle = 0

    while True:
        cycle += 1

        soc = get_float(client, SOC_PATH)
        if soc < 0:
            soc = 50.0

        if soc < soc_threshold:
            mode = "POWER_SAVE"
            range_km = soc * DEGRADED_EFFICIENCY
            light_intensity = 30.0
            seat_heating = 0.0
        else:
            mode = "NORMAL"
            range_km = soc * NORMAL_EFFICIENCY
            light_intensity = 100.0
            seat_heating = 1.0

        try:
            client.set_current_values({
                RANGE_PATH: Datapoint(range_km),
                LIGHT_PATH: Datapoint(light_intensity),
                SEAT_PATH: Datapoint(seat_heating),
            })
        except Exception as e:
            print(f"[RangeExt] Set error: {e}", flush=True)

        if mode != prev_mode:
            print(f"[RangeExt] *** MODE CHANGE: {mode} ***", flush=True)
            prev_mode = mode

        if cycle % 5 == 1:
            temp = get_float(client, TEMP_PATH)
            temp_str = f"{int(temp)}C" if temp >= 0 else "N/A"
            print(f"[RangeExt] cycle={cycle} mode={mode} SoC={soc:.0f}% Temp={temp_str} Range={range_km:.0f}km Lights={light_intensity:.0f} SeatHeat={seat_heating:.0f}", flush=True)

        time.sleep(interval)

if __name__ == "__main__":
    main()
`,
    yaml: `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
# Python service — architecture-independent
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
      codename: "ev-range-extender-py"
      title: "EV Range Extender (Python)"
      description: "Battery management, range computation, power-saving mode control"
    version: "1.0.0"
    sourceFolder: "ev-range-extender-py"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: /usr/bin/python3 -u /main.py
      env:
        - "KUKSA_DATABROKER_ADDR=172.17.0.1:55555"
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 5000
        ramLimit: 512MiB
        storageLimit: 32MiB
        stateLimit: 1MiB
        tmpLimit: 256MiB`
  },

  batteryEnergySaverPython: {
    name: 'Battery Energy Saver (Python)',
    appName: 'battery-energy-saver-py',
    description: 'Forces HVAC and seat heating off when SoC drops below thresholds via kuksa-client',
    language: 'python' as const,
    python: `#!/usr/bin/env python3
"""
Battery Energy Saver (Python) for AosEdge.
Subscribes to SoC and forces HVAC/seat heating off when battery is low.
Blocks re-activation while SoC remains below thresholds.
"""
import time
import sys
import os
import signal as sig_module

VERSION = "1.0.0"
DEFAULT_HVAC_OFF_THRESHOLD = 50.0
DEFAULT_SEAT_OFF_THRESHOLD = 30.0

try:
    from kuksa_client.grpc import VSSClient, Datapoint
except ImportError:
    print("[EnergySaver] kuksa-client not found. Install: pip install kuksa-client", flush=True)
    sys.exit(1)

RANGE_PATH     = "Vehicle.Powertrain.Range"
SOC_PATH       = "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current"
HVAC_PATH      = "Vehicle.Cabin.HVAC.IsAirConditioningActive"
SEAT_HEAT_PATH = "Vehicle.Cabin.Seat.Row1.DriverSide.Heating"

g_running = True

def signal_handler(signum, frame):
    global g_running
    g_running = False

def main():
    global g_running
    target = os.environ.get("KUKSA_DATABROKER_ADDR", "172.17.0.1:55555")
    hvac_threshold = float(os.environ.get("HVAC_OFF_THRESHOLD", str(DEFAULT_HVAC_OFF_THRESHOLD)))
    seat_threshold = float(os.environ.get("SEAT_OFF_THRESHOLD", str(DEFAULT_SEAT_OFF_THRESHOLD)))
    if len(sys.argv) > 1:
        target = sys.argv[1]
    if len(sys.argv) > 2:
        hvac_threshold = float(sys.argv[2])
    if len(sys.argv) > 3:
        seat_threshold = float(sys.argv[3])

    sig_module.signal(sig_module.SIGINT, signal_handler)
    sig_module.signal(sig_module.SIGTERM, signal_handler)

    host, port = target.rsplit(":", 1) if ":" in target else (target, "55555")

    print("=" * 60, flush=True)
    print("  Battery Energy Saver (Python)", flush=True)
    print(f"  Version:         {VERSION}", flush=True)
    print(f"  Databroker:      {target}", flush=True)
    print(f"  HVAC off below:  {hvac_threshold}%", flush=True)
    print(f"  Seat off below:  {seat_threshold}%", flush=True)
    print("=" * 60, flush=True)

    client = VSSClient(host, int(port))
    for attempt in range(1, 16):
        try:
            client.connect()
            info = client.get_server_info()
            print(f"[EnergySaver] Connected: {info.name} {info.version}", flush=True)
            break
        except Exception as e:
            if attempt == 15:
                print(f"[EnergySaver] Unreachable: {target} — {e}", flush=True)
                sys.exit(1)
            print(f"[EnergySaver] Waiting ({attempt}/15)...", flush=True)
            time.sleep(2)

    print("[EnergySaver] Subscribing to signals...", flush=True)

    soc = 100.0
    vehicle_range = 0.0
    hvac_cut = False
    seat_cut = False

    while g_running:
        try:
            for updates in client.subscribe_current_values([
                RANGE_PATH, SOC_PATH, HVAC_PATH, SEAT_HEAT_PATH
            ]):
                if not g_running:
                    break

                for update in updates:
                    path = update.entry.path
                    dp = update.entry.value

                    if path == RANGE_PATH:
                        vehicle_range = float(dp.value) if dp.value is not None else 0.0
                    elif path == SOC_PATH:
                        soc = float(dp.value) if dp.value is not None else 100.0
                        print(f"Charge: {soc:.0f}% | Range: {vehicle_range:.0f}", flush=True)

                        if soc < hvac_threshold and not hvac_cut:
                            print(f"[!] SoC={soc:.0f}% < {hvac_threshold:.0f}%  ->  Turning HVAC off", flush=True)
                            client.set_target_values({HVAC_PATH: Datapoint(False)})
                            hvac_cut = True
                        elif soc >= hvac_threshold and hvac_cut:
                            print(f"[+] SoC={soc:.0f}%  ->  HVAC restriction lifted", flush=True)
                            hvac_cut = False

                        if soc < seat_threshold and not seat_cut:
                            print(f"[!] SoC={soc:.0f}% < {seat_threshold:.0f}%  ->  Turning Seat Heating off", flush=True)
                            client.set_target_values({SEAT_HEAT_PATH: Datapoint(0)})
                            seat_cut = True
                        elif soc >= seat_threshold and seat_cut:
                            print(f"[+] SoC={soc:.0f}%  ->  Seat restriction lifted", flush=True)
                            seat_cut = False

                    elif path == HVAC_PATH and hvac_cut:
                        val = dp.value
                        if val is not None and bool(val):
                            print("[!] Battery low  ->  blocking HVAC re-activation", flush=True)
                            client.set_target_values({HVAC_PATH: Datapoint(False)})

                    elif path == SEAT_HEAT_PATH and seat_cut:
                        val = dp.value
                        if val is not None and int(val) != 0:
                            print("[!] Battery low  ->  blocking Seat Heating re-activation", flush=True)
                            client.set_target_values({SEAT_HEAT_PATH: Datapoint(0)})

        except Exception as e:
            if not g_running:
                break
            print(f"[EnergySaver] Stream ended: {e}", flush=True)
            print("[EnergySaver] Reconnecting in 5s...", flush=True)
            time.sleep(5)

    print("Battery Energy Saver: shutdown, no signal reset needed.", flush=True)

if __name__ == "__main__":
    main()
`,
    yaml: `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
# Python service — architecture-independent
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
      codename: "battery-energy-saver-py"
      title: "Battery Energy Saver (Python)"
      description: "Forces HVAC and seat heating off when SoC drops below thresholds"
    version: "1.0.0"
    sourceFolder: "battery-energy-saver-py"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: /usr/bin/python3 -u /main.py
      env:
        - "KUKSA_DATABROKER_ADDR=172.17.0.1:55555"
        - "HVAC_OFF_THRESHOLD=50.0"
        - "SEAT_OFF_THRESHOLD=30.0"
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 5000
        ramLimit: 512MiB
        storageLimit: 32MiB
        stateLimit: 1MiB
        tmpLimit: 256MiB`
  },

  signalReporterPython: {
    name: 'Signal Reporter (Python)',
    appName: 'signal-reporter-py',
    description: 'Subscribes to 9 vehicle signals and relays to dashboard via HTTP',
    language: 'python' as const,
    python: `#!/usr/bin/env python3
"""
Signal Reporter (Python) for AosEdge.
Subscribes to 9 vehicle signals from KUKSA Databroker and relays
them as JSON to a dashboard HTTP endpoint.
"""
import time
import sys
import os
import json
import urllib.request

VERSION = "1.0.0"

try:
    from kuksa_client.grpc import VSSClient, Datapoint
except ImportError:
    print("[Reporter] kuksa-client not found. Install: pip install kuksa-client", flush=True)
    sys.exit(1)

SIGNALS = [
    "Vehicle.Speed",
    "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current",
    "Vehicle.Powertrain.Range",
    "Vehicle.Cabin.HVAC.AmbientAirTemperature",
    "Vehicle.Cabin.HVAC.TargetTemperature",
    "Vehicle.Cabin.Lights.AmbientLight.Intensity",
    "Vehicle.Cabin.Seat.Heating",
    "Vehicle.Cabin.Seat.VentilationLevel",
    "Vehicle.Infotainment.Display.Brightness",
]

def http_post(url, body):
    """Send a JSON POST request. Returns True on success."""
    try:
        data = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=2)
        return True
    except Exception:
        return False

def main():
    kuksa_target = os.environ.get("KUKSA_DATABROKER_ADDR", "172.17.0.1:55555")
    relay_url = os.environ.get("SIGNAL_RELAY_URL", "http://172.17.0.1:9100/signal")
    if len(sys.argv) > 1:
        kuksa_target = sys.argv[1]
    if len(sys.argv) > 2:
        relay_url = sys.argv[2]

    host, port = kuksa_target.rsplit(":", 1) if ":" in kuksa_target else (kuksa_target, "55555")

    print("=" * 50, flush=True)
    print("  Signal Reporter (Python)", flush=True)
    print(f"  Version:    {VERSION}", flush=True)
    print(f"  Databroker: {kuksa_target}", flush=True)
    print(f"  Relay:      {relay_url}", flush=True)
    print("=" * 50, flush=True)

    client = VSSClient(host, int(port))
    for attempt in range(1, 16):
        try:
            client.connect()
            info = client.get_server_info()
            print(f"[Reporter] Connected: {info.name} {info.version}", flush=True)
            break
        except Exception as e:
            if attempt == 15:
                print(f"[Reporter] Unreachable: {kuksa_target} — {e}", flush=True)
                sys.exit(1)
            print(f"[Reporter] Waiting ({attempt}/15)...", flush=True)
            time.sleep(2)

    print(f"[Reporter] Subscribing to {len(SIGNALS)} signals...", flush=True)

    msg_count = 0
    post_ok = 0
    post_fail = 0

    while True:
        try:
            for updates in client.subscribe_current_values(SIGNALS):
                msg_count += 1

                for update in updates:
                    path = update.entry.path
                    dp = update.entry.value
                    val = dp.value if dp is not None else None

                    payload = {
                        "signal": path,
                        "value": val,
                        "ts": int(time.time() * 1000),
                    }

                    if http_post(relay_url, payload):
                        post_ok += 1
                    else:
                        post_fail += 1

                if msg_count % 50 == 0:
                    print(f"[Reporter] msgs={msg_count} posted={post_ok} failed={post_fail}", flush=True)

        except Exception as e:
            print(f"[Reporter] Stream ended: {e}", flush=True)
            print("[Reporter] Reconnecting in 5s...", flush=True)
            time.sleep(5)

if __name__ == "__main__":
    main()
`,
    yaml: `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
# Python service — architecture-independent
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
      codename: "signal-reporter-py"
      title: "Signal Reporter (Python)"
      description: "Subscribes to 9 vehicle signals and relays to dashboard via HTTP"
    version: "1.0.0"
    sourceFolder: "signal-reporter-py"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: /usr/bin/python3 -u /main.py
      env:
        - "KUKSA_DATABROKER_ADDR=172.17.0.1:55555"
        - "SIGNAL_RELAY_URL=http://172.17.0.1:9100/signal"
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: 5000
        ramLimit: 512MiB
        storageLimit: 32MiB
        stateLimit: 1MiB
        tmpLimit: 256MiB`
  }
}
