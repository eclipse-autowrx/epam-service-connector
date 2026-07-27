#
#  Copyright (c) 2018-2026 EPAM Systems Inc.
#
import json
from os import PathLike

from helpers import AosCryptoContainer


def approve_verification_batch(certificate_path: PathLike | str, batch_id: str) -> None:
    """Approves a verification batch.

    Requires an SP certificate (aos-user-sp.p12).

    Args:
        certificate_path: Path to the SP certificate file.
        batch_id: ID of the verification batch to approve.
    """
    try:
        aos_key_container = AosCryptoContainer(certificate_path)
        with aos_key_container.create_requests_session() as session:
            # Fetch batch details to extract the architecture field
            response = session.get(
                f"https://{aos_key_container.certificate_domain}:10000/api/v11/verification-batch/{batch_id}/"
            )
            response.raise_for_status()
            batch_info = response.json()

            architecture = batch_info.get('architecture', '')
            json_data: dict = {"status": "approved"}
            if architecture:
                json_data["architecture"] = architecture

            response = session.patch(
                f"https://{aos_key_container.certificate_domain}:10000/api/v11/verification-batch/{batch_id}/",
                json=json_data,
            )
            print(
                f"Approve verification batch URL:\n"
                f"   PATCH {response.url}\n"
                f"   payload: {json.dumps(json_data)}"
            )
            if response.status_code in (200, 201, 204):
                print(f'Verification batch "{batch_id}" successfully approved.')
            else:
                print(f'Failed to approve batch "{batch_id}". Response: {response.text}')
                response.raise_for_status()

    except Exception as exc:
        print(f"Error: {exc}")
