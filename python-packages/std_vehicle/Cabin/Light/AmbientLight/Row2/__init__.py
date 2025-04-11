#!/usr/bin/env python3

"""Row2 model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    Model,
)

from vehicle.Cabin.Light.AmbientLight.Row2.DriverSide import DriverSide
from vehicle.Cabin.Light.AmbientLight.Row2.PassengerSide import PassengerSide


class Row2(Model):
    """Row2 model.

    Attributes
    ----------
    DriverSide: branch
        Decorative coloured light inside the cabin, usually mounted on the door, ceiling, etc.

        Unit: None
    PassengerSide: branch
        Decorative coloured light inside the cabin, usually mounted on the door, ceiling, etc.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Row2 model."""
        super().__init__(parent)
        self.name = name

        self.DriverSide = DriverSide("DriverSide", self)
        self.PassengerSide = PassengerSide("PassengerSide", self)
