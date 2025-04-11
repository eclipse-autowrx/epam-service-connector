#!/usr/bin/env python3

"""Catalyst model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    Model,
)

from vehicle.OBD.Catalyst.Bank1 import Bank1
from vehicle.OBD.Catalyst.Bank2 import Bank2


class Catalyst(Model):
    """Catalyst model.

    Attributes
    ----------
    Bank1: branch
        Catalyst bank 1 signals

        Unit: None
    Bank2: branch
        Catalyst bank 2 signals

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Catalyst model."""
        super().__init__(parent)
        self.name = name

        self.Bank1 = Bank1("Bank1", self)
        self.Bank2 = Bank2("Bank2", self)
