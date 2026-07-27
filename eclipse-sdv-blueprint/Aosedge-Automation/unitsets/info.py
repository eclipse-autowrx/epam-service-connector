# Copyright (c) 2026 Eclipse Foundation.
#
# This program and the accompanying materials are made available under the
# terms of the MIT License which is available at
# https://opensource.org/licenses/MIT.
#
# SPDX-License-Identifier: MIT

from os import PathLike

from requests import Session

from helpers import AosCryptoContainer


def _print_unit_sets_list(aos_answer) -> None:
    ith = 0
    for item in aos_answer['items']:
        ith += 1
        print(
            f" - UnitSet #{ith}: {item['id']} - '{item['title']}'"
            f" (validation_set={item.get('is_validation_set', False)}"
            f", strategy={item.get('update_strategy', 'unknown')})"
        )


def show_unit_sets_list(certificate_path: PathLike | str) -> None:
    try:
        aos_key_container = AosCryptoContainer(certificate_path)
        with aos_key_container.create_requests_session() as session:
            response = session.get(
                f"https://{aos_key_container.certificate_domain}:10000/api/v11/unit-sets/"
            )
            response.raise_for_status()
            print("Unit sets list URL: GET", response.url)
            aos_answer = response.json()

        print(f"Unit sets list (total={aos_answer['total']})")
        print("---------")
        _print_unit_sets_list(aos_answer)

    except Exception as exc:
        print(f"Error: {exc}")


def find_unit_set_id_by_title(session: Session, aos_domain: str, title: str) -> str:
    """Finds a unit set ID by its exact title."""
    response = session.get(
        f"https://{aos_domain}:10000/api/v11/unit-sets/",
        params={'search': title},
    )
    response.raise_for_status()
    print("Unit sets search URL: GET", response.url)
    aos_answer = response.json()

    for item in aos_answer['items']:
        if item['title'] == title:
            return item['id']

    raise ValueError(f"No unit set found with title '{title}'")
