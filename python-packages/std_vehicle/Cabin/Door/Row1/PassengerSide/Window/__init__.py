#!/usr/bin/env python3

"""Window model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointString,
    DataPointUint8,
    Model,
)


class Window(Model):
    """Window model.

    Attributes
    ----------
    IsOpen: sensor
        Is window open or closed?

        Unit: None
    Position: actuator
        Window position. 0 = Fully closed 100 = Fully opened.

        Value range: [0, 100]
        Unit: percent
    Switch: actuator
        Switch controlling sliding action such as window, sunroof, or blind.

        Unit: None
        Allowed values: INACTIVE, CLOSE, OPEN, ONE_SHOT_CLOSE, ONE_SHOT_OPEN
    """

    def __init__(self, name, parent):
        """Create a new Window model."""
        super().__init__(parent)
        self.name = name

        self.IsOpen = DataPointBoolean("IsOpen", self)
        self.Position = DataPointUint8("Position", self)
        self.Switch = DataPointString("Switch", self)
