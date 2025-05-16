#!/usr/bin/env python3

"""ObstacleDetection model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    Model,
)


class ObstacleDetection(Model):
    """ObstacleDetection model.

    Attributes
    ----------
    IsEnabled: actuator
        Indicates if obstacle sensor system is enabled (i.e. monitoring for obstacles). True = Enabled. False = Disabled.

        Unit: None
    IsError: sensor
        Indicates if obstacle sensor system incurred an error condition. True = Error. False = No Error.

        Unit: None
    IsWarning: sensor
        Indicates if obstacle sensor system registered an obstacle.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new ObstacleDetection model."""
        super().__init__(parent)
        self.name = name

        self.IsEnabled = DataPointBoolean("IsEnabled", self)
        self.IsError = DataPointBoolean("IsError", self)
        self.IsWarning = DataPointBoolean("IsWarning", self)
