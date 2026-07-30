# AosEdge Automation Scripts

## What this folder contains

Python scripts to work with AosEdge/AOS API and automate EV Range Extender setup.

Main entry points:

- `aos-automation.py`: runs end-to-end setup (unit config, unit set, subject, service assignment).
- `cli.py`: command-line utility for individual API operations.

## Quick start (exact commands)

Run these commands from the project root:

```bash
cd eclipse-sdv-blueprint/Aosedge-Automation

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Required files

- OEM certificate (default expected path): `~/.aos/security/aos-user-oem.p12`
- Optional SP certificate (fallback for service discovery): `~/.aos/security/aos-user-sp.p12`
- `unitconfig.json` must exist in this folder (already included in repo).

## Run the full automation script

Use default certificate path:

```bash
python aos-automation.py --system-uid YOUR_SYSTEM_UID
```

If you do not pass `--system-uid`, the script will show available UIDs and prompt you.

Use custom certificate paths:

```bash
python aos-automation.py \
  --crt ~/.aos/security/aos-user-oem.p12 \
  --sp-crt ~/.aos/security/aos-user-sp.p12 \
  --system-uid YOUR_SYSTEM_UID \
  --unit-set-title ev-range-extender-unitset \
  --subject-label ev-range-extender-subject
```

## Run CLI commands

Show all commands:

```bash
python cli.py --help
```

List services:

```bash
python cli.py services-list
```

Assign service to subject:

```bash
python cli.py assign-service SERVICE_CODENAME SUBJECT_LABEL
```

Assign unit to subject:

```bash
python cli.py assign-unit SYSTEM_UID SUBJECT_LABEL
```

Pass explicit certificate file to any command:

```bash
python cli.py --crt ~/.aos/security/aos-user-oem.p12 services-list
```

## Notes

- Most commands default to `~/.aos/security/aos-user-oem.p12` when `--crt` is not provided.
- Verification and bundle commands in `cli.py` default to SP certificate.
- Keep the virtual environment active while running commands in this folder.
