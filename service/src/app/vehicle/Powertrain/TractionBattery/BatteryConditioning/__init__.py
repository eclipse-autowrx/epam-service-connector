#!/usr/bin/env python3

"""BatteryConditioning model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointFloat,
    DataPointString,
    Model,
)


class BatteryConditioning(Model):
    """BatteryConditioning model.

    Attributes
    ----------
    IsActive: sensor
        Indicates if battery conditioning is active (i.e. actively monitors battery temperature). True = Active. False = Inactive.

        This signal is typically true when mode is not INACTIVE and time is within defined start/end times.

        Unit: None
    IsOngoing: sensor
        Indicating if battery conditioning is currently ongoing. Battery conditioning is considered ongoing when the battery conditioning system is actively heating or cooling the battery, or requesting heating or cooling.

        When battery conditioning is active, but temperature is already within acceptable range so that no cooling or heating is needed then IsOngoing shall report False.

        Unit: None
    RequestedMode: actuator
        Defines requested mode for battery conditioning. INACTIVE - Battery conditioning inactive. FAST_CHARGING_PREPARATION - Battery conditioning for fast charging. DRIVING_PREPARATION - Battery conditioning for driving.

        The Mode and TargetTime can be used to calculate TargetTemperature and StartTime

        Unit: None
        Allowed values: INACTIVE, FAST_CHARGING_PREPARATION, DRIVING_PREPARATION
    StartTime: actuator
        Start time for battery conditioning, formatted according to ISO 8601 with UTC time zone.

        If the vehicle is asleep, this is the time the vehicle and the battery conditioning system must wake up and start monitoring the battery and if necessary start heating/cooling of the battery.

        Unit: iso8601
    TargetTemperature: actuator
        Target temperature for battery conditioning.

        Target temperature possibly differs between different modes as well as other factors. Allowed deviation from target temperature is implementation dependent.

        Unit: celsius
    TargetTime: actuator
        Target time when conditioning shall be finished, formatted according to ISO 8601 with UTC time zone.

        For FAST_CHARGING mode this is typically the time when charging is supposed to start. For DRIVING mode this is typically the expected departure time. Battery conditioning will be deactivated when this time has passed.

        Unit: iso8601
    """

    def __init__(self, name, parent):
        """Create a new BatteryConditioning model."""
        super().__init__(parent)
        self.name = name

        self.IsActive = DataPointBoolean("IsActive", self)
        self.IsOngoing = DataPointBoolean("IsOngoing", self)
        self.RequestedMode = DataPointString("RequestedMode", self)
        self.StartTime = DataPointString("StartTime", self)
        self.TargetTemperature = DataPointFloat("TargetTemperature", self)
        self.TargetTime = DataPointString("TargetTime", self)
