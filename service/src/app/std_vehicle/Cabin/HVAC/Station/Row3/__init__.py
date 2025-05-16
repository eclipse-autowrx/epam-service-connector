#!/usr/bin/env python3

"""Row3 model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    Model,
)

from vehicle.Cabin.HVAC.Station.Row3.Driver import Driver
from vehicle.Cabin.HVAC.Station.Row3.Passenger import Passenger


class Row3(Model):
    """Row3 model.

    Attributes
    ----------
    Driver: branch
        HVAC for single station in the vehicle

        Unit: None
    Passenger: branch
        HVAC for single station in the vehicle

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Row3 model."""
        super().__init__(parent)
        self.name = name

        self.Driver = Driver("Driver", self)
        self.Passenger = Passenger("Passenger", self)
