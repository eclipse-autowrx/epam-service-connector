#!/usr/bin/env python3

"""Right model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    Model,
)

from vehicle.Chassis.Axle.Row1.Wheel.Right.Brake import Brake
from vehicle.Chassis.Axle.Row1.Wheel.Right.Tire import Tire


class Right(Model):
    """Right model.

    Attributes
    ----------
    Brake: branch
        Brake signals for wheel

        Unit: None
    Speed: sensor
        Rotational speed of a vehicle's wheel.

        Unit: km/h
    Tire: branch
        Tire signals for wheel.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Right model."""
        super().__init__(parent)
        self.name = name

        self.Brake = Brake("Brake", self)
        self.Speed = DataPointFloat("Speed", self)
        self.Tire = Tire("Tire", self)
