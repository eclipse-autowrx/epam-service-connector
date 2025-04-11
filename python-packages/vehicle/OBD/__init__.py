#!/usr/bin/env python3

"""OBD model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointFloat,
    DataPointString,
    DataPointStringArray,
    DataPointUint8,
    Model,
)

from vehicle.OBD.Catalyst import Catalyst
from vehicle.OBD.DriveCycleStatus import DriveCycleStatus
from vehicle.OBD.O2 import O2
from vehicle.OBD.O2WR import O2WR
from vehicle.OBD.Status import Status


class OBD(Model):
    """OBD model.

    Attributes
    ----------
    AbsoluteLoad: sensor
        PID 43 - Absolute load value

        Unit: percent
    AcceleratorPositionD: sensor
        PID 49 - Accelerator pedal position D

        Unit: percent
    AcceleratorPositionE: sensor
        PID 4A - Accelerator pedal position E

        Unit: percent
    AcceleratorPositionF: sensor
        PID 4B - Accelerator pedal position F

        Unit: percent
    AirStatus: sensor
        PID 12 - Secondary air status

        Unit: None
    AmbientAirTemperature: sensor
        PID 46 - Ambient air temperature

        Unit: celsius
    BarometricPressure: sensor
        PID 33 - Barometric pressure

        Unit: kPa
    Catalyst: branch
        Catalyst signals

        Unit: None
    CommandedEGR: sensor
        PID 2C - Commanded exhaust gas recirculation (EGR)

        Unit: percent
    CommandedEVAP: sensor
        PID 2E - Commanded evaporative purge (EVAP) valve

        Unit: percent
    CommandedEquivalenceRatio: sensor
        PID 44 - Commanded equivalence ratio

        Unit: ratio
    ControlModuleVoltage: sensor
        PID 42 - Control module voltage

        Unit: V
    CoolantTemperature: sensor
        PID 05 - Coolant temperature

        Unit: celsius
    DTCList: sensor
        List of currently active DTCs formatted according OBD II (SAE-J2012DA_201812) standard ([P|C|B|U]XXXXX )

        Unit: None
    DistanceSinceDTCClear: sensor
        PID 31 - Distance traveled since codes cleared

        Unit: km
    DistanceWithMIL: sensor
        PID 21 - Distance traveled with MIL on

        Unit: km
    DriveCycleStatus: branch
        PID 41 - OBD status for the current drive cycle

        Unit: None
    EGRError: sensor
        PID 2D - Exhaust gas recirculation (EGR) error

        Unit: percent
    EVAPVaporPressure: sensor
        PID 32 - Evaporative purge (EVAP) system pressure

        Unit: Pa
    EVAPVaporPressureAbsolute: sensor
        PID 53 - Absolute evaporative purge (EVAP) system pressure

        Unit: kPa
    EVAPVaporPressureAlternate: sensor
        PID 54 - Alternate evaporative purge (EVAP) system pressure

        Unit: Pa
    EngineLoad: sensor
        PID 04 - Engine load in percent - 0 = no load, 100 = full load

        Unit: percent
    EngineSpeed: sensor
        PID 0C - Engine speed measured as rotations per minute

        Unit: rpm
    EthanolPercent: sensor
        PID 52 - Percentage of ethanol in the fuel

        Unit: percent
    FreezeDTC: sensor
        PID 02 - DTC that triggered the freeze frame

        Unit: None
    FuelInjectionTiming: sensor
        PID 5D - Fuel injection timing

        Unit: degrees
    FuelLevel: sensor
        PID 2F - Fuel level in the fuel tank

        Unit: percent
    FuelPressure: sensor
        PID 0A - Fuel pressure

        Unit: kPa
    FuelRailPressureAbsolute: sensor
        PID 59 - Absolute fuel rail pressure

        Unit: kPa
    FuelRailPressureDirect: sensor
        PID 23 - Fuel rail pressure direct inject

        Unit: kPa
    FuelRailPressureVac: sensor
        PID 22 - Fuel rail pressure relative to vacuum

        Unit: kPa
    FuelRate: sensor
        PID 5E - Engine fuel rate

        Unit: l/h
    FuelStatus: sensor
        PID 03 - Fuel status

        Unit: None
    FuelType: attribute (uint8)
        PID 51 - Fuel type

        Value range: [0, 23]
        Unit: None
    HybridBatteryRemaining: sensor
        PID 5B - Remaining life of hybrid battery

        Unit: percent
    IntakeTemp: sensor
        PID 0F - Intake temperature

        Unit: celsius
    IsPTOActive: sensor
        PID 1E - Auxiliary input status (power take off)

        Unit: None
    LongTermFuelTrim1: sensor
        PID 07 - Long Term (learned) Fuel Trim - Bank 1 - negative percent leaner, positive percent richer

        Unit: percent
    LongTermFuelTrim2: sensor
        PID 09 - Long Term (learned) Fuel Trim - Bank 2 - negative percent leaner, positive percent richer

        Unit: percent
    LongTermO2Trim1: sensor
        PID 56 (byte A) - Long term secondary O2 trim - Bank 1

        Unit: percent
    LongTermO2Trim2: sensor
        PID 58 (byte A) - Long term secondary O2 trim - Bank 2

        Unit: percent
    LongTermO2Trim3: sensor
        PID 56 (byte B) - Long term secondary O2 trim - Bank 3

        Unit: percent
    LongTermO2Trim4: sensor
        PID 58 (byte B) - Long term secondary O2 trim - Bank 4

        Unit: percent
    MAF: sensor
        PID 10 - Grams of air drawn into engine per second

        Unit: g/s
    MAP: sensor
        PID 0B - Intake manifold pressure

        Unit: kPa
    MaxMAF: sensor
        PID 50 - Maximum flow for mass air flow sensor

        Unit: g/s
    O2: branch
        Oxygen sensors (PID 14 - PID 1B)

        Unit: None
    O2WR: branch
        Wide range/band oxygen sensors (PID 24 - 2B and PID 34 - 3B)

        Unit: None
    OBDStandards: attribute (uint8)
        PID 1C - OBD standards this vehicle conforms to

        Unit: None
    OilTemperature: sensor
        PID 5C - Engine oil temperature

        Unit: celsius
    OxygenSensorsIn2Banks: sensor
        PID 13 - Presence of oxygen sensors in 2 banks. [A0..A3] == Bank 1, Sensors 1-4. [A4..A7] == Bank 2, Sensors 1-4

        Unit: None
    OxygenSensorsIn4Banks: sensor
        PID 1D - Presence of oxygen sensors in 4 banks. Similar to PID 13, but [A0..A7] == [B1S1, B1S2, B2S1, B2S2, B3S1, B3S2, B4S1, B4S2]

        Unit: None
    PidsA: attribute (string[])
        PID 00 - Array of the supported PIDs 01 to 20 in Hexadecimal.

        Unit: None
        Allowed values: 01, 02, 03, 04, 05, 06, 07, 08, 09, 0A, 0B, 0C, 0D, 0E, 0F, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 1A, 1B, 1C, 1D, 1E, 1F, 20
    PidsB: attribute (string[])
        PID 20 - Array of the supported PIDs 21 to 40 in Hexadecimal.

        Unit: None
        Allowed values: 21, 22, 23, 24, 25, 26, 27, 28, 29, 2A, 2B, 2C, 2D, 2E, 2F, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 3A, 3B, 3C, 3D, 3E, 3F, 40
    PidsC: attribute (string[])
        PID 40 - Array of the supported PIDs 41 to 60 in Hexadecimal.

        Unit: None
        Allowed values: 41, 42, 43, 44, 45, 46, 47, 48, 49, 4A, 4B, 4C, 4D, 4E, 4F, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 5A, 5B, 5C, 5D, 5E, 5F, 60
    RelativeAcceleratorPosition: sensor
        PID 5A - Relative accelerator pedal position

        Unit: percent
    RelativeThrottlePosition: sensor
        PID 45 - Relative throttle position

        Unit: percent
    RunTime: sensor
        PID 1F - Engine run time

        Unit: s
    RunTimeMIL: sensor
        PID 4D - Run time with MIL on

        Unit: min
    ShortTermFuelTrim1: sensor
        PID 06 - Short Term (immediate) Fuel Trim - Bank 1 - negative percent leaner, positive percent richer

        Unit: percent
    ShortTermFuelTrim2: sensor
        PID 08 - Short Term (immediate) Fuel Trim - Bank 2 - negative percent leaner, positive percent richer

        Unit: percent
    ShortTermO2Trim1: sensor
        PID 55 (byte A) - Short term secondary O2 trim - Bank 1

        Unit: percent
    ShortTermO2Trim2: sensor
        PID 57 (byte A) - Short term secondary O2 trim - Bank 2

        Unit: percent
    ShortTermO2Trim3: sensor
        PID 55 (byte B) - Short term secondary O2 trim - Bank 3

        Unit: percent
    ShortTermO2Trim4: sensor
        PID 57 (byte B) - Short term secondary O2 trim - Bank 4

        Unit: percent
    Speed: sensor
        PID 0D - Vehicle speed

        Unit: km/h
    Status: branch
        PID 01 - OBD status

        Unit: None
    ThrottleActuator: sensor
        PID 4C - Commanded throttle actuator

        Unit: percent
    ThrottlePosition: sensor
        PID 11 - Throttle position - 0 = closed throttle, 100 = open throttle

        Unit: percent
    ThrottlePositionB: sensor
        PID 47 - Absolute throttle position B

        Unit: percent
    ThrottlePositionC: sensor
        PID 48 - Absolute throttle position C

        Unit: percent
    TimeSinceDTCCleared: sensor
        PID 4E - Time since trouble codes cleared

        Unit: min
    TimingAdvance: sensor
        PID 0E - Time advance

        Unit: degrees
    WarmupsSinceDTCClear: sensor
        PID 30 - Number of warm-ups since codes cleared

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new OBD model."""
        super().__init__(parent)
        self.name = name

        self.AbsoluteLoad = DataPointFloat("AbsoluteLoad", self)
        self.AcceleratorPositionD = DataPointFloat("AcceleratorPositionD", self)
        self.AcceleratorPositionE = DataPointFloat("AcceleratorPositionE", self)
        self.AcceleratorPositionF = DataPointFloat("AcceleratorPositionF", self)
        self.AirStatus = DataPointString("AirStatus", self)
        self.AmbientAirTemperature = DataPointFloat("AmbientAirTemperature", self)
        self.BarometricPressure = DataPointFloat("BarometricPressure", self)
        self.Catalyst = Catalyst("Catalyst", self)
        self.CommandedEGR = DataPointFloat("CommandedEGR", self)
        self.CommandedEVAP = DataPointFloat("CommandedEVAP", self)
        self.CommandedEquivalenceRatio = DataPointFloat("CommandedEquivalenceRatio", self)
        self.ControlModuleVoltage = DataPointFloat("ControlModuleVoltage", self)
        self.CoolantTemperature = DataPointFloat("CoolantTemperature", self)
        self.DTCList = DataPointStringArray("DTCList", self)
        self.DistanceSinceDTCClear = DataPointFloat("DistanceSinceDTCClear", self)
        self.DistanceWithMIL = DataPointFloat("DistanceWithMIL", self)
        self.DriveCycleStatus = DriveCycleStatus("DriveCycleStatus", self)
        self.EGRError = DataPointFloat("EGRError", self)
        self.EVAPVaporPressure = DataPointFloat("EVAPVaporPressure", self)
        self.EVAPVaporPressureAbsolute = DataPointFloat("EVAPVaporPressureAbsolute", self)
        self.EVAPVaporPressureAlternate = DataPointFloat("EVAPVaporPressureAlternate", self)
        self.EngineLoad = DataPointFloat("EngineLoad", self)
        self.EngineSpeed = DataPointFloat("EngineSpeed", self)
        self.EthanolPercent = DataPointFloat("EthanolPercent", self)
        self.FreezeDTC = DataPointString("FreezeDTC", self)
        self.FuelInjectionTiming = DataPointFloat("FuelInjectionTiming", self)
        self.FuelLevel = DataPointFloat("FuelLevel", self)
        self.FuelPressure = DataPointFloat("FuelPressure", self)
        self.FuelRailPressureAbsolute = DataPointFloat("FuelRailPressureAbsolute", self)
        self.FuelRailPressureDirect = DataPointFloat("FuelRailPressureDirect", self)
        self.FuelRailPressureVac = DataPointFloat("FuelRailPressureVac", self)
        self.FuelRate = DataPointFloat("FuelRate", self)
        self.FuelStatus = DataPointString("FuelStatus", self)
        self.FuelType = DataPointUint8("FuelType", self)
        self.HybridBatteryRemaining = DataPointFloat("HybridBatteryRemaining", self)
        self.IntakeTemp = DataPointFloat("IntakeTemp", self)
        self.IsPTOActive = DataPointBoolean("IsPTOActive", self)
        self.LongTermFuelTrim1 = DataPointFloat("LongTermFuelTrim1", self)
        self.LongTermFuelTrim2 = DataPointFloat("LongTermFuelTrim2", self)
        self.LongTermO2Trim1 = DataPointFloat("LongTermO2Trim1", self)
        self.LongTermO2Trim2 = DataPointFloat("LongTermO2Trim2", self)
        self.LongTermO2Trim3 = DataPointFloat("LongTermO2Trim3", self)
        self.LongTermO2Trim4 = DataPointFloat("LongTermO2Trim4", self)
        self.MAF = DataPointFloat("MAF", self)
        self.MAP = DataPointFloat("MAP", self)
        self.MaxMAF = DataPointFloat("MaxMAF", self)
        self.O2 = O2("O2", self)
        self.O2WR = O2WR("O2WR", self)
        self.OBDStandards = DataPointUint8("OBDStandards", self)
        self.OilTemperature = DataPointFloat("OilTemperature", self)
        self.OxygenSensorsIn2Banks = DataPointUint8("OxygenSensorsIn2Banks", self)
        self.OxygenSensorsIn4Banks = DataPointUint8("OxygenSensorsIn4Banks", self)
        self.PidsA = DataPointStringArray("PidsA", self)
        self.PidsB = DataPointStringArray("PidsB", self)
        self.PidsC = DataPointStringArray("PidsC", self)
        self.RelativeAcceleratorPosition = DataPointFloat("RelativeAcceleratorPosition", self)
        self.RelativeThrottlePosition = DataPointFloat("RelativeThrottlePosition", self)
        self.RunTime = DataPointFloat("RunTime", self)
        self.RunTimeMIL = DataPointFloat("RunTimeMIL", self)
        self.ShortTermFuelTrim1 = DataPointFloat("ShortTermFuelTrim1", self)
        self.ShortTermFuelTrim2 = DataPointFloat("ShortTermFuelTrim2", self)
        self.ShortTermO2Trim1 = DataPointFloat("ShortTermO2Trim1", self)
        self.ShortTermO2Trim2 = DataPointFloat("ShortTermO2Trim2", self)
        self.ShortTermO2Trim3 = DataPointFloat("ShortTermO2Trim3", self)
        self.ShortTermO2Trim4 = DataPointFloat("ShortTermO2Trim4", self)
        self.Speed = DataPointFloat("Speed", self)
        self.Status = Status("Status", self)
        self.ThrottleActuator = DataPointFloat("ThrottleActuator", self)
        self.ThrottlePosition = DataPointFloat("ThrottlePosition", self)
        self.ThrottlePositionB = DataPointFloat("ThrottlePositionB", self)
        self.ThrottlePositionC = DataPointFloat("ThrottlePositionC", self)
        self.TimeSinceDTCCleared = DataPointFloat("TimeSinceDTCCleared", self)
        self.TimingAdvance = DataPointFloat("TimingAdvance", self)
        self.WarmupsSinceDTCClear = DataPointUint8("WarmupsSinceDTCClear", self)
