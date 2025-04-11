#!/usr/bin/env python3

"""HeadPosition model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    DataPointInt16,
    Model,
)


class HeadPosition(Model):
    """HeadPosition model.

    Attributes
    ----------
    Pitch: sensor
        Head pitch angle, measured as angle from vehicle sprung mass XY-plane as defined by ISO 23150:2023 to the head X-axis. 0 = Head in normal position. Positive values = Head leaning up. Negative values = Head leaning down.

        Value range: [-90, 90]
        Unit: degrees
    Roll: sensor
        Head roll angle about the head X-axis (right-hand rule). 0 = Head in normal position. Positive values = Head leaning to the right. Negative values = Head leaning to the left.

        Value range: [-180, 180]
        Unit: degrees
    X: sensor
        Longitudinal position of head center measured as mid eye position on X-axis of the vehicle rear-axle coordinate system as defined by ISO 23150:2023 section 3.7.12 Mid eye position refers to the center of a line drawn between the center of the drivers eyes. Positive values = forward of (first) rear-axle. Negative values = backward of (first) rear-axle.

        Unit: mm
    Y: sensor
        Lateral position of head center measured as mid eye position on X-axis of the vehicle rear-axle coordinate system as defined by ISO 23150:2023 section 3.7.12 Mid eye position refers to the center of a line drawn between the center of the drivers eyes. Positive values = left of rear-axle center. Negative values = right of rear-axle center.

        Unit: mm
    Yaw: sensor
        Head yaw angle, measured from the vehicle sprung mass X-axis as defined by ISO 23150:2023 to the head X-axis, around the vehicle Z-axis (right-hand rule). 0 = Head in normal position. Positive values = Head turned left. Negative values = Head turned right.

        Value range: [-180, 180]
        Unit: degrees
    Z: sensor
        Height position of head center measured as mid eye position on X-axis of the vehicle rear-axle coordinate system as defined by ISO 23150:2023 section 3.7.12 Mid eye position refers to the center of a line drawn between the center of the drivers eyes. Positive values = above center of rear-axle reference point. Negative values = below center of rear-axle reference point.

        Unit: mm
    """

    def __init__(self, name, parent):
        """Create a new HeadPosition model."""
        super().__init__(parent)
        self.name = name

        self.Pitch = DataPointFloat("Pitch", self)
        self.Roll = DataPointFloat("Roll", self)
        self.X = DataPointInt16("X", self)
        self.Y = DataPointInt16("Y", self)
        self.Yaw = DataPointFloat("Yaw", self)
        self.Z = DataPointInt16("Z", self)
