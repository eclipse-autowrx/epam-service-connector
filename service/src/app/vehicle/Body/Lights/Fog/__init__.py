#!/usr/bin/env python3

"""Fog model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    Model,
)

from vehicle.Body.Lights.Fog.Front import Front
from vehicle.Body.Lights.Fog.Rear import Rear


class Fog(Model):
    """Fog model.

    Attributes
    ----------
    Front: branch
        Fog lights.

        Unit: None
    Rear: branch
        Fog lights.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Fog model."""
        super().__init__(parent)
        self.name = name

        self.Front = Front("Front", self)
        self.Rear = Rear("Rear", self)
