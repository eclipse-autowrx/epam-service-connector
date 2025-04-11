#!/usr/bin/env python3

"""DriveCycleStatus model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointString,
    DataPointUint8,
    Model,
)


class DriveCycleStatus(Model):
    """DriveCycleStatus model.

    Attributes
    ----------
    DTCCount: sensor
        Number of sensor Trouble Codes (DTC)

        Unit: None
    IgnitionType: sensor
        Type of the ignition for ICE - spark = spark plug ignition, compression = self-igniting (Diesel engines)

        Unit: None
        Allowed values: SPARK, COMPRESSION
    IsMILOn: sensor
        Malfunction Indicator Light (MIL) - False = Off, True = On

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new DriveCycleStatus model."""
        super().__init__(parent)
        self.name = name

        self.DTCCount = DataPointUint8("DTCCount", self)
        self.IgnitionType = DataPointString("IgnitionType", self)
        self.IsMILOn = DataPointBoolean("IsMILOn", self)
