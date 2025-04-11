#!/usr/bin/env python3

"""DMS model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    Model,
)


class DMS(Model):
    """DMS model.

    Attributes
    ----------
    IsEnabled: actuator
        Indicates if DMS is enabled. True = Enabled. False = Disabled.

        Unit: None
    IsError: sensor
        Indicates if DMS incurred an error condition. True = Error. False = No Error.

        Unit: None
    IsWarning: sensor
        Indicates if DMS has registered a driver alert condition.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new DMS model."""
        super().__init__(parent)
        self.name = name

        self.IsEnabled = DataPointBoolean("IsEnabled", self)
        self.IsError = DataPointBoolean("IsError", self)
        self.IsWarning = DataPointBoolean("IsWarning", self)
