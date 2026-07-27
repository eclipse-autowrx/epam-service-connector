#
#  Copyright (c) 2018-2026 EPAM Systems Inc.
#
import json

from requests import Session

from helpers import AosCryptoContainer
from subjects.info import find_subject_id_by_label


def create_subject(session: Session, aos_domain: str, subject_label: str) -> str:
    """Creates subject in AOS and returns its ID.

    if subject already exists, return its ID
    """
    # Step 1. Look for existing subject
    try:
        subject_id = find_subject_id_by_label(session, aos_domain, subject_label)
        return subject_id
    except Exception:
        pass

    print(f'Subject is absent, creating subject "{subject_label}"...')

    # Step 2. Create new subject
    json_data = {"label": subject_label, "priority": 0, "is_group": False}
    response = session.post(
        f"https://{aos_domain}:10000/api/v11/subjects/", json=json_data
    )
    print(f'Create subject URL:\n   POST {response.url}\n   payload: {json.dumps(json_data)}')
    response.raise_for_status()
    aos_answer = response.json()
    return aos_answer['id']
