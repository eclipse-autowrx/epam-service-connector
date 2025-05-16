#!/usr/bin/env python3

"""Temperature model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    Model,
)


class Temperature(Model):
    """Temperature model.

    Attributes
    ----------
    Average: sensor
        Current average temperature of the battery cells.

        Unit: celsius
    Max: sensor
        Current maximum temperature of the battery cells, i.e. temperature of the hottest cell.

        Unit: celsius
    Min: sensor
        Current minimum temperature of the battery cells, i.e. temperature of the coldest cell.

        Unit: celsius
    """

    def __init__(self, name, parent):
        """Create a new Temperature model."""
        super().__init__(parent)
        self.name = name

        self.Average = DataPointFloat("Average", self)
        self.Max = DataPointFloat("Max", self)
        self.Min = DataPointFloat("Min", self)
