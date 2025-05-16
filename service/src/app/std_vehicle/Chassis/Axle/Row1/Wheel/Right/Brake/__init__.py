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
    FluidLevel: sensor
        Brake fluid level as percent. 0 = Empty. 100 = Full.

        Value range: [, 100]
        Unit: percent
    IsBrakesWorn: sensor
        Brake pad wear status. True = Worn. False = Not Worn.

        Unit: None
    IsFluidLevelLow: sensor
        Brake fluid level status. True = Brake fluid level low. False = Brake fluid level OK.

        Unit: None
    PadWear: sensor
        Brake pad wear as percent. 0 = No Wear. 100 = Worn.

        Value range: [, 100]
        Unit: percent
    """

    def __init__(self, name, parent):
        """Create a new Brake model."""
        super().__init__(parent)
        self.name = name

        self.FluidLevel = DataPointUint8("FluidLevel", self)
        self.IsBrakesWorn = DataPointBoolean("IsBrakesWorn", self)
        self.IsFluidLevelLow = DataPointBoolean("IsFluidLevelLow", self)
        self.PadWear = DataPointUint8("PadWear", self)
