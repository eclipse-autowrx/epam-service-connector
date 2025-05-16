#!/usr/bin/env python3

"""PassengerSide model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointInt8,
    Model,
)


class PassengerSide(Model):
    """PassengerSide model.

    Attributes
    ----------
    IsFolded: actuator
        Is mirror folded? True = Fully or partially folded. False = Fully unfolded.

        Unit: None
    IsHeatingOn: actuator
        Mirror Heater on or off. True = Heater On. False = Heater Off.

        Unit: None
    IsLocked: actuator
        Is mirror movement locked? True = Locked, mirror will not react to Tilt/Pan change. False = Unlocked.

        Unit: None
    Pan: actuator
        Mirror pan as a percent. 0 = Center Position. 100 = Fully Left Position. -100 = Fully Right Position.

        Value range: [-100, 100]
        Unit: percent
    Tilt: actuator
        Mirror tilt as a percent. 0 = Center Position. 100 = Fully Upward Position. -100 = Fully Downward Position.

        Value range: [-100, 100]
        Unit: percent
    """

    def __init__(self, name, parent):
        """Create a new PassengerSide model."""
        super().__init__(parent)
        self.name = name

        self.IsFolded = DataPointBoolean("IsFolded", self)
        self.IsHeatingOn = DataPointBoolean("IsHeatingOn", self)
        self.IsLocked = DataPointBoolean("IsLocked", self)
        self.Pan = DataPointInt8("Pan", self)
        self.Tilt = DataPointInt8("Tilt", self)
