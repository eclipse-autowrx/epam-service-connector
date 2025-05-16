#!/usr/bin/env python3

"""Lights model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointString,
    Model,
)

from vehicle.Body.Lights.Backup import Backup
from vehicle.Body.Lights.Beam import Beam
from vehicle.Body.Lights.Brake import Brake
from vehicle.Body.Lights.DirectionIndicator import DirectionIndicator
from vehicle.Body.Lights.Fog import Fog
from vehicle.Body.Lights.Hazard import Hazard
from vehicle.Body.Lights.LicensePlate import LicensePlate
from vehicle.Body.Lights.Parking import Parking
from vehicle.Body.Lights.Running import Running


class Lights(Model):
    """Lights model.

    Attributes
    ----------
    Backup: branch
        Backup lights.

        Unit: None
    Beam: branch
        Beam lights.

        Unit: None
    Brake: branch
        Brake lights.

        Unit: None
    DirectionIndicator: branch
        Indicator lights.

        Unit: None
    Fog: branch
        Fog lights.

        Unit: None
    Hazard: branch
        Hazard lights.

        Unit: None
    IsHighBeamSwitchOn: actuator
        Status of the high beam switch. True = high beam enabled. False = high beam not enabled.

        This signal indicates the status of the switch and does not indicate if low or high beam actually are on. That typically depends on vehicle logic and other signals like Lights.LightSwitch and Vehicle.LowVoltageSystemState.

        Unit: None
    LicensePlate: branch
        License plate lights.

        Unit: None
    LightSwitch: actuator
        Status of the vehicle main light switch.

        A vehicle typically does not support all alternatives. Which lights that actually are lit may vary according to vehicle configuration and local legislation. OFF is typically indicated by 0. POSITION is typically indicated by ISO 7000 symbol 0456. DAYTIME_RUNNING_LIGHTS (DRL) can be indicated by ISO 7000 symbol 2611. AUTO indicates that vehicle automatically selects suitable lights. BEAM is typically indicated by ISO 7000 symbol 0083.

        Unit: None
        Allowed values: OFF, POSITION, DAYTIME_RUNNING_LIGHTS, AUTO, BEAM
    Parking: branch
        Parking lights.

        Unit: None
    Running: branch
        Running lights.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Lights model."""
        super().__init__(parent)
        self.name = name

        self.Backup = Backup("Backup", self)
        self.Beam = Beam("Beam", self)
        self.Brake = Brake("Brake", self)
        self.DirectionIndicator = DirectionIndicator("DirectionIndicator", self)
        self.Fog = Fog("Fog", self)
        self.Hazard = Hazard("Hazard", self)
        self.IsHighBeamSwitchOn = DataPointBoolean("IsHighBeamSwitchOn", self)
        self.LicensePlate = LicensePlate("LicensePlate", self)
        self.LightSwitch = DataPointString("LightSwitch", self)
        self.Parking = Parking("Parking", self)
        self.Running = Running("Running", self)
