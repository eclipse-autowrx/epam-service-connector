#!/usr/bin/env python3

"""Hood model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    Model,
)


class Hood(Model):
    """Hood model.

    Attributes
    ----------
    IsOpen: actuator
        Hood open or closed. True = Open. False = Closed.

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Hood model."""
        super().__init__(parent)
        self.name = name

        self.IsOpen = DataPointBoolean("IsOpen", self)
