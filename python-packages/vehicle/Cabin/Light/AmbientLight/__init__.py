#!/usr/bin/env python3

"""AmbientLight model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    Model,
)

from vehicle.Cabin.Light.AmbientLight.Row1 import Row1
from vehicle.Cabin.Light.AmbientLight.Row2 import Row2


class AmbientLight(Model):
    """AmbientLight model.

    Attributes
    ----------
    Row1: branch
        Decorative coloured light inside the cabin, usually mounted on the door, ceiling, etc.

        Unit: None
    Row2: branch
        Decorative coloured light inside the cabin, usually mounted on the door, ceiling, etc.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new AmbientLight model."""
        super().__init__(parent)
        self.name = name

        self.Row1 = Row1("Row1", self)
        self.Row2 = Row2("Row2", self)
