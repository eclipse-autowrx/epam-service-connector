#!/usr/bin/env python3

"""Lumbar model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    DataPointUint8,
    Model,
)


class Lumbar(Model):
    """Lumbar model.

    Attributes
    ----------
    Height: actuator
        Height of lumbar support. Position is relative within available movable range of the lumbar support. 0 = Lowermost position supported.

        Value range: [0, ]
        Unit: mm
    Support: actuator
        Lumbar support (in/out position). 0 = Innermost position. 100 = Outermost position.

        Value range: [0, 100]
        Unit: percent
    """

    def __init__(self, name, parent):
        """Create a new Lumbar model."""
        super().__init__(parent)
        self.name = name

        self.Height = DataPointUint8("Height", self)
        self.Support = DataPointFloat("Support", self)
