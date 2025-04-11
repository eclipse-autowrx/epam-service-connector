#!/usr/bin/env python3

"""MountingPosition model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointInt16,
    Model,
)


class MountingPosition(Model):
    """MountingPosition model.

    Attributes
    ----------
    X: attribute (int16)
        Mounting position of GNSS receiver antenna relative to vehicle coordinate system. Axis definitions according to ISO 8855. Origin at center of (first) rear axle. Positive values = forward of rear axle. Negative values = backward of rear axle.

        Unit: mm
    Y: attribute (int16)
        Mounting position of GNSS receiver antenna relative to vehicle coordinate system. Axis definitions according to ISO 8855. Origin at center of (first) rear axle. Positive values = left of origin. Negative values = right of origin. Left/Right is as seen from driver perspective, i.e. by a person looking forward.

        Unit: mm
    Z: attribute (int16)
        Mounting position of GNSS receiver on Z-axis. Axis definitions according to ISO 8855. Origin at center of (first) rear axle. Positive values = above center of rear axle. Negative values = below center of rear axle.

        Unit: mm
    """

    def __init__(self, name, parent):
        """Create a new MountingPosition model."""
        super().__init__(parent)
        self.name = name

        self.X = DataPointInt16("X", self)
        self.Y = DataPointInt16("Y", self)
        self.Z = DataPointInt16("Z", self)
