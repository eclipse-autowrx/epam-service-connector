#!/usr/bin/env python3

"""Media model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointString,
    DataPointUint8,
    Model,
)

from vehicle.Cabin.Infotainment.Media.Played import Played


class Media(Model):
    """Media model.

    Attributes
    ----------
    Action: actuator
        Tells if the media was

        Unit: None
        Allowed values: UNKNOWN, STOP, PLAY, FAST_FORWARD, FAST_BACKWARD, SKIP_FORWARD, SKIP_BACKWARD
    DeclinedURI: sensor
        URI of suggested media that was declined

        Unit: None
    Played: branch
        Collection of signals updated in concert when a new media is played

        Unit: None
    SelectedURI: actuator
        URI of suggested media that was selected

        Unit: None
    Volume: actuator
        Current Media Volume

        Value range: [0, 100]
        Unit: percent
    """

    def __init__(self, name, parent):
        """Create a new Media model."""
        super().__init__(parent)
        self.name = name

        self.Action = DataPointString("Action", self)
        self.DeclinedURI = DataPointString("DeclinedURI", self)
        self.Played = Played("Played", self)
        self.SelectedURI = DataPointString("SelectedURI", self)
        self.Volume = DataPointUint8("Volume", self)
