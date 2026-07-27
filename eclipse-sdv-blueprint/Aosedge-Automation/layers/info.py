#
#  Copyright (c) 2018-2026 EPAM Systems Inc.
#
from os import PathLike

from helpers import AosCryptoContainer


def _print_layers_list(aos_answer) -> None:
    ith = 0
    for item in aos_answer['items']:
        ith += 1
        print(
            f" - Layer #{ith}: {item['id']} - '{item.get('name', 'unknown')}'"
            f" (state={item.get('state', 'unknown')})"
        )


def show_layers_list(certificate_path: PathLike | str, search: str = '') -> None:
    """Lists SOTA layers uploaded to AOS Cloud.

    Args:
        certificate_path: Path to the certificate file.
        search: Optional search string to filter layers by name.
    """
    try:
        aos_key_container = AosCryptoContainer(certificate_path)
        with aos_key_container.create_requests_session() as session:
            params = {'search': search} if search else None
            response = session.get(
                f"https://{aos_key_container.certificate_domain}:10000/api/v11/layers/",
                params=params,
            )
            response.raise_for_status()
            print("Layers list URL: GET", response.url)
            aos_answer = response.json()

        print(f"Layers list (total={aos_answer['total']})")
        print("---------")
        _print_layers_list(aos_answer)

    except Exception as exc:
        print(f"Error: {exc}")
