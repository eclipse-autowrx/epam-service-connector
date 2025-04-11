#!/usr/bin/env python3

"""ChargeVoltage model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    Model,
)


class ChargeVoltage(Model):
    """ChargeVoltage model.

    Attributes
    ----------
    DC: sensor
        Current DC charging voltage at charging inlet.

        Unit: V
    Phase1: sensor
        Current AC charging voltage (rms) at inlet for Phase 1.

        Unit: V
    Phase2: sensor
        Current AC charging voltage (rms) at inlet for Phase 2.

        Unit: V
    Phase3: sensor
        Current AC charging voltage (rms) at inlet for Phase 3.

        Unit: V
    """

    def __init__(self, name, parent):
        """Create a new ChargeVoltage model."""
        super().__init__(parent)
        self.name = name

        self.DC = DataPointFloat("DC", self)
        self.Phase1 = DataPointFloat("Phase1", self)
        self.Phase2 = DataPointFloat("Phase2", self)
        self.Phase3 = DataPointFloat("Phase3", self)
