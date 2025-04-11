#!/usr/bin/env python3

"""Played model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    DataPointString,
    Model,
)


class Played(Model):
    """Played model.

    Attributes
    ----------
    Album: sensor
        Name of album being played

        Unit: None
    Artist: sensor
        Name of artist being played

        Unit: None
    PlaybackRate: actuator
        Current playback rate of media being played.

        The normal playback rate is multiplied by this value to obtain the current rate, so a value of 1.0 indicates normal speed. Values of lower than 1.0 make the media play slower than normal. Values of higher than 1.0 make the media play faster than normal.

        Unit: None
    Source: actuator
        Media selected for playback

        Unit: None
        Allowed values: UNKNOWN, SIRIUS_XM, AM, FM, DAB, TV, CD, DVD, AUX, USB, DISK, BLUETOOTH, INTERNET, VOICE, BEEP
    Track: sensor
        Name of track being played

        Unit: None
    URI: sensor
        User Resource associated with the media

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Played model."""
        super().__init__(parent)
        self.name = name

        self.Album = DataPointString("Album", self)
        self.Artist = DataPointString("Artist", self)
        self.PlaybackRate = DataPointFloat("PlaybackRate", self)
        self.Source = DataPointString("Source", self)
        self.Track = DataPointString("Track", self)
        self.URI = DataPointString("URI", self)
