// Copyright (c) 2026 Eclipse Foundation.
//
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

// EV Range Extender — Eclipse SDV Blueprint demo application.
// Subscribes to battery SoC and ambient temperature via KUKSA gRPC,
// switches to POWER_SAVE mode when SoC drops below a threshold, and
// actuates lights / seat heating / HVAC while computing remaining range.

#include <iostream>
#include <string>
#include <thread>
#include <chrono>
#include <cstdlib>
#include <cmath>
#include <atomic>
#include <fstream>
#include <sstream>

#include <grpcpp/grpcpp.h>
#include <grpcpp/security/credentials.h>
#include "kuksa/val/v1/val.grpc.pb.h"
#include "kuksa/val/v1/types.pb.h"

#define VERSION "1.0.14"
#define SOC_THRESHOLD 20.0f
#define NORMAL_EFFICIENCY 5.5f
#define DEGRADED_EFFICIENCY 4.0f

static std::string read_file(const std::string& path) {
    std::ifstream f(path);
    if (!f.is_open()) {
        std::cerr << "[RangeExt] Failed to open: " << path << std::endl;
        return "";
    }
    std::stringstream buffer;
    buffer << f.rdbuf();
    return buffer.str();
}

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
    std::string target = "172.17.0.1:55555";
    int interval = 2;
    std::string ca_path = "/etc/kuksa-val/CA.pem";

    if (auto t = std::getenv("KUKSA_DATABROKER_ADDR")) target = t;
    if (auto i = std::getenv("CHECK_INTERVAL"))        interval = std::atoi(i);
    if (auto c = std::getenv("KUKSA_CA_CERT"))         ca_path = c;
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
    std::cout << "  TLS:           Disabled (insecure)" << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout.flush();

    // Create insecure channel
    auto channel = grpc::CreateChannel(target, grpc::InsecureChannelCredentials());
    auto stub = kuksa::val::v1::VAL::NewStub(channel);

    // Wait for databroker
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

        if (soc < 0) soc = 50.0f;   // default if not yet available

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
}
