#!/usr/bin/env python3

"""DieselExhaustFluid model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointFloat,
    DataPointUint32,
    DataPointUint8,
    Model,
)


class DieselExhaustFluid(Model):
    """DieselExhaustFluid model.

    Attributes
    ----------
    Capacity: attribute (float)
        Capacity in liters of the Diesel Exhaust Fluid Tank.

        Unit: l
    IsLevelLow: sensor
        Indicates if the Diesel Exhaust Fluid level is low. True if level is low. Definition of low is vehicle dependent.

        Unit: None
    Level: sensor
        Level of the Diesel Exhaust Fluid tank as percent of capacity. 0 = empty. 100 = full.

        Value range: [0, 100]
        Unit: percent
    Range: sensor
        Remaining range in meters of the Diesel Exhaust Fluid present in the vehicle.

        Unit: m
    """

    def __init__(self, name, parent):
        """Create a new DieselExhaustFluid model."""
        super().__init__(parent)
        self.name = name

        self.Capacity = DataPointFloat("Capacity", self)
        self.IsLevelLow = DataPointBoolean("IsLevelLow", self)
        self.Level = DataPointUint8("Level", self)
        self.Range = DataPointUint32("Range", self)
