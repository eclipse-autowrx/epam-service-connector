#!/usr/bin/env python3

"""Accelerator model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointUint8,
    Model,
)


class Accelerator(Model):
    """Accelerator model.

    Attributes
    ----------
    PedalPosition: sensor
        Accelerator pedal position as percent. 0 = Not depressed. 100 = Fully depressed.

        Value range: [0, 100]
        Unit: percent
    """

    def __init__(self, name, parent):
        """Create a new Accelerator model."""
        super().__init__(parent)
        self.name = name

        self.PedalPosition = DataPointUint8("PedalPosition", self)
