#!/usr/bin/env python3

"""ADAS model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointString,
    DataPointUint8,
    Model,
)

from vehicle.ADAS.ABS import ABS
from vehicle.ADAS.CruiseControl import CruiseControl
from vehicle.ADAS.DMS import DMS
from vehicle.ADAS.EBA import EBA
from vehicle.ADAS.EBD import EBD
from vehicle.ADAS.ESC import ESC
from vehicle.ADAS.LaneDepartureDetection import LaneDepartureDetection
from vehicle.ADAS.ObstacleDetection import ObstacleDetection
from vehicle.ADAS.TCS import TCS


class ADAS(Model):
    """ADAS model.

    Attributes
    ----------
    ABS: branch
        Antilock Braking System signals.

        Unit: None
    ActiveAutonomyLevel: sensor
        Indicates the currently active level of driving automation according to the SAE J3016 (Taxonomy and Definitions for Terms Related to Driving Automation Systems for On-Road Motor Vehicles).

        Complies with https://www.sae.org/standards/content/j3016_202104/ and https://www.sae.org/blog/sae-j3016-update. Level 5 and 4 ADS (Automated driving system) disengage, if appropriate, only after it achieves a minimal risk condition or a driver is performing the DDT. Level 3 ADS disengages either an appropriate time after issuing a request to intervene or immediately upon user request. Level 2 DAS (Driving automation system) disengages immediately upon driver request. However, since many Level 2 DAS, often termed "Level 2.5", warn the driver shortly before reaching their operational limits, the VSS also supports the DISENGAGING state for SAE_2. Nevertheless, it should be noted that the SAE J3016 states that it is incorrect to describe driving automation features using fractional levels.

        Unit: None
        Allowed values: SAE_0, SAE_1, SAE_2_DISENGAGING, SAE_2, SAE_3_DISENGAGING, SAE_3, SAE_4_DISENGAGING, SAE_4, SAE_5_DISENGAGING, SAE_5
    CruiseControl: branch
        Signals from Cruise Control system.

        Unit: None
    DMS: branch
        Driver Monitoring System signals.

        Unit: None
    EBA: branch
        Emergency Brake Assist (EBA) System signals.

        Unit: None
    EBD: branch
        Electronic Brakeforce Distribution (EBD) System signals.

        Unit: None
    ESC: branch
        Electronic Stability Control System signals.

        Unit: None
    IsAutoPowerOptimize: actuator
        Auto Power Optimization Flag When set to 'true', the system enables automatic power optimization, dynamically adjusting the power optimization level based on runtime conditions or features managed by the OEM. When set to 'false', manual control of the power optimization level is allowed.

        Unit: None
    LaneDepartureDetection: branch
        Signals from Lane Departure Detection System.

        Unit: None
    ObstacleDetection: branch
        Signals form Obstacle Sensor System.

        Unit: None
    PowerOptimizeLevel: actuator
        Power optimization level for this branch/subsystem. A higher number indicates more aggressive power optimization. Level 0 indicates that all functionality is enabled, no power optimization enabled. Level 10 indicates most aggressive power optimization mode, only essential functionality enabled.

        Value range: [0, 10]
        Unit: None
    SupportedAutonomyLevel: attribute (string)
        Indicates the highest level of driving automation according to the SAE J3016 taxonomy the vehicle is capable of.

        Unit: None
        Allowed values: SAE_0, SAE_1, SAE_2, SAE_3, SAE_4, SAE_5
    TCS: branch
        Traction Control System signals.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new ADAS model."""
        super().__init__(parent)
        self.name = name

        self.ABS = ABS("ABS", self)
        self.ActiveAutonomyLevel = DataPointString("ActiveAutonomyLevel", self)
        self.CruiseControl = CruiseControl("CruiseControl", self)
        self.DMS = DMS("DMS", self)
        self.EBA = EBA("EBA", self)
        self.EBD = EBD("EBD", self)
        self.ESC = ESC("ESC", self)
        self.IsAutoPowerOptimize = DataPointBoolean("IsAutoPowerOptimize", self)
        self.LaneDepartureDetection = LaneDepartureDetection("LaneDepartureDetection", self)
        self.ObstacleDetection = ObstacleDetection("ObstacleDetection", self)
        self.PowerOptimizeLevel = DataPointUint8("PowerOptimizeLevel", self)
        self.SupportedAutonomyLevel = DataPointString("SupportedAutonomyLevel", self)
        self.TCS = TCS("TCS", self)
