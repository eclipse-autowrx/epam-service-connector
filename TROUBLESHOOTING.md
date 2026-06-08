# Troubleshooting Guide

Common issues encountered when building, deploying, and running AOS services on AosEdge (Raspberry Pi 5).

---

## Device Clock Reset (RTC Battery)

**Symptom:** After reboot, the device clock resets to 1970 or a past date. Services fail to start, TLS connections are rejected, and AosCloud shows deployment errors.

**Cause:** The Raspberry Pi 5 has no built-in RTC battery. Without one, the clock resets on every power cycle.

**Impact:**
- TLS certificate validation fails (certificates appear expired or not-yet-valid)
- CNI network plugins fail to set up container networking
- Service packages can't be verified
- AosCloud connection drops

**Fix (temporary):** Set the date manually after each boot. On DomD serial console or via SSH:

```bash
sudo date -s "2026-04-10 09:00:00"
sudo systemctl restart aos-communicationmanager
sudo systemctl restart aos-servicemanager
```

Do **not** reboot after setting the date — the clock will reset again.

**Fix (permanent):** Install a [Pi RTC Battery](https://www.raspberrypi.com/products/rtc-battery/). The AosEdge documentation specifically recommends this.

---

## "failed to execute bridge plugin (exec.cpp:132)"

**Symptom:** AosCloud shows `can't run any instances of service: failed to execute bridge plugin (exec.cpp:132)`.

**Cause:** The CNI (Container Network Interface) bridge or DNS plugin fails when setting up container networking. The source is `aos_core_sm_cpp/src/networkmanager/exec.cpp` — it launches CNI plugin binaries (`/opt/cni/bin/bridge`, `/opt/cni/bin/dnsname`) which fail.

**Common triggers:**
1. **Wrong device clock** — the most common cause. TLS cert validation in CNI plugins fails with wrong timestamps
2. **Services started before network is ready** — after reboot, CNI plugins may fail if networking isn't fully initialized
3. **Corrupted CNI state** — leftover network namespaces from previous runs

**Fix:**
```bash
# 1. Fix the clock
sudo date -s "2026-04-10 09:00:00"

# 2. Restart both services
sudo systemctl restart aos-servicemanager
sudo systemctl restart aos-communicationmanager

# 3. Wait 15-30 seconds, then check
sudo crun list
```

If the container still doesn't start, wait 1-2 minutes and restart the service manager again. The CNI plugins sometimes need multiple attempts after a fresh boot.

---

## "failed to execute DNS plugin (exec.cpp:132)"

**Symptom:** Same as bridge plugin error, but specifically the DNS CNI plugin.

**Cause:** The dnsname CNI plugin can't set up DNS resolution for the container. Often happens alongside the bridge plugin failure.

**Fix:** Same as the bridge plugin fix above — correct the clock and restart services.

---

## Upload Failed: DNS Resolution in Docker Container

**Symptom:** Build and sign succeed from the standalone web UI, but upload to AosCloud fails silently. Broadcaster logs show:
```
[Build] Upload skipped or failed: Failed to resolve 'aoscloud.io'
```

**Cause:** The Docker broadcaster container was started without `--network host`, so it uses Docker's bridge network which can't resolve external DNS.

**Fix:** Always start the broadcaster with `--network host`:
```bash
docker run -d --network host \
  --name aos-broadcaster \
  --entrypoint "" \
  -v ~/.aos/security/aos-user-sp.p12:/certs/aos-user-sp.p12:ro \
  -e INSTANCE_ID=AET-TOOLCHAIN-001 \
  -e INSTANCE_NAME="AOS Edge Toolchain" \
  -e KIT_MANAGER_URL=https://kit.digitalauto.tech \
  -e BROADCAST_INTERVAL=30000 \
  -e CERT_FILE=/certs/aos-user-sp.p12 \
  -e AOSCLOUD_URL=https://aoscloud.io:10000 \
  -e NODE_TLS_REJECT_UNAUTHORIZED=0 \
  aos-edge-toolchain:proxy \
  sh -c "python3 /usr/local/bin/init-certs.py && exec node /usr/local/bin/aos-broadcaster.js"
```

---

## Upload Failed: "version already presented"

**Symptom:** `aos-signer upload` returns: `ERROR: version: Value is already presented for the service: 1.0.0`

**Cause:** That version number already exists on AosCloud for this service UUID.

**Fix:** Bump the `version` field in `config.yaml` to a new value (e.g., `1.0.0` → `1.1.0`), then re-sign and re-upload.

---

## KUKSA Vehicle App Shows "(unavailable)"

**Symptom:** The KUKSA vehicle app runs on the device but all signals show `(unavailable)`.

**Cause:** The app can't reach the KUKSA REST bridge.

**Checklist:**
1. **Bridge running?** Check on your dev machine: `curl http://localhost:8888/api/v1/health`
2. **Correct host IP?** The `DEFAULT_HOST` in the C++ code must be the dev machine's IP reachable from the RPi (e.g., `10.0.0.1`)
3. **Firewall?** The dev machine's firewall may block port 8888:
   ```bash
   sudo iptables -I INPUT -p tcp --dport 8888 -j ACCEPT
   ```
4. **Network reachable?** Test from the RPi: `wget -q -O - http://10.0.0.1:8888/api/v1/health`
5. **Container network?** Test from inside the crun container:
   ```bash
   sudo crun exec <container-id> wget -q -O - http://10.0.0.1:8888/api/v1/health
   ```

---

## Cannot SSH to RPi Device

**Symptom:** `ssh pi@10.0.0.100` times out.

**Cause:** Dev machine and RPi are on different subnets.

**Diagnosis:**
```bash
# Check dev machine IP
ip addr show

# Check RPi IP (on serial console)
ifconfig
```

**Fix options:**

1. **Same physical network:** Add the RPi's subnet to your Ethernet interface:
   ```bash
   sudo ip addr add <IP_ON_RPI_SUBNET>/24 dev <ETH_INTERFACE>
   sudo ip link set <ETH_INTERFACE> up
   ssh pi@<DEVICE_IP>
   ```

2. **RPi can ping you but not vice versa:** Asymmetric routing. On the RPi, add your subnet:
   ```bash
   sudo ip addr add <IP_ON_YOUR_SUBNET> dev eth0
   ```
   Then SSH to that IP.

---

## Serial Console Truncates Output

**Symptom:** Xen serial console truncates log lines, making them unreadable.

**Cause:** The serial console has a limited character width shared between Xen domains.

**Fix:** Save logs to a file first, then read:
```bash
sudo journalctl --no-pager > /tmp/log.txt
cat /tmp/log.txt | grep -i "error\|fail" | tail -20
```

Or use SSH instead of the serial console for reading logs.

---

## Minicom Ctrl+a Conflicts with Xen Domain Switching

**Symptom:** Can't switch between Xen domains (DOM0, DOM1, Xen) because minicom intercepts `Ctrl+a`.

**Cause:** Both minicom and Xen use `Ctrl+a` as their escape key.

**Fix:** Use `picocom` instead:
```bash
sudo apt install picocom
sudo picocom -b 115200 /dev/ttyUSB0
```

`picocom` uses `Ctrl+a Ctrl+x` (two-key combo) to exit, which doesn't conflict with Xen's triple `Ctrl+a` domain switching.

If stuck at the Xen debug prompt `(XEN) >`, type:
```
console dom1
```
to return to the DomD Linux console.

---

## Viewing KUKSA App Logs on the Device

The KUKSA vehicle app runs inside a crun container. Its stdout goes to a socket managed by the AOS service manager, not to syslog or journalctl.

**Via SSH:**
```bash
# 1. Find the container ID
sudo crun list

# 2. Run the app inside the container to see live output
sudo timeout 15 crun exec <container-id> /kuksa-vehicle-app 10.0.0.1 8888 3

# 3. Quick signal check without running the full app
sudo crun exec <container-id> wget -q -O - http://10.0.0.1:8888/api/v1/signals/Vehicle.Speed
```

**Via serial console:** Switch to DOM1 (`Ctrl+a` three times) — crun output scrolls there automatically.

---

## Docker Image Rebuild Produces Different Binaries

**Symptom:** After rebuilding the toolchain Docker image with `--no-cache`, binaries that previously worked on the device now fail.

**Cause:** `apt-get update` pulls the latest package versions. Cross-compiler packages (`gcc-aarch64-linux-gnu`, `libc6-arm64-cross`) may have received minor updates that change binary characteristics.

**Prevention:** Pin critical package versions in the Dockerfile, or avoid `--no-cache` unless necessary.

**Note:** In practice, this was a false alarm — the actual cause was the device clock being wrong (see first section). The binaries from the rebuilt image work correctly when the device clock is correct.

---

## KUKSA Bridge Setup

The KUKSA REST bridge translates HTTP requests to KUKSA databroker gRPC calls. Required for the C++ vehicle app which can't link gRPC statically.

**Start everything:**
```bash
cd kuksa-docker
./start-kuksa.sh
```

**Manual start (if pip install fails behind proxy):**
```bash
# 1. KUKSA Databroker
docker run -d --rm --name kuksa-databroker --network host \
  ghcr.io/eclipse-kuksa/kuksa-databroker:latest --insecure

# 2. Install kuksa-client in a venv
python3 -m venv .venv
.venv/bin/pip install --index-url https://pypi.org/simple/ kuksa-client

# 3. Start bridge
BRIDGE_PORT=8888 .venv/bin/python3 bridge.py &

# 4. Start feeder
.venv/bin/python3 feeder.py &
```

**Verify:** `curl http://localhost:8888/api/v1/signals/Vehicle.Speed`
