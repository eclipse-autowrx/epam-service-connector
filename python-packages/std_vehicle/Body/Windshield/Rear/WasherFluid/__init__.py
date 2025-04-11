#!/usr/bin/env python3

"""WasherFluid model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointUint8,
    Model,
)


class WasherFluid(Model):
    """WasherFluid model.

    Attributes
    ----------
    IsLevelLow: sensor
        Low level indication for washer fluid. True = Level Low. False = Level OK.

        Unit: None
    Level: sensor
        Washer fluid level as a percent. 0 = Empty. 100 = Full.

        Value range: [, 100]
        Unit: percent
    """

    def __init__(self, name, parent):
        """Create a new WasherFluid model."""
        super().__init__(parent)
        self.name = name

        self.IsLevelLow = DataPointBoolean("IsLevelLow", self)
        self.Level = DataPointUint8("Level", self)
