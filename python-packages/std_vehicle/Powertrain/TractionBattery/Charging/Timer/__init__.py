#!/usr/bin/env python3

"""Timer model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointString,
    Model,
)


class Timer(Model):
    """Timer model.

    Attributes
    ----------
    Mode: actuator
        Defines timer mode for charging: INACTIVE - no timer set, charging may start as soon as battery is connected to a charger. START_TIME - charging shall start at Charging.Timer.Time. END_TIME - charging shall be finished (reach Charging.ChargeLimit) at Charging.Timer.Time. When charging is completed the vehicle shall change mode to 'inactive' or set a new Charging.Timer.Time. Charging shall start immediately if mode is 'starttime' or 'endtime' and Charging.Timer.Time is a time in the past.

        Unit: None
        Allowed values: INACTIVE, START_TIME, END_TIME
    Time: actuator
        Time for next charging-related action, formatted according to ISO 8601 with UTC time zone. Value has no significance if Charging.Timer.Mode is 'inactive'.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Timer model."""
        super().__init__(parent)
        self.name = name

        self.Mode = DataPointString("Mode", self)
        self.Time = DataPointString("Time", self)
