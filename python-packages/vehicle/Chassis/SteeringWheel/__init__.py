#!/usr/bin/env python3

"""SteeringWheel model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointInt16,
    DataPointInt8,
    DataPointString,
    DataPointUint8,
    Model,
)


class SteeringWheel(Model):
    """SteeringWheel model.

    Attributes
    ----------
    Angle: sensor
        Steering wheel angle. Positive = degrees to the left. Negative = degrees to the right.

        Unit: degrees
    Extension: actuator
        Steering wheel column extension from dashboard. 0 = Closest to dashboard. 100 = Furthest from dashboard.

        Value range: [0, 100]
        Unit: percent
    HeatingCooling: actuator
        Heating or Cooling requsted for the Item. -100 = Maximum cooling, 0 = Heating/cooling deactivated, 100 = Maximum heating.

        Value range: [-100, 100]
        Unit: percent
    Tilt: actuator
        Steering wheel column tilt. 0 = Lowest position. 100 = Highest position.

        Value range: [0, 100]
        Unit: percent
    Position: attribute (string)
        Position of the steering wheel on the left or right side of the vehicle.

        Unit: None
        Allowed values: FRONT_LEFT, FRONT_RIGHT
    """

    def __init__(self, name, parent):
        """Create a new SteeringWheel model."""
        super().__init__(parent)
        self.name = name

        self.Angle = DataPointInt16("Angle", self)
        self.Extension = DataPointUint8("Extension", self)
        self.HeatingCooling = DataPointInt8("HeatingCooling", self)
        self.Tilt = DataPointUint8("Tilt", self)
        self.Position = DataPointString("Position", self)
