#!/usr/bin/env python3

"""System model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    DataPointFloat,
    DataPointString,
    DataPointUint8,
    Model,
)


class System(Model):
    """System model.

    Attributes
    ----------
    ActualPosition: actuator
        Actual position of main wiper blade for the wiper system relative to reference position. Location of reference position (0 degrees) and direction of positive/negative degrees is vehicle specific.

        Default parking position might be used as reference position.

        Unit: degrees
    DriveCurrent: sensor
        Actual current used by wiper drive.

        May be negative in special situations.

        Unit: A
    Frequency: actuator
        Wiping frequency/speed, measured in cycles per minute. The signal concerns the actual speed of the wiper blades when moving. Intervals/pauses are excluded, i.e. the value corresponds to the number of cycles that would be completed in 1 minute if wiping permanently over default range.

        Examples - 0 = Wipers stopped, 80 = Wipers doing 80 cycles per minute (in WIPE mode).

        Unit: cpm
    IsBlocked: sensor
        Indicates if wiper movement is blocked. True = Movement blocked. False = Movement not blocked.

        Unit: None
    IsEndingWipeCycle: sensor
        Indicates if current wipe movement is completed or near completion. True = Movement is completed or near completion. Changes to RequestedPosition will be executed first after reaching previous RequestedPosition, if it has not already been reached. False = Movement is not near completion. Any change to RequestedPosition will be executed immediately. Change of direction may not be allowed.

        In continuous wiping between A and B this sensor can be used a trigger to update TargetPosition.

        Unit: None
    IsOverheated: sensor
        Indicates if wiper system is overheated. True = Wiper system overheated. False = Wiper system not overheated.

        Unit: None
    IsPositionReached: sensor
        Indicates if a requested position has been reached. IsPositionReached refers to the previous position in case the TargetPosition is updated while IsEndingWipeCycle=True. True = Current or Previous TargetPosition reached. False = Position not (yet) reached, or wipers have moved away from the reached position.

        Unit: None
    IsWiperError: sensor
        Indicates system failure. True if wiping is disabled due to system failure.

        Unit: None
    IsWiping: sensor
        Indicates wiper movement. True if wiper blades are moving. Change of direction shall be considered as IsWiping if wipers will continue to move directly after the change of direction.

        Unit: None
    Mode: actuator
        Requested mode of wiper system. STOP_HOLD means that the wipers shall move to position given by TargetPosition and then hold the position. WIPE means that wipers shall move to the position given by TargetPosition and then hold the position if no new TargetPosition is requested. PLANT_MODE means that wiping is disabled. Exact behavior is vehicle specific. EMERGENCY_STOP means that wiping shall be immediately stopped without holding the position.

        Unit: None
        Allowed values: STOP_HOLD, WIPE, PLANT_MODE, EMERGENCY_STOP
    TargetPosition: actuator
        Requested position of main wiper blade for the wiper system relative to reference position. Location of reference position (0 degrees) and direction of positive/negative degrees is vehicle specific. System behavior when receiving TargetPosition depends on Mode and IsEndingWipeCycle. Supported values are vehicle specific and might be dynamically corrected. If IsEndingWipeCycle=True then wipers will complete current movement before actuating new TargetPosition. If IsEndingWipeCycle=False then wipers will directly change destination if the TargetPosition is changed.

        Default parking position might be used as reference position.

        Unit: degrees
    """

    def __init__(self, name, parent):
        """Create a new System model."""
        super().__init__(parent)
        self.name = name

        self.ActualPosition = DataPointFloat("ActualPosition", self)
        self.DriveCurrent = DataPointFloat("DriveCurrent", self)
        self.Frequency = DataPointUint8("Frequency", self)
        self.IsBlocked = DataPointBoolean("IsBlocked", self)
        self.IsEndingWipeCycle = DataPointBoolean("IsEndingWipeCycle", self)
        self.IsOverheated = DataPointBoolean("IsOverheated", self)
        self.IsPositionReached = DataPointBoolean("IsPositionReached", self)
        self.IsWiperError = DataPointBoolean("IsWiperError", self)
        self.IsWiping = DataPointBoolean("IsWiping", self)
        self.Mode = DataPointString("Mode", self)
        self.TargetPosition = DataPointFloat("TargetPosition", self)
