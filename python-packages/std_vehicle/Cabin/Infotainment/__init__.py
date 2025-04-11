#!/usr/bin/env python3

"""Infotainment model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointUint8,
    Model,
)

from vehicle.Cabin.Infotainment.HMI import HMI
from vehicle.Cabin.Infotainment.Media import Media
from vehicle.Cabin.Infotainment.Navigation import Navigation
from vehicle.Cabin.Infotainment.SmartphoneProjection import SmartphoneProjection


class Infotainment(Model):
    """Infotainment model.

    Attributes
    ----------
    HMI: branch
        HMI related signals

        Unit: None
    Media: branch
        All Media actions

        Unit: None
    Navigation: branch
        All navigation actions

        Unit: None
    PowerOptimizeLevel: actuator
        Power optimization level for this branch/subsystem. A higher number indicates more aggressive power optimization. Level 0 indicates that all functionality is enabled, no power optimization enabled. Level 10 indicates most aggressive power optimization mode, only essential functionality enabled.

        Value range: [0, 10]
        Unit: None
    SmartphoneProjection: branch
        All smartphone projection actions.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Infotainment model."""
        super().__init__(parent)
        self.name = name

        self.HMI = HMI("HMI", self)
        self.Media = Media("Media", self)
        self.Navigation = Navigation("Navigation", self)
        self.PowerOptimizeLevel = DataPointUint8("PowerOptimizeLevel", self)
        self.SmartphoneProjection = SmartphoneProjection("SmartphoneProjection", self)
