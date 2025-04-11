#!/usr/bin/env python3

"""ChargingPort model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    Model,
)

from vehicle.Powertrain.TractionBattery.Charging.ChargingPort.AnyPosition import AnyPosition
from vehicle.Powertrain.TractionBattery.Charging.ChargingPort.FrontLeft import FrontLeft
from vehicle.Powertrain.TractionBattery.Charging.ChargingPort.FrontMiddle import FrontMiddle
from vehicle.Powertrain.TractionBattery.Charging.ChargingPort.FrontRight import FrontRight
from vehicle.Powertrain.TractionBattery.Charging.ChargingPort.RearLeft import RearLeft
from vehicle.Powertrain.TractionBattery.Charging.ChargingPort.RearMiddle import RearMiddle
from vehicle.Powertrain.TractionBattery.Charging.ChargingPort.RearRight import RearRight


class ChargingPort(Model):
    """ChargingPort model.

    Attributes
    ----------
    AnyPosition: branch
        Properties related to a particular charging port available in the vehicle.

        If a vehicle has a single charging port, then use the instance AnyPosition.

        Unit: None
    FrontLeft: branch
        Properties related to a particular charging port available in the vehicle.

        If a vehicle has a single charging port, then use the instance AnyPosition.

        Unit: None
    FrontMiddle: branch
        Properties related to a particular charging port available in the vehicle.

        If a vehicle has a single charging port, then use the instance AnyPosition.

        Unit: None
    FrontRight: branch
        Properties related to a particular charging port available in the vehicle.

        If a vehicle has a single charging port, then use the instance AnyPosition.

        Unit: None
    RearLeft: branch
        Properties related to a particular charging port available in the vehicle.

        If a vehicle has a single charging port, then use the instance AnyPosition.

        Unit: None
    RearMiddle: branch
        Properties related to a particular charging port available in the vehicle.

        If a vehicle has a single charging port, then use the instance AnyPosition.

        Unit: None
    RearRight: branch
        Properties related to a particular charging port available in the vehicle.

        If a vehicle has a single charging port, then use the instance AnyPosition.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new ChargingPort model."""
        super().__init__(parent)
        self.name = name

        self.AnyPosition = AnyPosition("AnyPosition", self)
        self.FrontLeft = FrontLeft("FrontLeft", self)
        self.FrontMiddle = FrontMiddle("FrontMiddle", self)
        self.FrontRight = FrontRight("FrontRight", self)
        self.RearLeft = RearLeft("RearLeft", self)
        self.RearMiddle = RearMiddle("RearMiddle", self)
        self.RearRight = RearRight("RearRight", self)
