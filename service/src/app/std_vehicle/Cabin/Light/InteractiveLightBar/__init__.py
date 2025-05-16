#!/usr/bin/env python3

"""InteractiveLightBar model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointString,
    DataPointUint8,
    Model,
)


class InteractiveLightBar(Model):
    """InteractiveLightBar model.

    Attributes
    ----------
    Color: actuator
        Hexadecimal color code represented as a 3-byte RGB (i.e. Red, Green, and Blue) value preceded by a hash symbol "#". Allowed range "#000000" to "#FFFFFF".

        For example; "#C0C0C0" = Silver, "#FFD700" = Gold, "#000000" = Black, "#FFFFFF" = White, etc.

        Unit: None
    Effect: actuator
        Light effect selection from a predefined set of allowed values.

        Default and allowed values are OEM-specific and should be defined accordingly (e.g. with the use of overlays).

        Unit: None
    Intensity: actuator
        How much of the maximum possible brightness of the light is used. 1 = Maximum attenuation, 100 = No attenuation (i.e. full brightness).

        Minimum value cannot be zero as on/off is controlled by the actuator IsLightOn. V4.0 moved from Cabin.Lights.AmbientLight.Intensity to enable individual control of lights via the SingleConfigurableLight.vspec.

        Value range: [1, 100]
        Unit: percent
    IsLightOn: actuator
        Indicates whether the light is turned on. True = On, False = Off.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new InteractiveLightBar model."""
        super().__init__(parent)
        self.name = name

        self.Color = DataPointString("Color", self)
        self.Effect = DataPointString("Effect", self)
        self.Intensity = DataPointUint8("Intensity", self)
        self.IsLightOn = DataPointBoolean("IsLightOn", self)
