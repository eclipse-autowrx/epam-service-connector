#!/usr/bin/env python3

"""Trunk model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    Model,
)

from vehicle.Body.Trunk.Front import Front
from vehicle.Body.Trunk.Rear import Rear


class Trunk(Model):
    """Trunk model.

    Attributes
    ----------
    Front: branch
        Trunk status.

        A trunk is a luggage compartment in a vehicle. Depending on vehicle, it can be either in the front or back of the vehicle. Some vehicles may have trunks both at the front and at the rear of the vehicle.

        Unit: None
    Rear: branch
        Trunk status.

        A trunk is a luggage compartment in a vehicle. Depending on vehicle, it can be either in the front or back of the vehicle. Some vehicles may have trunks both at the front and at the rear of the vehicle.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Trunk model."""
        super().__init__(parent)
        self.name = name

        self.Front = Front("Front", self)
        self.Rear = Rear("Rear", self)
