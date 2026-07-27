#
#  Copyright (c) 2018-2026 EPAM Systems Inc.
#
from os import PathLike

from requests import Session

from helpers import AosCryptoContainer


def show_services_list(certificate_path: PathLike | str, search: str = '') -> None:
    try:
        aos_key_container = AosCryptoContainer(certificate_path)
        with aos_key_container.create_requests_session() as session:
            response = session.get(
                f"https://{aos_key_container.certificate_domain}:10000/api/v11/services/",
                params={'search': search} if search else None
            )
            response.raise_for_status()
            print("Service list URL: GET ", response.url)
            aos_answer = response.json()

        print(aos_answer)

        print(f"Services list (total={aos_answer['total']})")
        print("---------")
        _print_services_list(aos_answer)

    except Exception as exc:
        print(f"Error: {exc}")


def find_service_id_by_codename(session: Session, aos_domain: str, codename: str) -> str:
    response = session.get(
        f"https://{aos_domain}:10000/api/v11/services/",
        params={'search': codename}
    )
    response.raise_for_status()
    print("Service search URL: GET ", response.url)
    aos_answer = response.json()
    if aos_answer['total'] == 0:
        raise ValueError(f"No services found with codename '{codename}'")
    if aos_answer['total'] > 1:
        raise ValueError(f"More than one service found with codename '{codename}'")

    return aos_answer['items'][0]['id']


def _print_services_list(aos_answer) -> None:
    ith = 0
    for item in aos_answer['items']:
        ith += 1
        print(f" - Service #{ith}: {item['id']} (codename={item['codename']}) - '{item['title']}'")