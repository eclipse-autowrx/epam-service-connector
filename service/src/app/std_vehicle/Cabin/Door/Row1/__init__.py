#!/usr/bin/env python3

"""Row1 model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    Model,
)

from vehicle.Cabin.Door.Row1.DriverSide import DriverSide
from vehicle.Cabin.Door.Row1.PassengerSide import PassengerSide


class Row1(Model):
    """Row1 model.

    Attributes
    ----------
    DriverSide: branch
        All doors, including windows and switches.

        Unit: None
    PassengerSide: branch
        All doors, including windows and switches.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Row1 model."""
        super().__init__(parent)
        self.name = name

        self.DriverSide = DriverSide("DriverSide", self)
        self.PassengerSide = PassengerSide("PassengerSide", self)
