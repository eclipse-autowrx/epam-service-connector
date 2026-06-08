# QEMU Multi-VM SDV Lab

This directory builds and launches the QEMU VM environment for the EV Range
Extender use case. It provisions two Ubuntu 24.04 cloud-image VMs with
cloud-init, connects them through a private bridge, and starts the VM-side
services through systemd.

The setup is headless and repeatable. Running `setup.py` creates or refreshes
the VM disks, regenerates cloud-init seed images, creates the bridge/TAP
interfaces, launches both VMs, and waits until VM1's Kuksa Databroker answers
on port `55555`.

---

## VM topology

```text
Linux / WSL host
  br0: 192.168.100.1/24
      |
      +-- tap1 -> VM1: 192.168.100.10
      |           hostname: vm1
      |           role: HPC / SDV Runtime node
      |           Kuksa Databroker: 127.0.0.1:55555
      |
      +-- tap2 -> VM2: 192.168.100.11
                  hostname: vm2
                  role: zonal ECU node
```

Each VM also receives a QEMU user-mode network adapter for outbound internet
access during first boot. The private `br0` network is used for host-to-VM and
VM-to-VM traffic.

| Item | VM1 | VM2 |
|---|---|---|
| Private IP | `192.168.100.10` | `192.168.100.11` |
| TAP interface | `tap1` | `tap2` |
| Disk | `output/vm1.qcow2` | `output/vm2.qcow2` |
| Seed image | `output/seed1.img` | `output/seed2.img` |
| Cloud-init user-data | `output/user-data-vm1.composed` | `output/user-data-vm2.composed` |
| Login | `ubuntu` / `ubuntu` | `ubuntu` / `ubuntu` |

---

## VM services

`tools/compose_userdata.py` embeds the VM-side Python sources and systemd units
into the composed cloud-init files before the VMs boot.

| VM | Service | Purpose |
|---|---|---|
| VM1 | `ev-range-bms.service` | Runs `/home/ubuntu/ev-range-extender/vm1/bms.py`. |
| VM1 | `ev-range-range-ai.service` | Runs `/home/ubuntu/ev-range-extender/vm1/range_ai.py`. |
| VM1 | `ev-range-kuksa-bridge.service` | Runs the VM1 bridge configuration from `/home/ubuntu/kuksa-bridge/bridge-config.json`. |
| VM2 | `ev-range-hvac.service` | Runs `/home/ubuntu/ev-range-extender/vm2/hvac_ecu.py`. |
| VM2 | `ev-range-seat.service` | Runs `/home/ubuntu/ev-range-extender/vm2/seat_ecu.py`. |
| VM2 | `ev-range-kuksa-bridge.service` | Runs the VM2 bridge configuration from `/home/ubuntu/kuksa-bridge/bridge-config.json`. |

VM1 also starts the `ghcr.io/eclipse-autowrx/sdv-runtime:latest` container
through `/usr/local/bin/evrange-start-runtime`. The runtime exposes the Kuksa
Databroker on port `55555` inside VM1.

---

## Directory layout

| Path | Purpose |
|---|---|
| `setup.py` | Main provisioning entry point. Installs host packages, builds disks and seeds, prepares networking, launches both VMs, and waits for VM1's Databroker. |
| `setup.sh` | Shell entry point kept as an alternative to `setup.py`. |
| `vm1_launch.sh` | QEMU launch command for VM1. |
| `vm2_launch.sh` | QEMU launch command for VM2. |
| `input/user-data-vm1` | VM1 cloud-init template. |
| `input/user-data-vm2` | VM2 cloud-init template. |
| `input/network-vm1.yaml` | VM1 static private network configuration. |
| `input/network-vm2.yaml` | VM2 static private network configuration. |
| `tools/compose_userdata.py` | Injects VM files and systemd units into cloud-init user-data. |
| `ev-range-extender/vm1/` | Python sources deployed to VM1. |
| `ev-range-extender/vm2/` | Python sources deployed to VM2. |
| `kuksa-bridge/` | Bridge implementation and per-VM bridge configuration. |
| `output/` | Generated VM disks, seed images, composed cloud-init files, and cached Ubuntu base image. |

---

## Provision and launch the VMs

Run from this directory:

```bash
cd path/to/eclipse-sdv-blueprint/qemu-image-creator
python3 setup.py
```

`setup.py` performs these steps:

1. Installs required host packages with `apt`.
2. Checks whether KVM acceleration is available.
3. Downloads the Ubuntu Noble cloud image into `output/images/` if needed.
4. Creates `output/vm1.qcow2` and `output/vm2.qcow2` if needed.
5. Regenerates composed cloud-init files under `output/`.
6. Creates `output/seed1.img` and `output/seed2.img`.
7. Creates `br0`, `tap1`, and `tap2`.
8. Launches both VMs in the background through QEMU.
9. Waits for VM1's Kuksa Databroker on `192.168.100.10:55555`.

The first boot can take several minutes because cloud-init installs VM packages
and VM1 pulls the SDV Runtime container. Later runs are faster because the base
image, VM disks, and container layers are already cached.

When setup completes, it prints SSH commands for both VMs:

```bash
ssh ubuntu@192.168.100.10
ssh ubuntu@192.168.100.11
```

The default password is `ubuntu`.

---

## KVM check

The launch scripts use KVM automatically when `/dev/kvm` exists and the current
user is in the `kvm` group. Check that before a long first boot:

```bash
ls -l /dev/kvm
groups | grep -w kvm
```

If both checks pass, `setup.py` prints:

```text
[SUCCESS] KVM enabled
```

If KVM is not available, the VMs still boot with software emulation, but first
boot can be much slower.

---

## Inspect the VMs

Check the active VM services:

