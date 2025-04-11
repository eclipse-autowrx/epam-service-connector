#!/usr/bin/env python3

"""Seating model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    Model,
)


class Seating(Model):
    """Seating model.

    Attributes
    ----------
    IsBackwardEngaged: actuator
        Is switch to decrease seating length engaged (SingleSeat.Seating.Length).

        Unit: None
    IsForwardEngaged: actuator
        Is switch to increase seating length engaged (SingleSeat.Seating.Length).

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Seating model."""
        super().__init__(parent)
        self.name = name

        self.IsBackwardEngaged = DataPointBoolean("IsBackwardEngaged", self)
        self.IsForwardEngaged = DataPointBoolean("IsForwardEngaged", self)
