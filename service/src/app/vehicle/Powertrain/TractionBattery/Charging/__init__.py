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
from vehicle.Powertrain.TractionBattery.Charging.ChargingPort import ChargingPort
from vehicle.Powertrain.TractionBattery.Charging.Location import Location
from vehicle.Powertrain.TractionBattery.Charging.MaximumChargingCurrent import MaximumChargingCurrent
from vehicle.Powertrain.TractionBattery.Charging.Timer import Timer


class Charging(Model):
    """Charging model.

    Attributes
    ----------
    AveragePower: sensor
        Average charging power of last or current charging event.

        Unit: kW
    ChargeCurrent: branch
        Current charging current.

        Unit: None
    ChargeLimit: actuator
        Target charge limit (state of charge) for battery.

        Value range: [0, 100]
        Unit: percent
    ChargeRate: sensor
        Current charging rate, as in kilometers of range added per hour.

        Unit: km/h
    ChargeVoltage: branch
        Current charging voltage, as measured at the charging inlet.

        Unit: None
    ChargingPort: branch
        Properties related to a particular charging port available in the vehicle.

        If a vehicle has a single charging port, then use the instance AnyPosition.

        Unit: None
    EvseId: sensor
        EVSE charging point ID (without separators) of last or current charging event according to ISO 15118-2 Annex H.

        Length of id between 7 and 37 characters. ZZ00000 to be used if SECC cannot provide id

        Unit: None
    IsCharging: sensor
        True if charging is ongoing. Charging is considered to be ongoing if energy is flowing from charger to vehicle.

        Unit: None
    IsDischarging: sensor
        True if discharging (vehicle to grid) is ongoing. Discharging is considered to be ongoing if energy is flowing from vehicle to charger/grid.

        Unit: None
    Location: branch
        Location of last or current charging event.

        This may depending on implementation represent the location of (the charge port of) the vehicle during charging, or the actual location of the charger/load connected to the vehicle.

        Unit: None
    MaxPower: sensor
        Maximum charging power of last or current charging event.

        Unit: kW
    MaximumChargingCurrent: branch
        Maximum charging current that can be accepted by the system, as measured at the charging inlet.

        Unit: None
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
    ChargePlugType: attribute (string[])
        Type of charge plugs (charging inlet) available on the vehicle. A charge plug type may occur multiple times in the list if there are multiple instances of that charge plug type. IEC types refer to IEC 62196,  GBT refers to  GB/T 20234.

        A vehicle may have multiple charging inlets. The signal Charging.ChargePlugPosition can be used to indicate position of the charge plug. IEC_TYPE_1_AC refers to Type 1 as defined in IEC 62196-2. Also known as Yazaki or J1772 connector. IEC_TYPE_2_AC refers to Type 2 as defined in IEC 62196-2. Also known as Mennekes connector. IEC_TYPE_3_AC refers to Type 3 as defined in IEC 62196-2. Also known as Scame connector. IEC_TYPE_4_DC refers to AA configuration as defined in IEC 62196-3. Also known as Type 4 or CHAdeMO connector. IEC_TYPE_1_CCS_DC refers to EE Configuration as defined in IEC 62196-3. Also known as CCS1 or Combo1 connector. IEC_TYPE_2_CCS_DC refers to FF Configuration as defined in IEC 62196-3. Also known as CCS2 or Combo2 connector. TESLA_ROADSTER, TESLA_HPWC (High Power Wall Connector) and TESLA_SUPERCHARGER refer to non-standardized charging inlets/methods used by Tesla. GBT_AC refers to connector specified in GB/T 20234.2. GBT_DC refers to connector specified in GB/T 20234.3. Also specified as BB Configuration in IEC 62196-3. OTHER shall be used if the vehicle has a charging connector, but not one of the connectors listed above. For additional information see https://en.wikipedia.org/wiki/IEC_62196.

        Unit: None
        Allowed values: IEC_TYPE_1_AC, IEC_TYPE_2_AC, IEC_TYPE_3_AC, IEC_TYPE_4_DC, IEC_TYPE_1_CCS_DC, IEC_TYPE_2_CCS_DC, TESLA_ROADSTER, TESLA_HPWC, TESLA_SUPERCHARGER, GBT_AC, GBT_DC, OTHER
    ChargePortFlap: actuator
        Status of the charge port cover(s), can potentially be controlled manually. OPEN if at least one is open.

        Unit: None
        Allowed values: OPEN, CLOSED
    ChargePortPosition: attribute (string[])
        Location of the charge port(s). First part indicates side of vehicle, second part relative position on that side. If supported, the list in this attribute shall have the same length as Charging.ChargePortType, and use same the relative order.

        Example - If this signal is [LEFT_FRONT, RIGHT_FRONT] and Charging.ChargePortType is [IEC_TYPE_2_AC, GBT_AC] that means that there is Mennekes port on the left side of the vehicle near the front, and a GB/T AC port on the right side, near the front.

        Unit: None
        Allowed values: FRONT_LEFT, FRONT_MIDDLE, FRONT_RIGHT, REAR_LEFT, REAR_MIDDLE, REAR_RIGHT, LEFT_FRONT, LEFT_MIDDLE, LEFT_REAR, RIGHT_FRONT, RIGHT_MIDDLE, RIGHT_REAR
    ChargePortType: attribute (string[])
        Type of charge ports (charging inlet) available on the vehicle. A charge port type may occur multiple times in the list if there are multiple instances of that charge port type. IEC types refer to IEC 62196,  GBT refers to  GB/T 20234.

        A vehicle may have multiple charging ports. The signal Charging.ChargePortPosition can be used to indicate position of the charge port. IEC_TYPE_1_AC refers to Type 1 as defined in IEC 62196-2. Also known as Yazaki or J1772 connector. IEC_TYPE_2_AC refers to Type 2 as defined in IEC 62196-2. Also known as Mennekes connector. IEC_TYPE_3_AC refers to Type 3 as defined in IEC 62196-2. Also known as Scame connector. IEC_TYPE_4_DC refers to AA configuration as defined in IEC 62196-3. Also known as Type 4 or CHAdeMO connector. IEC_TYPE_1_CCS_DC refers to EE Configuration as defined in IEC 62196-3. Also known as CCS1 or Combo1 connector. IEC_TYPE_2_CCS_DC refers to FF Configuration as defined in IEC 62196-3. Also known as CCS2 or Combo2 connector. TESLA_ROADSTER, TESLA_HPWC (High Power Wall Connector) and TESLA_SUPERCHARGER refer to non-standardized charging ports/methods used by Tesla. GBT_AC refers to connector specified in GB/T 20234.2. GBT_DC refers to connector specified in GB/T 20234.3. Also specified as BB Configuration in IEC 62196-3. OTHER shall be used for charging ports not included in the list above. For additional information see https://en.wikipedia.org/wiki/IEC_62196.

        Unit: None
        Allowed values: IEC_TYPE_1_AC, IEC_TYPE_2_AC, IEC_TYPE_3_AC, IEC_TYPE_4_DC, IEC_TYPE_1_CCS_DC, IEC_TYPE_2_CCS_DC, TESLA_ROADSTER, TESLA_HPWC, TESLA_SUPERCHARGER, GBT_AC, GBT_DC, OTHER
    IsChargePortFlapOpen: actuator
        Status of the charge port flap(s), can potentially be controlled manually. True if at least one is open.

        Unit: None
    IsChargingCableConnected: sensor
        Indicates if a charging cable is physically connected to the vehicle or not.

        Unit: None
    IsChargingCableLocked: actuator
        Is charging cable locked to prevent removal.

        Locking of charging cable can be used to prevent unintentional removing during charging.

        Unit: None
    Mode: actuator
        Describes how the charging process is controlled. DEACTIVATED means that charging and discharging is deactivated, nothing will happen if charger is connected. AUTOMATIC means charging will be initiated as soon as charger is connected. TRIGGERED means charging will be initiated when triggered by user. TIMER means charging is timer-based. PROFILE means charging is controlled by profile downloaded to vehicle. EXTERNAL_ENTITY means charging/discharging is controlled by the external entity connected to the vehicle. This includes GRID-controlled charging (e.g. ISO 15118), but also other cases where vehicle is connected to an arbitrary load that is powered by the vehicle. MANUAL means manually initiated (plug-in event, companion app, etc). GRID means grid-controlled (e.g. ISO 15118).

        EXTERNAL_ENTITY is the only mode where discharge may occur. The mechanism to provide a profile to the vehicle is currently not covered by VSS.

        Unit: None
        Allowed values: DEACTIVATED, AUTOMATIC, TRIGGERED, TIMER, PROFILE, EXTERNAL_ENTITY, MANUAL, GRID
    """

    def __init__(self, name, parent):
        """Create a new Charging model."""
        super().__init__(parent)
        self.name = name

        self.AveragePower = DataPointFloat("AveragePower", self)
        self.ChargeCurrent = ChargeCurrent("ChargeCurrent", self)
        self.ChargeLimit = DataPointUint8("ChargeLimit", self)
        self.ChargeRate = DataPointFloat("ChargeRate", self)
        self.ChargeVoltage = ChargeVoltage("ChargeVoltage", self)
        self.ChargingPort = ChargingPort("ChargingPort", self)
        self.EvseId = DataPointString("EvseId", self)
        self.IsCharging = DataPointBoolean("IsCharging", self)
        self.IsDischarging = DataPointBoolean("IsDischarging", self)
        self.Location = Location("Location", self)
        self.MaxPower = DataPointFloat("MaxPower", self)
        self.MaximumChargingCurrent = MaximumChargingCurrent("MaximumChargingCurrent", self)
        self.PowerLoss = DataPointFloat("PowerLoss", self)
        self.StartStopCharging = DataPointString("StartStopCharging", self)
        self.Temperature = DataPointFloat("Temperature", self)
        self.TimeToComplete = DataPointUint32("TimeToComplete", self)
        self.Timer = Timer("Timer", self)
        self.ChargePlugType = DataPointStringArray("ChargePlugType", self)
        self.ChargePortFlap = DataPointString("ChargePortFlap", self)
        self.ChargePortPosition = DataPointStringArray("ChargePortPosition", self)
        self.ChargePortType = DataPointStringArray("ChargePortType", self)
        self.IsChargePortFlapOpen = DataPointBoolean("IsChargePortFlapOpen", self)
        self.IsChargingCableConnected = DataPointBoolean("IsChargingCableConnected", self)
        self.IsChargingCableLocked = DataPointBoolean("IsChargingCableLocked", self)
        self.Mode = DataPointString("Mode", self)
