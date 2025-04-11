#!/usr/bin/env python3

"""Convertible model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointString,
    Model,
)


class Convertible(Model):
    """Convertible model.

    Attributes
    ----------
    Status: sensor
        Roof status on convertible vehicles.

        Unit: None
        Allowed values: UNDEFINED, CLOSED, OPEN, CLOSING, OPENING, STALLED
    """

    def __init__(self, name, parent):
        """Create a new Convertible model."""
        super().__init__(parent)
        self.name = name

        self.Status = DataPointString("Status", self)
