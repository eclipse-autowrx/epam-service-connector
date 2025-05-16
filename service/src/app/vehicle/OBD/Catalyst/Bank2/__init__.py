#!/usr/bin/env python3

"""Bank2 model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    Model,
)


class Bank2(Model):
    """Bank2 model.

    Attributes
    ----------
    Temperature1: sensor
        PID 3D - Catalyst temperature from bank 2, sensor 1

        Unit: celsius
    Temperature2: sensor
        PID 3F - Catalyst temperature from bank 2, sensor 2

        Unit: celsius
    """

    def __init__(self, name, parent):
        """Create a new Bank2 model."""
        super().__init__(parent)
        self.name = name

        self.Temperature1 = DataPointFloat("Temperature1", self)
        self.Temperature2 = DataPointFloat("Temperature2", self)
