#!/usr/bin/env python3

"""Occupant model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    Model,
)

from vehicle.Occupant.Row1 import Row1
from vehicle.Occupant.Row2 import Row2


class Occupant(Model):
    """Occupant model.

    Attributes
    ----------
    Row1: branch
        Occupant (Driver or Passenger) data.

        Unit: None
    Row2: branch
        Occupant (Driver or Passenger) data.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Occupant model."""
        super().__init__(parent)
        self.name = name

        self.Row1 = Row1("Row1", self)
        self.Row2 = Row2("Row2", self)
