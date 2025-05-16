#!/usr/bin/env python3

"""CombustionEngine model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointFloat,
    DataPointInt16,
    DataPointInt32,
    DataPointString,
    DataPointUint16,
    DataPointUint8,
    Model,
)

from vehicle.Powertrain.CombustionEngine.DieselExhaustFluid import DieselExhaustFluid
from vehicle.Powertrain.CombustionEngine.DieselParticulateFilter import DieselParticulateFilter


class CombustionEngine(Model):
    """CombustionEngine model.

    Attributes
    ----------
    AspirationType: attribute (string)
        Type of aspiration (natural, turbocharger, supercharger etc).

        Unit: None
        Allowed values: UNKNOWN, NATURAL, SUPERCHARGER, TURBOCHARGER
    Bore: attribute (float)
        Bore in millimetres.

        Unit: mm
    CompressionRatio: attribute (string)
        Engine compression ratio, specified in the format 'X:1', e.g. '9.2:1'.

        Unit: None
    Configuration: attribute (string)
        Engine configuration.

        Unit: None
        Allowed values: UNKNOWN, STRAIGHT, V, BOXER, W, ROTARY, RADIAL, SQUARE, H, U, OPPOSED, X
    DieselExhaustFluid: branch
        Signals related to Diesel Exhaust Fluid (DEF). DEF is called AUS32 in ISO 22241.

        In retail and marketing other names are typically used for the fluid.

        Unit: None
    DieselParticulateFilter: branch
        Diesel Particulate Filter signals.

        Unit: None
    Displacement: attribute (uint16)
        Displacement in cubic centimetres.

        Unit: cm^3
    ECT: sensor
        Engine coolant temperature.

        Unit: celsius
    EOP: sensor
        Engine oil pressure.

        Unit: kPa
    EOT: sensor
        Engine oil temperature.

        Unit: celsius
    EngineCode: attribute (string)
        Engine code designation, as specified by vehicle manufacturer.

        For hybrid vehicles the engine code may refer to the combination of combustion and electric engine.

        Unit: None
    EngineCoolantCapacity: attribute (float)
        Engine coolant capacity in liters.

        Unit: l
    EngineHours: sensor
        Accumulated time during engine lifetime with 'engine speed (rpm) > 0'.

        Unit: h
    EngineOilCapacity: attribute (float)
        Engine oil capacity in liters.

        Unit: l
    EngineOilLevel: sensor
        Engine oil level.

        Unit: None
        Allowed values: CRITICALLY_LOW, LOW, NORMAL, HIGH, CRITICALLY_HIGH
    IdleHours: sensor
        Accumulated idling time during engine lifetime. Definition of idling is not standardized.

        Vehicles may calculate accumulated idle time for an engine. It might be based on engine speed (rpm) below a certain limit or any other mechanism.

        Unit: h
    IsRunning: sensor
        Engine Running. True if engine is rotating (Speed > 0).

        Unit: None
    MAF: sensor
        Grams of air drawn into engine per second.

        Unit: g/s
    MAP: sensor
        Manifold absolute pressure possibly boosted using forced induction.

        Unit: kPa
    MaxPower: attribute (uint16)
        Peak power, in kilowatts, that engine can generate.

        Unit: kW
    MaxTorque: attribute (uint16)
        Peak torque, in newton meter, that the engine can generate.

        Unit: Nm
    NumberOfCylinders: attribute (uint16)
        Number of cylinders.

        Unit: None
    NumberOfValvesPerCylinder: attribute (uint16)
        Number of valves per cylinder.

        Unit: None
    OilLifeRemaining: sensor
        Remaining engine oil life in seconds. Negative values can be used to indicate that lifetime has been exceeded.

        In addition to this a signal a vehicle can report remaining time to service (including e.g. oil change) by Vehicle.Service.TimeToService.

        Unit: s
    Power: sensor
        Current engine power output. Shall be reported as 0 during engine breaking.

        Unit: kW
    Speed: sensor
        Engine speed measured as rotations per minute.

        Unit: rpm
    StrokeLength: attribute (float)
        Stroke length in millimetres.

        Unit: mm
    TPS: sensor
        Current throttle position.

        Value range: [, 100]
        Unit: percent
    Torque: sensor
        Current engine torque. Shall be reported as 0 during engine breaking.

        During engine breaking the engine delivers a negative torque to the transmission. This negative torque shall be ignored, instead 0 shall be reported.

        Unit: Nm
    """

    def __init__(self, name, parent):
        """Create a new CombustionEngine model."""
        super().__init__(parent)
        self.name = name

        self.AspirationType = DataPointString("AspirationType", self)
        self.Bore = DataPointFloat("Bore", self)
        self.CompressionRatio = DataPointString("CompressionRatio", self)
        self.Configuration = DataPointString("Configuration", self)
        self.DieselExhaustFluid = DieselExhaustFluid("DieselExhaustFluid", self)
        self.DieselParticulateFilter = DieselParticulateFilter("DieselParticulateFilter", self)
        self.Displacement = DataPointUint16("Displacement", self)
        self.ECT = DataPointInt16("ECT", self)
        self.EOP = DataPointUint16("EOP", self)
        self.EOT = DataPointInt16("EOT", self)
        self.EngineCode = DataPointString("EngineCode", self)
        self.EngineCoolantCapacity = DataPointFloat("EngineCoolantCapacity", self)
        self.EngineHours = DataPointFloat("EngineHours", self)
        self.EngineOilCapacity = DataPointFloat("EngineOilCapacity", self)
        self.EngineOilLevel = DataPointString("EngineOilLevel", self)
        self.IdleHours = DataPointFloat("IdleHours", self)
        self.IsRunning = DataPointBoolean("IsRunning", self)
        self.MAF = DataPointUint16("MAF", self)
        self.MAP = DataPointUint16("MAP", self)
        self.MaxPower = DataPointUint16("MaxPower", self)
        self.MaxTorque = DataPointUint16("MaxTorque", self)
        self.NumberOfCylinders = DataPointUint16("NumberOfCylinders", self)
        self.NumberOfValvesPerCylinder = DataPointUint16("NumberOfValvesPerCylinder", self)
        self.OilLifeRemaining = DataPointInt32("OilLifeRemaining", self)
        self.Power = DataPointUint16("Power", self)
        self.Speed = DataPointUint16("Speed", self)
        self.StrokeLength = DataPointFloat("StrokeLength", self)
        self.TPS = DataPointUint8("TPS", self)
        self.Torque = DataPointUint16("Torque", self)
