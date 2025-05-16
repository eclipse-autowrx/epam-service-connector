#!/usr/bin/env python3

"""CurrentLocation model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointDouble,
    DataPointString,
    Model,
)

from vehicle.CurrentLocation.GNSSReceiver import GNSSReceiver


class CurrentLocation(Model):
    """CurrentLocation model.

    Attributes
    ----------
    Altitude: sensor
        Current altitude relative to WGS 84 reference ellipsoid, as measured at the position of GNSS receiver antenna.

        Unit: m
    GNSSReceiver: branch
        Information on the GNSS receiver used for determining current location.

        Unit: None
    Heading: sensor
        Current heading relative to geographic north. 0 = North, 90 = East, 180 = South, 270 = West.

        Value range: [0, 360]
        Unit: degrees
    HorizontalAccuracy: sensor
        Accuracy of the latitude and longitude coordinates.

        Unit: m
    Latitude: sensor
        Current latitude of vehicle in WGS 84 geodetic coordinates, as measured at the position of GNSS receiver antenna.

        Value range: [-90, 90]
        Unit: degrees
    Longitude: sensor
        Current longitude of vehicle in WGS 84 geodetic coordinates, as measured at the position of GNSS receiver antenna.

        Value range: [-180, 180]
        Unit: degrees
    Timestamp: sensor
        Timestamp from GNSS system for current location, formatted according to ISO 8601 with UTC time zone.

        Unit: None
    VerticalAccuracy: sensor
        Accuracy of altitude.

        Unit: m
    """

    def __init__(self, name, parent):
        """Create a new CurrentLocation model."""
        super().__init__(parent)
        self.name = name

        self.Altitude = DataPointDouble("Altitude", self)
        self.GNSSReceiver = GNSSReceiver("GNSSReceiver", self)
        self.Heading = DataPointDouble("Heading", self)
        self.HorizontalAccuracy = DataPointDouble("HorizontalAccuracy", self)
        self.Latitude = DataPointDouble("Latitude", self)
        self.Longitude = DataPointDouble("Longitude", self)
        self.Timestamp = DataPointString("Timestamp", self)
        self.VerticalAccuracy = DataPointDouble("VerticalAccuracy", self)
