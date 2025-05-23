#!/usr/bin/env python3

"""Sensor8 model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    Model,
)


class Sensor8(Model):
    """Sensor8 model.

    Attributes
    ----------
    ShortTermFuelTrim: sensor
        PID 1x (byte B) - Short term fuel trim

        Unit: percent
    Voltage: sensor
        PID 1x (byte A) - Sensor voltage

        Unit: V
    """

    def __init__(self, name, parent):
        """Create a new Sensor8 model."""
        super().__init__(parent)
        self.name = name

        self.ShortTermFuelTrim = DataPointFloat("ShortTermFuelTrim", self)
        self.Voltage = DataPointFloat("Voltage", self)
