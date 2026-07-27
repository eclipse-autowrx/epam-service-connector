#
#  Copyright (c) 2018-2026 EPAM Systems Inc.
#
import json
from os import PathLike

from helpers import AosCryptoContainer
from unitsets.info import find_unit_set_id_by_title
from units.info import find_unit_id_by_system_uid


def _get_default_fleet_id(session, aos_domain: str) -> str:
    response = session.get(f"https://{aos_domain}:10000/api/v11/fleets/default/")
    response.raise_for_status()
    print("Default fleet URL: GET", response.url)
    fleet_info = response.json()
    fleet_id = fleet_info.get('id')
    if not fleet_id:
        raise ValueError('Failed to resolve default fleet ID')
    return fleet_id


def _normalize_update_strategy(strategy: str) -> str:
    strategy_map = {
        'minimize_unit_restart': 'MinimizeRestarts',
        'minimize_restarts': 'MinimizeRestarts',
        'minimize_download_traffic': 'MinimizeDownloadTraffic',
        'minimize_download': 'MinimizeDownloadTraffic',
        'MinimizeRestarts': 'MinimizeRestarts',
        'MinimizeDownloadTraffic': 'MinimizeDownloadTraffic',
    }
    return strategy_map.get(strategy, strategy)


def create_unit_set(
    certificate_path: PathLike | str,
    title: str,
    description: str = '',
    is_verification_set: bool = True,
    update_strategy: str = 'minimize_unit_restart',
    fleet_id: str = '',
) -> None:
    """Creates a unit set.

    If a unit set with the given title already exists, does nothing.

    Args:
        certificate_path: Path to the OEM certificate file.
        title: Title of the unit set.
        description: Optional description.
        is_verification_set: Whether this is a verification set (bypasses verification checks).
        update_strategy: Update strategy for the unit set (e.g. 'minimize_unit_restart').
    """
    try:
        aos_key_container = AosCryptoContainer(certificate_path)
        with aos_key_container.create_requests_session() as session:
            # Check if it already exists
            try:
                existing_id = find_unit_set_id_by_title(session, aos_key_container.certificate_domain, title)
                print(f"Unit set '{title}' already exists with ID '{existing_id}'.")
                return
            except ValueError:
                pass

            effective_fleet_id = fleet_id or _get_default_fleet_id(
                session, aos_key_container.certificate_domain
            )
            effective_update_strategy = _normalize_update_strategy(update_strategy)

            json_data = {
                "title": title,
                "fleet": effective_fleet_id,
                "description": description,
                "update_strategy": effective_update_strategy,
                "is_validation_set": is_verification_set,
            }
            response = session.post(
                f"https://{aos_key_container.certificate_domain}:10000/api/v11/unit-sets/",
                json=json_data,
            )
            print(f"Create unit set URL:\n   POST {response.url}\n   payload: {json.dumps(json_data)}")
            if response.status_code == 201:
                result = response.json()
                print(f"Successfully created unit set '{title}' with ID '{result['id']}'.")
            else:
                print(f"Failed to create unit set '{title}'. Response: {response.text}")
                response.raise_for_status()

    except Exception as exc:
        print(f"Error: {exc}")


def assign_unit_to_unit_set(
    certificate_path: PathLike | str,
    unit_set_title: str,
    unit_system_uid: str,
) -> None:
    """Assigns a unit to a unit set.

    If the unit is already in the unit set, does nothing.

    Args:
        certificate_path: Path to the OEM certificate file.
        unit_set_title: Title of the target unit set.
        unit_system_uid: System UID of the unit to assign.
    """
    try:
        aos_key_container = AosCryptoContainer(certificate_path)
        with aos_key_container.create_requests_session() as session:
            unit_set_id = find_unit_set_id_by_title(
                session, aos_key_container.certificate_domain, unit_set_title
            )
            unit_id = find_unit_id_by_system_uid(
                session, aos_key_container.certificate_domain, unit_system_uid
            )

            print(f'Trying to assign unit "{unit_id}" to unit set "{unit_set_id}"...')

            json_data = {"system_uids": [unit_system_uid]}
            response = session.post(
                f"https://{aos_key_container.certificate_domain}:10000/api/v11/unit-sets/{unit_set_id}/units/",
                json=json_data,
            )
            print(
                f"Assign unit to unit set URL:\n"
                f"   POST {response.url}\n"
                f"   payload: {json.dumps(json_data)}"
            )
            if response.status_code in (200, 201):
                print(f'Unit "{unit_id}" successfully assigned to unit set "{unit_set_id}".')
            elif response.status_code == 409:
                print(f'Unit "{unit_id}" is already in unit set "{unit_set_id}".')
            else:
                response_text = response.text
                if response.status_code == 400 and 'already contains' in response_text and unit_system_uid in response_text:
                    print(f'Unit "{unit_id}" is already in unit set "{unit_set_id}".')
                    return
                response.raise_for_status()

    except Exception as exc:
        print(f"Error: {exc}")
