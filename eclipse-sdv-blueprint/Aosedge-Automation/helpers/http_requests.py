# Copyright (c) 2026 Eclipse Foundation.
#
# This program and the accompanying materials are made available under the
# terms of the MIT License which is available at
# https://opensource.org/licenses/MIT.
#
# SPDX-License-Identifier: MIT

import os
import ssl
import typing
from os import PathLike
from pathlib import Path

import requests
import truststore
from cryptography.x509 import NameOID
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.serialization import pkcs12
from requests.adapters import HTTPAdapter


class MTLSAdapter(HTTPAdapter):

    def __init__(self, *args, **kwargs):
        self._ssl_context = None
        crypto_instance = kwargs.pop('aos_crypto_container', None)
        if crypto_instance:
            self._ssl_context = crypto_instance.create_ssl_context()
        super().__init__(*args, **kwargs)

    def init_poolmanager(self, *args, **kwargs):
        if self._ssl_context:
            kwargs['ssl_context'] = self._ssl_context
        return super().init_poolmanager(*args, **kwargs)

    def proxy_manager_for(self, *args, **kwargs):
        if self._ssl_context:
            kwargs['ssl_context'] = self._ssl_context
        return super().proxy_manager_for(*args, **kwargs)


class AosCryptoContainer:

    def __init__(self, file_path: typing.Union[str, PathLike]):
        self._p12_filename = str(file_path)
        self._pem_filename: str = ''
        self._key_and_certificates: typing.Optional[pkcs12.PKCS12KeyAndCertificates] = None
        self._cert_domain = 'aoscloud.io'
        self.base_filename = file_path

        self.load()

    @property
    def certificate_domain(self):
        return self._cert_domain

    @property
    def base_filename(self):
        return str(Path(self._p12_filename).with_suffix(''))

    @base_filename.setter
    def base_filename(self, filename: typing.Union[str, PathLike]):
        abs_path = Path(filename).expanduser().resolve()
        # Remove ext from filename
        filename_no_ext = Path(abs_path).with_suffix('')
        self._p12_filename = str(abs_path)
        self._pem_filename = str(Path(filename_no_ext).with_suffix('.pem'))
        if self._pem_filename == self._p12_filename:
            self._pem_filename += '.pem'

    def load(self):
        # Load key and certificates
        with open(self._p12_filename, 'rb') as p12_handle:
            _p12_bytes = p12_handle.read()
        self._key_and_certificates = pkcs12.load_pkcs12(_p12_bytes, None)

        if not self._key_and_certificates.key:
            raise ValueError('Key is absent in the certificate file')

        if not (self._key_and_certificates.cert and self._key_and_certificates.additional_certs):
            raise ValueError('Certificate is absent in the certificate file')

        certificate = self._key_and_certificates.cert.certificate
        org_list = certificate.subject.get_attributes_for_oid(NameOID.ORGANIZATION_NAME)
        if org_list:
            self._cert_domain = org_list[0].value
        else:
            self._cert_domain = 'aoscloud.io'

        self._create_pem()
        self._check_pem()

    def create_ssl_context(self):
        ssl_ctx = truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        if os.path.exists(self._pem_filename):
            ssl_ctx.load_cert_chain(self._pem_filename, password=None)
        return ssl_ctx

    def create_requests_session(self) -> requests.Session:
        https_session = requests.Session()
        https_session.mount('https://', MTLSAdapter(aos_crypto_container=self))
        return https_session

    def _create_pem(self, force_recreate: bool = False):
        if os.path.exists(self._pem_filename) and not force_recreate:
            os.chmod(self._pem_filename, 0o600)
            return
        with open(self._pem_filename, 'wb') as pem_handle:
            pem_handle.write(self._dump_to_pem())
        os.chmod(self._pem_filename, 0o600)

    def _dump_to_pem(self) -> bytes:
        pem_list = [
            self._key_and_certificates.key.private_bytes(
                serialization.Encoding.PEM,
                serialization.PrivateFormat.TraditionalOpenSSL,
                serialization.NoEncryption(),
            ),
            self._key_and_certificates.cert.certificate.public_bytes(serialization.Encoding.PEM),
        ]
        for cert in self._key_and_certificates.additional_certs:
            pem_list.append(
                cert.certificate.public_bytes(serialization.Encoding.PEM),
            )
        return b''.join(pem_list)

    def _check_pem(self):
        with open(self._pem_filename, 'rb') as pem_handle:
            pem_bytes = pem_handle.read()

        if pem_bytes != self._dump_to_pem():
            # Need to recreate PEM
            self._create_pem(force_recreate=True)


def create_https_session(certificate_path: PathLike) -> requests.Session:
    return AosCryptoContainer(certificate_path).create_requests_session()
