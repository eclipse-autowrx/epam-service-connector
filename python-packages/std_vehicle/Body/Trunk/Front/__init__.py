#!/usr/bin/env python3

"""Front model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
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
        Is trunk locked or unlocked. True = Locked. False = Unlocked.

        Unit: None
    IsOpen: actuator
        Trunk open or closed. True = Open. False = Closed.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Front model."""
        super().__init__(parent)
        self.name = name

        self.IsLightOn = DataPointBoolean("IsLightOn", self)
        self.IsLocked = DataPointBoolean("IsLocked", self)
        self.IsOpen = DataPointBoolean("IsOpen", self)
