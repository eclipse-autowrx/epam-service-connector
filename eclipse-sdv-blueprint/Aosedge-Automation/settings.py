#
#  Copyright (c) 2018-2026 EPAM Systems Inc.
#
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
