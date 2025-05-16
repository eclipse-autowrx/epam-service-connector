#!/usr/bin/env python3

"""CruiseControl model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointFloat,
    Model,
)


class CruiseControl(Model):
    """CruiseControl model.

    Attributes
    ----------
    IsActive: actuator
        Indicates if cruise control system is active (i.e. actively controls speed). True = Active. False = Inactive.

        Unit: None
    IsEnabled: actuator
        Indicates if cruise control system is enabled (e.g. ready to receive configurations and settings) True = Enabled. False = Disabled.

        Unit: None
    IsError: sensor
        Indicates if cruise control system incurred an error condition. True = Error. False = No Error.

        Unit: None
    SpeedSet: actuator
        Set cruise control speed in kilometers per hour.

        Unit: km/h
    """

    def __init__(self, name, parent):
        """Create a new CruiseControl model."""
        super().__init__(parent)
        self.name = name

        self.IsActive = DataPointBoolean("IsActive", self)
        self.IsEnabled = DataPointBoolean("IsEnabled", self)
        self.IsError = DataPointBoolean("IsError", self)
        self.SpeedSet = DataPointFloat("SpeedSet", self)
