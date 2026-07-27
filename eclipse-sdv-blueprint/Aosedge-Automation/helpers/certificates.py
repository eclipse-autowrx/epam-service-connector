#
#  Copyright (c) 2018-2026 EPAM Systems Inc.
#
from os import PathLike

from cryptography.x509 import NameOID
from cryptography.hazmat.primitives.serialization import pkcs12


def load_certificate_and_key(certificate_path: PathLike | str) -> pkcs12.PKCS12KeyAndCertificates:
    with open(certificate_path, 'rb') as file_handle:
        file_content = file_handle.read()

    p12_object: pkcs12.PKCS12KeyAndCertificates = pkcs12.load_pkcs12(file_content, None)

    return p12_object


def extract_domain_from_certificate(certificate_path: PathLike | str) -> str:
    p12_object: pkcs12.PKCS12KeyAndCertificates = load_certificate_and_key(certificate_path)

    user_certificate = p12_object.cert.certificate
    org_list = user_certificate.subject.get_attributes_for_oid(NameOID.ORGANIZATION_NAME)
    if org_list:
        cert_domain = org_list[0].value
    else:
        cert_domain = 'aoscloud.io'
    return cert_domain if isinstance(cert_domain, str) else cert_domain.decode()
