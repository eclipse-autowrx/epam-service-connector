
# Hardware Simulator

`pytk_dashboard.py` is the host-side Tk dashboard for driving the EV Range
Extender VM services. It publishes battery, HVAC, and seat inputs over Eclipse
Zenoh, and it listens for reverse status messages from the VM2 ECUs so the UI
can show whether HVAC and seat actions are active.

This folder is only the host control surface. VM provisioning, QEMU networking,
and systemd service deployment are documented in
[`../qemu-image-creator/README.md`](../qemu-image-creator/README.md).

---

## What the dashboard controls

| UI section | Control | Zenoh key | Receiver |
|---|---|---|---|
| Battery | Battery Voltage | `sim/battery/voltage` | VM1 `bms.py` on `tcp/7460` |
| Battery | Battery Current | `sim/battery/current` | VM1 `bms.py` on `tcp/7460` |
| Battery | Battery % | `sim/battery/soc` | VM1 `bms.py` on `tcp/7460` |
| Cabin HVAC | Fan Speed | `sim/cabin/temp` | VM2 `hvac_ecu.py` on `tcp/7461` |
| Cabin Seat | Seat Heating | `sim/cabin/seat/heating` | VM2 `seat_ecu.py` on `tcp/7462` |
| Cabin Seat | Seat Cooling | `sim/cabin/seat/hc` | VM2 `seat_ecu.py` on `tcp/7462` |

Each publish payload is JSON:

```json
{
  "value": 50,
  "source": "host-name",
  "ts": "2026-05-21T...Z"
}
```

Seat Heating and Seat Cooling are mutually exclusive in the UI. Turning one on
turns the other off and publishes the matching off value.

---

## Status indicators

The dashboard also subscribes to status channels from VM2:

| Indicator | Zenoh key | Source |
|---|---|---|
| HVAC Fan | `dash/status/hvac` | `hvac_ecu.py` |
| Seat Heating / Cooling | `dash/status/seat` | `seat_ecu.py` |

The reverse status path is used for both local dashboard actions and values
that arrive from VM1 through `kuksa-bridge`. This lets the UI show the current
actuator state instead of only the last slider or toggle position.

---

## Drive simulation

The `Drive` button starts a simple battery drain loop inside the dashboard. It
periodically lowers the Battery % control and republishes the updated state of
charge. This is useful for watching `range_ai.py` react without manually moving
the SoC slider.

The drive loop does not run inside the VMs; it is just a host-side publisher.

---

## Run

Install the host dependencies, then run the dashboard from this directory:

```bash
cd eclipse-sdv-blueprint/hardware-sim
python3 -m venv venv
source venv/bin/activate
chmod +x setup.sh
./setup.sh
python3 -m pip install -r requirements.txt
python3 pytk_hwsim.py
```

`setup.sh` installs the Tk runtime package required by the dashboard UI:

```bash
sudo apt install -y python3-tk
```

