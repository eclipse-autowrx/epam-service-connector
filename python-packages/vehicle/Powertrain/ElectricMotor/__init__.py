#!/usr/bin/env python3

"""ElectricMotor model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    DataPointInt16,
    DataPointInt32,
    DataPointString,
    DataPointUint16,
    Model,
)

from vehicle.Powertrain.ElectricMotor.EngineCoolant import EngineCoolant


class ElectricMotor(Model):
    """ElectricMotor model.

    Attributes
    ----------
    CoolantTemperature: sensor
        Motor coolant temperature (if applicable).

        Unit: celsius
    EngineCode: attribute (string)
        Engine code designation, as specified by vehicle manufacturer.

        Unit: None
    EngineCoolant: branch
        Signals related to the engine coolant (if applicable).

        Unit: None
    MaxPower: attribute (uint16)
        Peak power, in kilowatts, that motor(s) can generate.

        Unit: kW
    MaxRegenPower: attribute (uint16)
        Peak regen/brake power, in kilowatts, that motor(s) can generate.

        Unit: kW
    MaxRegenTorque: attribute (uint16)
        Peak regen/brake torque, in newton meter, that the motor(s) can generate.

        Unit: Nm
    MaxTorque: attribute (uint16)
        Peak power, in newton meter, that the motor(s) can generate.

        Unit: Nm
    Power: sensor
        Current motor power output. Negative values indicate regen mode.

        Unit: kW
    Speed: sensor
        Motor rotational speed measured as rotations per minute. Negative values indicate reverse driving mode.

        Unit: rpm
    Temperature: sensor
        Motor temperature.

        Unit: celsius
    TimeInUse: sensor
        Accumulated time during engine lifetime when the vehicule state's is 'READY'.

        Vehicles may define their READY state.

        Unit: h
    Torque: sensor
        Current motor torque. Negative values indicate regen mode.

        Unit: Nm
    """

    def __init__(self, name, parent):
        """Create a new ElectricMotor model."""
        super().__init__(parent)
        self.name = name

        self.CoolantTemperature = DataPointFloat("CoolantTemperature", self)
        self.EngineCode = DataPointString("EngineCode", self)
        self.EngineCoolant = EngineCoolant("EngineCoolant", self)
        self.MaxPower = DataPointUint16("MaxPower", self)
        self.MaxRegenPower = DataPointUint16("MaxRegenPower", self)
        self.MaxRegenTorque = DataPointUint16("MaxRegenTorque", self)
        self.MaxTorque = DataPointUint16("MaxTorque", self)
        self.Power = DataPointInt16("Power", self)
        self.Speed = DataPointInt32("Speed", self)
        self.Temperature = DataPointFloat("Temperature", self)
        self.TimeInUse = DataPointFloat("TimeInUse", self)
        self.Torque = DataPointInt16("Torque", self)
