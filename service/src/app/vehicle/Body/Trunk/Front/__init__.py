#!/usr/bin/env python3

"""Front model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointString,
    DataPointUint8,
    Model,
)


class Front(Model):
    """Front model.

    Attributes
    ----------
    IsLightOn: actuator
        Is trunk light on

        V4.0 Moved from Vehicle.Cabin.Lights.IsTrunkOn because Trunk is not defined as part of the Cabin.

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
    Switch: actuator
        Switch controlling sliding action such as window, sunroof, or blind.

        Unit: None
        Allowed values: INACTIVE, CLOSE, OPEN, ONE_SHOT_CLOSE, ONE_SHOT_OPEN
    """

    def __init__(self, name, parent):
        """Create a new Front model."""
        super().__init__(parent)
        self.name = name

        self.IsLightOn = DataPointBoolean("IsLightOn", self)
        self.IsLocked = DataPointBoolean("IsLocked", self)
        self.IsOpen = DataPointBoolean("IsOpen", self)
        self.Position = DataPointUint8("Position", self)
        self.Switch = DataPointString("Switch", self)
