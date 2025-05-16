#!/usr/bin/env python3

"""DriverSide model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointInt8,
    Model,
)


class DriverSide(Model):
    """DriverSide model.

    Attributes
    ----------
    IsHeatingOn: actuator
        Mirror Heater on or off. True = Heater On. False = Heater Off.

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
        """Create a new DriverSide model."""
        super().__init__(parent)
        self.name = name

        self.IsHeatingOn = DataPointBoolean("IsHeatingOn", self)
        self.Pan = DataPointInt8("Pan", self)
        self.Tilt = DataPointInt8("Tilt", self)
