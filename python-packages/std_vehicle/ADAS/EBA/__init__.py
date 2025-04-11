#!/usr/bin/env python3

"""EBA model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    Model,
)


class EBA(Model):
    """EBA model.

    Attributes
    ----------
    IsEnabled: actuator
        Indicates if EBA is enabled. True = Enabled. False = Disabled.

        Unit: None
    IsEngaged: sensor
        Indicates if EBA is currently regulating brake pressure. True = Engaged. False = Not Engaged.

        Unit: None
    IsError: sensor
        Indicates if EBA incurred an error condition. True = Error. False = No Error.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new EBA model."""
        super().__init__(parent)
        self.name = name

        self.IsEnabled = DataPointBoolean("IsEnabled", self)
        self.IsEngaged = DataPointBoolean("IsEngaged", self)
        self.IsError = DataPointBoolean("IsError", self)
