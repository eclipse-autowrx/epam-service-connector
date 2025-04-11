#!/usr/bin/env python3

"""Map model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    Model,
)


class Map(Model):
    """Map model.

    Attributes
    ----------
    IsAutoScaleModeUsed: actuator
        Used to select auto-scaling mode. This feature dynamically adjusts the zoom level of the map to provide an optimal view based on the current speed of the vehicle

        If true, then auto-scaling mode is used. If false, then manual-scaling mode is used.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Map model."""
        super().__init__(parent)
        self.name = name

        self.IsAutoScaleModeUsed = DataPointBoolean("IsAutoScaleModeUsed", self)
