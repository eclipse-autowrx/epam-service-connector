#!/usr/bin/env python3

"""Rear model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    Model,
)

from vehicle.Body.Windshield.Rear.WasherFluid import WasherFluid
from vehicle.Body.Windshield.Rear.Wiping import Wiping


class Rear(Model):
    """Rear model.

    Attributes
    ----------
    IsHeatingOn: actuator
        Windshield heater status. False - off, True - on.

        Unit: None
    WasherFluid: branch
        Windshield washer fluid signals

        Unit: None
    Wiping: branch
        Windshield wiper signals.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Rear model."""
        super().__init__(parent)
        self.name = name

        self.IsHeatingOn = DataPointBoolean("IsHeatingOn", self)
        self.WasherFluid = WasherFluid("WasherFluid", self)
        self.Wiping = Wiping("Wiping", self)
