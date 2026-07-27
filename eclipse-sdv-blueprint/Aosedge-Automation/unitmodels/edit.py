# Copyright (c) 2026 Eclipse Foundation.
#
# This program and the accompanying materials are made available under the
# terms of the MIT License which is available at
# https://opensource.org/licenses/MIT.
#
# SPDX-License-Identifier: MIT

import json
from os import PathLike
from pathlib import Path
from urllib.request import urlopen

from helpers import AosCryptoContainer
from unitmodels.info import _resolve_unit_model_id, fetch_target_unit_config_data, export_target_unit_config
from units.info import find_unit_id_by_system_uid


DEFAULT_UNIT_CONFIG_TEMPLATE_URL = (
    "https://raw.githubusercontent.com/aosedge/meta-aos-vm/demo_bosch/misc/unitconfig.json"
)


def _load_unit_config_from_file(config_file: str | PathLike) -> dict:
    config_path = Path(config_file).expanduser().resolve()
    if not config_path.exists():
        raise ValueError(f"Config file not found: {config_path}")

    with open(config_path, 'r', encoding='utf-8') as file_handle:
        unit_config = json.load(file_handle)

    # Support both plain unit_config JSON and exported backup structure.
    if isinstance(unit_config, dict) and 'unit_config' in unit_config and isinstance(unit_config['unit_config'], dict):
        unit_config = unit_config['unit_config']

    if not isinstance(unit_config, dict):
        raise ValueError('Unit config must be a JSON object')

    return unit_config


def _normalize_unit_config_payload(payload: dict) -> dict:
    # Support both plain unit_config JSON and exported backup/template structures.
    if isinstance(payload, dict) and 'unit_config' in payload and isinstance(payload['unit_config'], dict):
        payload = payload['unit_config']

    if not isinstance(payload, dict):
        raise ValueError('Unit config payload must be a JSON object')

    return payload


def _load_unit_config_from_url(template_url: str) -> dict:
    with urlopen(template_url) as response_handle:
        raw_content = response_handle.read().decode('utf-8')

    payload = json.loads(raw_content)
    return _normalize_unit_config_payload(payload)


def update_target_unit_config(
    certificate_path: PathLike | str,
    system_uid: str,
    config_file: str | PathLike,
    backup_file: str | PathLike | None = None,
    no_backup: bool = False,
) -> None:
    """Updates a target unit model configuration by unit SYSTEM_UID.

    The API updates unit configuration at unit-model level.
    This command resolves target unit -> unit model, then patches unit model
    with the JSON config loaded from CONFIG_FILE.
    """
    try:
        unit_config = _load_unit_config_from_file(config_file)

        if not no_backup:
            if backup_file:
                backup_path = Path(backup_file).expanduser().resolve()
            else:
                backup_path = Path.cwd() / f"{system_uid}-unit-config-backup.json"
            export_target_unit_config(certificate_path, system_uid, backup_path)

        aos_key_container = AosCryptoContainer(certificate_path)

        with aos_key_container.create_requests_session() as session:
            unit_id = find_unit_id_by_system_uid(session, aos_key_container.certificate_domain, system_uid)
            model_id = _resolve_unit_model_id(session, aos_key_container.certificate_domain, unit_id)

            json_data = {'unit_config': unit_config}
            response = session.patch(
                f"https://{aos_key_container.certificate_domain}:10000/api/v11/unit-models/{model_id}/",
                json=json_data,
            )
            print(
                f"Update unit config URL:\n"
                f"   PATCH {response.url}\n"
                f"   payload: {json.dumps(json_data)}"
            )
            response.raise_for_status()
            answer = response.json()

        print(f"Successfully updated unit config for system UID '{system_uid}'.")
        print(f" - Unit ID:       {unit_id}")
        print(f" - Unit model ID: {model_id}")
        print(f" - Latest config version: {answer.get('unit_config_latest_version', 'unknown')}")

    except Exception as exc:
        print(f"Error: {exc}")


