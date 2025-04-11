#!/usr/bin/env python3

"""Seating model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointUint16,
    Model,
)


class Seating(Model):
    """Seating model.

    Attributes
    ----------
    Length: actuator
        Length adjustment of seating. 0 = Adjustable part of seating in rearmost position (Shortest length of seating).

        Value range: [0, ]
        Unit: mm
    """

    def __init__(self, name, parent):
        """Create a new Seating model."""
        super().__init__(parent)
        self.name = name

        self.Length = DataPointUint16("Length", self)
