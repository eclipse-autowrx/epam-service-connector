#!/usr/bin/env python3

"""RearMiddle model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointStringArray,
    Model,
)


class RearMiddle(Model):
    """RearMiddle model.

    Attributes
    ----------
    IsChargingCableConnected: sensor
        Indicates whether a charging cable is physically connected to a particular charging port or not.

        Unit: None
    IsChargingCableLocked: actuator
        Is charging cable locked to prevent removal.

        Locking of charging cable can be used to prevent unintentional removing during charging.

        Unit: None
    IsFlapOpen: actuator
        Status of the charging port flap(s).

        True = at least one flap of this port is open, False = All flaps of this port are closed.

        Unit: None
    SupportedInletTypes: attribute (string[])
        A list of the supported (i.e., available) charging inlets in a particular charging port. IEC types refer to IEC 62196,  GBT refers to  GB/T 20234.

        A vehicle may have multiple charging ports. IEC_TYPE_1_AC refers to Type 1 as defined in IEC 62196-2. Also known as Yazaki or J1772 connector. IEC_TYPE_2_AC refers to Type 2 as defined in IEC 62196-2. Also known as Mennekes connector. IEC_TYPE_3_AC refers to Type 3 as defined in IEC 62196-2. Also known as Scame connector. IEC_TYPE_4_DC refers to AA configuration as defined in IEC 62196-3. Also known as Type 4 or CHAdeMO connector. IEC_TYPE_1_CCS_DC refers to EE Configuration as defined in IEC 62196-3. Also known as CCS1 or Combo1 connector. IEC_TYPE_2_CCS_DC refers to FF Configuration as defined in IEC 62196-3. Also known as CCS2 or Combo2 connector. TESLA_ROADSTER, TESLA_HPWC (High Power Wall Connector) and TESLA_SUPERCHARGER refer to non-standardized charging ports/methods used by Tesla. GBT_AC refers to connector specified in GB/T 20234.2. GBT_DC refers to connector specified in GB/T 20234.3. Also specified as BB Configuration in IEC 62196-3. OTHER shall be used for charging ports not included in the list above. For additional information see https://en.wikipedia.org/wiki/IEC_62196.

        Unit: None
        Allowed values: IEC_TYPE_1_AC, IEC_TYPE_2_AC, IEC_TYPE_3_AC, IEC_TYPE_4_DC, IEC_TYPE_1_CCS_DC, IEC_TYPE_2_CCS_DC, TESLA_ROADSTER, TESLA_HPWC, TESLA_SUPERCHARGER, GBT_AC, GBT_DC, OTHER
    """

    def __init__(self, name, parent):
        """Create a new RearMiddle model."""
        super().__init__(parent)
        self.name = name

        self.IsChargingCableConnected = DataPointBoolean("IsChargingCableConnected", self)
        self.IsChargingCableLocked = DataPointBoolean("IsChargingCableLocked", self)
        self.IsFlapOpen = DataPointBoolean("IsFlapOpen", self)
        self.SupportedInletTypes = DataPointStringArray("SupportedInletTypes", self)
