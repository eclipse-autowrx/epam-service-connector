#!/usr/bin/env python3
# Copyright (c) 2026 Eclipse Foundation.
#
# This program and the accompanying materials are made available under the
# terms of the MIT License which is available at
# https://opensource.org/licenses/MIT.
#
# SPDX-License-Identifier: MIT
"""Python translation of setup.sh.

Same flow, same prints, same idempotent re-run behaviour as the
original bash script. Run from the qemu-image-creator/ folder:

    python3 setup.py

setup.sh is kept alongside this file as a fallback for users who
prefer the original bash entry-point.
"""

import os
import socket
import subprocess
import sys
import time
from pathlib import Path


# -------- CONFIG --------
BASE_URL    = "https://cloud-images.ubuntu.com/noble/current/"
IMAGE_NAME  = "noble-server-cloudimg-amd64.img"

REPO_ROOT   = Path(__file__).resolve().parent
INPUT_DIR   = REPO_ROOT / "input"
OUTPUT_DIR  = REPO_ROOT / "output"
IMAGE_DIR   = OUTPUT_DIR / "images"

VM1_IMG     = OUTPUT_DIR / "vm1.qcow2"
VM2_IMG     = OUTPUT_DIR / "vm2.qcow2"
SEED1       = OUTPUT_DIR / "seed1.img"
SEED2       = OUTPUT_DIR / "seed2.img"

# Composed cloud-init files (template + auto-deployed ev-range-extender code).
# These are regenerated on every setup.py run so that any local edits to
# the Python sources under ev-range-extender/ are picked up automatically.
USERDATA1   = OUTPUT_DIR / "user-data-vm1.composed"
USERDATA2   = OUTPUT_DIR / "user-data-vm2.composed"
META1       = OUTPUT_DIR / "meta-data-vm1"
META2       = OUTPUT_DIR / "meta-data-vm2"

BANNER_THIN = "=" * 38
BANNER_WIDE = "=" * 56


def run(cmd, check=True, cwd=None):
    """Run a command list; exit() on failure when check=True.

    `check=False` mirrors the bash idiom `cmd 2>/dev/null || true`
    used for idempotent ip/iptables steps that fail on a re-run.
    """
    return subprocess.run(cmd, check=check, cwd=cwd or REPO_ROOT)


def write_meta(path: Path, vm_name: str, run_token: str) -> None:
    """Write per-run NoCloud meta-data so cloud-init reruns app bootstrap.

    A static instance-id makes cloud-init skip once-per-instance modules
    (including app deployment/start commands) on subsequent runs. A fresh
    instance-id per setup invocation forces those app steps to run again.
    """
    path.write_text(
        f"instance-id: {vm_name}-{run_token}\n"
        f"local-hostname: {vm_name}\n",
        encoding="utf-8",
    )


def _check_existing_qemu() -> int:
    """Detect leftover QEMU / TAP state from a previous run.

    The VM launch scripts use `set -e` and -daemonize; if an old
    digital.auto / QEMU instance is still running or tap1/tap2/br0 are
    still attached, the second launch fails with a confusing error.
    Surface that here and ask the user to clean up and re-run setup
    instead of partially launching a broken environment.
    """
    qemu_pids: list[str] = []
    try:
        result = subprocess.run(
            ["pgrep", "-f", "qemu-system-x86_64"],
            capture_output=True, text=True, check=False,
        )
        if result.returncode == 0:
            qemu_pids = [p for p in result.stdout.split() if p.strip()]
    except FileNotFoundError:
        pass

    stale_links = [
        name for name in ("tap1", "tap2")
        if Path(f"/sys/class/net/{name}").exists()
    ]

    if not qemu_pids and not stale_links:
        return 0

    print(BANNER_WIDE)
    print("[ERROR] A previous digital.auto / QEMU instance is still running.")
    print(BANNER_WIDE)
    if qemu_pids:
        print(f"  Running qemu-system-x86_64 PIDs: {' '.join(qemu_pids)}")
    if stale_links:
        print(f"  Leftover network interfaces: {' '.join(stale_links)}")
    print()
    print(" Please kill the running VMs and re-run this setup.")
    print()
    print(" TAP network cleanup commands:")
    print("   sudo ip link delete tap1")
    print("   sudo ip link delete tap2")
    print("   sudo ip link delete br0")
    print()
    return 1


