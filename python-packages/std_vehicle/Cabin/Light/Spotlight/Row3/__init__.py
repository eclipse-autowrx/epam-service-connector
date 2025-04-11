#!/usr/bin/env python3

"""Row3 model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    Model,
)

from vehicle.Cabin.Light.Spotlight.Row3.DriverSide import DriverSide
from vehicle.Cabin.Light.Spotlight.Row3.PassengerSide import PassengerSide


class Row3(Model):
    """Row3 model.

    Attributes
    ----------
    DriverSide: branch
        Spotlight for a specific area in the vehicle.

        Unit: None
    PassengerSide: branch
        Spotlight for a specific area in the vehicle.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Row3 model."""
        super().__init__(parent)
        self.name = name

        self.DriverSide = DriverSide("DriverSide", self)
        self.PassengerSide = PassengerSide("PassengerSide", self)
