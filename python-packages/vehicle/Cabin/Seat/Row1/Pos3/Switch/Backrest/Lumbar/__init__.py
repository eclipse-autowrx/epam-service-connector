#!/usr/bin/env python3

"""Lumbar model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    Model,
)


class Lumbar(Model):
    """Lumbar model.

    Attributes
    ----------
    IsDownEngaged: actuator
        Lumbar down switch engaged (SingleSeat.Backrest.Lumbar.Support).

        Unit: None
    IsLessSupportEngaged: actuator
        Is switch for less lumbar support engaged (SingleSeat.Backrest.Lumbar.Support).

        Unit: None
    IsMoreSupportEngaged: actuator
        Is switch for more lumbar support engaged (SingleSeat.Backrest.Lumbar.Support).

        Unit: None
    IsUpEngaged: actuator
        Lumbar up switch engaged (SingleSeat.Backrest.Lumbar.Support).

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new Lumbar model."""
        super().__init__(parent)
        self.name = name

        self.IsDownEngaged = DataPointBoolean("IsDownEngaged", self)
        self.IsLessSupportEngaged = DataPointBoolean("IsLessSupportEngaged", self)
        self.IsMoreSupportEngaged = DataPointBoolean("IsMoreSupportEngaged", self)
        self.IsUpEngaged = DataPointBoolean("IsUpEngaged", self)
