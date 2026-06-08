# Troubleshooting Guide

Common issues and solutions for the Eclipse SDV Blueprint deployment.

---

## VM Issues

### SELinux Blocking Services

**Symptom:** `crun` can't start containers, services show `Operation not permitted`

**Fix:** Run after every VM reboot:
```bash
sshpass -p 'Password1' ssh -p <SSH_PORT> root@localhost "setenforce 0"
```

### VM Clock Drift

**Symptom:** TLS errors, certificate validation failures after reboot

**Fix:**
```bash
sshpass -p 'Password1' ssh -p <SSH_PORT> root@localhost "date -s '$(date -u)'"
```

### DNS Resolution Failed

**Symptom:** Can't reach `aoscloud.io`, `nslookup` fails

**Fix:**
```bash
sshpass -p 'Password1' ssh -p <SSH_PORT> root@localhost "
  mount -o remount,rw /
  mkdir -p /etc/systemd/resolved.conf.d
  printf '[Resolve]\nDNS=8.8.8.8 1.1.1.1\n' > /etc/systemd/resolved.conf.d/public-dns.conf
  systemctl restart systemd-resolved"
```

### Provision State Not Set

**Symptom:** IAM fails with `can't initialize node info provider: not found`

**Cause:** `/var/aos/.provisionstate` is empty (VM was powered off during provisioning)

**Fix:**
```bash
sshpass -p 'Password1' ssh -p <SSH_PORT> root@localhost "
  echo 'provisioned' > /var/aos/.provisionstate
  systemctl restart aos.target"
```

### Read-Only Filesystem

**Symptom:** `Read-only file system` when trying to modify config

**Fix:**
```bash
sshpass -p 'Password1' ssh -p <SSH_PORT> root@localhost "mount -o remount,rw /"
```

---

## Network Issues

### VirtualBox NAT Port Forwarding Doesn't Work for gRPC

**Symptom:** TCP connects but gRPC calls time out with `DEADLINE_EXCEEDED`

**Cause:** VirtualBox NAT network port forwarding doesn't reliably handle HTTP/2 (gRPC) traffic.

**Fix:** Use SSH tunnels instead:
```bash
sshpass -p 'Password1' ssh -o StrictHostKeyChecking=no -f -N \
  -L 55555:localhost:55555 -p <HPC_SSH_PORT> root@localhost
sshpass -p 'Password1' ssh -o StrictHostKeyChecking=no -f -N \
  -L 55556:localhost:55556 -p <ZONAL_SSH_PORT> root@localhost
```

### Corporate Proxy Interference

**Symptom:** gRPC, pip, apt, or AosCloud connections fail or hang

**Cause:** Proxy env vars (`http_proxy`, `HTTP_PROXY`) point to a non-running proxy.

**Fix:** Unset proxy before every command:
```bash
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY FTP_PROXY ftp_proxy
```

For Python gRPC scripts, use `env -i` for a completely clean environment:
```bash
env -i PATH="$PATH" HOME="$HOME" python3 my_script.py
```

For Docker containers:
```bash
docker exec container env -i PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  HOME=/root bash -c "your_command"
```

---

## KUKSA Issues

### KUKSA Connection Refused

**Symptom:** Services can't connect to KUKSA Databroker

**Check:**
```bash
sshpass -p 'Password1' ssh -p <SSH_PORT> root@localhost \
  "systemctl status kuksa-databroker --no-pager | head -8"
```

**Common causes:**
1. Wrong binary path in service file → create override with correct path `/usr/bin/databroker`
2. TLS mode mismatch → ensure KUKSA runs with `--insecure`
3. Port not configured → ensure `--port 55555` (HPC) or `--port 55556` (Zonal)

### Custom VSS Paths Not Found

**Symptom:** `Subscribe` returns `NOT_FOUND` for signals like `Vehicle.Cabin.Seat.VentilationLevel`

**Cause:** Stock KUKSA VSS 5.1 doesn't include blueprint-specific signal paths.

**Fix:** Copy the merged VSS file to both VMs:
```bash
sshpass -p 'Password1' ssh -p <SSH_PORT> root@localhost "mount -o remount,rw /"
sshpass -p 'Password1' scp -P <SSH_PORT> sdv-blueprint/vss-merged.json \
  root@localhost:/usr/share/vss/vss.json
sshpass -p 'Password1' ssh -p <SSH_PORT> root@localhost \
  "systemctl restart kuksa-databroker"
```

---

## Service Deployment Issues

### C++ Services Must Use Insecure gRPC

**Symptom:** Service exits immediately with `Cannot read CA certificate`

**Cause:** AOS crun containers don't have access to `/etc/kuksa-val/CA.pem`. TLS credentials fail.

**Fix:** All C++ services must use `grpc::InsecureChannelCredentials()`. KUKSA must run with `--insecure`.

### Dynamic Binaries Fail in AOS Containers

**Symptom:** `can't run any instances of service: job finished with status=failed`

**Cause:** Dynamically linked C++ binaries require shared libraries not available in AOS containers.

**Fix:** Build with static linking:
```makefile
CXXFLAGS := -std=c++17 -O2 -static -static-libgcc -static-libstdc++
```

Binary size increases from ~700KB to ~19MB. Verify: `ldd build/signal-writer` → "not a dynamic executable"

### Version Already Exists

**Symptom:** `ERROR: version: Value is already presented for the service`

**Fix:** Bump the version in the service YAML before re-uploading:
```yaml
publish:
    version: "1.0.16"  # increment this
```

---

## Dashboard Issues

### Dashboard Shows "--" for All Values

**Symptom:** Page loads but no signal data after clicking Connect

**Check:**
1. Is the broadcaster running? `docker logs aos-broadcaster 2>&1 | grep SignalRelay`
2. Is the relay receiving signals? `curl -s http://localhost:9100/signals | python3 -m json.tool | tail -5`
3. Are the SSH tunnels alive? `ss -tlnp | grep -E '55555|55556'`
4. Is the KUKSA bridge running? `ps aux | grep kuksa-bridge`

### CORS Errors in Browser Console

**Symptom:** `Access-Control-Allow-Origin` errors when fetching from `:9100`

**Fix:** The broadcaster's signal relay must include CORS headers. This is handled in `aos-broadcaster.js`. If you see this error, restart the broadcaster with the latest script.

---

## Quick Diagnostic Commands

```bash
# Check all VMs
VBoxManage list runningvms

# Check all ports
ss -tlnp | grep -E '(55555|55556|9100|3012)'

# Check all processes
ps aux | grep -E "(kuksa-bridge|simulator|esbuild|ssh.*-L)" | grep -v grep

# Check signal flow
env -i PATH="$PATH" HOME="$HOME" python3 -c "
import grpc
from kuksa.val.v1 import val_pb2, val_pb2_grpc, types_pb2
for port, name in [(55555, 'HPC'), (55556, 'Zonal')]:
    stub = val_pb2_grpc.VALStub(grpc.insecure_channel(f'localhost:{port}'))
    resp = stub.GetServerInfo(val_pb2.GetServerInfoRequest(), timeout=5)
    print(f'{name}: {resp.name} {resp.version}')
"

# Check relay
curl -s http://localhost:9100/signals | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(f'{len(d)} signals')
for s in d[-3:]: print(f'  {s[\"signal\"]}: {s[\"value\"]}')
"
```
