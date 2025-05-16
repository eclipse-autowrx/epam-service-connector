#!/usr/bin/env python3

"""Raindetection model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointUint8,
    Model,
)


class Raindetection(Model):
    """Raindetection model.

    Attributes
    ----------
    Intensity: sensor
        Rain intensity. 0 = Dry, No Rain. 100 = Covered.

        Value range: [, 100]
        Unit: percent
    """

    def __init__(self, name, parent):
        """Create a new Raindetection model."""
        super().__init__(parent)
        self.name = name

        self.Intensity = DataPointUint8("Intensity", self)
