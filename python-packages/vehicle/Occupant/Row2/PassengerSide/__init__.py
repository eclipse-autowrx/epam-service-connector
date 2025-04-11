#!/usr/bin/env python3

"""PassengerSide model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    Model,
)

from vehicle.Occupant.Row2.PassengerSide.HeadPosition import HeadPosition
from vehicle.Occupant.Row2.PassengerSide.Identifier import Identifier
from vehicle.Occupant.Row2.PassengerSide.MidEyeGaze import MidEyeGaze


class PassengerSide(Model):
    """PassengerSide model.

    Attributes
    ----------
    HeadPosition: branch
        The current position of the driver head on vehicle axis according to ISO 23150:2023.

        Unit: None
    Identifier: branch
        Identifier attributes based on OAuth 2.0.

        Unit: None
    MidEyeGaze: branch
        Direction from mid eye position to object driver is looking at.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new PassengerSide model."""
        super().__init__(parent)
        self.name = name

        self.HeadPosition = HeadPosition("HeadPosition", self)
        self.Identifier = Identifier("Identifier", self)
        self.MidEyeGaze = MidEyeGaze("MidEyeGaze", self)
