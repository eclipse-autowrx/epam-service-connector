# Copyright (c) 2026 Eclipse Foundation.
#
# This program and the accompanying materials are made available under the
# terms of the MIT License which is available at
# https://opensource.org/licenses/MIT.
#
# SPDX-License-Identifier: MIT
"""Range Compute AI service — runs on VM1.

Subscribes to battery and cabin VSS signals from the local Kuksa Databroker
(sdv-runtime, 127.0.0.1:55555), computes estimated driving range, and writes
the result back as Vehicle.Powertrain.Range.

Signal flow
-----------
  VM1 Kuksa Databroker
    ├─ Vehicle.Powertrain.TractionBattery.CurrentVoltage      (written by bms.py)
    ├─ Vehicle.Powertrain.TractionBattery.CurrentCurrent      (written by bms.py)
    ├─ Vehicle.Powertrain.TractionBattery.StateOfCharge.Current  (written by bms.py)
    ├─ Vehicle.Cabin.HVAC.AmbientAirTemperature               (mirrored from VM2 via kuksa-bridge)
    ├─ Vehicle.Cabin.Seat.Row1.DriverSide.Heating             (mirrored from VM2 via kuksa-bridge)
    └─ Vehicle.Cabin.Seat.Row1.DriverSide.HeatingCooling      (mirrored from VM2 via kuksa-bridge)
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

# Cabin signals (mirrored from VM2 via kuksa-bridge; fan speed uses AmbientAirTemperature)
SIGNAL_HVAC_FAN  = "Vehicle.Cabin.HVAC.AmbientAirTemperature"
SIGNAL_SEAT_HEAT = "Vehicle.Cabin.Seat.Row1.DriverSide.Heating"
SIGNAL_SEAT_HC   = "Vehicle.Cabin.Seat.Row1.DriverSide.HeatingCooling"

BATTERY_SIGNALS    = [SIGNAL_CURRENT, SIGNAL_VOLTAGE, SIGNAL_SOC]
CABIN_SIGNALS      = [SIGNAL_HVAC_FAN, SIGNAL_SEAT_HEAT, SIGNAL_SEAT_HC]
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
        self.hvac_fan = None         # HVAC fan speed (%, 0..100) - from VM2
                                     # (carried on AmbientAirTemperature; see docstring)
        self.seat_heat = None        # seat heating (%, 0..100) - from VM2
        self.seat_hc = None          # seat HeatingCooling (%, -100..100) - from VM2

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

    Fan speed is the dashboard's relabel of `AmbientAirTemperature`
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
            log(f"    - {s}                     (battery, written by bms.py on VM1)")
        for s in CABIN_SIGNALS:
            log(f"    - {s}     (cabin, bridged from VM2 via zenoh_client.py)")
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
        description="EV Range Extender - Range Compute AI (VM1)"
    )
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Kuksa Databroker host (default: 127.0.0.1)",
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
