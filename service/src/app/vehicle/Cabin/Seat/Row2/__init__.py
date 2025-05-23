#!/usr/bin/env python3

"""Row2 model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    Model,
)

from vehicle.Cabin.Seat.Row2.DriverSide import DriverSide
from vehicle.Cabin.Seat.Row2.Middle import Middle
from vehicle.Cabin.Seat.Row2.PassengerSide import PassengerSide
from vehicle.Cabin.Seat.Row2.Pos1 import Pos1
from vehicle.Cabin.Seat.Row2.Pos2 import Pos2
from vehicle.Cabin.Seat.Row2.Pos3 import Pos3


class Row2(Model):
    """Row2 model.

    Attributes
    ----------
    DriverSide: branch
        All seats.

        Unit: None
    Middle: branch
        All seats.

        Unit: None
    PassengerSide: branch
        All seats.

        Unit: None
    Pos1: branch
        All seats.

        Unit: None
    Pos2: branch
        All seats.

        Unit: None
    Pos3: branch
        All seats.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Row2 model."""
        super().__init__(parent)
        self.name = name

        self.DriverSide = DriverSide("DriverSide", self)
        self.Middle = Middle("Middle", self)
        self.PassengerSide = PassengerSide("PassengerSide", self)
        self.Pos1 = Pos1("Pos1", self)
        self.Pos2 = Pos2("Pos2", self)
        self.Pos3 = Pos3("Pos3", self)
