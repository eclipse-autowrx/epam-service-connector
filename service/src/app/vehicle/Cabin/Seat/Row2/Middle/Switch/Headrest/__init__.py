#!/usr/bin/env python3

"""Headrest model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    Model,
)


class Headrest(Model):
    """Headrest model.

    Attributes
    ----------
    IsBackwardEngaged: actuator
        Head rest backward switch engaged (SingleSeat.Headrest.Angle).

        Unit: None
    IsDownEngaged: actuator
        Head rest down switch engaged (SingleSeat.Headrest.Height).

        Unit: None
    IsForwardEngaged: actuator
        Head rest forward switch engaged (SingleSeat.Headrest.Angle).

        Unit: None
    IsUpEngaged: actuator
        Head rest up switch engaged (SingleSeat.Headrest.Height).

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Headrest model."""
        super().__init__(parent)
        self.name = name

        self.IsBackwardEngaged = DataPointBoolean("IsBackwardEngaged", self)
        self.IsDownEngaged = DataPointBoolean("IsDownEngaged", self)
        self.IsForwardEngaged = DataPointBoolean("IsForwardEngaged", self)
        self.IsUpEngaged = DataPointBoolean("IsUpEngaged", self)
