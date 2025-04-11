#!/usr/bin/env python3

"""Lights model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointUint8,
    Model,
)

from vehicle.Cabin.Lights.Spotlight import Spotlight


class Lights(Model):
    """Lights model.

    Attributes
    ----------
    AmbientLight: sensor
        How much ambient light is detected in cabin. 0 = No ambient light. 100 = Full brightness

        Value range: [0, 100]
        Unit: percent
    IsDomeOn: actuator
        Is central dome light light on

        Unit: None
    IsGloveBoxOn: actuator
        Is glove box light on

        Unit: None
    IsTrunkOn: actuator
        Is trunk light light on

        Unit: None
    LightIntensity: sensor
        Intensity of the interior lights. 0 = Off. 100 = Full brightness.

        Value range: [0, 100]
        Unit: percent
    Spotlight: branch
        Spotlight for a specific area in the vehicle.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Lights model."""
        super().__init__(parent)
        self.name = name

        self.AmbientLight = DataPointUint8("AmbientLight", self)
        self.IsDomeOn = DataPointBoolean("IsDomeOn", self)
        self.IsGloveBoxOn = DataPointBoolean("IsGloveBoxOn", self)
        self.IsTrunkOn = DataPointBoolean("IsTrunkOn", self)
        self.LightIntensity = DataPointUint8("LightIntensity", self)
        self.Spotlight = Spotlight("Spotlight", self)
