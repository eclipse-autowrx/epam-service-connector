#!/usr/bin/env python3

"""GNSSReceiver model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointString,
    Model,
)

from vehicle.CurrentLocation.GNSSReceiver.MountingPosition import MountingPosition


class GNSSReceiver(Model):
    """GNSSReceiver model.

    Attributes
    ----------
    FixType: sensor
        Fix status of GNSS receiver.

        Unit: None
        Allowed values: NONE, TWO_D, TWO_D_SATELLITE_BASED_AUGMENTATION, TWO_D_GROUND_BASED_AUGMENTATION, TWO_D_SATELLITE_AND_GROUND_BASED_AUGMENTATION, THREE_D, THREE_D_SATELLITE_BASED_AUGMENTATION, THREE_D_GROUND_BASED_AUGMENTATION, THREE_D_SATELLITE_AND_GROUND_BASED_AUGMENTATION
    MountingPosition: branch
        Mounting position of GNSS receiver antenna relative to vehicle coordinate system. Axis definitions according to ISO 8855. Origin at center of (first) rear axle.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new GNSSReceiver model."""
        super().__init__(parent)
        self.name = name

        self.FixType = DataPointString("FixType", self)
        self.MountingPosition = MountingPosition("MountingPosition", self)
