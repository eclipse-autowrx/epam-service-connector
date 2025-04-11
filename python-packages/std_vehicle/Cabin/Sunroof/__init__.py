#!/usr/bin/env python3

"""Sunroof model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointInt8,
    DataPointString,
    Model,
)

from vehicle.Cabin.Sunroof.Shade import Shade


class Sunroof(Model):
    """Sunroof model.

    Attributes
    ----------
    Position: sensor
        Sunroof position. 0 = Fully closed 100 = Fully opened. -100 = Fully tilted.

        Value range: [-100, 100]
        Unit: percent
    Shade: branch
        Sun roof shade status.

        Unit: None
    Switch: actuator
        Switch controlling sliding action such as window, sunroof, or shade.

        Unit: None
        Allowed values: INACTIVE, CLOSE, OPEN, ONE_SHOT_CLOSE, ONE_SHOT_OPEN, TILT_UP, TILT_DOWN
    """

    def __init__(self, name, parent):
        """Create a new Sunroof model."""
        super().__init__(parent)
        self.name = name

        self.Position = DataPointInt8("Position", self)
        self.Shade = Shade("Shade", self)
        self.Switch = DataPointString("Switch", self)
