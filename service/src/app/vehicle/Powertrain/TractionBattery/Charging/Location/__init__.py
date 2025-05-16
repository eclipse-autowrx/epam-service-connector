#!/usr/bin/env python3

"""Location model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointDouble,
    Model,
)


class Location(Model):
    """Location model.

    Attributes
    ----------
    Altitude: sensor
        Altitude relative to WGS 84 reference ellipsoid of last or current charging event.

        Unit: m
    Latitude: sensor
        Latitude of last or current charging event in WGS 84 geodetic coordinates.

        Value range: [-90, 90]
        Unit: degrees
    Longitude: sensor
        Longitude of last or current charging event in WGS 84 geodetic coordinates.

        Value range: [-180, 180]
        Unit: degrees
    """

    def __init__(self, name, parent):
        """Create a new Location model."""
        super().__init__(parent)
        self.name = name

        self.Altitude = DataPointDouble("Altitude", self)
        self.Latitude = DataPointDouble("Latitude", self)
        self.Longitude = DataPointDouble("Longitude", self)
