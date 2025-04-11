#!/usr/bin/env python3

"""Hazard model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    Model,
)


class Hazard(Model):
    """Hazard model.

    Attributes
    ----------
    IsDefect: sensor
        Indicates if light is defect. True = Light is defect. False = Light has no defect.

        Unit: None
    IsSignaling: actuator
        Indicates if light is signaling or off. True = signaling. False = Off.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Hazard model."""
        super().__init__(parent)
        self.name = name

        self.IsDefect = DataPointBoolean("IsDefect", self)
        self.IsSignaling = DataPointBoolean("IsSignaling", self)
