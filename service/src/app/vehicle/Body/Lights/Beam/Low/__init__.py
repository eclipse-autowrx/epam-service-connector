#!/usr/bin/env python3

"""Low model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    Model,
)


class Low(Model):
    """Low model.

    Attributes
    ----------
    IsDefect: sensor
        Indicates if light is defect. True = Light is defect. False = Light has no defect.

        Unit: None
    IsOn: actuator
        Indicates if light is on or off. True = On. False = Off.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Low model."""
        super().__init__(parent)
        self.name = name

        self.IsDefect = DataPointBoolean("IsDefect", self)
        self.IsOn = DataPointBoolean("IsOn", self)
