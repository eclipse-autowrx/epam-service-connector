#!/usr/bin/env python3

"""Spotlight model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    Model,
)

from vehicle.Cabin.Light.Spotlight.Row1 import Row1
from vehicle.Cabin.Light.Spotlight.Row2 import Row2
from vehicle.Cabin.Light.Spotlight.Row3 import Row3
from vehicle.Cabin.Light.Spotlight.Row4 import Row4


class Spotlight(Model):
    """Spotlight model.

    Attributes
    ----------
    Row1: branch
        Spotlight for a specific area in the vehicle.

        Unit: None
    Row2: branch
        Spotlight for a specific area in the vehicle.

        Unit: None
    Row3: branch
        Spotlight for a specific area in the vehicle.

        Unit: None
    Row4: branch
        Spotlight for a specific area in the vehicle.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Spotlight model."""
        super().__init__(parent)
        self.name = name

        self.Row1 = Row1("Row1", self)
        self.Row2 = Row2("Row2", self)
        self.Row3 = Row3("Row3", self)
        self.Row4 = Row4("Row4", self)
