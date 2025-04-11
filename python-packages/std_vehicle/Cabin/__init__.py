#!/usr/bin/env python3

"""Cabin model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointString,
    DataPointUint8,
    DataPointUint8Array,
    Model,
)

from vehicle.Cabin.Convertible import Convertible
from vehicle.Cabin.Door import Door
from vehicle.Cabin.HVAC import HVAC
from vehicle.Cabin.Infotainment import Infotainment
from vehicle.Cabin.Light import Light
from vehicle.Cabin.RearShade import RearShade
from vehicle.Cabin.RearviewMirror import RearviewMirror
from vehicle.Cabin.Seat import Seat
from vehicle.Cabin.Sunroof import Sunroof


class Cabin(Model):
    """Cabin model.

    Attributes
    ----------
    Convertible: branch
        Convertible roof.

        Unit: None
    Door: branch
        All doors, including windows and switches.

        Unit: None
    DoorCount: attribute (uint8)
        Number of doors in vehicle.

        Unit: None
    DriverPosition: attribute (string)
        The position of the driver seat in row 1.

        Some signals use DriverSide and PassengerSide as instances. If this signal specifies that DriverPosition is LEFT or MIDDLE, then DriverSide refers to left side and PassengerSide to right side. If this signal specifies that DriverPosition is RIGHT, then DriverSide refers to right side and PassengerSide to left side.

        Unit: None
        Allowed values: LEFT, MIDDLE, RIGHT
    HVAC: branch
        Climate control

        Unit: None
    Infotainment: branch
        Infotainment system.

        Unit: None
    IsWindowChildLockEngaged: actuator
        Is window child lock engaged. True = Engaged. False = Disengaged.

        Window child lock refers to the functionality to disable the move window button next to most windows, so that they only can be operated by the driver.

        Unit: None
    Light: branch
        Light that is part of the Cabin.

        V4.0 branch renamed from "Lights" to "Light" to comply with singular naming of entities. Use SingleConfigurableLight.vspec to describe interior lights that can be configured.

        Unit: None
    PowerOptimizeLevel: actuator
        Power optimization level for this branch/subsystem. A higher number indicates more aggressive power optimization. Level 0 indicates that all functionality is enabled, no power optimization enabled. Level 10 indicates most aggressive power optimization mode, only essential functionality enabled.

        Value range: [0, 10]
        Unit: None
    RearShade: branch
        Rear window shade.

        Unit: None
    RearviewMirror: branch
        Rear-view mirror.

        Unit: None
    Seat: branch
        All seats.

        Unit: None
    SeatPosCount: attribute (uint8[])
        Number of seats across each row from the front to the rear.

        Default value corresponds to two seats in front row and 3 seats in second row.

        Unit: None
    SeatRowCount: attribute (uint8)
        Number of seat rows in vehicle.

        Default value corresponds to two rows of seats.

        Unit: None
    Sunroof: branch
        Sun roof status.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Cabin model."""
        super().__init__(parent)
        self.name = name

        self.Convertible = Convertible("Convertible", self)
        self.Door = Door("Door", self)
        self.DoorCount = DataPointUint8("DoorCount", self)
        self.DriverPosition = DataPointString("DriverPosition", self)
        self.HVAC = HVAC("HVAC", self)
        self.Infotainment = Infotainment("Infotainment", self)
        self.IsWindowChildLockEngaged = DataPointBoolean("IsWindowChildLockEngaged", self)
        self.Light = Light("Light", self)
        self.PowerOptimizeLevel = DataPointUint8("PowerOptimizeLevel", self)
        self.RearShade = RearShade("RearShade", self)
        self.RearviewMirror = RearviewMirror("RearviewMirror", self)
        self.Seat = Seat("Seat", self)
        self.SeatPosCount = DataPointUint8Array("SeatPosCount", self)
        self.SeatRowCount = DataPointUint8("SeatRowCount", self)
        self.Sunroof = Sunroof("Sunroof", self)
