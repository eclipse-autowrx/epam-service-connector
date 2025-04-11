#!/usr/bin/env python3

"""Tire model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointFloat,
    DataPointUint16,
    Model,
)


class Tire(Model):
    """Tire model.

    Attributes
    ----------
    IsPressureLow: sensor
        Tire Pressure Status. True = Low tire pressure. False = Good tire pressure.

        Unit: None
    Pressure: sensor
        Tire pressure in kilo-Pascal.

        Unit: kPa
    Temperature: sensor
        Tire temperature in Celsius.

        Unit: celsius
    """

    def __init__(self, name, parent):
        """Create a new Tire model."""
        super().__init__(parent)
        self.name = name

        self.IsPressureLow = DataPointBoolean("IsPressureLow", self)
        self.Pressure = DataPointUint16("Pressure", self)
        self.Temperature = DataPointFloat("Temperature", self)