def update_target_unit_config_from_url(
    certificate_path: PathLike | str,
    system_uid: str,
    template_url: str = DEFAULT_UNIT_CONFIG_TEMPLATE_URL,
    backup_file: str | PathLike | None = None,
    no_backup: bool = False,
    save_template_as: str | PathLike | None = None,
) -> None:
    """Downloads a unit config template from URL and applies it to target system.

    This automates the manual dashboard import flow for UNIT CONFIG.
    """
    try:
        unit_config = _load_unit_config_from_url(template_url)
        if save_template_as:
            save_path = Path(save_template_as).expanduser().resolve()
            with open(save_path, 'w', encoding='utf-8') as out_handle:
                json.dump(unit_config, out_handle, indent=2, sort_keys=True)
            print(f"Saved downloaded template to: {save_path}")

        _, _, current_version, current_config = fetch_target_unit_config_data(certificate_path, system_uid)
        if current_config == unit_config:
            print(
                f"Template download URL:\n   GET {template_url}\n"
                f"Unit config already matches template for system UID '{system_uid}'.\n"
                f" - Current config version: {current_version}\n"
                f"Skip update PATCH request."
            )
            return

        if not no_backup:
            if backup_file:
                backup_path = Path(backup_file).expanduser().resolve()
            else:
                backup_path = Path.cwd() / f"{system_uid}-unit-config-backup.json"
            export_target_unit_config(certificate_path, system_uid, backup_path)

        aos_key_container = AosCryptoContainer(certificate_path)
        with aos_key_container.create_requests_session() as session:
            unit_id = find_unit_id_by_system_uid(session, aos_key_container.certificate_domain, system_uid)
            model_id = _resolve_unit_model_id(session, aos_key_container.certificate_domain, unit_id)

            json_data = {'unit_config': unit_config}
            response = session.patch(
                f"https://{aos_key_container.certificate_domain}:10000/api/v11/unit-models/{model_id}/",
                json=json_data,
            )
            print(
                f"Template download URL:\n   GET {template_url}\n"
                f"Update unit config URL:\n   PATCH {response.url}\n"
                f"   payload: {json.dumps(json_data)}"
            )
            response.raise_for_status()
            answer = response.json()

        print(f"Successfully applied template config for system UID '{system_uid}'.")
        print(f" - Unit ID:       {unit_id}")
        print(f" - Unit model ID: {model_id}")
        print(f" - Latest config version: {answer.get('unit_config_latest_version', 'unknown')}")

    except Exception as exc:
        print(f"Error: {exc}")


def update_target_unit_config_from_file(
    certificate_path: PathLike | str,
    system_uid: str,
    template_file: str | PathLike,
    backup_file: str | PathLike | None = None,
    no_backup: bool = False,
) -> None:
    """Loads unit config template from local JSON file and applies it to target system."""
    try:
        unit_config = _load_unit_config_from_file(template_file)

        _, _, current_version, current_config = fetch_target_unit_config_data(certificate_path, system_uid)
        if current_config == unit_config:
            print(
                f"Template file: {Path(template_file).expanduser().resolve()}\n"
                f"Unit config already matches template for system UID '{system_uid}'.\n"
                f" - Current config version: {current_version}\n"
                f"Skip update PATCH request."
            )
            return

        if not no_backup:
            if backup_file:
                backup_path = Path(backup_file).expanduser().resolve()
            else:
                backup_path = Path.cwd() / f"{system_uid}-unit-config-backup.json"
            export_target_unit_config(certificate_path, system_uid, backup_path)

        aos_key_container = AosCryptoContainer(certificate_path)
        with aos_key_container.create_requests_session() as session:
            unit_id = find_unit_id_by_system_uid(session, aos_key_container.certificate_domain, system_uid)
            model_id = _resolve_unit_model_id(session, aos_key_container.certificate_domain, unit_id)

            json_data = {'unit_config': unit_config}
            response = session.patch(
                f"https://{aos_key_container.certificate_domain}:10000/api/v11/unit-models/{model_id}/",
                json=json_data,
            )
            print(
                f"Template file: {Path(template_file).expanduser().resolve()}\n"
                f"Update unit config URL:\n   PATCH {response.url}\n"
                f"   payload: {json.dumps(json_data)}"
            )
            response.raise_for_status()
            answer = response.json()

        print(f"Successfully applied file-based config for system UID '{system_uid}'.")
        print(f" - Unit ID:       {unit_id}")
        print(f" - Unit model ID: {model_id}")
        print(f" - Latest config version: {answer.get('unit_config_latest_version', 'unknown')}")

    except Exception as exc:
        print(f"Error: {exc}")
