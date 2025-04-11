#!/usr/bin/env python3

"""SteeringWheel model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointInt16,
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
    Tilt: actuator
        Steering wheel column tilt. 0 = Lowest position. 100 = Highest position.

        Value range: [0, 100]
        Unit: percent
    """

    def __init__(self, name, parent):
        """Create a new SteeringWheel model."""
        super().__init__(parent)
        self.name = name

        self.Angle = DataPointInt16("Angle", self)
        self.Extension = DataPointUint8("Extension", self)
        self.Tilt = DataPointUint8("Tilt", self)
