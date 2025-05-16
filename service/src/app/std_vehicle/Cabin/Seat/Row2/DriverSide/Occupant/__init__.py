#!/usr/bin/env python3

"""Occupant model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    Model,
)

from vehicle.Cabin.Seat.Row2.DriverSide.Occupant.Identifier import Identifier


class Occupant(Model):
    """Occupant model.

    Attributes
    ----------
    Identifier: branch
        Identifier attributes based on OAuth 2.0.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Occupant model."""
        super().__init__(parent)
        self.name = name

        self.Identifier = Identifier("Identifier", self)
