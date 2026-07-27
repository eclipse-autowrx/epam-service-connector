#
#  Copyright (c) 2018-2026 EPAM Systems Inc.
#
import json
from os import PathLike

from helpers import AosCryptoContainer
from subjects.edit import create_subject
from units.info import find_unit_id_by_system_uid


def assign_unit_to_subject(certificate_path: PathLike | str, subject_label: str, unit_system_uid: str) -> None:
    """Assigns unit to subject.

    This function assigns a unit to a subject based on the provided subject label and unit system UID.
    If unit is already assigned to the subject, do nothing.

    Args:
        certificate_path (PathLike | str): The path to the certificate file.
        subject_label (str): The label of the subject to which the unit will be assigned.
        unit_system_uid (str): The system UID of the unit to be assigned to the subject.
    """

    try:
        # Load certificate and key, extract domain
        aos_key_container = AosCryptoContainer(certificate_path)

        with aos_key_container.create_requests_session() as session:
            # Using one HTTP session do all requests

            # Step 1: Find subject ID by label
            subject_id = create_subject(session, aos_key_container.certificate_domain, subject_label)

            # Step 2: Find unit ID by system UID (just to check the Unit)
            unit_id = find_unit_id_by_system_uid(session, aos_key_container.certificate_domain, unit_system_uid)

            print(f'Trying to assign unit "{unit_id}" to subject "{subject_id}"...')

            json_data = {"system_uids": [unit_system_uid]}

            response = session.post(
                f'https://{aos_key_container.certificate_domain}:10000/api/v11/subjects/{subject_id}/units/',
                json=json_data,
            )

            print(f'Assign unit to subject URL:\n   POST {response.url}\n   payload: {json.dumps(json_data)}')
            if response.status_code == 201:
                print(f'Unit "{unit_id}" successfully assigned to subject "{subject_id}".')
            else:
                response_text = response.text
                if response.status_code == 409:
                    print(f'Unit "{unit_id}" is already assigned to subject "{subject_id}".')
                    return
                if 'already contains' in response_text and unit_system_uid in response_text:
                    print(f'Unit "{unit_id}" is already assigned to subject "{subject_id}".')
                    return
                response.raise_for_status()

    except Exception as exc:
        print(f'Error assigning unit "{unit_system_uid}" to subject "{subject_label}": {exc}')
        return