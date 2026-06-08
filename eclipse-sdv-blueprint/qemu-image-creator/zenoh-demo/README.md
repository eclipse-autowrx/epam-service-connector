# Zenoh Demo

This folder contains a minimal Eclipse Zenoh peer-to-peer smoke test between
the two QEMU VMs.

It is intentionally separate from the EV Range Extender data path. Use it when
you only want to confirm that VM1 and VM2 can exchange Zenoh samples over the
private `br0` network.

---

## Files

| File | Runs on | Purpose |
|---|---|---|
| `sub.py` | VM2 | Listens on `tcp/0.0.0.0:7447` and subscribes to `demo/vm/**`. |
| `pub.py` | VM1 | Dials VM2 at `tcp/192.168.100.11:7447` and publishes JSON samples on `demo/vm/vm1`. |

No Zenoh router is required. `sub.py` listens, `pub.py` connects directly.

---

## Topology

```text
VM1                                              VM2
192.168.100.10                                  192.168.100.11

pub.py  --connect tcp/192.168.100.11:7447  ->   sub.py --listen tcp/0.0.0.0:7447
key: demo/vm/vm1                                subscription: demo/vm/**
```

---

## Prerequisites

`eclipse-zenoh` must be installed on both VMs. The QEMU cloud-init templates
install it automatically.

Check on either VM:

```bash
python3 -c "import zenoh; print('zenoh OK')"
```

Install manually if needed:

```bash
sudo pip3 install --break-system-packages --ignore-installed eclipse-zenoh
```

---

## Run

Copy the scripts to the VMs from the host:

```bash
cd path/to/eclipse-sdv-blueprint/qemu-image-creator
scp zenoh-demo/sub.py ubuntu@192.168.100.11:/home/ubuntu/
scp zenoh-demo/pub.py ubuntu@192.168.100.10:/home/ubuntu/
```

Start the subscriber on VM2:

```bash
ssh ubuntu@192.168.100.11
python3 sub.py
```

Expected VM2 output:

```text
[SUB] Opening Zenoh session, listening on 'tcp/0.0.0.0:7447'
[SUB] Subscribed to 'demo/vm/**'. Waiting for samples... (Ctrl+C to exit)
```

Start the publisher on VM1:

```bash
ssh ubuntu@192.168.100.10
python3 pub.py
```

Expected VM1 output:

```text
[PUB] Opening Zenoh session, dialling 'tcp/192.168.100.11:7447'
[PUB] Publishing on 'demo/vm/vm1' every 1.0s
[PUB] key=demo/vm/vm1 msg={...}
```

Expected VM2 output:

```text
[SUB] key=demo/vm/vm1 msg={...}
```

---

## Useful flags

`pub.py`:

| Flag | Default | Purpose |
|---|---|---|
| `--peer` | `tcp/192.168.100.11:7447` | Subscriber endpoint to dial. |
| `--key` | `demo/vm/vm1` | Key to publish. |
| `--interval` | `1.0` | Seconds between messages. |
| `--count` | `0` | Number of messages; `0` means forever. |
| `--name` | hostname | Sender name in the JSON payload. |

`sub.py`:

| Flag | Default | Purpose |
|---|---|---|
| `--listen` | `tcp/0.0.0.0:7447` | Endpoint to listen on. |
| `--key` | `demo/vm/**` | Key expression to subscribe to. |

Example using a different port:

```bash
# VM2
python3 sub.py --listen tcp/0.0.0.0:7450

# VM1
python3 pub.py --peer tcp/192.168.100.11:7450
```

---

## Troubleshooting

If VM1 cannot reach VM2, confirm the subscriber is running and the port is
reachable from VM1:

```bash
nc -vz 192.168.100.11 7447
```

If port `7447` is already in use, choose another listen/peer port with the
flags above.

If VM-to-VM traffic is blocked, re-run the QEMU setup or restore the bridge
forwarding rule on the host:

```bash
sudo iptables -A FORWARD -i br0 -o br0 -j ACCEPT
```
