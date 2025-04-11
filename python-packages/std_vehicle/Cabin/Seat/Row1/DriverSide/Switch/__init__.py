#!/usr/bin/env python3

"""Switch model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    Model,
)

from vehicle.Cabin.Seat.Row1.DriverSide.Switch.Backrest import Backrest
from vehicle.Cabin.Seat.Row1.DriverSide.Switch.Headrest import Headrest
from vehicle.Cabin.Seat.Row1.DriverSide.Switch.Massage import Massage
from vehicle.Cabin.Seat.Row1.DriverSide.Switch.Seating import Seating


class Switch(Model):
    """Switch model.

    Attributes
    ----------
    Backrest: branch
        Describes switches related to the backrest of the seat.

        Unit: None
    Headrest: branch
        Switches for SingleSeat.Headrest.

        Unit: None
    IsBackwardEngaged: actuator
        Seat backward switch engaged (SingleSeat.Position).

        Unit: None
    IsCoolerEngaged: actuator
        Cooler switch for Seat heater (SingleSeat.Heating).

        Unit: None
    IsDownEngaged: actuator
        Seat down switch engaged (SingleSeat.Height).

        Unit: None
    IsForwardEngaged: actuator
        Seat forward switch engaged (SingleSeat.Position).

        Unit: None
    IsTiltBackwardEngaged: actuator
        Tilt backward switch engaged (SingleSeat.Tilt).

        Unit: None
    IsTiltForwardEngaged: actuator
        Tilt forward switch engaged (SingleSeat.Tilt).

        Unit: None
    IsUpEngaged: actuator
        Seat up switch engaged (SingleSeat.Height).

        Unit: None
    IsWarmerEngaged: actuator
        Warmer switch for Seat heater (SingleSeat.Heating).

        Unit: None
    Massage: branch
        Switches for SingleSeat.Massage.

        Unit: None
    Seating: branch
        Describes switches related to the seating of the seat.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Switch model."""
        super().__init__(parent)
        self.name = name

        self.Backrest = Backrest("Backrest", self)
        self.Headrest = Headrest("Headrest", self)
        self.IsBackwardEngaged = DataPointBoolean("IsBackwardEngaged", self)
        self.IsCoolerEngaged = DataPointBoolean("IsCoolerEngaged", self)
        self.IsDownEngaged = DataPointBoolean("IsDownEngaged", self)
        self.IsForwardEngaged = DataPointBoolean("IsForwardEngaged", self)
        self.IsTiltBackwardEngaged = DataPointBoolean("IsTiltBackwardEngaged", self)
        self.IsTiltForwardEngaged = DataPointBoolean("IsTiltForwardEngaged", self)
        self.IsUpEngaged = DataPointBoolean("IsUpEngaged", self)
        self.IsWarmerEngaged = DataPointBoolean("IsWarmerEngaged", self)
        self.Massage = Massage("Massage", self)
        self.Seating = Seating("Seating", self)
