#
#  Copyright (c) 2018-2026 EPAM Systems Inc.
#
import json
from os import PathLike

from helpers import AosCryptoContainer
from services.info import find_service_id_by_codename
from subjects.info import find_subject_id_by_label


def assign_service_to_subject(certificate_path: PathLike | str, subject_label: str, service_codename: str):
    """Assigns a service to a subject.

    This function assigns a service to a subject based on the provided subject label and service codename.
    If the service is already assigned to the subject, it does nothing.

    Args:
        certificate_path (PathLike | str): The path to the certificate file.
        subject_label (str): The label of the subject to which the service will be assigned.
        service_codename (str): The codename of the service to be assigned to the subject.
    """

    try:
        # Load certificate and key, extract domain
        aos_key_container = AosCryptoContainer(certificate_path)

        with aos_key_container.create_requests_session() as session:
            # Using one HTTP session do all requests

            # Step 1: Find service ID by codename
            service_id = find_service_id_by_codename(session, aos_key_container.certificate_domain, service_codename)

            # Step 2: Find subject ID by label
            subject_id = find_subject_id_by_label(session, aos_key_container.certificate_domain, subject_label)

            print(f'Trying to assign service "{service_id}" to subject "{subject_id}"...')

            json_data = {"service_ids": [service_id]}

            # Step 3: Assign service to subject
            response = session.post(
                f"https://{aos_key_container.certificate_domain}:10000/api/v11/subjects/{subject_id}/services/",
                json=json_data,
            )
            print(f'Assign service to subject URL:\n   POST {response.url}\n   payload: {json.dumps(json_data)}')
            if response.status_code == 201:
                print(f'Successfully assigned service "{service_id}" to subject "{subject_id}".')
            else:
                if response.status_code >= 400:
                    response_text = response.text
                    if response.status_code == 409:
                        print(f'Service "{service_id}" is already assigned to subject "{subject_id}".')
                        return
                    if 'already contains' in response_text and service_id in response_text:
                        print(f'Service "{service_id}" is already assigned to subject "{subject_id}".')
                        return
                    print(f'Failed to assign service "{service_id}" to subject "{subject_id}". Response: {response_text}')
                response.raise_for_status()

    except Exception as exc:
        print(f"Error: {exc}")