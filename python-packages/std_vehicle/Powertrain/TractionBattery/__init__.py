#!/usr/bin/env python3

"""TractionBattery model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointFloat,
    DataPointString,
    DataPointUint16,
    DataPointUint32,
    Model,
)

from vehicle.Powertrain.TractionBattery.CellVoltage import CellVoltage
from vehicle.Powertrain.TractionBattery.Charging import Charging
from vehicle.Powertrain.TractionBattery.DCDC import DCDC
from vehicle.Powertrain.TractionBattery.StateOfCharge import StateOfCharge
from vehicle.Powertrain.TractionBattery.Temperature import Temperature


class TractionBattery(Model):
    """TractionBattery model.

    Attributes
    ----------
    AccumulatedChargedEnergy: sensor
        The accumulated energy delivered to the battery during charging over lifetime of the battery.

        Unit: kWh
    AccumulatedChargedThroughput: sensor
        The accumulated charge throughput delivered to the battery during charging over lifetime of the battery.

        Unit: Ah
    AccumulatedConsumedEnergy: sensor
        The accumulated energy leaving HV battery for propulsion and auxiliary loads over lifetime of the battery.

        Unit: kWh
    AccumulatedConsumedThroughput: sensor
        The accumulated charge throughput leaving HV battery for propulsion and auxiliary loads over lifetime of the battery.

        Unit: Ah
    CellVoltage: branch
        Voltage information for cells in the battery pack.

        Unit: None
    Charging: branch
        Properties related to battery charging.

        Unit: None
    CurrentCurrent: sensor
        Current current flowing in/out of battery. Positive = Current flowing in to battery, e.g. during charging. Negative = Current flowing out of battery, e.g. during driving.

        Unit: A
    CurrentPower: sensor
        Current electrical energy flowing in/out of battery. Positive = Energy flowing in to battery, e.g. during charging. Negative = Energy flowing out of battery, e.g. during driving.

        Unit: W
    CurrentVoltage: sensor
        Current Voltage of the battery.

        Unit: V
    DCDC: branch
        Properties related to DC/DC converter converting high voltage (from high voltage battery) to vehicle low voltage (supply voltage, typically 12 Volts).

        Unit: None
    GrossCapacity: attribute (uint16)
        Gross capacity of the battery.

        Unit: kWh
    Id: attribute (string)
        Battery Identification Number as assigned by OEM.

        This could be serial number, part number plus serial number, UUID, or any other identifier that the OEM want to use to uniquely identify the battery individual.

        Unit: None
    IsGroundConnected: sensor
        Indicating if the ground (negative terminator) of the traction battery is connected to the powertrain.

        It might be possible to disconnect the traction battery used by an electric powertrain. This is achieved by connectors, typically one for plus and one for minus.

        Unit: None
    IsPowerConnected: sensor
        Indicating if the power (positive terminator) of the traction battery is connected to the powertrain.

        It might be possible to disconnect the traction battery used by an electric powertrain. This is achieved by connectors, typically one for plus and one for minus.

        Unit: None
    MaxVoltage: attribute (uint16)
        Max allowed voltage of the battery, e.g. during charging.

        Unit: V
    NetCapacity: sensor
        Total net capacity of the battery considering aging.

        Unit: kWh
    NominalVoltage: attribute (uint16)
        Nominal Voltage of the battery.

        Nominal voltage typically refers to voltage of fully charged battery when delivering rated capacity.

        Unit: V
    PowerLoss: sensor
        Electrical energy lost by power dissipation to heat inside the battery.

        Unit: W
    ProductionDate: attribute (string)
        Production date of battery in ISO8601 format, e.g. YYYY-MM-DD.

        Unit: None
    Range: sensor
        Remaining range in meters using only battery.

        Unit: m
    StateOfCharge: branch
        Information on the state of charge of the vehicle's high voltage battery.

        Unit: None
    StateOfHealth: sensor
        Calculated battery state of health at standard conditions.

        Exact formula is implementation dependent. Could be e.g. current capacity at 20 degrees Celsius divided with original capacity at the same temperature.

        Value range: [0, 100]
        Unit: percent
    Temperature: branch
        Temperature Information for the battery pack.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new TractionBattery model."""
        super().__init__(parent)
        self.name = name

        self.AccumulatedChargedEnergy = DataPointFloat("AccumulatedChargedEnergy", self)
        self.AccumulatedChargedThroughput = DataPointFloat("AccumulatedChargedThroughput", self)
        self.AccumulatedConsumedEnergy = DataPointFloat("AccumulatedConsumedEnergy", self)
        self.AccumulatedConsumedThroughput = DataPointFloat("AccumulatedConsumedThroughput", self)
        self.CellVoltage = CellVoltage("CellVoltage", self)
        self.Charging = Charging("Charging", self)
        self.CurrentCurrent = DataPointFloat("CurrentCurrent", self)
        self.CurrentPower = DataPointFloat("CurrentPower", self)
        self.CurrentVoltage = DataPointFloat("CurrentVoltage", self)
        self.DCDC = DCDC("DCDC", self)
        self.GrossCapacity = DataPointUint16("GrossCapacity", self)
        self.Id = DataPointString("Id", self)
        self.IsGroundConnected = DataPointBoolean("IsGroundConnected", self)
        self.IsPowerConnected = DataPointBoolean("IsPowerConnected", self)
        self.MaxVoltage = DataPointUint16("MaxVoltage", self)
        self.NetCapacity = DataPointUint16("NetCapacity", self)
        self.NominalVoltage = DataPointUint16("NominalVoltage", self)
        self.PowerLoss = DataPointFloat("PowerLoss", self)
        self.ProductionDate = DataPointString("ProductionDate", self)
        self.Range = DataPointUint32("Range", self)
        self.StateOfCharge = StateOfCharge("StateOfCharge", self)
        self.StateOfHealth = DataPointFloat("StateOfHealth", self)
        self.Temperature = Temperature("Temperature", self)
