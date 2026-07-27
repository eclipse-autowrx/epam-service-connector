# Copyright (c) 2026 Eclipse Foundation.
#
# This program and the accompanying materials are made available under the
# terms of the MIT License which is available at
# https://opensource.org/licenses/MIT.
#
# SPDX-License-Identifier: MIT

from os import PathLike

from requests import Session

from helpers import extract_domain_from_certificate, AosCryptoContainer


def _print_subject_list(aos_answer) -> None:
    ith = 0
    for item in aos_answer['items']:
        ith += 1
        print(f" - Subject #{ith}: {item['id']} - '{item['label']}'")


def _print_units_list(aos_answer) -> None:
    print(f"Units list (total={aos_answer['total']}):")
    ith = 0
    for item in aos_answer['items']:
        ith += 1
        print(f" - Unit #{ith}: {item['id']} - systemUid: '{item['system_uid']}'")


def _print_services_list(aos_answer) -> None:
    print(f"Services list (total={aos_answer['total']}):")
    ith = 0
    for item in aos_answer['items']:
        ith += 1
        print(f" - Service #{ith}: {item['service']['id']} - '{item['service']['title']}'")


def show_subjects_list(certificate_path: PathLike | str) -> None:
    try:
        cert_domain = extract_domain_from_certificate(certificate_path)

        aos_key_container = AosCryptoContainer(certificate_path)
        with aos_key_container.create_requests_session() as session:
            response = session.get(f"https://{cert_domain}:10000/api/v11/subjects/")
            response.raise_for_status()
            print("Subjects list URL: GET", response.url)
            aos_answer = response.json()

        print(f"Subjects list (total={aos_answer['total']})")
        print("---------")
        _print_subject_list(aos_answer)

    except Exception as exc:
        print(f"Error: {exc}")


def show_subjects_info(certificate_path: PathLike | str, label: str) -> None:
    try:
        cert_domain = extract_domain_from_certificate(certificate_path)

        aos_key_container = AosCryptoContainer(certificate_path)
        with aos_key_container.create_requests_session() as session:
            # Fetch subjects filtered by label
            response = session.get(
                f"https://{cert_domain}:10000/api/v11/subjects/",
                params={'label': label}
            )
            response.raise_for_status()
            print("Subjects info URL: GET ", response.url)
            aos_answer = response.json()
            if aos_answer['total'] == 0:
                print(f"No subjects found with label '{label}'")
                return
            if aos_answer['total'] > 1:
                print(f"More than one subject found with label '{label}'")
                return

            subject_id = aos_answer['items'][0]['id']

            # Fetch the units' info
            response = session.get(
                f"https://{cert_domain}:10000/api/v11/subjects/{subject_id}/units/",
            )
            response.raise_for_status()
            print("Units info URL: GET ", response.url)
            units_answer = response.json()

            # Fetch the services' info
            response = session.get(
                f"https://{cert_domain}:10000/api/v11/subjects/{subject_id}/services/",
            )
            response.raise_for_status()
            print("Services info URL: GET ", response.url)
            services_answer = response.json()

        print(f"Subjects info for label '{label}'")
        print("---------")
        _print_subject_list(aos_answer)
        print('')
        _print_units_list(units_answer)
        print('')
        _print_services_list(services_answer)

    except Exception as exc:
        print(f"Error: {exc}")


def find_subject_id_by_label(session: Session, aos_domain: str, label: str) -> str:
    # Fetch subjects filtered by label
    response = session.get(
        f"https://{aos_domain}:10000/api/v11/subjects/",
        params={'label': label}
    )
    response.raise_for_status()
    print("Subjects info URL: GET", response.url)
    aos_answer = response.json()
    if aos_answer['total'] == 0:
        raise ValueError(f"No subjects found with label '{label}'")
    if aos_answer['total'] > 1:
        raise ValueError(f"More than one subject found with label '{label}'")

    return aos_answer['items'][0]['id']
