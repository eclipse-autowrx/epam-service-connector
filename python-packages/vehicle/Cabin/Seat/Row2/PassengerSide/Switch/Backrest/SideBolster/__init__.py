#!/usr/bin/env python3

"""SideBolster model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointBoolean,
    Model,
)


class SideBolster(Model):
    """SideBolster model.

    Attributes
    ----------
    IsLessSupportEngaged: actuator
        Is switch for less side bolster support engaged (SingleSeat.Backrest.SideBolster.Support).

        Unit: None
    IsMoreSupportEngaged: actuator
        Is switch for more side bolster support engaged (SingleSeat.Backrest.SideBolster.Support).

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new SideBolster model."""
        super().__init__(parent)
        self.name = name

        self.IsLessSupportEngaged = DataPointBoolean("IsLessSupportEngaged", self)
        self.IsMoreSupportEngaged = DataPointBoolean("IsMoreSupportEngaged", self)
