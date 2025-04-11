#!/usr/bin/env python3

"""SmartphoneProjection model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointString,
    DataPointStringArray,
    Model,
)


class SmartphoneProjection(Model):
    """SmartphoneProjection model.

    Attributes
    ----------
    Active: actuator
        Projection activation info.

        NONE indicates that projection is not supported.

        Unit: None
        Allowed values: NONE, ACTIVE, INACTIVE
    Source: actuator
        Connectivity source selected for projection.

        Unit: None
        Allowed values: USB, BLUETOOTH, WIFI
    SupportedMode: attribute (string[])
        Supportable list for projection.

        Unit: None
        Allowed values: ANDROID_AUTO, APPLE_CARPLAY, MIRROR_LINK, OTHER
    """

    def __init__(self, name, parent):
        """Create a new SmartphoneProjection model."""
        super().__init__(parent)
        self.name = name

        self.Active = DataPointString("Active", self)
        self.Source = DataPointString("Source", self)
        self.SupportedMode = DataPointStringArray("SupportedMode", self)
