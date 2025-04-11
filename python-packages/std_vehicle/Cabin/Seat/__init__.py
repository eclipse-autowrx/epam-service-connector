#!/usr/bin/env python3

"""Seat model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    Model,
)

from vehicle.Cabin.Seat.Row1 import Row1
from vehicle.Cabin.Seat.Row2 import Row2


class Seat(Model):
    """Seat model.

    Attributes
    ----------
    Row1: branch
        All seats.

        Unit: None
    Row2: branch
        All seats.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Seat model."""
        super().__init__(parent)
        self.name = name

        self.Row1 = Row1("Row1", self)
        self.Row2 = Row2("Row2", self)
