#!/usr/bin/env python3

"""EngineOil model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    DataPointInt32,
    DataPointString,
    Model,
)


class EngineOil(Model):
    """EngineOil model.

    Attributes
    ----------
    Capacity: attribute (float)
        Engine oil capacity in liters.

        Unit: l
    Level: sensor
        Engine oil level.

        Unit: None
        Allowed values: CRITICALLY_LOW, LOW, NORMAL, HIGH, CRITICALLY_HIGH
    LifeRemaining: sensor
        Remaining engine oil life in seconds. Negative values can be used to indicate that lifetime has been exceeded.

        In addition to this a signal a vehicle can report remaining time to service (including e.g. oil change) by Vehicle.Service.TimeToService.

        Unit: s
    Temperature: sensor
        EOT, Engine oil temperature.

        Unit: celsius
    """

    def __init__(self, name, parent):
        """Create a new EngineOil model."""
        super().__init__(parent)
        self.name = name

        self.Capacity = DataPointFloat("Capacity", self)
        self.Level = DataPointString("Level", self)
        self.LifeRemaining = DataPointInt32("LifeRemaining", self)
        self.Temperature = DataPointFloat("Temperature", self)
