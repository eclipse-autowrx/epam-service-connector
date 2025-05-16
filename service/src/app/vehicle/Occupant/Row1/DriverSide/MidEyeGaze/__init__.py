#!/usr/bin/env python3

"""MidEyeGaze model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    Model,
)


class MidEyeGaze(Model):
    """MidEyeGaze model.

    Attributes
    ----------
    Azimuth: sensor
        Mid eye azimuth gaze (right-hand rule) on vehicle sprung mass Z-axis as defined by ISO 23150:2023 0 = Driver looking forward. Positive values = Driver looking at something on the left side of driver. Negative values = Driver looking at something on the right side of driver.

        Value range: [-180, 180]
        Unit: degrees
    Elevation: sensor
        Elevation to observed object measured as angle between vehicle sprung mass XY-plane as defined by ISO 23150:2023 at driver mid eye position and object. 0 = Driver looking at something at same height as mid eye position. Positive values = Driver looking at something above mid eye position. Negative values = Driver looking at something below mid eye position.

        Value range: [-90, 90]
        Unit: degrees
    """

    def __init__(self, name, parent):
        """Create a new MidEyeGaze model."""
        super().__init__(parent)
        self.name = name

        self.Azimuth = DataPointFloat("Azimuth", self)
        self.Elevation = DataPointFloat("Elevation", self)
