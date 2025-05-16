#!/usr/bin/env python3

"""LowVoltageBattery model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    DataPointUint16,
    Model,
)


class LowVoltageBattery(Model):
    """LowVoltageBattery model.

    Attributes
    ----------
    CurrentCurrent: sensor
        Current current flowing in/out of the low voltage battery. Positive = Current flowing in to battery, e.g. during charging or driving. Negative = Current flowing out of battery, e.g. when using the battery to start a combustion engine.

        Unit: A
    CurrentVoltage: sensor
        Current Voltage of the low voltage battery.

        Unit: V
    NominalCapacity: attribute (uint16)
        Nominal capacity of the low voltage battery.

        Unit: Ah
    NominalVoltage: attribute (uint16)
        Nominal Voltage of the battery.

        Nominal voltage typically refers to voltage of fully charged battery when delivering rated capacity.

        Unit: V
    """

    def __init__(self, name, parent):
        """Create a new LowVoltageBattery model."""
        super().__init__(parent)
        self.name = name

        self.CurrentCurrent = DataPointFloat("CurrentCurrent", self)
        self.CurrentVoltage = DataPointFloat("CurrentVoltage", self)
        self.NominalCapacity = DataPointUint16("NominalCapacity", self)
        self.NominalVoltage = DataPointUint16("NominalVoltage", self)
