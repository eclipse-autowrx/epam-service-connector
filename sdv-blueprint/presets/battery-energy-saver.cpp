// Copyright (c) 2026 Eclipse Foundation.
//
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

// Battery Energy Saver — Eclipse SDV Blueprint demo application.
// Subscribes to battery SoC and range via KUKSA gRPC streaming. When charge
// drops below configurable thresholds it forces HVAC temperature and seat
// heating/cooling to zero, and blocks re-activation while charge remains low.
//
// Thresholds (configurable via env vars):
//   HVAC_OFF_THRESHOLD (default 50%) — HVAC temperature forced to 0 below this
//   SEAT_OFF_THRESHOLD (default 30%) — Seat Heating/Cooling forced to 0 below this

#include <iostream>
#include <string>
#include <thread>
#include <chrono>
#include <cstdlib>
#include <csignal>
#include <atomic>

#include <grpcpp/grpcpp.h>
#include <grpcpp/security/credentials.h>
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

// ── Value extraction helpers ──────────────────────────────────────────────────

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

// ── Write helpers ─────────────────────────────────────────────────────────────

static bool set_float(kuksa::val::v1::VAL::Stub* stub,
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

static bool set_int(kuksa::val::v1::VAL::Stub* stub,
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

// ── Main subscription loop ────────────────────────────────────────────────────

static void run(kuksa::val::v1::VAL::Stub* stub,
                float hvac_threshold, float seat_threshold) {
    float soc           = 100.0f;
    float vehicle_range = 0.0f;
    bool  hvac_cut      = false;
    bool  seat_cut      = false;

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
                const auto& dp         = update.entry().value();

                // ── Range update ─────────────────────────────────────────────
                if (path == RANGE_PATH) {
                    vehicle_range = as_float(dp);
                }

                // ── SoC update ───────────────────────────────────────────────
                else if (path == SOC_PATH) {
                    soc = as_float(dp);
                    std::cout << "Charge: " << soc << "% | Range: "
                              << vehicle_range << std::endl;

                    if (soc < hvac_threshold && !hvac_cut) {
                        std::cout << "[!] Charge=" << soc << "% | Range="
                                  << vehicle_range << " < " << hvac_threshold
                                  << "%  ->  Turning HVAC off" << std::endl;
                        set_float(stub, HVAC_PATH, 0.0f);
                        hvac_cut = true;
                    } else if (soc >= hvac_threshold && hvac_cut) {
                        std::cout << "[+] Charge=" << soc << "% | Range="
                                  << vehicle_range << " >= " << hvac_threshold
                                  << "%  ->  HVAC restriction lifted" << std::endl;
                        hvac_cut = false;
                    }

                    if (soc < seat_threshold && !seat_cut) {
                        std::cout << "[!] Charge=" << soc << "% | Range="
                                  << vehicle_range << " < " << seat_threshold
                                  << "%  ->  Turning Seat Heating/Cooling off"
                                  << std::endl;
                        set_int(stub, SEAT_HEAT_PATH, 0);
                        set_int(stub, SEAT_HC_PATH,   0);
                        seat_cut = true;
                    } else if (soc >= seat_threshold && seat_cut) {
                        std::cout << "[+] Charge=" << soc << "% | Range="
                                  << vehicle_range << " >= " << seat_threshold
                                  << "%  ->  Seat restriction lifted" << std::endl;
                        seat_cut = false;
                    }
                }

                // ── Block HVAC re-activation while battery is low ─────────────
                else if (path == HVAC_PATH && hvac_cut) {
                    if (as_float(dp) != 0.0f) {
                        std::cout << "[!] Battery low (Charge=" << soc
                                  << "% | Range=" << vehicle_range
                                  << ")  ->  blocking HVAC re-activation"
                                  << std::endl;
                        set_float(stub, HVAC_PATH, 0.0f);
                    }
                }

                // ── Block seat heating re-activation while battery is low ──────
                else if (path == SEAT_HEAT_PATH && seat_cut) {
                    if (as_int(dp) != 0) {
                        std::cout << "[!] Battery low (Charge=" << soc
                                  << "% | Range=" << vehicle_range
                                  << ")  ->  blocking Seat Heating re-activation"
                                  << std::endl;
                        set_int(stub, SEAT_HEAT_PATH, 0);
                    }
                }

                else if (path == SEAT_HC_PATH && seat_cut) {
                    if (as_int(dp) != 0) {
                        std::cout << "[!] Battery low (Charge=" << soc
                                  << "% | Range=" << vehicle_range
                                  << ")  ->  blocking Seat HeatingCooling re-activation"
                                  << std::endl;
                        set_int(stub, SEAT_HC_PATH, 0);
                    }
                }
            }
        }

        if (!g_running) break;

        auto status = reader->Finish();
        std::cerr << "[EnergySaver] Stream ended: " << status.error_message()
                  << std::endl;
        std::cout << "[EnergySaver] Reconnecting in 5s..." << std::endl;
        std::cout.flush();
        std::this_thread::sleep_for(std::chrono::seconds(5));
    }
}

int main(int argc, char* argv[]) {
    std::string target    = "172.17.0.1:55555";
    float hvac_threshold  = DEFAULT_HVAC_OFF_THRESHOLD;
    float seat_threshold  = DEFAULT_SEAT_OFF_THRESHOLD;

    if (auto t = std::getenv("KUKSA_DATABROKER_ADDR")) target        = t;
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
        ctx.set_deadline(std::chrono::system_clock::now() +
                         std::chrono::seconds(3));
        auto st = stub->GetServerInfo(&ctx, req, &resp);
        if (st.ok()) {
            std::cout << "[EnergySaver] Connected: " << resp.name()
                      << " " << resp.version() << std::endl;
            break;
        }
        if (r == 15) {
            std::cerr << "[EnergySaver] Unreachable: " << target << std::endl;
            return 1;
        }
        std::cout << "[EnergySaver] Waiting (" << r << "/15)..." << std::endl;
        std::cout.flush();
        std::this_thread::sleep_for(std::chrono::seconds(2));
    }

    std::cout << "[EnergySaver] Subscribing to signals..." << std::endl;
    std::cout.flush();

    run(stub.get(), hvac_threshold, seat_threshold);

    std::cout << "Battery Energy Saver: shutdown, no signal reset needed."
              << std::endl;
    return 0;
}
