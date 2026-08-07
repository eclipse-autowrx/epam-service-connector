# Copyright (c) 2026 Eclipse Foundation.
#
# This program and the accompanying materials are made available under the
# terms of the MIT License which is available at
# https://opensource.org/licenses/MIT.
#
# SPDX-License-Identifier: MIT

from os import PathLike

from helpers import extract_domain_from_certificate, AosCryptoContainer


def show_certificate_info(certificate_path: PathLike) -> None:
    try:
        cert_domain = extract_domain_from_certificate(certificate_path)

        print("Certificate info")
        print("----------------")
        print(f" - file path:  {certificate_path}")
        print(f" - Aos domain: {cert_domain}")

    except Exception as exc:
        print(f"Error: {exc}")


def show_user_info(certificate_path: PathLike) -> None:
    try:
        cert_domain = extract_domain_from_certificate(certificate_path)

        aos_key_container = AosCryptoContainer(certificate_path)
        with aos_key_container.create_requests_session() as session:
            response = session.get(f"https://{cert_domain}:10000/api/v11/users/me/")
            response.raise_for_status()
            user_info = response.json()

        print("User info")
        print("---------")
        print(f" - file path:  {certificate_path}")
        print(f" - Aos domain: {cert_domain}")
        print(f" - User ID:    {user_info['id']}")
        print(f" - User name:  {user_info['username']}")
        if user_info.get('oem'):
            print(f" - User OEM: {user_info['oem']['id']} - '{user_info['oem']['title']}'")
            for sp in user_info['oem']['service_providers']:
                print(f"   - SP: {sp}")
        if user_info.get('service_provider'):
            print(f" - User SP: {user_info['service_provider']['id']} - '{user_info['service_provider']['title']}'")

    except Exception as exc:
        print(f"Error: {exc}")
