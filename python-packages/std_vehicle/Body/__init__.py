#!/usr/bin/env python3

"""Body model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    DataPointString,
    DataPointUint8,
    Model,
)

from vehicle.Body.Hood import Hood
from vehicle.Body.Horn import Horn
from vehicle.Body.Lights import Lights
from vehicle.Body.Mirrors import Mirrors
from vehicle.Body.Raindetection import Raindetection
from vehicle.Body.Trunk import Trunk
from vehicle.Body.Windshield import Windshield


class Body(Model):
    """Body model.

    Attributes
    ----------
    BodyType: attribute (string)
        Body type code as defined by ISO 3779.

        Unit: None
    Hood: branch
        Hood status.

        The hood is the hinged cover over the engine compartment of a motor vehicles. Depending on vehicle, it can be either in the front or back of the vehicle. Luggage compartments are in VSS called trunks, even if they are located at the front of the vehicle.

        Unit: None
    Horn: branch
        Horn signals.

        Unit: None
    Lights: branch
        Exterior lights.

        Unit: None
    Mirrors: branch
        All mirrors.

        Unit: None
    PowerOptimizeLevel: actuator
        Power optimization level for this branch/subsystem. A higher number indicates more aggressive power optimization. Level 0 indicates that all functionality is enabled, no power optimization enabled. Level 10 indicates most aggressive power optimization mode, only essential functionality enabled.

        Value range: [0, 10]
        Unit: None
    Raindetection: branch
        Rain sensor signals.

        Unit: None
    RearMainSpoilerPosition: actuator
        Rear spoiler position, 0% = Spoiler fully stowed. 100% = Spoiler fully exposed.

        Value range: [0, 100]
        Unit: percent
    RefuelPosition: attribute (string)
        Location of the fuel cap or charge port.

        Unit: None
        Allowed values: FRONT_LEFT, FRONT_RIGHT, MIDDLE_LEFT, MIDDLE_RIGHT, REAR_LEFT, REAR_RIGHT
    Trunk: branch
        Trunk status.

        A trunk is a luggage compartment in a vehicle. Depending on vehicle, it can be either in the front or back of the vehicle. Some vehicles may have trunks both at the front and at the rear of the vehicle.

        Unit: None
    Windshield: branch
        Windshield signals.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Body model."""
        super().__init__(parent)
        self.name = name

        self.BodyType = DataPointString("BodyType", self)
        self.Hood = Hood("Hood", self)
        self.Horn = Horn("Horn", self)
        self.Lights = Lights("Lights", self)
        self.Mirrors = Mirrors("Mirrors", self)
        self.PowerOptimizeLevel = DataPointUint8("PowerOptimizeLevel", self)
        self.Raindetection = Raindetection("Raindetection", self)
        self.RearMainSpoilerPosition = DataPointFloat("RearMainSpoilerPosition", self)
        self.RefuelPosition = DataPointString("RefuelPosition", self)
        self.Trunk = Trunk("Trunk", self)
        self.Windshield = Windshield("Windshield", self)
