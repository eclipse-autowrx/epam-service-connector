#!/usr/bin/env python3

"""ChargeCurrent model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    Model,
)


class ChargeCurrent(Model):
    """ChargeCurrent model.

    Attributes
    ----------
    DC: sensor
        Current DC charging current at inlet. Negative if returning energy to grid.

        Unit: A
    Phase1: sensor
        Current AC charging current (rms) at inlet for Phase 1. Negative if returning energy to grid.

        Unit: A
    Phase2: sensor
        Current AC charging current (rms) at inlet for Phase 2. Negative if returning energy to grid.

        Unit: A
    Phase3: sensor
        Current AC charging current (rms) at inlet for Phase 3. Negative if returning energy to grid.

        Unit: A
    """

    def __init__(self, name, parent):
        """Create a new ChargeCurrent model."""
        super().__init__(parent)
        self.name = name

        self.DC = DataPointFloat("DC", self)
        self.Phase1 = DataPointFloat("Phase1", self)
        self.Phase2 = DataPointFloat("Phase2", self)
        self.Phase3 = DataPointFloat("Phase3", self)
