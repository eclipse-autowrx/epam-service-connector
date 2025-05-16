#!/usr/bin/env python3

"""Sensor1 model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    Model,
)


class Sensor1(Model):
    """Sensor1 model.

    Attributes
    ----------
    Current: sensor
        PID 3x (byte CD) - Current for wide range/band oxygen sensor

        Unit: A
    Lambda: sensor
        PID 2x (byte AB) and PID 3x (byte AB) - Lambda for wide range/band oxygen sensor

        Unit: None
    Voltage: sensor
        PID 2x (byte CD) - Voltage for wide range/band oxygen sensor

        Unit: V
    """

    def __init__(self, name, parent):
        """Create a new Sensor1 model."""
        super().__init__(parent)
        self.name = name

        self.Current = DataPointFloat("Current", self)
        self.Lambda = DataPointFloat("Lambda", self)
        self.Voltage = DataPointFloat("Voltage", self)
