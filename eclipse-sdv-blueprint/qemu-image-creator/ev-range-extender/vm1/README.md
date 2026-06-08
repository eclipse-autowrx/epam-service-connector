# EV Range Extender VM1 Services

VM1 is the HPC side of the QEMU setup. It runs the SDV Runtime container, the
Kuksa Databroker, and the VM1 application services that collect battery values
and compute estimated driving range.

VM1 address in the default setup:

```text
192.168.100.10
```

---

## Services

| Service | File | Purpose |
|---|---|---|
| `ev-range-bms.service` | `bms.py` | Receives battery telemetry from the host dashboard over Zenoh and writes it to VM1 Kuksa. |
| `ev-range-range-ai.service` | `range_ai.py` | Reads battery and cabin signals from VM1 Kuksa, computes range, and writes `Vehicle.Powertrain.Range`. |
| `ev-range-kuksa-bridge.service` | `../../kuksa-bridge/kuksa_bridge.py` | Mirrors selected cabin VSS values between VM1 Kuksa and the VM2 bridge relay. |

The QEMU cloud-init setup deploys these services automatically. You normally
inspect or restart them through systemd instead of running scripts by hand.

---

## BMS input path

`bms.py` listens for host dashboard samples on:

```text
tcp/0.0.0.0:7460
```

It subscribes to:

| Zenoh key | VSS path | Type |
|---|---|---|
| `sim/battery/voltage` | `Vehicle.Powertrain.TractionBattery.CurrentVoltage` | float |
| `sim/battery/current` | `Vehicle.Powertrain.TractionBattery.CurrentCurrent` | float |
| `sim/battery/soc` | `Vehicle.Powertrain.TractionBattery.StateOfCharge.Current` | float |

Payload format:

```json
{
  "value": 80,
  "source": "host-name",
  "ts": "2026-05-21T...Z"
}
```

---

## Range computation

`range_ai.py` subscribes to six input signals from VM1 Kuksa:

| VSS path | Source |
|---|---|
| `Vehicle.Powertrain.TractionBattery.CurrentVoltage` | VM1 `bms.py` |
| `Vehicle.Powertrain.TractionBattery.CurrentCurrent` | VM1 `bms.py` |
| `Vehicle.Powertrain.TractionBattery.StateOfCharge.Current` | VM1 `bms.py` |
| `Vehicle.Cabin.HVAC.AmbientAirTemperature` | VM2 HVAC path mirrored by `kuksa-bridge` |
| `Vehicle.Cabin.Seat.Row1.DriverSide.Heating` | VM2 seat path mirrored by `kuksa-bridge` |
| `Vehicle.Cabin.Seat.Row1.DriverSide.HeatingCooling` | VM2 seat path mirrored by `kuksa-bridge` |

It writes:

```text
Vehicle.Powertrain.Range
```

Model summary:

```text
available_kWh = (SoC / 100) * 75
base_consumption = 0.18 kWh/km
range_km = available_kWh / effective_consumption
```

Effective consumption increases when traction power exceeds the nominal cruise
threshold and when HVAC or seat loads are active.

The constants live near the top of `range_ai.py`:

| Constant | Meaning |
|---|---|
| `BATTERY_CAPACITY_KWH` | Battery capacity used for range estimation. |
| `NOMINAL_CONSUMPTION_KWH_PER_KM` | Base vehicle consumption. |
| `NOMINAL_CRUISE_POWER_KW` | Power threshold before acceleration penalty applies. |
| `HVAC_FAN_FULL_KW` | Full-scale HVAC load. |
| `SEAT_HEATER_FULL_KW` | Full-scale seat heating load. |
| `SEAT_VENT_FULL_KW` | Full-scale seat cooling load. |
| `AVG_SPEED_KMH` | Speed used to convert cabin kW into kWh/km. |

---

## Inspect

Check service status on VM1:

```bash
systemctl status ev-range-bms ev-range-range-ai ev-range-kuksa-bridge
```

Tail logs:

```bash
tail -f /tmp/ev-range-bms.log
tail -f /tmp/ev-range-range-ai.log
tail -f /tmp/ev-range-kuksa-bridge.log
tail -f /tmp/evrange-runtime.log
```

Restart services:

```bash
sudo systemctl restart ev-range-bms ev-range-range-ai ev-range-kuksa-bridge
```

---

## Manual run

Stop the systemd unit before running a service directly:

```bash
sudo systemctl stop ev-range-bms
cd /home/ubuntu/ev-range-extender/vm1
python3 bms.py
```

Run the range service manually:

```bash
sudo systemctl stop ev-range-range-ai
cd /home/ubuntu/ev-range-extender/vm1
python3 range_ai.py
```

Both scripts default to VM1's local Kuksa Databroker at
`127.0.0.1:55555`.

---

## Troubleshooting

If `range_ai.py` waits for output, confirm State of Charge has been written by
`bms.py`:

```bash
tail -f /tmp/ev-range-bms.log
```

If cabin inputs do not change on VM1, inspect the bridge:

```bash
tail -f /tmp/ev-range-kuksa-bridge.log
```

If the Databroker is not responding, inspect the SDV Runtime startup log:

```bash
tail -f /tmp/evrange-runtime.log
```
