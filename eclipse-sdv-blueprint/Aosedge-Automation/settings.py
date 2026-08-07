# Copyright (c) 2026 Eclipse Foundation.
#
# This program and the accompanying materials are made available under the
# terms of the MIT License which is available at
# https://opensource.org/licenses/MIT.
#
# SPDX-License-Identifier: MIT

from pathlib import Path


class AosExampleSettings:

    def __init__(
        self,
        certificate_path: str | None = None,
    ):
        self._certificate_path: str = certificate_path or ''

    @property
    def certificate_path(self) -> Path | str:
        if not self._certificate_path:
            return ''
        return Path(self._certificate_path).expanduser().resolve()

    @certificate_path.setter
    def certificate_path(self, value: str | Path):
        self._certificate_path = str(Path(value).expanduser().resolve())
