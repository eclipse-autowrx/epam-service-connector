#!/usr/bin/env python3

"""PassengerSide model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointFloat,
    DataPointInt8,
    DataPointUint16,
    DataPointUint8,
    Model,
)

from vehicle.Cabin.Seat.Row2.PassengerSide.Airbag import Airbag
from vehicle.Cabin.Seat.Row2.PassengerSide.Backrest import Backrest
from vehicle.Cabin.Seat.Row2.PassengerSide.Headrest import Headrest
from vehicle.Cabin.Seat.Row2.PassengerSide.Occupant import Occupant
from vehicle.Cabin.Seat.Row2.PassengerSide.Seating import Seating
from vehicle.Cabin.Seat.Row2.PassengerSide.Switch import Switch


class PassengerSide(Model):
    """PassengerSide model.

    Attributes
    ----------
    Airbag: branch
        Airbag signals.

        Unit: None
    Backrest: branch
        Describes signals related to the backrest of the seat.

        Unit: None
    Headrest: branch
        Headrest settings.

        Unit: None
    Heating: actuator
        Seat cooling / heating. 0 = off. -100 = max cold. +100 = max heat.

        Value range: [-100, 100]
        Unit: percent
    Height: actuator
        Seat position on vehicle z-axis. Position is relative within available movable range of the seating. 0 = Lowermost position supported.

        Value range: [0, ]
        Unit: mm
    IsBelted: sensor
        Is the belt engaged.

        Unit: None
    IsOccupied: sensor
        Does the seat have a passenger in it.

        Unit: None
    Massage: actuator
        Seat massage level. 0 = off. 100 = max massage.

        Value range: [0, 100]
        Unit: percent
    Occupant: branch
        Occupant data.

        Unit: None
    Position: actuator
        Seat position on vehicle x-axis. Position is relative to the frontmost position supported by the seat. 0 = Frontmost position supported.

        Value range: [0, ]
        Unit: mm
    Seating: branch
        Describes signals related to the seat bottom of the seat.

        Seating is here considered as the part of the seat that supports the thighs. Additional cushions (if any) for support of lower legs is not covered by this branch.

        Unit: None
    Switch: branch
        Seat switch signals

        Unit: None
    Tilt: actuator
        Tilting of seat (seating and backrest) relative to vehicle x-axis. 0 = seat bottom is flat, seat bottom and vehicle x-axis are parallel. Positive degrees = seat tilted backwards, seat x-axis tilted upward, seat z-axis is tilted backward.

        In VSS it is assumed that tilting a seat affects both seating (seat bottom) and backrest, i.e. the angle between seating and backrest will not be affected when changing Tilt.

        Unit: degrees
    """

    def __init__(self, name, parent):
        """Create a new PassengerSide model."""
        super().__init__(parent)
        self.name = name

        self.Airbag = Airbag("Airbag", self)
        self.Backrest = Backrest("Backrest", self)
        self.Headrest = Headrest("Headrest", self)
        self.Heating = DataPointInt8("Heating", self)
        self.Height = DataPointUint16("Height", self)
        self.IsBelted = DataPointBoolean("IsBelted", self)
        self.IsOccupied = DataPointBoolean("IsOccupied", self)
        self.Massage = DataPointUint8("Massage", self)
        self.Occupant = Occupant("Occupant", self)
        self.Position = DataPointUint16("Position", self)
        self.Seating = Seating("Seating", self)
        self.Switch = Switch("Switch", self)
        self.Tilt = DataPointFloat("Tilt", self)
