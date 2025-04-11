#!/usr/bin/env python3

"""HMI model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointFloat,
    DataPointString,
    DataPointUint16,
    Model,
)


class HMI(Model):
    """HMI model.

    Attributes
    ----------
    Brightness: actuator
        Brightness of the HMI, relative to supported range. 0 = Lowest brightness possible. 100 = Maximum Brightness possible.

        The value 0 does not necessarily correspond to a turned off HMI, as it may not be allowed/supported to turn off the HMI completely.

        Value range: [0, 100]
        Unit: percent
    CurrentLanguage: sensor
        ISO 639-1 standard language code for the current HMI

        Unit: None
    DateFormat: actuator
        Date format used in the current HMI

        Unit: None
        Allowed values: YYYY_MM_DD, DD_MM_YYYY, MM_DD_YYYY, YY_MM_DD, DD_MM_YY, MM_DD_YY
    DayNightMode: actuator
        Current display theme

        Unit: None
        Allowed values: DAY, NIGHT
    DisplayOffDuration: actuator
        Duration in seconds before the display is turned off. Value shall be 0 if screen never shall turn off.

        Display shall be turned off at HMI.LastActionTime + HMI.DisplayOffDuration, unless HMI.IsScreenAlwaysOn==True.

        Unit: s
    DistanceUnit: actuator
        Distance unit used in the current HMI

        Unit: None
        Allowed values: MILES, KILOMETERS
    EVEconomyUnits: actuator
        EV fuel economy unit used in the current HMI

        Unit: None
        Allowed values: MILES_PER_KILOWATT_HOUR, KILOMETERS_PER_KILOWATT_HOUR, KILOWATT_HOURS_PER_100_MILES, KILOWATT_HOURS_PER_100_KILOMETERS, WATT_HOURS_PER_MILE, WATT_HOURS_PER_KILOMETER
    FontSize: actuator
        Font size used in the current HMI

        Unit: None
        Allowed values: STANDARD, LARGE, EXTRA_LARGE
    FuelEconomyUnits: actuator
        Fuel economy unit used in the current HMI

        Unit: None
        Allowed values: MPG_UK, MPG_US, MILES_PER_LITER, KILOMETERS_PER_LITER, LITERS_PER_100_KILOMETERS
    FuelVolumeUnit: actuator
        Fuel volume unit used in the current HMI

        Unit: None
        Allowed values: LITER, GALLON_US, GALLON_UK
    IsScreenAlwaysOn: actuator
        Used to prevent the screen going black if no action placed.

        Unit: None
    LastActionTime: sensor
        Time for last hmi action, formatted according to ISO 8601 with UTC time zone.

        Unit: None
    TemperatureUnit: actuator
        Temperature unit used in the current HMI

        Unit: None
        Allowed values: C, F
    TimeFormat: actuator
        Time format used in the current HMI

        Unit: None
        Allowed values: HR_12, HR_24
    TirePressureUnit: actuator
        Tire pressure unit used in the current HMI

        Unit: None
        Allowed values: PSI, KPA, BAR
    """

    def __init__(self, name, parent):
        """Create a new HMI model."""
        super().__init__(parent)
        self.name = name

        self.Brightness = DataPointFloat("Brightness", self)
        self.CurrentLanguage = DataPointString("CurrentLanguage", self)
        self.DateFormat = DataPointString("DateFormat", self)
        self.DayNightMode = DataPointString("DayNightMode", self)
        self.DisplayOffDuration = DataPointUint16("DisplayOffDuration", self)
        self.DistanceUnit = DataPointString("DistanceUnit", self)
        self.EVEconomyUnits = DataPointString("EVEconomyUnits", self)
        self.FontSize = DataPointString("FontSize", self)
        self.FuelEconomyUnits = DataPointString("FuelEconomyUnits", self)
        self.FuelVolumeUnit = DataPointString("FuelVolumeUnit", self)
        self.IsScreenAlwaysOn = DataPointBoolean("IsScreenAlwaysOn", self)
        self.LastActionTime = DataPointString("LastActionTime", self)
        self.TemperatureUnit = DataPointString("TemperatureUnit", self)
        self.TimeFormat = DataPointString("TimeFormat", self)
        self.TirePressureUnit = DataPointString("TirePressureUnit", self)
