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
    description: 'Simple hello world application',
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
    yaml: `publisher:
    author: "developer@example.com"
    company: "Example Corp"

build:
    os: linux
    arch: x86_64
    sign_pkcs12: aos-user-sp.p12
    symlinks: copy

publish:
    url: aoscloud.io
    service_uid: c0528145-b393-44c6-aeaa-b26bc560acee
    tls_pkcs12: aos-user-sp.p12
    version: "1.0.0"

configuration:
    cmd: /hello-aos
    workingDir: '/'
    state:
        filename: default_state.dat
        required: true
    instances:
        minInstances: 1
        priority: 0
    isResourceLimits: true
    requestedResources:
        cpu: 1000
        ram: 10MB
        storage: 5MB
        state: 512KB
    quotas:
        cpu: 1000
        mem: 10MB
        state: 512KB
        storage: 5MB`
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
    yaml: `publisher:
    author: "developer@example.com"
    company: "Example Corp"

build:
    os: linux
    arch: x86_64
    sign_pkcs12: aos-user-sp.p12
    symlinks: copy

publish:
    url: aoscloud.io
    service_uid: 242a46c7-f237-40e3-a37e-40529a39bf85
    tls_pkcs12: aos-user-sp.p12
    version: "1.0.0"

configuration:
    cmd: /signal-writer
    workingDir: '/'
    env:
        - "KUKSA_DATABROKER_ADDR=172.17.0.1:55556"
    state:
        filename: default_state.dat
        required: true
    instances:
        minInstances: 1
        priority: 0
    isResourceLimits: true
    requestedResources:
        cpu: 1000
        ram: 10MB
        storage: 5MB
        state: 512KB
    quotas:
        cpu: 1000
        mem: 10MB
        state: 512KB
        storage: 5MB`
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
    yaml: `publisher:
    author: "developer@example.com"
    company: "Example Corp"

build:
    os: linux
    arch: x86_64
    sign_pkcs12: aos-user-sp.p12
    symlinks: copy

publish:
    url: aoscloud.io
    service_uid: d8e4ffa0-8cb6-4f9c-abfe-f0cfdee7150d
    tls_pkcs12: aos-user-sp.p12
    version: "1.0.0"

configuration:
    cmd: /kuksa-reader
    workingDir: '/'
    env:
        - "KUKSA_DATABROKER_ADDR=172.17.0.1:55555"
    state:
        filename: default_state.dat
        required: true
    instances:
        minInstances: 1
        priority: 0
    isResourceLimits: true
    requestedResources:
        cpu: 1000
        ram: 10MB
        storage: 5MB
        state: 512KB
    quotas:
        cpu: 1000
        mem: 10MB
        state: 512KB
        storage: 5MB`
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
    yaml: `publisher:
    author: "developer@example.com"
    company: "Example Corp"

build:
    os: linux
    arch: x86_64
    sign_pkcs12: aos-user-sp.p12
    symlinks: copy

publish:
    url: aoscloud.io
    service_uid: bb539aaa-682c-4a35-b492-19abed3118ff
    tls_pkcs12: aos-user-sp.p12
    version: "1.0.0"

configuration:
    cmd: /ev-range-extender
    workingDir: '/'
    env:
        - "KUKSA_DATABROKER_ADDR=172.17.0.1:55555"
    state:
        filename: default_state.dat
        required: true
    instances:
        minInstances: 1
        priority: 0
    isResourceLimits: true
    requestedResources:
        cpu: 1000
        ram: 10MB
        storage: 5MB
        state: 512KB
    quotas:
        cpu: 1000
        mem: 10MB
        state: 512KB
        storage: 5MB`
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
static const char* SEAT_HEAT_PATH = "Vehicle.Cabin.Seat.Heating";
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
    for (const char* path : { RANGE_PATH, SOC_PATH, HVAC_PATH,
                               SEAT_HEAT_PATH, SEAT_HC_PATH }) {
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
                        set_int(stub, SEAT_HC_PATH,   0);
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
    yaml: `publisher:
    author: "developer@example.com"
    company: "Example Corp"

build:
    os: linux
    arch: x86_64
    sign_pkcs12: aos-user-sp.p12
    symlinks: copy

publish:
    url: aoscloud.io
    service_uid: 00000000-0000-0000-0000-000000000000
    tls_pkcs12: aos-user-sp.p12
    version: "1.0.0"

configuration:
    cmd: /battery-energy-saver
    workingDir: '/'
    env:
        - "KUKSA_DATABROKER_ADDR=172.17.0.1:55555"
        - "HVAC_OFF_THRESHOLD=50.0"
        - "SEAT_OFF_THRESHOLD=30.0"
    state:
        filename: default_state.dat
        required: true
    instances:
        minInstances: 1
        priority: 0
    isResourceLimits: true
    requestedResources:
        cpu: 1000
        ram: 10MB
        storage: 5MB
        state: 512KB
    quotas:
        cpu: 1000
        mem: 10MB
        state: 512KB
        storage: 5MB`
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

#define VERSION "1.0.0"

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
    yaml: `publisher:
    author: "developer@example.com"
    company: "Example Corp"

build:
    os: linux
    arch: x86_64
    sign_pkcs12: aos-user-sp.p12
    symlinks: copy

publish:
    url: aoscloud.io
    service_uid: 242dd4d4-7236-432d-88b9-ba9bbb3288f8
    tls_pkcs12: aos-user-sp.p12
    version: "1.0.0"

configuration:
    cmd: /signal-reporter
    workingDir: '/'
    env:
        - "KUKSA_DATABROKER_ADDR=172.17.0.1:55555"
        - "SIGNAL_RELAY_URL=10.0.0.1:9100"
    state:
        filename: default_state.dat
        required: true
    instances:
        minInstances: 1
        priority: 0
    isResourceLimits: true
    requestedResources:
        cpu: 1000
        ram: 10MB
        storage: 5MB
        state: 512KB
    quotas:
        cpu: 1000
        mem: 10MB
        state: 512KB
        storage: 5MB`
  }
}
