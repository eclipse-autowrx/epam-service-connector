#!/usr/bin/env python3

"""Brake model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointUint8,
    Model,
)


class Brake(Model):
    """Brake model.

    Attributes
    ----------
    IsDriverEmergencyBrakingDetected: sensor
        Indicates if emergency braking initiated by driver is detected. True = Emergency braking detected. False = Emergency braking not detected.

        Detection of emergency braking can trigger Emergency Brake Assist (EBA) to engage.

        Unit: None
    PedalPosition: sensor
        Brake pedal position as percent. 0 = Not depressed. 100 = Fully depressed.

        Value range: [0, 100]
        Unit: percent
    """

    def __init__(self, name, parent):
        """Create a new Brake model."""
        super().__init__(parent)
        self.name = name

        self.IsDriverEmergencyBrakingDetected = DataPointBoolean("IsDriverEmergencyBrakingDetected", self)
        self.PedalPosition = DataPointUint8("PedalPosition", self)
