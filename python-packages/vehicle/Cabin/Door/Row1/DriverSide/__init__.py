#!/usr/bin/env python3

"""DriverSide model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointString,
    DataPointUint8,
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
        Is item locked or unlocked. True = Locked. False = Unlocked.

        Unit: None
    IsOpen: actuator
        Is item open or closed? True = Fully or partially open. False = Fully closed.

        Unit: None
    Position: actuator
        Item position. 0 = Start position 100 = End position.

        Relationship between Open/Close and Start/End position is item dependent.

        Value range: [0, 100]
        Unit: percent
    Shade: branch
        Side window shade. Open = Retracted, Closed = Deployed. Start position for Shade is Open/Retracted.

        Unit: None
    Switch: actuator
        Switch controlling sliding action such as window, sunroof, or blind.

        Unit: None
        Allowed values: INACTIVE, CLOSE, OPEN, ONE_SHOT_CLOSE, ONE_SHOT_OPEN
    Window: branch
        Door window status. Start position for Window is Closed.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new DriverSide model."""
        super().__init__(parent)
        self.name = name

        self.IsChildLockActive = DataPointBoolean("IsChildLockActive", self)
        self.IsLocked = DataPointBoolean("IsLocked", self)
        self.IsOpen = DataPointBoolean("IsOpen", self)
        self.Position = DataPointUint8("Position", self)
        self.Shade = Shade("Shade", self)
        self.Switch = DataPointString("Switch", self)
        self.Window = Window("Window", self)
