#!/usr/bin/env python3

"""Vehicle model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointFloat,
    DataPointInt16,
    DataPointString,
    DataPointUint16,
    DataPointUint8,
    Model,
)

from vehicle.ADAS import ADAS
from vehicle.Acceleration import Acceleration
from vehicle.AngularVelocity import AngularVelocity
from vehicle.Body import Body
from vehicle.Cabin import Cabin
from vehicle.Chassis import Chassis
from vehicle.Connectivity import Connectivity
from vehicle.CurrentLocation import CurrentLocation
from vehicle.Driver import Driver
from vehicle.Exterior import Exterior
from vehicle.LowVoltageBattery import LowVoltageBattery
from vehicle.OBD import OBD
from vehicle.Powertrain import Powertrain
from vehicle.Service import Service
from vehicle.Trailer import Trailer
from vehicle.VehicleIdentification import VehicleIdentification
from vehicle.VersionVSS import VersionVSS


class Vehicle(Model):
    """Vehicle model.

    Attributes
    ----------
    ADAS: branch
        All Advanced Driver Assist Systems data.

        Unit: None
    Acceleration: branch
        Spatial acceleration. Axis definitions according to ISO 8855.

        Unit: None
    AngularVelocity: branch
        Spatial rotation. Axis definitions according to ISO 8855.

        Unit: None
    AverageSpeed: sensor
        Average speed for the current trip.

        A new trip is considered to start when engine gets enabled (e.g. LowVoltageSystemState in ON or START mode). A trip is considered to end when engine is no longer enabled. The signal may however keep the value of the last trip until a new trip is started. Calculation of average speed may exclude periods when the vehicle for example is not moving or transmission is in neutral.

        Unit: km/h
    Body: branch
        All body components.

        Unit: None
    Cabin: branch
        All in-cabin components, including doors.

        Unit: None
    CargoVolume: attribute (float)
        The available volume for cargo or luggage. For automobiles, this is usually the trunk volume.

        Value range: [0, ]
        Unit: l
    Chassis: branch
        All data concerning steering, suspension, wheels, and brakes.

        Unit: None
    Connectivity: branch
        Connectivity data.

        Unit: None
    CurbWeight: attribute (uint16)
        Vehicle curb weight, including all liquids and full tank of fuel, but no cargo or passengers.

        Unit: kg
    CurrentLocation: branch
        The current latitude and longitude of the vehicle.

        Unit: None
    CurrentOverallWeight: sensor
        Current overall Vehicle weight. Including passengers, cargo and other load inside the car.

        Unit: kg
    Driver: branch
        Driver data.

        Unit: None
    EmissionsCO2: attribute (int16)
        The CO2 emissions.

        Unit: g/km
    Exterior: branch
        Information about exterior measured by vehicle.

        Unit: None
    GrossWeight: attribute (uint16)
        Curb weight of vehicle, including all liquids and full tank of fuel and full load of cargo and passengers.

        Unit: kg
    Height: attribute (uint16)
        Overall vehicle height.

        Unit: mm
    IsBrokenDown: sensor
        Vehicle breakdown or any similar event causing vehicle to stop on the road, that might pose a risk to other road users. True = Vehicle broken down on the road, due to e.g. engine problems, flat tire, out of gas, brake problems. False = Vehicle not broken down.

        Actual criteria and method used to decide if a vehicle is broken down is implementation specific.

        Unit: None
    IsMoving: sensor
        Indicates whether the vehicle is stationary or moving.

        Unit: None
    Length: attribute (uint16)
        Overall vehicle length.

        Unit: mm
    LowVoltageBattery: branch
        Signals related to low voltage battery.

        Unit: None
    LowVoltageSystemState: sensor
        State of the supply voltage of the control units (usually 12V).

        Unit: None
        Allowed values: UNDEFINED, LOCK, OFF, ACC, ON, START
    MaxTowBallWeight: attribute (uint16)
        Maximum vertical weight on the tow ball of a trailer.

        Unit: kg
    MaxTowWeight: attribute (uint16)
        Maximum weight of trailer.

        Unit: kg
    OBD: branch
        OBD data.

        Unit: None
    PowerOptimizeLevel: actuator
        Power optimization level for this branch/subsystem. A higher number indicates more aggressive power optimization. Level 0 indicates that all functionality is enabled, no power optimization enabled. Level 10 indicates most aggressive power optimization mode, only essential functionality enabled.

        Value range: [0, 10]
        Unit: None
    Powertrain: branch
        Powertrain data for battery management, etc.

        Unit: None
    RoofLoad: attribute (int16)
        The permitted total weight of cargo and installations (e.g. a roof rack) on top of the vehicle.

        Unit: kg
    Service: branch
        Service data.

        Unit: None
    Speed: sensor
        Vehicle speed.

        Unit: km/h
    StartTime: attribute (string)
        Start time of current or latest trip, formatted according to ISO 8601 with UTC time zone.

        This signal is supposed to be set whenever a new trip starts. A new trip is considered to start when engine gets enabled (e.g. LowVoltageSystemState in ON or START mode). A trip is considered to end when engine is no longer enabled. The default value indicates that the vehicle never has been started, or that latest start time is unknown.

        Unit: None
    Trailer: branch
        Trailer signals.

        Unit: None
    TraveledDistance: sensor
        Odometer reading, total distance traveled during the lifetime of the vehicle.

        Unit: km
    TraveledDistanceSinceStart: sensor
        Distance traveled since start of current trip.

        A new trip is considered to start when engine gets enabled (e.g. LowVoltageSystemState in ON or START mode). A trip is considered to end when engine is no longer enabled. The signal may however keep the value of the last trip until a new trip is started.

        Unit: km
    TripDuration: sensor
        Duration of latest trip.

        This signal is not assumed to be continuously updated, but instead set to 0 when a trip starts and set to the actual duration of the trip when a trip ends. A new trip is considered to start when engine gets enabled (e.g. LowVoltageSystemState in ON or START mode). A trip is considered to end when engine is no longer enabled.

        Unit: s
    TripMeterReading: actuator
        Trip meter reading.

        The trip meter is an odometer that can be manually reset by the driver

        Unit: km
    VehicleIdentification: branch
        Attributes that identify a vehicle.

        Unit: None
    VersionVSS: branch
        Supported Version of VSS.

        Unit: None
    Width: attribute (uint16)
        Overall vehicle width.

        Unit: mm
    """

    def __init__(self, name):
        """Create a new Vehicle model."""
        super().__init__()
        self.name = name

        self.ADAS = ADAS("ADAS", self)
        self.Acceleration = Acceleration("Acceleration", self)
        self.AngularVelocity = AngularVelocity("AngularVelocity", self)
        self.AverageSpeed = DataPointFloat("AverageSpeed", self)
        self.Body = Body("Body", self)
        self.Cabin = Cabin("Cabin", self)
        self.CargoVolume = DataPointFloat("CargoVolume", self)
        self.Chassis = Chassis("Chassis", self)
        self.Connectivity = Connectivity("Connectivity", self)
        self.CurbWeight = DataPointUint16("CurbWeight", self)
        self.CurrentLocation = CurrentLocation("CurrentLocation", self)
        self.CurrentOverallWeight = DataPointUint16("CurrentOverallWeight", self)
        self.Driver = Driver("Driver", self)
        self.EmissionsCO2 = DataPointInt16("EmissionsCO2", self)
        self.Exterior = Exterior("Exterior", self)
        self.GrossWeight = DataPointUint16("GrossWeight", self)
        self.Height = DataPointUint16("Height", self)
        self.IsBrokenDown = DataPointBoolean("IsBrokenDown", self)
        self.IsMoving = DataPointBoolean("IsMoving", self)
        self.Length = DataPointUint16("Length", self)
        self.LowVoltageBattery = LowVoltageBattery("LowVoltageBattery", self)
        self.LowVoltageSystemState = DataPointString("LowVoltageSystemState", self)
        self.MaxTowBallWeight = DataPointUint16("MaxTowBallWeight", self)
        self.MaxTowWeight = DataPointUint16("MaxTowWeight", self)
        self.OBD = OBD("OBD", self)
        self.PowerOptimizeLevel = DataPointUint8("PowerOptimizeLevel", self)
        self.Powertrain = Powertrain("Powertrain", self)
        self.RoofLoad = DataPointInt16("RoofLoad", self)
        self.Service = Service("Service", self)
        self.Speed = DataPointFloat("Speed", self)
        self.StartTime = DataPointString("StartTime", self)
        self.Trailer = Trailer("Trailer", self)
        self.TraveledDistance = DataPointFloat("TraveledDistance", self)
        self.TraveledDistanceSinceStart = DataPointFloat("TraveledDistanceSinceStart", self)
        self.TripDuration = DataPointFloat("TripDuration", self)
        self.TripMeterReading = DataPointFloat("TripMeterReading", self)
        self.VehicleIdentification = VehicleIdentification("VehicleIdentification", self)
        self.VersionVSS = VersionVSS("VersionVSS", self)
        self.Width = DataPointUint16("Width", self)


vehicle = Vehicle("Vehicle")
