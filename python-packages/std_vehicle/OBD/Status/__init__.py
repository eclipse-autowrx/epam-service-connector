#!/usr/bin/env python3

"""Status model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointString,
    DataPointUint8,
    Model,
)


class Status(Model):
    """Status model.

    Attributes
    ----------
    DTCCount: sensor
        Number of Diagnostic Trouble Codes (DTC)

        Unit: None
    IgnitionType: attribute (string)
        Type of the ignition for ICE - spark = spark plug ignition, compression = self-igniting (Diesel engines)

        Unit: None
        Allowed values: SPARK, COMPRESSION
    IsMILOn: sensor
        Malfunction Indicator Light (MIL) False = Off, True = On

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Status model."""
        super().__init__(parent)
        self.name = name

        self.DTCCount = DataPointUint8("DTCCount", self)
        self.IgnitionType = DataPointString("IgnitionType", self)
        self.IsMILOn = DataPointBoolean("IsMILOn", self)
