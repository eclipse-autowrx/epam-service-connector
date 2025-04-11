#!/usr/bin/env python3

"""DriverSide model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    Model,
)

from vehicle.Cabin.Door.Row1.DriverSide.Shade import Shade
from vehicle.Cabin.Door.Row1.DriverSide.Window import Window


class DriverSide(Model):
    """DriverSide model.

    Attributes
    ----------
    IsChildLockActive: sensor
        Is door child lock active. True = Door cannot be opened from inside. False = Door can be opened from inside.

        Unit: None
    IsLocked: actuator
        Is door locked or unlocked. True = Locked. False = Unlocked.

        Unit: None
    IsOpen: actuator
        Is door open or closed

        Unit: None
    Shade: branch
        Side window shade

        Unit: None
    Window: branch
        Door window status

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new DriverSide model."""
        super().__init__(parent)
        self.name = name

        self.IsChildLockActive = DataPointBoolean("IsChildLockActive", self)
        self.IsLocked = DataPointBoolean("IsLocked", self)
        self.IsOpen = DataPointBoolean("IsOpen", self)
        self.Shade = Shade("Shade", self)
        self.Window = Window("Window", self)
