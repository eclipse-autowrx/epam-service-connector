#!/usr/bin/env python3

"""Driver model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointFloat,
    DataPointUint16,
    Model,
)

from vehicle.Driver.Identifier import Identifier


class Driver(Model):
    """Driver model.

    Attributes
    ----------
    AttentiveProbability: sensor
        Probability of attentiveness of the driver.

        Value range: [0, 100]
        Unit: percent
    DistractionLevel: sensor
        Distraction level of the driver, which can be evaluated by multiple factors e.g. driving situation, acoustical or optical signals inside the cockpit, ongoing phone calls.

        Value range: [0, 100]
        Unit: percent
    FatigueLevel: sensor
        Fatigue level of the driver, which can be evaluated by multiple factors e.g. trip time, behaviour of steering, eye status.

        Value range: [0, 100]
        Unit: percent
    HeartRate: sensor
        Heart rate of the driver.

        Unit: bpm
    Identifier: branch
        Identifier attributes based on OAuth 2.0.

        Unit: None
    IsEyesOnRoad: sensor
        Has driver the eyes on road or not?

        Unit: None
    IsHandsOnWheel: sensor
        Are the driver's hands on the steering wheel or not?

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Driver model."""
        super().__init__(parent)
        self.name = name

        self.AttentiveProbability = DataPointFloat("AttentiveProbability", self)
        self.DistractionLevel = DataPointFloat("DistractionLevel", self)
        self.FatigueLevel = DataPointFloat("FatigueLevel", self)
        self.HeartRate = DataPointUint16("HeartRate", self)
        self.Identifier = Identifier("Identifier", self)
        self.IsEyesOnRoad = DataPointBoolean("IsEyesOnRoad", self)
        self.IsHandsOnWheel = DataPointBoolean("IsHandsOnWheel", self)
