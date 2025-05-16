#!/usr/bin/env python3

"""Light model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointUint8,
    Model,
)

from vehicle.Cabin.Light.AmbientLight import AmbientLight
from vehicle.Cabin.Light.InteractiveLightBar import InteractiveLightBar
from vehicle.Cabin.Light.Spotlight import Spotlight


class Light(Model):
    """Light model.

    Attributes
    ----------
    AmbientLight: branch
        Decorative coloured light inside the cabin, usually mounted on the door, ceiling, etc.

        Unit: None
    InteractiveLightBar: branch
        Decorative coloured light bar that supports effects, usually mounted on the dashboard (e.g. BMW i7 Interactive bar).

        Unit: None
    IsDomeOn: actuator
        Is central dome light on

        Unit: None
    IsGloveBoxOn: actuator
        Is glove box light on

        Unit: None
    PerceivedAmbientLight: sensor
        The percentage of ambient light that is measured (e.g., by a sensor) inside the cabin. 0 = No ambient light. 100 = Full brightness.

        V4.0 named changed from "AmbientLight" to "PerceivedAmbientLight". This is a read-only property that refers to the pre-existing light (e.g., natural light). If you are looking for the in-cabin decorative lights that sometimes are also called "AmbientLights", please refer to the branch Vehicle.Cabin.Light.AmbientLight.

        Value range: [0, 100]
        Unit: percent
    Spotlight: branch
        Spotlight for a specific area in the vehicle.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Light model."""
        super().__init__(parent)
        self.name = name

        self.AmbientLight = AmbientLight("AmbientLight", self)
        self.InteractiveLightBar = InteractiveLightBar("InteractiveLightBar", self)
        self.IsDomeOn = DataPointBoolean("IsDomeOn", self)
        self.IsGloveBoxOn = DataPointBoolean("IsGloveBoxOn", self)
        self.PerceivedAmbientLight = DataPointUint8("PerceivedAmbientLight", self)
        self.Spotlight = Spotlight("Spotlight", self)
