# EV Range Extender VM2 Services

VM2 is the cabin ECU side of the QEMU setup. It receives HVAC and seat commands
from the host dashboard, publishes those values onto the `kuksa-bridge` Zenoh
wire namespace, and sends status updates back to the dashboard indicators.

VM2 address in the default setup:

```text
192.168.100.11
```

---

## Services

| Service | File | Purpose |
|---|---|---|
| `ev-range-hvac.service` | `hvac_ecu.py` | Receives fan-speed commands and publishes the HVAC VSS bridge envelope. |
| `ev-range-seat.service` | `seat_ecu.py` | Receives seat heating/cooling commands and publishes seat VSS bridge envelopes. |
| `ev-range-kuksa-bridge.service` | `../../kuksa-bridge/kuksa_bridge.py` | Runs VM2 bridge relay mode and connects to VM1 on `tcp/192.168.100.10:7448`. |

VM2 is intentionally lightweight. The ECUs run in bridge-wire mode and do not
need a local Kuksa Databroker for the current VM2 path.

---

## HVAC ECU

`hvac_ecu.py` listens on:

```text
tcp/0.0.0.0:7461
```

It consumes dashboard TCP frames carrying:

| Signal key | VSS path | Value |
|---|---|---|
| `sim/cabin/temp` | `Vehicle.Cabin.HVAC.AmbientAirTemperature` | `0..100` fan-speed percent |

On each dashboard update it publishes a bridge envelope on:

```text
kuksa-bridge/Vehicle/Cabin/HVAC/AmbientAirTemperature
```

It also sends dashboard status frames with topic:

```text
dash/status/hvac
```

Status is `on` when the fan value is greater than zero, otherwise `off`.

---

## Seat ECU

`seat_ecu.py` listens on:

```text
tcp/0.0.0.0:7462
```

It consumes dashboard TCP frames carrying:

| Signal key | VSS path | Value |
|---|---|---|
| `sim/cabin/seat/heating` | `Vehicle.Cabin.Seat.Row1.DriverSide.Heating` | `0` or `100` |
| `sim/cabin/seat/hc` | `Vehicle.Cabin.Seat.Row1.DriverSide.HeatingCooling` | `0` or `-100` for cooling |

It publishes bridge envelopes on:

```text
kuksa-bridge/Vehicle/Cabin/Seat/Row1/DriverSide/Heating
kuksa-bridge/Vehicle/Cabin/Seat/Row1/DriverSide/HeatingCooling
```

It also sends dashboard status frames with topic:

```text
dash/status/seat
```

Status mapping:

| Value | Dashboard status |
|---|---|
| Heating `> 0` | `heating` |
| HeatingCooling `> 0` | `heating` |
| HeatingCooling `< 0` | `cooling` |
| Zero values | `off` |

---

## Bridge-wire mode

Both VM2 ECUs connect to the local VM2 bridge relay at:

```text
tcp/127.0.0.1:7448
```

The VM2 bridge relay then dials VM1:

```text
tcp/192.168.100.10:7448
```

This gives two useful flows:

| Flow | Path |
|---|---|
| Dashboard to VM1 | dashboard -> VM2 ECU -> VM2 bridge relay -> VM1 bridge -> VM1 Kuksa |
| VM1 to dashboard | VM1 Kuksa -> VM1 bridge -> VM2 bridge relay -> VM2 ECU -> dashboard status key |

The second flow lets VM1-originated cabin commands produce `ACT` log lines in
the VM2 ECU logs and update the dashboard indicators.

---

## Inspect

Check service status on VM2:

```bash
systemctl status ev-range-hvac ev-range-seat ev-range-kuksa-bridge
```

Tail logs:

```bash
tail -f /tmp/ev-range-hvac.log
tail -f /tmp/ev-range-seat.log
tail -f /tmp/ev-range-kuksa-bridge.log
```

Restart services:

```bash
sudo systemctl restart ev-range-hvac ev-range-seat ev-range-kuksa-bridge
```

---

## Manual run

Stop the systemd unit before running a service directly:

```bash
sudo systemctl stop ev-range-hvac
cd /home/ubuntu/ev-range-extender/vm2
python3 hvac_ecu.py
```

Run the seat ECU manually:

```bash
sudo systemctl stop ev-range-seat
cd /home/ubuntu/ev-range-extender/vm2
python3 seat_ecu.py
```

Useful options:

| Option | Default | Purpose |
|---|---|---|
| `--host` | `0.0.0.0` | TCP listen address for dashboard frames. |
| `--port` | `7461` for HVAC, `7462` for seat | TCP listen port for dashboard frames. |
| `--bridge-connect` | `tcp/127.0.0.1:7448` | Local VM2 bridge relay endpoint. |

`--kuksa-host` and `--kuksa-port` remain available in the scripts for the older
Kuksa-backed mode, but the current `run()` path uses bridge-wire mode.

---

## Troubleshooting

If dashboard controls do not appear in VM2 logs, check the ECU listener ports
and service state:

```bash
systemctl is-active ev-range-hvac ev-range-seat
```

If VM2 logs show local updates but VM1 does not receive cabin values, inspect
the bridge relay:

```bash
tail -f /tmp/ev-range-kuksa-bridge.log
```

If dashboard indicators do not change, confirm the dashboard is subscribed to
`dash/status/hvac` and `dash/status/seat` by checking `/tmp/pytk_hwsim.log`
on the host.
