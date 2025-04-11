#!/usr/bin/env python3

"""Acceleration model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    Model,
)


class Acceleration(Model):
    """Acceleration model.

    Attributes
    ----------
    Lateral: sensor
        Vehicle acceleration in Y (lateral acceleration).

        Unit: m/s^2
    Longitudinal: sensor
        Vehicle acceleration in X (longitudinal acceleration).

        Unit: m/s^2
    Vertical: sensor
        Vehicle acceleration in Z (vertical acceleration).

        Unit: m/s^2
    """

    def __init__(self, name, parent):
        """Create a new Acceleration model."""
        super().__init__(parent)
        self.name = name

        self.Lateral = DataPointFloat("Lateral", self)
        self.Longitudinal = DataPointFloat("Longitudinal", self)
        self.Vertical = DataPointFloat("Vertical", self)
