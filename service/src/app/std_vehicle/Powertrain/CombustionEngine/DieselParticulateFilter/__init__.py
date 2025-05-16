#!/usr/bin/env python3

"""DieselParticulateFilter model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    Model,
)


class DieselParticulateFilter(Model):
    """DieselParticulateFilter model.

    Attributes
    ----------
    DeltaPressure: sensor
        Delta Pressure of Diesel Particulate Filter.

        Unit: Pa
    InletTemperature: sensor
        Inlet temperature of Diesel Particulate Filter.

        Unit: celsius
    OutletTemperature: sensor
        Outlet temperature of Diesel Particulate Filter.

        Unit: celsius
    """

    def __init__(self, name, parent):
        """Create a new DieselParticulateFilter model."""
        super().__init__(parent)
        self.name = name

        self.DeltaPressure = DataPointFloat("DeltaPressure", self)
        self.InletTemperature = DataPointFloat("InletTemperature", self)
        self.OutletTemperature = DataPointFloat("OutletTemperature", self)
