#!/usr/bin/env python3
# Copyright (c) 2026 Eclipse Foundation.
# 
# This program and the accompanying materials are made available under the
# terms of the MIT License which is available at
# https://opensource.org/licenses/MIT.
#
# SPDX-License-Identifier: MIT

"""
init-certs.py - Initialize AOS signing certificate at container startup.

Certificate sources (checked in order):
  1. CERT_FILE             - Path to a local .p12 file (mounted into container)
  2. AZURE_KEY_VAULT_NAME  - Key Vault name (fetches cert from Azure)

Other env:
  CERT_NAME              - Certificate name (default: aos-user-sp)

If neither is set, prints a warning and exits cleanly.
Build-only use cases work without a certificate.
"""

import base64
import os
import shutil
import stat
import subprocess
import sys


CERT_DIR = "/root/.aos/security"


def log(msg):
    print(f"[init-certs] {msg}", flush=True)


def error(msg):
    print(f"[init-certs] ERROR: {msg}", file=sys.stderr, flush=True)


def generate_pem(p12_path, pem_path):
    """Convert .p12 to .pem using openssl."""
    try:
        result = subprocess.run(
            ["openssl", "pkcs12", "-in", p12_path, "-out", pem_path, "-nodes"],
            capture_output=True,
            timeout=10,
        )
        if result.returncode != 0:
            error(f"openssl failed (exit {result.returncode}): {result.stderr.decode().strip()}")
            return
        os.chmod(pem_path, stat.S_IRUSR | stat.S_IWUSR)
        log(f"Generated PEM: {pem_path}")
    except Exception as e:
        error(f"Failed to generate PEM from {p12_path}: {e}")


def fetch_from_key_vault():
    from azure.identity import DefaultAzureCredential
    from azure.keyvault.secrets import SecretClient

    vault_name = os.environ.get("AZURE_KEY_VAULT_NAME")
    cert_name = os.environ.get("CERT_NAME", "aos-user-sp")

    if not vault_name:
        log("AZURE_KEY_VAULT_NAME not set — skipping Key Vault cert fetch")
        log("Build-only mode: signing, upload, and API calls will not be available")
        return

    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy") or ""
    if proxy:
        log(f"Using proxy for Key Vault access: {proxy}")

    vault_url = f"https://{vault_name}.vault.azure.net"
    log(f"Fetching certificate '{cert_name}' from Key Vault '{vault_name}'...")

    try:
        credential = DefaultAzureCredential()
        secret_client = SecretClient(vault_url=vault_url, credential=credential)
        secret = secret_client.get_secret(cert_name)
    except Exception as e:
        error(f"Failed to fetch certificate from Key Vault: {e}")
        sys.exit(1)

    if not secret.value:
        error(f"Secret '{cert_name}' is empty in Key Vault '{vault_name}'")
        sys.exit(1)

    # Decode the PFX content
    try:
        pfx_bytes = base64.b64decode(secret.value)
    except Exception:
        # If not base64, try raw bytes
        pfx_bytes = secret.value.encode("utf-8")

    # Write certificate to disk
    os.makedirs(CERT_DIR, exist_ok=True)

    p12_path = os.path.join(CERT_DIR, f"{cert_name}.p12")
    with open(p12_path, "wb") as f:
        f.write(pfx_bytes)
    os.chmod(p12_path, stat.S_IRUSR | stat.S_IWUSR)
    log(f"Wrote certificate: {p12_path} ({len(pfx_bytes)} bytes)")

    # Generate .pem for curl/openssl usage
    pem_path = os.path.join(CERT_DIR, f"{cert_name}.pem")
    generate_pem(p12_path, pem_path)

    log("Certificate initialization complete")


def copy_local_cert():
    """Copy a local .p12 file (e.g. mounted via -v) to the cert directory."""
    cert_file = os.environ.get("CERT_FILE", "")
    cert_name = os.environ.get("CERT_NAME", "aos-user-sp")

    if not cert_file:
        return False

    if not os.path.isfile(cert_file):
        error(f"CERT_FILE={cert_file} does not exist")
        sys.exit(1)

    os.makedirs(CERT_DIR, exist_ok=True)
    p12_path = os.path.join(CERT_DIR, f"{cert_name}.p12")
    shutil.copy2(cert_file, p12_path)
    os.chmod(p12_path, stat.S_IRUSR | stat.S_IWUSR)
    log(f"Copied local certificate: {cert_file} → {p12_path}")

    pem_path = os.path.join(CERT_DIR, f"{cert_name}.pem")
    generate_pem(p12_path, pem_path)

    log("Certificate initialization complete (local file)")
    return True


if __name__ == "__main__":
    if not copy_local_cert():
        fetch_from_key_vault()
