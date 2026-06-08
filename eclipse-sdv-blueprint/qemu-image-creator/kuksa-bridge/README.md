# kuksa-bridge

`kuksa_bridge.py` mirrors selected VSS current values between the VM1 Kuksa
Databroker and the VM2 bridge-wire services over Eclipse Zenoh.

In the current VM setup, VM1 owns the Kuksa Databroker. VM2 runs cabin ECUs in
bridge-wire mode: they publish cabin VSS envelopes to the local VM2 bridge and
listen for values coming back from VM1. VM2 does not require its own local
Kuksa Databroker for this path.

---

## Bridged signals

Only cabin actuator signals are bridged:

| VSS path | Type | Unit | Direction |
|---|---|---|---|
| `Vehicle.Cabin.HVAC.AmbientAirTemperature` | float | percent | bidirectional |
| `Vehicle.Cabin.Seat.Row1.DriverSide.Heating` | int | percent | bidirectional |
| `Vehicle.Cabin.Seat.Row1.DriverSide.HeatingCooling` | int | percent | bidirectional |

Battery signals and `Vehicle.Powertrain.Range` stay on VM1 and are not bridged.

---

## Runtime shape

```text
VM1                                             VM2
192.168.100.10                                 192.168.100.11

Kuksa Databroker :55555
    ^
    | inbound writes
    |
kuksa_bridge.py
  listen tcp/0.0.0.0:7448  <---- Zenoh peer ---->  kuksa_bridge.py
                                                     relay_only=true
                                                     listen tcp/0.0.0.0:7448
                                                     connect tcp/192.168.100.10:7448
                                                           ^
                                                           |
                                      hvac_ecu.py / seat_ecu.py
                                      publish and consume bridge envelopes
```

VM1 is the only side that writes incoming bridge samples into Kuksa. VM2 is a
stateless relay for its local ECUs and for VM1-originated cabin commands.

---

## Wire envelope

Each Zenoh sample uses the configured key prefix plus the VSS path converted to
slashes, for example:

```text
kuksa-bridge/Vehicle/Cabin/HVAC/AmbientAirTemperature
```

Payload:

```json
{
  "path": "Vehicle.Cabin.HVAC.AmbientAirTemperature",
  "value": 50.0,
  "unit": "percent",
  "timestamp": "2026-05-21T...Z",
  "source": "vm2"
}
```

The `source` field prevents echo loops. A bridge instance drops samples that
already carry its own `source_label`, and the inbound side also deduplicates
recent values.

---

## Config files

| File | Role |
|---|---|
| `bridge-config-vm1.json` | VM1 bridge. Connects to Kuksa at `127.0.0.1:55555`, listens on `tcp/0.0.0.0:7448`, and writes inbound cabin values to VM1. |
| `bridge-config-vm2.json` | VM2 relay. Uses `relay_only=true`, listens locally on `tcp/0.0.0.0:7448`, and dials VM1 at `tcp/192.168.100.10:7448`. |

Important config fields:

| Field | Meaning |
|---|---|
| `kuksa.host` / `kuksa.port` | Kuksa target for non-relay mode. Used by VM1. |
| `relay_only` | Keeps a Zenoh relay session without opening a Kuksa client. Used by VM2. |
| `diagnostic_log` | Logs observed bridge samples without republishing them. |
| `zenoh.listen` | Endpoints this instance opens for peers. |
| `zenoh.connect` | Endpoints this instance dials. |
| `key_prefix` | Prefix for bridge sample keys. |
| `source_label` | Source tag inserted into outbound envelopes. |
| `signals[].direction` | `outbound`, `inbound`, or `bidirectional`. |

---

## Systemd deployment

The QEMU cloud-init composer installs the bridge on both VMs under:

```text
/home/ubuntu/kuksa-bridge/
```

It starts through:

```text
ev-range-kuksa-bridge.service
```

Logs are written to:

```text
/tmp/ev-range-kuksa-bridge.log
```

---

## Manual run

Stop the systemd unit first:

```bash
sudo systemctl stop ev-range-kuksa-bridge
```

Run on VM1:

```bash
cd /home/ubuntu/kuksa-bridge
python3 kuksa_bridge.py --config bridge-config.json
```

Run on VM2:

```bash
cd /home/ubuntu/kuksa-bridge
python3 kuksa_bridge.py --config bridge-config.json
```

Validate a config without opening Kuksa or Zenoh:

```bash
python3 kuksa_bridge.py --config bridge-config-vm1.json --validate-config
python3 kuksa_bridge.py --config bridge-config-vm2.json --validate-config
```

---

## Verify

Tail both bridge logs:

```bash
ssh ubuntu@192.168.100.10 'tail -f /tmp/ev-range-kuksa-bridge.log'
ssh ubuntu@192.168.100.11 'tail -f /tmp/ev-range-kuksa-bridge.log'
```

Expected log patterns:

```text
OUT ... Vehicle.Cabin.HVAC.AmbientAirTemperature=50.0
IN  Vehicle.Cabin.HVAC.AmbientAirTemperature = 50.0 (from vm2)
ACT Vehicle.Cabin.Seat.Row1.DriverSide.Heating = 100 -> dashboard seat.heating
```

`OUT` means this side published a bridge envelope. `IN` means VM1 wrote an
incoming value to Kuksa. `ACT` means a VM2 ECU observed an inbound bridge value
and forwarded status to the dashboard.
