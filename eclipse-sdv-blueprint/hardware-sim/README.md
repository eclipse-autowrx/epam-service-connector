# Hardware Simulator

`pytk_hwsim.py` is the host-side Tk dashboard for driving the EV Range
Extender VM services. It publishes battery, HVAC, and seat inputs over direct
TCP connections, and it listens for reverse status messages from the VM2 ECUs
on those same connections so the UI can show whether HVAC and seat actions are
active.

This folder is only the host control surface. VM provisioning, QEMU networking,
and systemd service deployment are documented in
[`../qemu-image-creator/README.md`](../qemu-image-creator/README.md).

---

## What the dashboard controls

| UI section | Control | Signal key | Receiver |
|---|---|---|---|
| Battery | Battery Voltage | `sim/battery/voltage` | VM1 `bms.py` on `tcp/7460` |
| Battery | Battery Current | `sim/battery/current` | VM1 `bms.py` on `tcp/7460` |
| Battery | Battery % | `sim/battery/soc` | VM1 `bms.py` on `tcp/7460` |
| Cabin HVAC | Fan Speed | `sim/cabin/temp` | VM2 `hvac_ecu.py` on `tcp/7461` |
| Cabin Seat | Seat Heating | `sim/cabin/seat/heating` | VM2 `seat_ecu.py` on `tcp/7462` |
| Cabin Seat | Seat Cooling | `sim/cabin/seat/hc` | VM2 `seat_ecu.py` on `tcp/7462` |

Each publish payload is newline-delimited JSON:

```json
{
  "key": "sim/cabin/temp",
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

| Indicator | Status topic | Source |
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
cd path/to/eclipse-sdv-blueprint/hardware-sim
./setup.sh
python3 pytk_hwsim.py
```

`setup.sh` installs the Tk runtime package required by the dashboard UI:

```bash
sudo apt install -y python3-tk
```

If you are already using the virtual environment from `qemu-image-creator`, you
can reuse it:

```bash
cd path/to/eclipse-sdv-blueprint/qemu-image-creator
source .venv/bin/activate
cd ../hardware-sim
python3 pytk_hwsim.py
```

Defaults match the QEMU VM setup:

| Target | Default |
|---|---|
| VM1 IP | `192.168.100.10` |
| VM2 IP | `192.168.100.11` |
| BMS port | `7460` |
| HVAC port | `7461` |
| Seat port | `7462` |


---

## Verify

Tail the VM service logs while moving controls:

```bash
ssh ubuntu@192.168.100.10 'tail -f /tmp/ev-range-bms.log'
ssh ubuntu@192.168.100.11 'tail -f /tmp/ev-range-hvac.log'
ssh ubuntu@192.168.100.11 'tail -f /tmp/ev-range-seat.log'
```

Tail the range output on VM1:

```bash
ssh ubuntu@192.168.100.10 'tail -f /tmp/ev-range-range-ai.log'
```

The dashboard itself logs to:

```bash
/tmp/pytk_hwsim.log
```

---

## Troubleshooting

If the UI opens but VM logs do not change, check that the QEMU VMs are running
and that the ECU services are active:

```bash
ssh ubuntu@192.168.100.10 'systemctl is-active ev-range-bms'
ssh ubuntu@192.168.100.11 'systemctl is-active ev-range-hvac ev-range-seat'
```

If Python cannot import Tk:

```bash
sudo apt install -y python3-tk
```

If Python dependencies are missing, install dashboard requirements or activate
the virtual environment used for the QEMU setup.
