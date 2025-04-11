#!/usr/bin/env python3

"""RearviewMirror model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointUint8,
    Model,
)


class RearviewMirror(Model):
    """RearviewMirror model.

    Attributes
    ----------
    DimmingLevel: actuator
        Dimming level of rear-view mirror. 0 = Undimmed. 100 = Fully dimmed.

        Value range: [, 100]
        Unit: percent
    """

    def __init__(self, name, parent):
        """Create a new RearviewMirror model."""
        super().__init__(parent)
        self.name = name

        self.DimmingLevel = DataPointUint8("DimmingLevel", self)
