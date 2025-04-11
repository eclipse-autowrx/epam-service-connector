#!/usr/bin/env python3

"""Row2 model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    Model,
)

from vehicle.Cabin.HVAC.Station.Row2.Driver import Driver
from vehicle.Cabin.HVAC.Station.Row2.Left import Left
from vehicle.Cabin.HVAC.Station.Row2.Passenger import Passenger
from vehicle.Cabin.HVAC.Station.Row2.Right import Right


class Row2(Model):
    """Row2 model.

    Attributes
    ----------
    Driver: branch
        HVAC for single station in the vehicle

        Unit: None
    Passenger: branch
        HVAC for single station in the vehicle

        Unit: None
    Left: branch
        HVAC for single station in the vehicle

        Unit: None
    Right: branch
        HVAC for single station in the vehicle

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Row2 model."""
        super().__init__(parent)
        self.name = name

        self.Driver = Driver("Driver", self)
        self.Passenger = Passenger("Passenger", self)
        self.Left = Left("Left", self)
        self.Right = Right("Right", self)
