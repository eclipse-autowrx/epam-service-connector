#!/usr/bin/env python3

"""Navigation model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointString,
    DataPointUint8,
    Model,
)

from vehicle.Cabin.Infotainment.Navigation.DestinationSet import DestinationSet


class Navigation(Model):
    """Navigation model.

    Attributes
    ----------
    DestinationSet: branch
        A navigation has been selected.

        Unit: None
    GuidanceVoice: actuator
        Navigation guidance state that was selected.

        ETC indicates a voice alternative not covered by the explicitly listed alternatives.

        Unit: None
        Allowed values: STANDARD_MALE, STANDARD_FEMALE, ETC
    Mute: actuator
        Navigation mute state that was selected.

        Unit: None
        Allowed values: MUTED, ALERT_ONLY, UNMUTED
    Volume: actuator
        Current navigation volume

        Value range: [0, 100]
        Unit: percent
    """

    def __init__(self, name, parent):
        """Create a new Navigation model."""
        super().__init__(parent)
        self.name = name

        self.DestinationSet = DestinationSet("DestinationSet", self)
        self.GuidanceVoice = DataPointString("GuidanceVoice", self)
        self.Mute = DataPointString("Mute", self)
        self.Volume = DataPointUint8("Volume", self)
