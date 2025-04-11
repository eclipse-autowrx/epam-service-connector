#!/usr/bin/env python3

"""Identifier model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointString,
    Model,
)


class Identifier(Model):
    """Identifier model.

    Attributes
    ----------
    Issuer: sensor
        Unique Issuer for the authentication of the occupant e.g. https://accounts.funcorp.com.

        Unit: None
    Subject: sensor
        Subject for the authentication of the occupant e.g. UserID 7331677.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Identifier model."""
        super().__init__(parent)
        self.name = name

        self.Issuer = DataPointString("Issuer", self)
        self.Subject = DataPointString("Subject", self)
