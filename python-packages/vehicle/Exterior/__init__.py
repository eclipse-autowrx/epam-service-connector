#!/usr/bin/env python3

"""Exterior model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    Model,
)


class Exterior(Model):
    """Exterior model.

    Attributes
    ----------
    AirTemperature: sensor
        Air temperature outside the vehicle.

        Unit: celsius
    Humidity: sensor
        Relative humidity outside the vehicle. 0 = Dry, 100 = Air fully saturated.

        Value range: [0, 100]
        Unit: percent
    LightIntensity: sensor
        Light intensity outside the vehicle. 0 = No light detected, 100 = Fully lit.

        Mapping to physical units and calculation method is sensor specific.

        Value range: [0, 100]
        Unit: percent
    """

    def __init__(self, name, parent):
        """Create a new Exterior model."""
        super().__init__(parent)
        self.name = name

        self.AirTemperature = DataPointFloat("AirTemperature", self)
        self.Humidity = DataPointFloat("Humidity", self)
        self.LightIntensity = DataPointFloat("LightIntensity", self)
