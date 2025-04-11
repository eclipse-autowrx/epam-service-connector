#!/usr/bin/env python3

"""Powertrain model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    DataPointString,
    DataPointUint32,
    DataPointUint8,
    Model,
)

from vehicle.Powertrain.CombustionEngine import CombustionEngine
from vehicle.Powertrain.ElectricMotor import ElectricMotor
from vehicle.Powertrain.FuelSystem import FuelSystem
from vehicle.Powertrain.TractionBattery import TractionBattery
from vehicle.Powertrain.Transmission import Transmission


class Powertrain(Model):
    """Powertrain model.

    Attributes
    ----------
    AccumulatedBrakingEnergy: sensor
        The accumulated energy from regenerative braking over lifetime.

        Unit: kWh
    CombustionEngine: branch
        Engine-specific data, stopping at the bell housing.

        Unit: None
    ElectricMotor: branch
        Electric Motor specific data.

        Unit: None
    FuelSystem: branch
        Fuel system data.

        Unit: None
    PowerOptimizeLevel: actuator
        Power optimization level for this branch/subsystem. A higher number indicates more aggressive power optimization. Level 0 indicates that all functionality is enabled, no power optimization enabled. Level 10 indicates most aggressive power optimization mode, only essential functionality enabled.

        Value range: [0, 10]
        Unit: None
    Range: sensor
        Remaining range in meters using all energy sources available in the vehicle.

        Unit: m
    TractionBattery: branch
        Battery Management data.

        Unit: None
    Transmission: branch
        Transmission-specific data, stopping at the drive shafts.

        Unit: None
    Type: attribute (string)
        Defines the powertrain type of the vehicle.

        For vehicles with a combustion engine (including hybrids) more detailed information on fuels supported can be found in FuelSystem.SupportedFuelTypes and FuelSystem.SupportedFuels.

        Unit: None
        Allowed values: COMBUSTION, HYBRID, ELECTRIC
    """

    def __init__(self, name, parent):
        """Create a new Powertrain model."""
        super().__init__(parent)
        self.name = name

        self.AccumulatedBrakingEnergy = DataPointFloat("AccumulatedBrakingEnergy", self)
        self.CombustionEngine = CombustionEngine("CombustionEngine", self)
        self.ElectricMotor = ElectricMotor("ElectricMotor", self)
        self.FuelSystem = FuelSystem("FuelSystem", self)
        self.PowerOptimizeLevel = DataPointUint8("PowerOptimizeLevel", self)
        self.Range = DataPointUint32("Range", self)
        self.TractionBattery = TractionBattery("TractionBattery", self)
        self.Transmission = Transmission("Transmission", self)
        self.Type = DataPointString("Type", self)
