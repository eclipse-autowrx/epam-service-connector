#!/usr/bin/env python3

"""Headrest model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    DataPointUint8,
    Model,
)


class Headrest(Model):
    """Headrest model.

    Attributes
    ----------
    Angle: actuator
        Headrest angle, relative to backrest, 0 degrees if parallel to backrest, Positive degrees = tilted forward.

        Unit: degrees
    Height: actuator
        Position of headrest relative to movable range of the head rest. 0 = Bottommost position supported.

        Value range: [0, ]
        Unit: mm
    """

    def __init__(self, name, parent):
        """Create a new Headrest model."""
        super().__init__(parent)
        self.name = name

        self.Angle = DataPointFloat("Angle", self)
        self.Height = DataPointUint8("Height", self)
