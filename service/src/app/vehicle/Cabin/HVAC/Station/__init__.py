#!/usr/bin/env python3

"""Station model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    Model,
)

from vehicle.Cabin.HVAC.Station.Row1 import Row1
from vehicle.Cabin.HVAC.Station.Row2 import Row2
from vehicle.Cabin.HVAC.Station.Row3 import Row3
from vehicle.Cabin.HVAC.Station.Row4 import Row4


class Station(Model):
    """Station model.

    Attributes
    ----------
    Row1: branch
        HVAC for single station in the vehicle

        Unit: None
    Row2: branch
        HVAC for single station in the vehicle

        Unit: None
    Row3: branch
        HVAC for single station in the vehicle

        Unit: None
    Row4: branch
        HVAC for single station in the vehicle

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Station model."""
        super().__init__(parent)
        self.name = name

        self.Row1 = Row1("Row1", self)
        self.Row2 = Row2("Row2", self)
        self.Row3 = Row3("Row3", self)
        self.Row4 = Row4("Row4", self)
