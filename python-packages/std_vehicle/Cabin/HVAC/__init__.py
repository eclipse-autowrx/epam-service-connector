#!/usr/bin/env python3

"""HVAC model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointFloat,
    DataPointUint8,
    Model,
)

from vehicle.Cabin.HVAC.Station import Station


class HVAC(Model):
    """HVAC model.

    Attributes
    ----------
    AmbientAirTemperature: sensor
        Ambient air temperature inside the vehicle.

        Unit: celsius
    IsAirConditioningActive: actuator
        Is Air conditioning active.

        Unit: None
    IsFrontDefrosterActive: actuator
        Is front defroster active.

        Unit: None
    IsRearDefrosterActive: actuator
        Is rear defroster active.

        Unit: None
    IsRecirculationActive: actuator
        Is recirculation active.

        Unit: None
    PowerOptimizeLevel: actuator
        Power optimization level for this branch/subsystem. A higher number indicates more aggressive power optimization. Level 0 indicates that all functionality is enabled, no power optimization enabled. Level 10 indicates most aggressive power optimization mode, only essential functionality enabled.

        Value range: [0, 10]
        Unit: None
    Station: branch
        HVAC for single station in the vehicle

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new HVAC model."""
        super().__init__(parent)
        self.name = name

        self.AmbientAirTemperature = DataPointFloat("AmbientAirTemperature", self)
        self.IsAirConditioningActive = DataPointBoolean("IsAirConditioningActive", self)
        self.IsFrontDefrosterActive = DataPointBoolean("IsFrontDefrosterActive", self)
        self.IsRearDefrosterActive = DataPointBoolean("IsRearDefrosterActive", self)
        self.IsRecirculationActive = DataPointBoolean("IsRecirculationActive", self)
        self.PowerOptimizeLevel = DataPointUint8("PowerOptimizeLevel", self)
        self.Station = Station("Station", self)
