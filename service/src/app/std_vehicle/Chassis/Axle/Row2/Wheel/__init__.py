#!/usr/bin/env python3

"""Wheel model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    Model,
)

from vehicle.Chassis.Axle.Row2.Wheel.Left import Left
from vehicle.Chassis.Axle.Row2.Wheel.Right import Right


class Wheel(Model):
    """Wheel model.

    Attributes
    ----------
    Left: branch
        Wheel signals for axle

        Unit: None
    Right: branch
        Wheel signals for axle

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Wheel model."""
        super().__init__(parent)
        self.name = name

        self.Left = Left("Left", self)
        self.Right = Right("Right", self)
