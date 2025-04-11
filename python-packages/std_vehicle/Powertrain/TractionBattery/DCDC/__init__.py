#!/usr/bin/env python3

"""DCDC model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    Model,
)


class DCDC(Model):
    """DCDC model.

    Attributes
    ----------
    PowerLoss: sensor
        Electrical energy lost by power dissipation to heat inside DC/DC converter.

        Unit: W
    Temperature: sensor
        Current temperature of DC/DC converter converting battery high voltage to vehicle low voltage (typically 12 Volts).

        Unit: celsius
    """

    def __init__(self, name, parent):
        """Create a new DCDC model."""
        super().__init__(parent)
        self.name = name

        self.PowerLoss = DataPointFloat("PowerLoss", self)
        self.Temperature = DataPointFloat("Temperature", self)
