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

from requests import Session

from helpers import AosCryptoContainer
from units.info import find_unit_id_by_system_uid


def _version_key(version: str) -> tuple:
    # Prefer semantic version ordering when possible (e.g. 2.0.0 < 10.0.0).
    parts = str(version).split('.')
    key: list[int | str] = []
    for part in parts:
        if part.isdigit():
            key.append(int(part))
        else:
            key.append(part)
    return tuple(key)


def _resolve_unit_model_id(session: Session, aos_domain: str, unit_id: str) -> str:
    response = session.get(f"https://{aos_domain}:10000/api/v11/units/{unit_id}/")
    response.raise_for_status()
    unit_info = response.json()

    model = unit_info.get('model')
    if not model:
        raise ValueError(f"Unit '{unit_id}' has no model assigned")

    if isinstance(model, dict):
        model_id = model.get('id')
        if not model_id:
            raise ValueError(f"Unit '{unit_id}' model does not contain ID")
        return model_id

    if isinstance(model, str):
        return model

    raise ValueError(f"Unsupported model format for unit '{unit_id}'")


def fetch_target_unit_config_data(
    certificate_path: PathLike | str,
    system_uid: str,
) -> tuple[str, str, str, dict]:
    """Fetches latest unit config data for target system UID.

    Returns:
        tuple: (unit_id, model_id, version, unit_config)
    """
    aos_key_container = AosCryptoContainer(certificate_path)

    version = 'unknown'
    unit_config: dict = {}

    with aos_key_container.create_requests_session() as session:
        unit_id = find_unit_id_by_system_uid(session, aos_key_container.certificate_domain, system_uid)
        model_id = _resolve_unit_model_id(session, aos_key_container.certificate_domain, unit_id)

        response = session.get(
            f"https://{aos_key_container.certificate_domain}:10000/api/v11/unit-models/{model_id}/unit-configs/"
        )
        response.raise_for_status()
        print("Unit configs URL: GET", response.url)
        config_list = response.json()

        if config_list.get('total', 0) > 0:
            items = config_list.get('items', [])
            latest_item = max(items, key=lambda item: _version_key(item.get('version', '0')))
            version = latest_item.get('version', 'unknown')
            unit_config = latest_item.get('unit_config', {})
        else:
            # Some deployments expose current unit_config on unit-model details
            # but have no historical entries in /unit-configs/ yet.
            response = session.get(
                f"https://{aos_key_container.certificate_domain}:10000/api/v11/unit-models/{model_id}/"
            )
            response.raise_for_status()
            print("Unit model details URL: GET", response.url)
            model_info = response.json()
            version = model_info.get('unit_config_latest_version', 'unknown')
            unit_config = model_info.get('unit_config', {})
            if unit_config is None:
                unit_config = {}

    if not isinstance(unit_config, dict):
        raise ValueError('Unit config payload is not a JSON object')

    return unit_id, model_id, version, unit_config


def export_target_unit_config(
    certificate_path: PathLike | str,
    system_uid: str,
    out_file: PathLike | str,
) -> None:
    """Exports latest target unit config into a JSON file."""
    unit_id, model_id, version, unit_config = fetch_target_unit_config_data(certificate_path, system_uid)

    out_path = Path(out_file).expanduser().resolve()
    payload = {
        'system_uid': system_uid,
        'unit_id': unit_id,
        'unit_model_id': model_id,
        'version': version,
        'unit_config': unit_config,
    }

    with open(out_path, 'w', encoding='utf-8') as file_handle:
        json.dump(payload, file_handle, indent=2, sort_keys=True)

    print(f"Exported unit config backup to: {out_path}")


def show_target_unit_config(certificate_path: PathLike | str, system_uid: str) -> None:
    """Shows effective unit-model config for a target unit system UID."""
    try:
        unit_id, model_id, version, unit_config = fetch_target_unit_config_data(certificate_path, system_uid)
        print(f"Unit config for system UID '{system_uid}'")
        print("---------")
        print(f" - Unit ID:       {unit_id}")
        print(f" - Unit model ID: {model_id}")
        print(f" - Config ver:    {version}")
        print(" - Unit config JSON:")
        print(json.dumps(unit_config, indent=2, sort_keys=True))

    except Exception as exc:
        print(f"Error: {exc}")