def main() -> int:
    print(BANNER_THIN)
    print("[INFO] MULTI-VM SETUP STARTED")
    print(BANNER_THIN)

    # -------- PREFLIGHT: existing QEMU / TAP state --------
    rc = _check_existing_qemu()
    if rc != 0:
        return rc

    # -------- CHECK INPUT FILES --------
    if not (INPUT_DIR / "user-data-vm1").is_file() \
            or not (INPUT_DIR / "meta-data-vm1").is_file():
        print("[ERROR] VM1 cloud-init files missing")
        return 1

    if not (INPUT_DIR / "user-data-vm2").is_file() \
            or not (INPUT_DIR / "meta-data-vm2").is_file():
        print("[ERROR] VM2 cloud-init files missing")
        return 1

    # -------- INSTALL DEPENDENCIES --------
    print("[INFO] Installing dependencies...")
    run(["sudo", "apt", "update"])
    run([
        "sudo", "apt", "install", "-y",
        "qemu-system", "qemu-utils", "cloud-image-utils",
        "wget", "bridge-utils", "python3-yaml",
    ])

    # -------- KVM CHECK --------
    print("[INFO] Checking KVM...")
    in_kvm_group = False
    try:
        groups = subprocess.check_output(["groups"], text=True).split()
        in_kvm_group = "kvm" in groups
    except (FileNotFoundError, subprocess.CalledProcessError):
        pass
    if Path("/dev/kvm").exists() and in_kvm_group:
        print("[SUCCESS] KVM enabled")
    else:
        print("[WARNING] KVM not enabled (slower VM)")

    # -------- CREATE DIRS --------
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    base_image = IMAGE_DIR / IMAGE_NAME

    # -------- DOWNLOAD BASE IMAGE --------
    if not base_image.is_file():
        print("[INFO] Downloading Ubuntu image...")
        run(["wget", "-O", str(base_image), BASE_URL + IMAGE_NAME])
    else:
        print("[INFO] Base image already exists")

    # -------- CREATE VM DISKS --------
    # qemu-img stores the backing-file path verbatim, so the relative
    # `images/<name>` path needs to resolve correctly when QEMU later
    # opens the qcow2 from output/. cwd=output/ matches what setup.sh did.
    if not VM1_IMG.is_file():
        print("[INFO] Creating VM1 disk...")
        run([
            "qemu-img", "create", "-f", "qcow2", "-F", "qcow2",
            "-b", f"images/{IMAGE_NAME}", str(VM1_IMG), "30G",
        ], cwd=OUTPUT_DIR)

    if not VM2_IMG.is_file():
        print("[INFO] Creating VM2 disk...")
        run([
            "qemu-img", "create", "-f", "qcow2", "-F", "qcow2",
            "-b", f"images/{IMAGE_NAME}", str(VM2_IMG), "30G",
        ], cwd=OUTPUT_DIR)

    # -------- COMPOSE CLOUD-INIT USER-DATA --------
    # Inject the entire ev-range-extender/ Python source tree + the systemd
    # units that auto-start the ECUs (BMS / HVAC / Seat) into the cloud-init
    # user-data. After this step there is no manual scp anywhere; the apps
    # arrive on the VM with the very first boot.
    print("[INFO] Composing cloud-init user-data with auto-deployed apps...")
    run([
        sys.executable, "tools/compose_userdata.py",
        "--template", str(INPUT_DIR / "user-data-vm1"),
        "--output",   str(USERDATA1),
        "--vm",       "vm1",
    ])
    run([
        sys.executable, "tools/compose_userdata.py",
        "--template", str(INPUT_DIR / "user-data-vm2"),
        "--output",   str(USERDATA2),
        "--vm",       "vm2",
    ])

    # -------- WRITE PER-RUN CLOUD-INIT META-DATA --------
    run_token = f"{int(time.time())}-{os.getpid()}"
    write_meta(META1, "vm1", run_token)
    write_meta(META2, "vm2", run_token)

    # -------- CREATE SEED IMAGES --------
    print("[INFO] Creating cloud-init seeds...")
    run([
        "cloud-localds",
        "--network-config", str(INPUT_DIR / "network-vm1.yaml"),
        str(SEED1), str(USERDATA1), str(META1),
    ])
    run([
        "cloud-localds",
        "--network-config", str(INPUT_DIR / "network-vm2.yaml"),
        str(SEED2), str(USERDATA2), str(META2),
    ])

    print(BANNER_THIN)
    print("[SUCCESS] SETUP COMPLETED")
    print(BANNER_THIN)

    print("[INFO] Creating Bridge and TAP interfaces...")
    user = os.environ.get("USER") or os.environ.get("LOGNAME") or "ubuntu"

    # 1. Create and enable the bridge
    run(["sudo", "ip", "link", "add", "br0", "type", "bridge"], check=False)
    run(["sudo", "ip", "link", "set", "br0", "up"])

    # 2. Assign IP to bridge (AFTER creation)
    run(["sudo", "ip", "addr", "add", "192.168.100.1/24", "dev", "br0"],
        check=False)

    # 3. Create TAP1 and attach to bridge
    run(["sudo", "ip", "tuntap", "add", "dev", "tap1", "mode", "tap",
         "user", user], check=False)
    run(["sudo", "ip", "link", "set", "tap1", "master", "br0"])
    run(["sudo", "ip", "link", "set", "tap1", "up"])

    # 4. Create TAP2 and attach to bridge
    run(["sudo", "ip", "tuntap", "add", "dev", "tap2", "mode", "tap",
         "user", user], check=False)
    run(["sudo", "ip", "link", "set", "tap2", "master", "br0"])
    run(["sudo", "ip", "link", "set", "tap2", "up"])

    # 5. Enable forwarding (IMPORTANT)
    run(["sudo", "sysctl", "-w", "net.ipv4.ip_forward=1"])

    # 6. Allow traffic (IMPORTANT)
    run(["sudo", "iptables", "-A", "INPUT",   "-i", "br0", "-j", "ACCEPT"],
        check=False)
    run(["sudo", "iptables", "-A", "FORWARD", "-i", "br0", "-j", "ACCEPT"],
        check=False)
    run(["sudo", "iptables", "-A", "FORWARD", "-o", "br0", "-j", "ACCEPT"],
        check=False)

    print("[SUCCESS] Bridge and TAP interfaces ready")

    print(BANNER_THIN)
    print("[SUCCESS] Network setup completed")
    print(BANNER_THIN)
    print()

    # Hand off control to the VM1 launch script (background QEMU + spinner).
    run(["bash", str(REPO_ROOT / "vm1_launch.sh")])
    print()
    # Hand off control to the VM2 launch script (background QEMU + spinner).
    run(["bash", str(REPO_ROOT / "vm2_launch.sh")])

    # ==========================================
    # Automated Polling: Wait for Docker Container
    # ==========================================
    print()
    print("[INFO] Waiting for SDV Runtime to download and launch...")
    print("       (This usually takes 2-3 minutes. Please wait...)")

    # Silently knock on port 55555 every 5 seconds until it answers
    while True:
        try:
            with socket.create_connection(("192.168.100.10", 55555),
                                          timeout=2.0):
                break
        except OSError:
            print(".", end="", flush=True)
            time.sleep(5)

    print("\n")
    print(BANNER_WIDE)
    print(" [SUCCESS] VM1 setup completed and runtime created! ")
    print(BANNER_WIDE)
    print()
    print(" To log into VM1, use:")
    print(" ssh ubuntu@192.168.100.10")
    print()
    print(" To log into VM2, use:")
    print(" ssh ubuntu@192.168.100.11")
    print()
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print()
        print("[WARNING] Interrupted by user.")
        sys.exit(130)