```bash
ssh ubuntu@192.168.100.10 \
    'systemctl list-units --type=service --state=active "ev-range-*"'

ssh ubuntu@192.168.100.11 \
    'systemctl list-units --type=service --state=active "ev-range-*"'
```

Read service logs:

```bash
ssh ubuntu@192.168.100.10 'tail -f /tmp/ev-range-bms.log'
ssh ubuntu@192.168.100.10 'tail -f /tmp/ev-range-range-ai.log'
ssh ubuntu@192.168.100.10 'tail -f /tmp/ev-range-kuksa-bridge.log'

ssh ubuntu@192.168.100.11 'tail -f /tmp/ev-range-hvac.log'
ssh ubuntu@192.168.100.11 'tail -f /tmp/ev-range-seat.log'
ssh ubuntu@192.168.100.11 'tail -f /tmp/ev-range-kuksa-bridge.log'
```

Inspect the VM1 runtime startup log:

```bash
ssh ubuntu@192.168.100.10 'tail -f /tmp/evrange-runtime.log'
```

Restart VM services:

```bash
ssh ubuntu@192.168.100.10 \
    'sudo systemctl restart ev-range-bms ev-range-range-ai ev-range-kuksa-bridge'

ssh ubuntu@192.168.100.11 \
    'sudo systemctl restart ev-range-hvac ev-range-seat ev-range-kuksa-bridge'
```

---

## Stop and clean up

Power off both VMs:

```bash
ssh ubuntu@192.168.100.10 'sudo poweroff'
ssh ubuntu@192.168.100.11 'sudo poweroff'
```

Remove leftover QEMU processes and network interfaces:

```bash
sudo pkill -9 -f 'qemu-system-x86_64' 2>/dev/null || true
sudo ip link delete tap1 2>/dev/null || true
sudo ip link delete tap2 2>/dev/null || true
sudo ip link delete br0  2>/dev/null || true
```

Wipe only the VM disks and seeds:

```bash
rm -f output/vm1.qcow2 output/vm2.qcow2 output/seed1.img output/seed2.img
```

Wipe all generated output, including the cached base image:

```bash
rm -rf output/*
```

---

## Troubleshooting

### `setup.py` waits a long time for VM1

VM1 is usually still running cloud-init, installing Python packages, pulling
the SDV Runtime image, or waiting for Docker. Check cloud-init and the runtime
log:

```bash
ssh ubuntu@192.168.100.10 'cloud-init status --long; tail -40 /tmp/evrange-runtime.log'
```

Common causes:

- KVM is unavailable, so QEMU is using software emulation.
- The VM cannot reach package registries or `ghcr.io` during first boot.
- Docker is still pulling `ghcr.io/eclipse-autowrx/sdv-runtime:latest`.

To rerun the VM1 runtime helper manually:

```bash
ssh ubuntu@192.168.100.10 'sudo /usr/local/bin/evrange-start-runtime'
```

### TAP interface is busy

If QEMU reports that `tap1` or `tap2` is busy, an earlier VM process may still
be holding the interface.

```bash
sudo pkill -9 -f 'qemu-system-x86_64' 2>/dev/null || true
sudo ip link delete tap1 2>/dev/null || true
sudo ip link delete tap2 2>/dev/null || true
sudo ip link delete br0  2>/dev/null || true
python3 setup.py
```

### A VM service is inactive or failed

The services wait for cloud-init and, where needed, the Databroker. If a unit
failed during first boot, restart it after the VM settles:

```bash
ssh ubuntu@192.168.100.10 \
    'sudo systemctl restart ev-range-bms ev-range-range-ai ev-range-kuksa-bridge'

ssh ubuntu@192.168.100.11 \
    'sudo systemctl restart ev-range-hvac ev-range-seat ev-range-kuksa-bridge'
```

If it still fails, read the journal:

```bash
ssh ubuntu@192.168.100.10 'sudo journalctl -u ev-range-bms --no-pager -n 80'
ssh ubuntu@192.168.100.11 'sudo journalctl -u ev-range-hvac --no-pager -n 80'
```

### VM-to-VM traffic is blocked

`setup.py` adds forwarding rules for `br0`. If firewall state was reset, add
them again:

```bash
sudo iptables -A INPUT   -i br0 -j ACCEPT
sudo iptables -A FORWARD -i br0 -j ACCEPT
sudo iptables -A FORWARD -o br0 -j ACCEPT
sudo sysctl -w net.ipv4.ip_forward=1
```

### KVM is not enabled

On Ubuntu or Debian, the usual setup is:

```bash
sudo apt update
sudo apt install -y qemu-kvm cpu-checker
sudo modprobe kvm_intel    # Intel CPU
# or: sudo modprobe kvm_amd # AMD CPU
sudo usermod -aG kvm $USER
newgrp kvm
kvm-ok
```

If `/dev/kvm` exists but your user is not in the group, run:

```bash
sudo usermod -aG kvm $USER
newgrp kvm
```

If `/dev/kvm` is missing on native Linux, check whether virtualization is
enabled in BIOS/UEFI and whether the correct KVM kernel module is loaded.

If `/dev/kvm` is missing inside WSL2, enable nested virtualization on the
Windows host, restart WSL, and check `/dev/kvm` again.

After fixing KVM, wipe the partially booted VM disks and rerun setup:

```bash
sudo pkill -f qemu-system-x86_64 2>/dev/null || true
rm -f output/vm1.qcow2 output/vm2.qcow2 output/seed1.img output/seed2.img
python3 setup.py
```

---

## References

- [VM1 application notes](ev-range-extender/vm1/README.md)
- [VM2 application notes](ev-range-extender/vm2/README.md)
- [Project root README](../README.md)
