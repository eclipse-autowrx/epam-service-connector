#!/usr/bin/env python3

"""Mirrors model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    Model,
)

from vehicle.Body.Mirrors.DriverSide import DriverSide
from vehicle.Body.Mirrors.PassengerSide import PassengerSide


class Mirrors(Model):
    """Mirrors model.

    Attributes
    ----------
    DriverSide: branch
        All mirrors.

        Unit: None
    PassengerSide: branch
        All mirrors.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Mirrors model."""
        super().__init__(parent)
        self.name = name

        self.DriverSide = DriverSide("DriverSide", self)
        self.PassengerSide = PassengerSide("PassengerSide", self)
