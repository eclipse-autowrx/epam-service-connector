#!/usr/bin/env python3

"""CellVoltage model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    Model,
)


class CellVoltage(Model):
    """CellVoltage model.

    Attributes
    ----------
    Max: sensor
        Current voltage of the battery cell with highest voltage.

        Unit: V
    Min: sensor
        Current voltage of the battery cell with lowest voltage.

        Unit: V
    """

    def __init__(self, name, parent):
        """Create a new CellVoltage model."""
        super().__init__(parent)
        self.name = name

        self.Max = DataPointFloat("Max", self)
        self.Min = DataPointFloat("Min", self)
