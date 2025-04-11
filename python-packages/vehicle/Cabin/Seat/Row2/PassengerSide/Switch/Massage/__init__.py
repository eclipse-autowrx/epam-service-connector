#!/usr/bin/env python3

"""Massage model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    Model,
)


class Massage(Model):
    """Massage model.

    Attributes
    ----------
    IsDecreaseEngaged: actuator
        Decrease massage level switch engaged (SingleSeat.Massage).

        Unit: None
    IsIncreaseEngaged: actuator
        Increase massage level switch engaged (SingleSeat.Massage).

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Massage model."""
        super().__init__(parent)
        self.name = name

        self.IsDecreaseEngaged = DataPointBoolean("IsDecreaseEngaged", self)
        self.IsIncreaseEngaged = DataPointBoolean("IsIncreaseEngaged", self)
