#!/usr/bin/env python3

"""DestinationSet model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointDouble,
    Model,
)


class DestinationSet(Model):
    """DestinationSet model.

    Attributes
    ----------
    Latitude: actuator
        Latitude of destination in WGS 84 geodetic coordinates.

        Value range: [-90, 90]
        Unit: degrees
    Longitude: actuator
        Longitude of destination in WGS 84 geodetic coordinates.

        Value range: [-180, 180]
        Unit: degrees
    """

    def __init__(self, name, parent):
        """Create a new DestinationSet model."""
        super().__init__(parent)
        self.name = name

        self.Latitude = DataPointDouble("Latitude", self)
        self.Longitude = DataPointDouble("Longitude", self)
