#!/usr/bin/env python3

"""TCS model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    Model,
)


class TCS(Model):
    """TCS model.

    Attributes
    ----------
    IsEnabled: actuator
        Indicates if TCS is enabled. True = Enabled. False = Disabled.

        Unit: None
    IsEngaged: sensor
        Indicates if TCS is currently regulating traction. True = Engaged. False = Not Engaged.

        Unit: None
    IsError: sensor
        Indicates if TCS incurred an error condition. True = Error. False = No Error.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new TCS model."""
        super().__init__(parent)
        self.name = name

        self.IsEnabled = DataPointBoolean("IsEnabled", self)
        self.IsEngaged = DataPointBoolean("IsEngaged", self)
        self.IsError = DataPointBoolean("IsError", self)
