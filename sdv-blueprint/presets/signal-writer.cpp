// Copyright (c) 2026 Eclipse Foundation.
//
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

// Signal Writer — writes simulated Zonal-domain vehicle signals
// (Speed, SoC, AmbientAirTemperature) to the local KUKSA Databroker
// via gRPC Set() every N seconds.
//
// Deployed to the Zonal node (VM2) as an AOS service via AosCloud OTA.

#include <iostream>
#include <string>
#include <thread>
#include <chrono>
#include <cstdlib>
#include <cmath>
#include <fstream>
#include <sstream>

#include <grpcpp/grpcpp.h>
#include <grpcpp/security/credentials.h>
#include "kuksa/val/v1/val.grpc.pb.h"
#include "kuksa/val/v1/types.pb.h"

#define VERSION "1.0.9"

static std::string read_file(const std::string& path) {
    std::ifstream f(path);
    if (!f.is_open()) {
        std::cerr << "[Writer] Failed to open: " << path << std::endl;
        return "";
    }
    std::stringstream buffer;
    buffer << f.rdbuf();
    return buffer.str();
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
    std::string target = "10.0.0.100:55556";
    int interval = 2;
    std::string ca_path = "/etc/kuksa-val/CA.pem";

    if (auto t = std::getenv("KUKSA_DATABROKER_ADDR")) target = t;
    if (auto i = std::getenv("WRITE_INTERVAL"))        interval = std::atoi(i);
    if (auto c = std::getenv("KUKSA_CA_CERT"))         ca_path = c;
    if (argc > 1) target   = argv[1];
    if (argc > 2) interval = std::atoi(argv[2]);

    std::cout << "========================================" << std::endl;
    std::cout << "  KUKSA Signal Writer (Zonal)" << std::endl;
    std::cout << "  Version:    " << VERSION << std::endl;
    std::cout << "  Databroker: " << target << std::endl;
    std::cout << "  Interval:   " << interval << "s" << std::endl;
    std::cout << "  TLS:        Disabled (insecure)" << std::endl;
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
            std::cout << "[Writer] Connected: " << resp.name()
                      << " " << resp.version() << std::endl;
            break;
        }

        std::cerr << "[Writer] Retry " << r << "/15 failed: "
                  << st.error_code() << " - " << st.error_message() << std::endl;

        if (r == 15) {
            std::cerr << "[Writer] Unreachable: " << target << std::endl;
            return 1;
        }
        std::this_thread::sleep_for(std::chrono::seconds(2));
    }

    // Write signals
    int t = 0;
    while (true) {
        float speed = 40.0f + 30.0f * std::sin(t * 0.1f);
        float soc   = std::max(0.0f, 80.0f - std::fmod(t * 1.5f, 80.0f));
        float temp  = 22.0f + 5.0f * std::sin(t * 0.05f);

        set_signal(stub.get(), "Vehicle.Speed", speed);
        set_signal(stub.get(), "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current", soc);
        set_signal(stub.get(), "Vehicle.Cabin.HVAC.AmbientAirTemperature", temp);

        if (t % 10 == 0) {
            std::cout << "[Writer] t=" << t << "  Speed=" << speed
                      << "  SoC=" << soc << std::endl;
            std::cout.flush();
        }

        t++;
        std::this_thread::sleep_for(std::chrono::seconds(interval));
    }

    return 0;
}
