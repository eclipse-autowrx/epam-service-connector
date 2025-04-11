#!/usr/bin/env python3

"""Sensor7 model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    Model,
)


class Sensor7(Model):
    """Sensor7 model.

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
        """Create a new Sensor7 model."""
        super().__init__(parent)
        self.name = name

        self.ShortTermFuelTrim = DataPointFloat("ShortTermFuelTrim", self)
        self.Voltage = DataPointFloat("Voltage", self)
