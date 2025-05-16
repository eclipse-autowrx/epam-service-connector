#!/usr/bin/env python3

"""DirectionIndicator model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    Model,
)

from vehicle.Body.Lights.DirectionIndicator.Left import Left
from vehicle.Body.Lights.DirectionIndicator.Right import Right


class DirectionIndicator(Model):
    """DirectionIndicator model.

    Attributes
    ----------
    Left: branch
        Indicator lights.

        Unit: None
    Right: branch
        Indicator lights.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new DirectionIndicator model."""
        super().__init__(parent)
        self.name = name

        self.Left = Left("Left", self)
        self.Right = Right("Right", self)
