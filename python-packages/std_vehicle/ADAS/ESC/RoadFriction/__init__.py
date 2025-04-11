#!/usr/bin/env python3

"""RoadFriction model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    DataPointFloat,
    Model,
)


class RoadFriction(Model):
    """RoadFriction model.

    Attributes
    ----------
    LowerBound: sensor
        Lower bound road friction, as calculated by the ESC system. 5% possibility that road friction is below this value. 0 = no friction, 100 = maximum friction.

        Value range: [0, 100]
        Unit: percent
    MostProbable: sensor
        Most probable road friction, as calculated by the ESC system. Exact meaning of most probable is implementation specific. 0 = no friction, 100 = maximum friction.

        Value range: [0, 100]
        Unit: percent
    UpperBound: sensor
        Upper bound road friction, as calculated by the ESC system. 95% possibility that road friction is below this value. 0 = no friction, 100 = maximum friction.

        Value range: [0, 100]
        Unit: percent
    """

    def __init__(self, name, parent):
        """Create a new RoadFriction model."""
        super().__init__(parent)
        self.name = name

        self.LowerBound = DataPointFloat("LowerBound", self)
        self.MostProbable = DataPointFloat("MostProbable", self)
        self.UpperBound = DataPointFloat("UpperBound", self)
