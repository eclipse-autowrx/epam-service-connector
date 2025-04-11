#!/usr/bin/env python3

"""SmartphoneScreenMirroring model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointString,
    Model,
)


class SmartphoneScreenMirroring(Model):
    """SmartphoneScreenMirroring model.

    Attributes
    ----------
    Active: actuator
        Mirroring activation info.

        NONE indicates that mirroring is not supported.

        Unit: None
        Allowed values: NONE, ACTIVE, INACTIVE
    Source: actuator
        Connectivity source selected for mirroring.

        Unit: None
        Allowed values: USB, BLUETOOTH, WIFI
    """

    def __init__(self, name, parent):
        """Create a new SmartphoneScreenMirroring model."""
        super().__init__(parent)
        self.name = name

        self.Active = DataPointString("Active", self)
        self.Source = DataPointString("Source", self)
