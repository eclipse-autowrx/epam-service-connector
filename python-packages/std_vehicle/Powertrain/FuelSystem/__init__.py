#!/usr/bin/env python3

"""FuelSystem model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointFloat,
    DataPointString,
    DataPointStringArray,
    DataPointUint32,
    DataPointUint8,
    Model,
)


class FuelSystem(Model):
    """FuelSystem model.

    Attributes
    ----------
    AbsoluteLevel: sensor
        Current available fuel in the fuel tank expressed in liters.

        Unit: l
    AverageConsumption: sensor
        Average consumption in liters per 100 km.

        Value range: [0, ]
        Unit: l/100km
    ConsumptionSinceStart: sensor
        Fuel amount in liters consumed since start of current trip.

        A new trip is considered to start when engine gets enabled (e.g. LowVoltageSystemState in ON or START mode). A trip is considered to end when engine is no longer enabled. The signal may however keep the value of the last trip until a new trip is started.

        Unit: l
    HybridType: attribute (string)
        Defines the hybrid type of the vehicle.

        Unit: None
        Allowed values: UNKNOWN, NOT_APPLICABLE, STOP_START, BELT_ISG, CIMG, PHEV
    InstantConsumption: sensor
        Current consumption in liters per 100 km.

        Value range: [0, ]
        Unit: l/100km
    IsEngineStopStartEnabled: sensor
        Indicates whether eco start stop is currently enabled.

        Unit: None
    IsFuelLevelLow: sensor
        Indicates that the fuel level is low (e.g. <50km range).

        Unit: None
    Range: sensor
        Remaining range in meters using only liquid fuel.

        Unit: m
    RelativeLevel: sensor
        Level in fuel tank as percent of capacity. 0 = empty. 100 = full.

        Value range: [0, 100]
        Unit: percent
    SupportedFuel: attribute (string[])
        Detailed information on fuels supported by the vehicle. Identifiers originating from DIN EN 16942:2021-08, appendix B, with additional suffix for octane (RON) where relevant.

        RON 95 is sometimes referred to as Super, RON 98 as Super Plus.

        Unit: None
        Allowed values: E5_95, E5_98, E10_95, E10_98, E85, B7, B10, B20, B30, B100, XTL, LPG, CNG, LNG, H2, OTHER
    SupportedFuelTypes: attribute (string[])
        High level information of fuel types supported

        If a vehicle also has an electric drivetrain (e.g. hybrid) that will be obvious from the PowerTrain.Type signal.

        Unit: None
        Allowed values: GASOLINE, DIESEL, E85, LPG, CNG, LNG, H2, OTHER
    TankCapacity: attribute (float)
        Capacity of the fuel tank in liters.

        Unit: l
    """

    def __init__(self, name, parent):
        """Create a new FuelSystem model."""
        super().__init__(parent)
        self.name = name

        self.AbsoluteLevel = DataPointFloat("AbsoluteLevel", self)
        self.AverageConsumption = DataPointFloat("AverageConsumption", self)
        self.ConsumptionSinceStart = DataPointFloat("ConsumptionSinceStart", self)
        self.HybridType = DataPointString("HybridType", self)
        self.InstantConsumption = DataPointFloat("InstantConsumption", self)
        self.IsEngineStopStartEnabled = DataPointBoolean("IsEngineStopStartEnabled", self)
        self.IsFuelLevelLow = DataPointBoolean("IsFuelLevelLow", self)
        self.Range = DataPointUint32("Range", self)
        self.RelativeLevel = DataPointUint8("RelativeLevel", self)
        self.SupportedFuel = DataPointStringArray("SupportedFuel", self)
        self.SupportedFuelTypes = DataPointStringArray("SupportedFuelTypes", self)
        self.TankCapacity = DataPointFloat("TankCapacity", self)
