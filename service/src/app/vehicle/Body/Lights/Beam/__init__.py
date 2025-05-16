#!/usr/bin/env python3

"""Beam model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    Model,
)

from vehicle.Body.Lights.Beam.High import High
from vehicle.Body.Lights.Beam.Low import Low


class Beam(Model):
    """Beam model.

    Attributes
    ----------
    High: branch
        Beam lights.

        Unit: None
    Low: branch
        Beam lights.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Beam model."""
        super().__init__(parent)
        self.name = name

        self.High = High("High", self)
        self.Low = Low("Low", self)
