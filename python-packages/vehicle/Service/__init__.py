#!/usr/bin/env python3

"""Service model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointFloat,
    DataPointInt32,
    Model,
)


class Service(Model):
    """Service model.

    Attributes
    ----------
    DistanceToService: sensor
        Remaining distance to service (of any kind). Negative values indicate service overdue.

        Unit: km
    IsServiceDue: sensor
        Indicates if vehicle needs service (of any kind). True = Service needed now or in the near future. False = No known need for service.

        Unit: None
    TimeToService: sensor
        Remaining time to service (of any kind). Negative values indicate service overdue.

        Unit: s
    """

    def __init__(self, name, parent):
        """Create a new Service model."""
        super().__init__(parent)
        self.name = name

        self.DistanceToService = DataPointFloat("DistanceToService", self)
        self.IsServiceDue = DataPointBoolean("IsServiceDue", self)
        self.TimeToService = DataPointInt32("TimeToService", self)
