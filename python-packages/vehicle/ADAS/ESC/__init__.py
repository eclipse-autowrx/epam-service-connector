#!/usr/bin/env python3

"""ESC model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    Model,
)

from vehicle.ADAS.ESC.RoadFriction import RoadFriction


class ESC(Model):
    """ESC model.

    Attributes
    ----------
    IsEnabled: actuator
        Indicates if ESC is enabled. True = Enabled. False = Disabled.

        Unit: None
    IsEngaged: sensor
        Indicates if ESC is currently regulating vehicle stability. True = Engaged. False = Not Engaged.

        Unit: None
    IsError: sensor
        Indicates if ESC incurred an error condition. True = Error. False = No Error.

        Unit: None
    IsStrongCrossWindDetected: sensor
        Indicates if the ESC system is detecting strong cross winds. True = Strong cross winds detected. False = No strong cross winds detected.

        Unit: None
    RoadFriction: branch
        Road friction values reported by the ESC system.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new ESC model."""
        super().__init__(parent)
        self.name = name

        self.IsEnabled = DataPointBoolean("IsEnabled", self)
        self.IsEngaged = DataPointBoolean("IsEngaged", self)
        self.IsError = DataPointBoolean("IsError", self)
        self.IsStrongCrossWindDetected = DataPointBoolean("IsStrongCrossWindDetected", self)
        self.RoadFriction = RoadFriction("RoadFriction", self)
