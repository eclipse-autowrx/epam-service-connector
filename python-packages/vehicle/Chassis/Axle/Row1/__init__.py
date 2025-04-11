#!/usr/bin/env python3

"""Row1 model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    DataPointUint16,
    DataPointUint8,
    Model,
)

from vehicle.Chassis.Axle.Row1.Wheel import Wheel


class Row1(Model):
    """Row1 model.

    Attributes
    ----------
    AxleWidth: attribute (uint16)
        The lateral distance between the wheel mounting faces, measured along the spindle axis.

        Corresponds to SAE J1100-2009 W113.

        Unit: mm
    SteeringAngle: sensor
        Single track two-axle model steering angle. Angle according to ISO 8855. Positive = degrees to the left. Negative = degrees to the right.

        Single track two-axle model steering angle refers to the angle that a centrally mounted wheel would have.

        Unit: degrees
    TireAspectRatio: attribute (uint8)
        Aspect ratio between tire section height and tire section width, as per ETRTO / TRA standard.

        Unit: percent
    TireDiameter: attribute (float)
        Outer diameter of tires, in inches, as per ETRTO / TRA standard.

        Unit: inch
    TireWidth: attribute (uint16)
        Nominal section width of tires, in mm, as per ETRTO / TRA standard.

        Unit: mm
    TrackWidth: attribute (uint16)
        The lateral distance between the centers of the wheels, measured along the spindle, or axle axis. If there are dual rear wheels, measure from the midway points between the inner and outer tires.

        Corresponds to SAE J1100-2009 W102.

        Unit: mm
    TreadWidth: attribute (uint16)
        The lateral distance between the centerlines of the base tires at ground, including camber angle. If there are dual rear wheels, measure from the midway points between the inner and outer tires.

        Corresponds to SAE J1100-2009 W101.

        Unit: mm
    Wheel: branch
        Wheel signals for axle

        Unit: None
    WheelCount: attribute (uint8)
        Number of wheels on the axle

        Unit: None
    WheelDiameter: attribute (float)
        Diameter of wheels (rims without tires), in inches, as per ETRTO / TRA standard.

        Unit: inch
    WheelWidth: attribute (float)
        Width of wheels (rims without tires), in inches, as per ETRTO / TRA standard.

        Unit: inch
    """

    def __init__(self, name, parent):
        """Create a new Row1 model."""
        super().__init__(parent)
        self.name = name

        self.AxleWidth = DataPointUint16("AxleWidth", self)
        self.SteeringAngle = DataPointFloat("SteeringAngle", self)
        self.TireAspectRatio = DataPointUint8("TireAspectRatio", self)
        self.TireDiameter = DataPointFloat("TireDiameter", self)
        self.TireWidth = DataPointUint16("TireWidth", self)
        self.TrackWidth = DataPointUint16("TrackWidth", self)
        self.TreadWidth = DataPointUint16("TreadWidth", self)
        self.Wheel = Wheel("Wheel", self)
        self.WheelCount = DataPointUint8("WheelCount", self)
        self.WheelDiameter = DataPointFloat("WheelDiameter", self)
        self.WheelWidth = DataPointFloat("WheelWidth", self)
