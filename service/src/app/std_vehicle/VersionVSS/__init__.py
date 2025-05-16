#!/usr/bin/env python3

"""VersionVSS model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointString,
    DataPointUint32,
    Model,
)


class VersionVSS(Model):
    """VersionVSS model.

    Attributes
    ----------
    Label: attribute (string)
        Label to further describe the version.

        Unit: None
    Major: attribute (uint32)
        Supported Version of VSS - Major version.

        Unit: None
    Minor: attribute (uint32)
        Supported Version of VSS - Minor version.

        Unit: None
    Patch: attribute (uint32)
        Supported Version of VSS - Patch version.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new VersionVSS model."""
        super().__init__(parent)
        self.name = name

        self.Label = DataPointString("Label", self)
        self.Major = DataPointUint32("Major", self)
        self.Minor = DataPointUint32("Minor", self)
        self.Patch = DataPointUint32("Patch", self)
