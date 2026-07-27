#
#  Copyright (c) 2018-2026 EPAM Systems Inc.
#
"""AosEdge setup automation.

This script executes all setup steps automatically.
Only system UID is required from the user.

Steps:
1. Target system unitconfig update
2. Unit set setup
3. Assign unit to unit set
4. Subject setup
5. Assign unit to subject
6. Assign services to subject
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from helpers import AosCryptoContainer
from subjects.edit import create_subject
from subjects.info import find_subject_id_by_label
from subjects.units import assign_unit_to_subject
from unitmodels.edit import update_target_unit_config_from_file
from unitmodels.info import fetch_target_unit_config_data
from unitsets.edit import create_unit_set
from unitsets.info import find_unit_set_id_by_title
from units.info import find_unit_id_by_system_uid

SERVICE_CODENAMES: list[str] = [
    "ev-range-extender",
    "kuksa-syncer",
    "demo-ev-range-extender-bms",
    "demo-ev-range-extender-hvac-ecu",
    "demo-ev-range-extender-range-ai",
    "demo-ev-range-extender-seat-ecu",
]

PLAYGROUND_DASHBOARD_URL = (
    "https://playground.digital.auto/model/67f76c0d8c609a0027662a69/"
    "library/prototype/69ce30f438bb8e98f0af5ac8/dashboard"
)


def _list_available_system_uids(certificate_path: Path) -> list[str]:
    container = AosCryptoContainer(certificate_path)
    with container.create_requests_session() as session:
        limit = 200
        offset = 0
        system_uids: list[str] = []

        while True:
            response = session.get(
                f"https://{container.certificate_domain}:10000/api/v11/units/",
                params={"limit": limit, "offset": offset},
            )
            response.raise_for_status()
            payload = response.json()
            items = payload.get("items", [])

            for item in items:
                system_uid = item.get("system_uid")
                if system_uid and system_uid not in system_uids:
                    system_uids.append(system_uid)

            total = payload.get("total", 0)
            offset += limit
            if len(system_uids) >= total or not items:
                break

    return system_uids


def _prompt_system_uid_if_missing(certificate_path: Path, system_uid: str) -> str:
    if system_uid:
        return system_uid

    available_system_uids = _list_available_system_uids(certificate_path)
    if available_system_uids:
        print("Available system UIDs:")
        for uid in available_system_uids:
            print(f" - {uid}")
    else:
        print("No system UIDs were returned by API.")

    while True:
        value = input("Enter system UID: ").strip()
        if value:
            return value
        print("System UID cannot be empty.")


def _validate_system_uid_exists(certificate_path: Path, system_uid: str) -> str:
    container = AosCryptoContainer(certificate_path)
    with container.create_requests_session() as session:
        return find_unit_id_by_system_uid(session, container.certificate_domain, system_uid)


def _verify_unitconfig_matches_template(certificate_path: Path, system_uid: str, template_file: Path) -> None:
    _, _, version, current_config = fetch_target_unit_config_data(certificate_path, system_uid)

    from unitmodels.edit import _load_unit_config_from_file
    desired_config = _load_unit_config_from_file(template_file)
    if current_config != desired_config:
        raise ValueError(
            "Verification failed: current unit config does not match local unitconfig.json template"
        )

    print(f"Unit config verification passed (version={version}).")


def _setup_subject(certificate_path: Path, subject_label: str) -> None:
    container = AosCryptoContainer(certificate_path)
    with container.create_requests_session() as session:
        create_subject(session, container.certificate_domain, subject_label)


def _get_all_services(certificate_path: Path) -> list[dict]:
    """Fetches all visible services using paginated API requests."""
    container = AosCryptoContainer(certificate_path)
    with container.create_requests_session() as session:
        limit = 200
        offset = 0
        all_items: list[dict] = []

        while True:
            response = session.get(
                f"https://{container.certificate_domain}:10000/api/v11/services/",
                params={"limit": limit, "offset": offset},
            )
            response.raise_for_status()
            answer = response.json()
            items = answer.get("items", [])
            all_items.extend(items)

            total = answer.get("total", 0)
            offset += limit
            if len(all_items) >= total or not items:
                break

    return all_items


def _resolve_service_id_with_certificate(certificate_path: Path, service_codename: str) -> str | None:
    services = _get_all_services(certificate_path)

    exact_matches = [
        item for item in services
        if (item.get("codename") or "") == service_codename
    ]

    if len(exact_matches) == 1:
        return exact_matches[0]["id"]

    if len(exact_matches) > 1:
        ids = [item.get("id", "unknown") for item in exact_matches]
        raise ValueError(
            f"More than one exact service found for codename '{service_codename}'. "
            f"Matching IDs: {ids}"
        )

    return None


def _resolve_service_id_or_raise(
    oem_certificate_path: Path,
    service_codename: str,
    sp_certificate_path: Path | None = None,
) -> str:
    """Resolves exact service ID by codename, or raises with actionable details."""
    service_id = _resolve_service_id_with_certificate(oem_certificate_path, service_codename)
    if service_id:
        return service_id

    if sp_certificate_path and sp_certificate_path.exists():
        print(
            f"Service '{service_codename}' not visible with OEM cert. "
            f"Trying SP cert: {sp_certificate_path}"
        )
        service_id = _resolve_service_id_with_certificate(sp_certificate_path, service_codename)
        if service_id:
            return service_id

    services = _get_all_services(oem_certificate_path)
    close_matches = [
        item.get("codename", "") for item in services
        if service_codename.lower() in (item.get("codename") or "").lower()
        or (item.get("codename") or "").lower() in service_codename.lower()
    ]
    if sp_certificate_path and sp_certificate_path.exists():
        sp_services = _get_all_services(sp_certificate_path)
        sp_close_matches = [
            item.get("codename", "") for item in sp_services
            if service_codename.lower() in (item.get("codename") or "").lower()
            or (item.get("codename") or "").lower() in service_codename.lower()
        ]
        close_matches.extend([m for m in sp_close_matches if m not in close_matches])

    close_preview = ", ".join(close_matches[:10]) if close_matches else "none"
    raise ValueError(
        f"Required service codename '{service_codename}' not found in visible services. "
        f"Close matches: {close_preview}."
    )


def _assign_unit_to_unit_set_idempotent(certificate_path: Path, unit_set_title: str, system_uid: str) -> None:
    container = AosCryptoContainer(certificate_path)
    with container.create_requests_session() as session:
        unit_set_id = find_unit_set_id_by_title(session, container.certificate_domain, unit_set_title)
        unit_id = find_unit_id_by_system_uid(session, container.certificate_domain, system_uid)

        print(f'Trying to assign unit "{unit_id}" to unit set "{unit_set_id}"...')
        json_data = {"system_uids": [system_uid]}
        response = session.post(
            f"https://{container.certificate_domain}:10000/api/v11/unit-sets/{unit_set_id}/units/",
            json=json_data,
        )
        print(
            f"Assign unit to unit set URL:\n"
            f"   POST {response.url}\n"
            f"   payload: {json.dumps(json_data)}"
        )

        if response.status_code in (200, 201):
            print(f'Unit "{unit_id}" successfully assigned to unit set "{unit_set_id}".')
            return

        if response.status_code == 409:
            print(f'Unit "{unit_id}" is already in unit set "{unit_set_id}".')
            return

        # Some deployments return 400 when unit is already linked.
        response_text = response.text.lower()
        if response.status_code == 400 and ("already" in response_text or "exists" in response_text):
            print(f'Unit "{unit_id}" is already in unit set "{unit_set_id}".')
            return

        response.raise_for_status()


def _assign_service_to_subject_exact(
    certificate_path: Path,
    subject_label: str,
    service_codename: str,
    sp_certificate_path: Path | None = None,
) -> None:
    container = AosCryptoContainer(certificate_path)
    with container.create_requests_session() as session:
        subject_id = find_subject_id_by_label(session, container.certificate_domain, subject_label)
        service_id = _resolve_service_id_or_raise(
            certificate_path,
            service_codename,
            sp_certificate_path=sp_certificate_path,
        )
        json_data = {"service_ids": [service_id]}
        response = session.post(
            f"https://{container.certificate_domain}:10000/api/v11/subjects/{subject_id}/services/",
            json=json_data,
        )
        print(
            f"Assign service to subject URL:\n"
            f"   POST {response.url}\n"
            f"   payload: {json.dumps(json_data)}"
        )

        if response.status_code in (200, 201, 204):
            print(f"Successfully assigned service '{service_codename}' ({service_id}) to subject '{subject_id}'.")
            return

        if response.status_code == 409:
            print(f"Service '{service_codename}' ({service_id}) already assigned to subject '{subject_id}'.")
            return

        response_text = response.text
        response_text_lower = response_text.lower()
        if (
            "already contains" in response_text_lower
            or "already assigned" in response_text_lower
            or "already exists" in response_text_lower
        ):
            print(f"Service '{service_codename}' ({service_id}) already assigned to subject '{subject_id}'.")
            return

        if response.status_code == 400 and "without versions in \"ready\" state cannot be assigned" in response_text_lower:
            raise ValueError(
                f"Service '{service_codename}' ({service_id}) is not assignable: {response_text}"
            )

        if response.status_code >= 400:
            raise ValueError(
                f"Failed to assign service '{service_codename}' ({service_id}): "
                f"HTTP {response.status_code} response={response_text}"
            )

        response.raise_for_status()


def _resolve_required_services_or_raise(
    oem_certificate_path: Path,
    required_codenames: list[str],
    sp_certificate_path: Path | None = None,
) -> dict[str, str]:
    resolved: dict[str, str] = {}
    missing: list[str] = []

    for codename in required_codenames:
        try:
            service_id = _resolve_service_id_or_raise(
                oem_certificate_path,
                codename,
                sp_certificate_path=sp_certificate_path,
            )
            resolved[codename] = service_id
        except Exception:
            missing.append(codename)

    if missing:
        raise ValueError(
            "Required service codenames are not visible in API scope: "
            + ", ".join(missing)
            + ". Ensure services exist and are visible to OEM/SP certificates."
        )

    return resolved


def _open_playground_dashboard() -> None:
    print("\n7. Open Playground dashboard")
    print(f"URL: {PLAYGROUND_DASHBOARD_URL}")


def run_automation(
    certificate_path: Path,
    system_uid: str,
    unit_set_title: str,
    subject_label: str,
    sp_certificate_path: Path | None = None,
) -> None:
    template_file = Path(__file__).resolve().parent / "unitconfig.json"
    if not template_file.exists():
        raise FileNotFoundError(
            f"Required template file not found: {template_file}. "
            "Place unitconfig.json in the repository root."
        )

    unit_id = _validate_system_uid_exists(certificate_path, system_uid)

    print("\nAosEdge Setup")
    print("=============")
    print(f"system_uid:     {system_uid}")
    print(f"unit_id:        {unit_id}")
    print(f"unit_set_title: {unit_set_title}")
    print(f"subject_label:  {subject_label}")
    print(f"services:       {', '.join(SERVICE_CODENAMES)}")
    if sp_certificate_path:
        print(f"sp_certificate: {sp_certificate_path}")

    print("\n1. Target system unitconfig update")
    update_target_unit_config_from_file(
        certificate_path,
        system_uid,
        template_file=template_file,
        no_backup=False,
    )
    _verify_unitconfig_matches_template(certificate_path, system_uid, template_file)

    print("\n2. Unit set setup")
    create_unit_set(certificate_path, title=unit_set_title)

    print("\n3. Assign unit to unit set")
    _assign_unit_to_unit_set_idempotent(certificate_path, unit_set_title=unit_set_title, system_uid=system_uid)

    print("\n4. Subject setup")
    _setup_subject(certificate_path, subject_label)

    print("\n5. Assign unit to subject")
    assign_unit_to_subject(certificate_path, subject_label=subject_label, unit_system_uid=system_uid)

    print("\n6. Assign service(s) to subject")
    resolved_services = _resolve_required_services_or_raise(
        certificate_path,
        SERVICE_CODENAMES,
        sp_certificate_path=sp_certificate_path,
    )
    assignment_failures: list[str] = []
    for codename in SERVICE_CODENAMES:
        _ = resolved_services[codename]
        try:
            _assign_service_to_subject_exact(
                certificate_path,
                subject_label=subject_label,
                service_codename=codename,
                sp_certificate_path=sp_certificate_path,
            )
        except Exception as exc:
            assignment_failures.append(f"{codename}: {exc}")

    if assignment_failures:
        raise RuntimeError(
            "Not all required services could be assigned to the subject.\n"
            + "\n".join(f"- {failure}" for failure in assignment_failures)
        )

    print("\nAutomation completed successfully.")
    _open_playground_dashboard()


def main() -> None:
    parser = argparse.ArgumentParser(description="AosEdge setup automation")
    parser.add_argument(
        "--crt",
        default="~/.aos/security/aos-user-oem.p12",
        help="Path to OEM certificate (.p12). Default: ~/.aos/security/aos-user-oem.p12",
    )
    parser.add_argument(
        "--system-uid",
        default="",
        help="Target system UID. If omitted, script prompts once.",
    )
    parser.add_argument(
        "--unit-set-title",
        default="ev-range-extender-unitset",
        help="Unit set title. Default: ev-range-extender-unitset",
    )
    parser.add_argument(
        "--subject-label",
        default="ev-range-extender-subject",
        help="Subject label. Default: ev-range-extender-subject",
    )
    parser.add_argument(
        "--sp-crt",
        default="~/.aos/security/aos-user-sp.p12",
        help="Optional SP certificate path for service discovery fallback.",
    )
    args = parser.parse_args()

    certificate_path = Path(args.crt).expanduser().resolve()
    if not certificate_path.exists():
        raise FileNotFoundError(f"Certificate file not found: {certificate_path}")

    system_uid = _prompt_system_uid_if_missing(certificate_path, args.system_uid)
    unit_set_title = args.unit_set_title
    subject_label = args.subject_label
    sp_certificate_path = Path(args.sp_crt).expanduser().resolve()
    if not sp_certificate_path.exists():
        sp_certificate_path = None

    run_automation(
        certificate_path,
        system_uid,
        unit_set_title,
        subject_label,
        sp_certificate_path=sp_certificate_path,
    )


if __name__ == "__main__":
    main()
