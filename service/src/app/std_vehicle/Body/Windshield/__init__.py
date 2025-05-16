#!/usr/bin/env python3

"""Windshield model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    Model,
)

from vehicle.Body.Windshield.Front import Front
from vehicle.Body.Windshield.Rear import Rear


class Windshield(Model):
    """Windshield model.

    Attributes
    ----------
    Front: branch
        Windshield signals.

        Unit: None
    Rear: branch
        Windshield signals.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Windshield model."""
        super().__init__(parent)
        self.name = name

        self.Front = Front("Front", self)
        self.Rear = Rear("Rear", self)
