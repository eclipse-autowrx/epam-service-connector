#!/usr/bin/env python3

"""Axle model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    Model,
)

from vehicle.Chassis.Axle.Row1 import Row1
from vehicle.Chassis.Axle.Row2 import Row2


class Axle(Model):
    """Axle model.

    Attributes
    ----------
    Row1: branch
        Axle signals

        Unit: None
    Row2: branch
        Axle signals

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Axle model."""
        super().__init__(parent)
        self.name = name

        self.Row1 = Row1("Row1", self)
        self.Row2 = Row2("Row2", self)
