#!/usr/bin/env python3

"""Diagnostics model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointStringArray,
    DataPointUint8,
    Model,
)


class Diagnostics(Model):
    """Diagnostics model.

    Attributes
    ----------
    DTCCount: sensor
        Number of Diagnostic Trouble Codes (DTC)

        Unit: None
    DTCList: sensor
        List of currently active DTCs formatted according OBD II (SAE-J2012DA_201812) standard ([P|C|B|U]XXXXX )

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Diagnostics model."""
        super().__init__(parent)
        self.name = name

        self.DTCCount = DataPointUint8("DTCCount", self)
        self.DTCList = DataPointStringArray("DTCList", self)
