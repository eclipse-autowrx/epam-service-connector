#!/usr/bin/env python3

"""ParkingBrake model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    Model,
)


class ParkingBrake(Model):
    """ParkingBrake model.

    Attributes
    ----------
    IsAutoApplyEnabled: actuator
        Indicates if parking brake will be automatically engaged when the vehicle engine is turned off.

        Unit: None
    IsEngaged: actuator
        Parking brake status. True = Parking Brake is Engaged. False = Parking Brake is not Engaged.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new ParkingBrake model."""
        super().__init__(parent)
        self.name = name

        self.IsAutoApplyEnabled = DataPointBoolean("IsAutoApplyEnabled", self)
        self.IsEngaged = DataPointBoolean("IsEngaged", self)
