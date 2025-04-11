#!/usr/bin/env python3

"""Charging model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointFloat,
    DataPointString,
    DataPointStringArray,
    DataPointUint32,
    DataPointUint8,
    Model,
)

from vehicle.Powertrain.TractionBattery.Charging.ChargeCurrent import ChargeCurrent
from vehicle.Powertrain.TractionBattery.Charging.ChargeVoltage import ChargeVoltage
from vehicle.Powertrain.TractionBattery.Charging.MaximumChargingCurrent import MaximumChargingCurrent
from vehicle.Powertrain.TractionBattery.Charging.Timer import Timer


class Charging(Model):
    """Charging model.

    Attributes
    ----------
    ChargeCurrent: branch
        Current charging current.

        Unit: None
    ChargeLimit: actuator
        Target charge limit (state of charge) for battery.

        Value range: [0, 100]
        Unit: percent
    ChargePlugType: attribute (string[])
        Type of charge plug (charging inlet) available on the vehicle. IEC types refer to IEC 62196,  GBT refers to  GB/T 20234.

        A vehicle may have multiple charging inlets. IEC_TYPE_1_AC refers to Type 1 as defined in IEC 62196-2. Also known as Yazaki or J1772 connector. IEC_TYPE_2_AC refers to Type 2 as defined in IEC 62196-2. Also known as Mennekes connector. IEC_TYPE_3_AC refers to Type 3 as defined in IEC 62196-2. Also known as Scame connector. IEC_TYPE_4_DC refers to AA configuration as defined in IEC 62196-3. Also known as Type 4 or CHAdeMO connector. IEC_TYPE_1_CCS_DC refers to EE Configuration as defined in IEC 62196-3. Also known as CCS1 or Combo1 connector. IEC_TYPE_2_CCS_DC refers to FF Configuration as defined in IEC 62196-3. Also known as CCS2 or Combo2 connector. TESLA_ROADSTER, TESLA_HPWC (High Power Wall Connector) and TESLA_SUPERCHARGER refer to non-standardized charging inlets/methods used by Tesla. GBT_AC refers to connector specified in GB/T 20234.2. GBT_DC refers to connector specified in GB/T 20234.3. Also specified as BB Configuration in IEC 62196-3. OTHER shall be used if the vehicle has a charging connector, but not one of the connectors listed above. For additional information see https://en.wikipedia.org/wiki/IEC_62196.

        Unit: None
        Allowed values: IEC_TYPE_1_AC, IEC_TYPE_2_AC, IEC_TYPE_3_AC, IEC_TYPE_4_DC, IEC_TYPE_1_CCS_DC, IEC_TYPE_2_CCS_DC, TESLA_ROADSTER, TESLA_HPWC, TESLA_SUPERCHARGER, GBT_AC, GBT_DC, OTHER
    ChargePortFlap: actuator
        Status of the charge port cover, can potentially be controlled manually.

        Unit: None
        Allowed values: OPEN, CLOSED
    ChargeRate: sensor
        Current charging rate, as in kilometers of range added per hour.

        Unit: km/h
    ChargeVoltage: branch
        Current charging voltage, as measured at the charging inlet.

        Unit: None
    IsCharging: sensor
        True if charging is ongoing. Charging is considered to be ongoing if energy is flowing from charger to vehicle.

        Unit: None
    IsChargingCableConnected: sensor
        Indicates if a charging cable is physically connected to the vehicle or not.

        Unit: None
    IsChargingCableLocked: actuator
        Is charging cable locked to prevent removal.

        Locking of charging cable can be used to prevent unintentional removing during charging.

        Unit: None
    IsDischarging: sensor
        True if discharging (vehicle to grid) is ongoing. Discharging is considered to be ongoing if energy is flowing from vehicle to charger/grid.

        Unit: None
    MaximumChargingCurrent: branch
        Maximum charging current that can be accepted by the system, as measured at the charging inlet.

        Unit: None
    Mode: actuator
        Control of the charge process. MANUAL means manually initiated (plug-in event, companion app, etc). TIMER means timer-based. GRID means grid-controlled (e.g. ISO 15118). PROFILE means controlled by profile download to vehicle.

        The mechanism to provide a profile to the vehicle is currently not covered by VSS.

        Unit: None
        Allowed values: MANUAL, TIMER, GRID, PROFILE
    PowerLoss: sensor
        Electrical energy lost by power dissipation to heat inside the AC/DC converter.

        Unit: W
    StartStopCharging: actuator
        Start or stop the charging process.

        Unit: None
        Allowed values: START, STOP
    Temperature: sensor
        Current temperature of AC/DC converter converting grid voltage to battery voltage.

        Unit: celsius
    TimeToComplete: sensor
        The time needed for the current charging process to reach Charging.ChargeLimit. 0 if charging is complete or no charging process is active or planned.

        Shall consider time set by Charging.Timer.Time. E.g. if charging shall start in 3 hours and 2 hours of charging is needed, then Charging.TimeToComplete shall report 5 hours.

        Unit: s
    Timer: branch
        Properties related to timing of battery charging sessions.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Charging model."""
        super().__init__(parent)
        self.name = name

        self.ChargeCurrent = ChargeCurrent("ChargeCurrent", self)
        self.ChargeLimit = DataPointUint8("ChargeLimit", self)
        self.ChargePlugType = DataPointStringArray("ChargePlugType", self)
        self.ChargePortFlap = DataPointString("ChargePortFlap", self)
        self.ChargeRate = DataPointFloat("ChargeRate", self)
        self.ChargeVoltage = ChargeVoltage("ChargeVoltage", self)
        self.IsCharging = DataPointBoolean("IsCharging", self)
        self.IsChargingCableConnected = DataPointBoolean("IsChargingCableConnected", self)
        self.IsChargingCableLocked = DataPointBoolean("IsChargingCableLocked", self)
        self.IsDischarging = DataPointBoolean("IsDischarging", self)
        self.MaximumChargingCurrent = MaximumChargingCurrent("MaximumChargingCurrent", self)
        self.Mode = DataPointString("Mode", self)
        self.PowerLoss = DataPointFloat("PowerLoss", self)
        self.StartStopCharging = DataPointString("StartStopCharging", self)
        self.Temperature = DataPointFloat("Temperature", self)
        self.TimeToComplete = DataPointUint32("TimeToComplete", self)
        self.Timer = Timer("Timer", self)
