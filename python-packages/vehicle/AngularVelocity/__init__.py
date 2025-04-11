#!/usr/bin/env python3

"""AngularVelocity model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    Model,
)


class AngularVelocity(Model):
    """AngularVelocity model.

    Attributes
    ----------
    Pitch: sensor
        Vehicle rotation rate along Y (lateral).

        Unit: degrees/s
    Roll: sensor
        Vehicle rotation rate along X (longitudinal).

        Unit: degrees/s
    Yaw: sensor
        Vehicle rotation rate along Z (vertical).

        Unit: degrees/s
    """

    def __init__(self, name, parent):
        """Create a new AngularVelocity model."""
        super().__init__(parent)
        self.name = name

        self.Pitch = DataPointFloat("Pitch", self)
        self.Roll = DataPointFloat("Roll", self)
        self.Yaw = DataPointFloat("Yaw", self)
