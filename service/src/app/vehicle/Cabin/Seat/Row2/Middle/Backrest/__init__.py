#!/usr/bin/env python3

"""Backrest model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    Model,
)

from vehicle.Cabin.Seat.Row2.Middle.Backrest.Lumbar import Lumbar
from vehicle.Cabin.Seat.Row2.Middle.Backrest.SideBolster import SideBolster


class Backrest(Model):
    """Backrest model.

    Attributes
    ----------
    Lumbar: branch
        Adjustable lumbar support mechanisms in seats allow the user to change the seat back shape.

        Unit: None
    Recline: actuator
        Backrest recline compared to seat z-axis (seat vertical axis). 0 degrees = Upright/Vertical backrest. Negative degrees for forward recline. Positive degrees for backward recline.

        Seat z-axis depends on seat tilt. This means that movement of backrest due to seat tilting will not affect Backrest.Recline as long as the angle between Seating and Backrest are constant. Absolute recline relative to vehicle z-axis can be calculated as Tilt + Backrest.Recline.

        Unit: degrees
    SideBolster: branch
        Backrest side bolster (lumbar side support) settings.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Backrest model."""
        super().__init__(parent)
        self.name = name

        self.Lumbar = Lumbar("Lumbar", self)
        self.Recline = DataPointFloat("Recline", self)
        self.SideBolster = SideBolster("SideBolster", self)
