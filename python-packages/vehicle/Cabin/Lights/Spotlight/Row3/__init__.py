#!/usr/bin/env python3

"""Row3 model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    Model,
)


class Row3(Model):
    """Row3 model.

    Attributes
    ----------
    IsLeftOn: actuator
        Is light on the left side switched on

        Unit: None
    IsRightOn: actuator
        Is light on the right side switched on

        Unit: None
    IsSharedOn: sensor
        Is a shared light across a specific row on

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Row3 model."""
        super().__init__(parent)
        self.name = name

        self.IsLeftOn = DataPointBoolean("IsLeftOn", self)
        self.IsRightOn = DataPointBoolean("IsRightOn", self)
        self.IsSharedOn = DataPointBoolean("IsSharedOn", self)
