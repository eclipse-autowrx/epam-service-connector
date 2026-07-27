#
#  Copyright (c) 2018-2026 EPAM Systems Inc.
#
from requests import Session

from helpers import AosCryptoContainer


def _print_unit_list(aos_answer):
    ith = 0
    for unit in aos_answer['items']:
        print(f"{ith}: id={unit['id']} systemUid={unit['system_uid']}")
        ith += 1


def show_unit_list(certificate_path: str, search: str = '', status: str = '', limit: int = 100) -> None:
    """Shows list of units.

    Args:
        certificate_path (str): Path to the certificate file.
        search (str, optional): Search string to filter units. Defaults to ''.
        status (str, optional): Status to filter units. Defaults to ''.
        limit (int, optional): Maximum number of units to return. Defaults to 100.
    """
    try:
        # Using ordering: created_at to sort units by creation date (reverse order)
        params = {'ordering': '-created_at', 'limit': limit}
        if search:
            params['system_uid'] = search
        if status:
            params['status'] = status

        aos_key_container = AosCryptoContainer(certificate_path)
        with aos_key_container.create_requests_session() as session:
            response = session.get(
                f"https://{aos_key_container.certificate_domain}:10000/api/v11/units/",
                params=params
            )
            response.raise_for_status()
            print("Unit list URL: GET", response.url)
            aos_answer = response.json()

        print(f"Units (total={len(aos_answer['items'])}):")
        print("---------")
        _print_unit_list(aos_answer)

    except Exception as exc:
        print(f"Error: {exc}")


def find_unit_id_by_system_uid(session: Session, aos_domain: str, system_uid: str) -> str:
    """Finds unit id by system_uid."""
    params = {'system_uid': system_uid}
    response = session.get(
        f"https://{aos_domain}:10000/api/v11/units/",
        params=params
    )
    print("Unit search URL: GET", response.url)
    response.raise_for_status()
    aos_answer = response.json()

    if aos_answer['total'] == 0:
        raise ValueError(f"No units found with system_uid '{system_uid}'")
    if aos_answer['total'] > 1:
        raise ValueError(f"More than one unit found with system_uid '{system_uid}'")

    return aos_answer['items'][0]['id']
