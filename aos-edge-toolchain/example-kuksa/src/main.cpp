// Copyright (c) 2026 Eclipse Foundation.
// SPDX-License-Identifier: MIT

// KUKSA Vehicle Signal App — gRPC client connecting directly to KUKSA Databroker.
// No bridge needed. Uses the kuksa.val.v1 gRPC API.

#include <iostream>
#include <string>
#include <thread>
#include <chrono>
#include <cstdlib>
#include <vector>

#include <grpcpp/grpcpp.h>
#include "kuksa/val/v1/val.grpc.pb.h"
#include "kuksa/val/v1/types.pb.h"

#define VERSION "1.0.0"

static std::string get_signal(kuksa::val::v1::VAL::Stub* stub,
                              const std::string& path) {
    kuksa::val::v1::GetRequest request;
    auto* entry = request.add_entries();
    entry->set_path(path);
    entry->set_view(kuksa::val::v1::VIEW_CURRENT_VALUE);
    entry->add_fields(kuksa::val::v1::FIELD_VALUE);

    kuksa::val::v1::GetResponse response;
    grpc::ClientContext context;

    auto status = stub->Get(&context, request, &response);
    if (!status.ok()) {
        return "(error: " + status.error_message() + ")";
    }

    if (response.entries_size() > 0) {
        const auto& dp = response.entries(0).value();
        switch (dp.value_case()) {
            case kuksa::val::v1::Datapoint::kFloat:
                return std::to_string(dp.float_());
            case kuksa::val::v1::Datapoint::kDouble:
                return std::to_string(dp.double_());
            case kuksa::val::v1::Datapoint::kInt32:
                return std::to_string(dp.int32());
            case kuksa::val::v1::Datapoint::kInt64:
                return std::to_string(dp.int64());
            case kuksa::val::v1::Datapoint::kUint32:
                return std::to_string(dp.uint32());
            case kuksa::val::v1::Datapoint::kBool:
                return dp.bool_() ? "true" : "false";
            case kuksa::val::v1::Datapoint::kString:
                return dp.string();
            default:
                return "N/A";
        }
    }

    if (response.errors_size() > 0) {
        return "(error: " + response.errors(0).error().message() + ")";
    }

    return "N/A";
}

int main(int argc, char* argv[]) {
    std::string target = "localhost:55555";
    int interval = 3;

    if (auto t = std::getenv("KUKSA_DATABROKER_ADDR")) target = t;
    if (auto i = std::getenv("POLL_INTERVAL"))         interval = std::atoi(i);
    if (argc > 1) target   = argv[1];
    if (argc > 2) interval = std::atoi(argv[2]);

    std::cout << "========================================" << std::endl;
    std::cout << "  KUKSA Vehicle Signal App (gRPC)"       << std::endl;
    std::cout << "  Version:    " << VERSION               << std::endl;
    std::cout << "  Databroker: " << target                << std::endl;
    std::cout << "  Interval:   " << interval << "s"       << std::endl;
    std::cout << "  Direct gRPC — no bridge needed!"       << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout.flush();

    auto channel = grpc::CreateChannel(target, grpc::InsecureChannelCredentials());
    auto stub = kuksa::val::v1::VAL::NewStub(channel);

    // Wait for databroker to become reachable
    for (int r = 1; r <= 30; r++) {
        kuksa::val::v1::GetServerInfoRequest req;
        kuksa::val::v1::GetServerInfoResponse resp;
        grpc::ClientContext ctx;
        ctx.set_deadline(std::chrono::system_clock::now() + std::chrono::seconds(3));

        auto status = stub->GetServerInfo(&ctx, req, &resp);
        if (status.ok()) {
            std::cout << "[KUKSA] Connected to " << resp.name()
                      << " " << resp.version() << std::endl;
            break;
        }
        if (r == 30) {
            std::cerr << "[KUKSA] Databroker unreachable at " << target << std::endl;
        }
        std::cout << "[KUKSA] Waiting for databroker (" << r << "/30)..." << std::endl;
        std::cout.flush();
        std::this_thread::sleep_for(std::chrono::seconds(2));
    }

    std::vector<std::string> signals = {
        "Vehicle.Speed",
        "Vehicle.Cabin.HVAC.AmbientAirTemperature",
        "Vehicle.Powertrain.TractionBattery.StateOfCharge.Current"
    };

    int cycle = 0;
    while (true) {
        cycle++;
        std::cout << "\n--- Cycle " << cycle << " ---" << std::endl;
        for (const auto& sig : signals) {
            auto val = get_signal(stub.get(), sig);
            std::cout << "  " << sig << " = " << val << std::endl;
        }
        std::cout.flush();
        std::this_thread::sleep_for(std::chrono::seconds(interval));
    }
    return 0;
}
