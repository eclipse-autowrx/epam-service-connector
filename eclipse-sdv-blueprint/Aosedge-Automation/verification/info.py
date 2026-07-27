#
#  Copyright (c) 2018-2026 EPAM Systems Inc.
#
from os import PathLike

from helpers import AosCryptoContainer


def _print_verification_batches(aos_answer) -> None:
    ith = 0
    for item in aos_answer['items']:
        ith += 1
        print(
            f" - Batch #{ith}: {item['id']}"
            f" (status={item.get('status', 'unknown')}"
            f", arch={item.get('architecture', 'unknown')})"
        )


def show_verification_batches(certificate_path: PathLike | str) -> None:
    """Lists verification batches.

    Requires an SP certificate (aos-user-sp.p12).

    Args:
        certificate_path: Path to the SP certificate file.
    """
    try:
        aos_key_container = AosCryptoContainer(certificate_path)
        with aos_key_container.create_requests_session() as session:
            response = session.get(
                f"https://{aos_key_container.certificate_domain}:10000/api/v11/verification-batch/"
            )
            response.raise_for_status()
            print("Verification batches URL: GET", response.url)
            aos_answer = response.json()

        print(f"Verification batches (total={aos_answer['total']})")
        print("---------")
        _print_verification_batches(aos_answer)

    except Exception as exc:
        print(f"Error: {exc}")
