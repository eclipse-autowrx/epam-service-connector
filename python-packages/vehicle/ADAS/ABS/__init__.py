#!/usr/bin/env python3

"""ABS model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    Model,
)


class ABS(Model):
    """ABS model.

    Attributes
    ----------
    IsEnabled: actuator
        Indicates if ABS is enabled. True = Enabled. False = Disabled.

        Unit: None
    IsEngaged: sensor
        Indicates if ABS is currently regulating brake pressure. True = Engaged. False = Not Engaged.

        Unit: None
    IsError: sensor
        Indicates if ABS incurred an error condition. True = Error. False = No Error.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new ABS model."""
        super().__init__(parent)
        self.name = name

        self.IsEnabled = DataPointBoolean("IsEnabled", self)
        self.IsEngaged = DataPointBoolean("IsEngaged", self)
        self.IsError = DataPointBoolean("IsError", self)
