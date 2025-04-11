#!/usr/bin/env python3

"""CellVoltage model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    DataPointFloatArray,
    DataPointUint16,
    Model,
)


class CellVoltage(Model):
    """CellVoltage model.

    Attributes
    ----------
    CellVoltages: sensor
        Array of cell voltages. Length or array shall correspond to number of cells in vehicle.

        Cells are identified by relative position in array.

        Unit: None
    IdMax: sensor
        Identifier of the battery cell with highest voltage.

        Identifier is supposed to be relative index of the cell, starting with 0 the first cell.

        Unit: None
    IdMin: sensor
        Identifier of the battery cell with lowest voltage.

        Identifier is supposed to be relative index of the cell, starting with 0 the first cell.

        Unit: None
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

        self.CellVoltages = DataPointFloatArray("CellVoltages", self)
        self.IdMax = DataPointUint16("IdMax", self)
        self.IdMin = DataPointUint16("IdMin", self)
        self.Max = DataPointFloat("Max", self)
        self.Min = DataPointFloat("Min", self)
