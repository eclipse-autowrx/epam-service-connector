#!/usr/bin/env python3

"""O2WR model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    Model,
)

from vehicle.OBD.O2WR.Sensor1 import Sensor1
from vehicle.OBD.O2WR.Sensor2 import Sensor2
from vehicle.OBD.O2WR.Sensor3 import Sensor3
from vehicle.OBD.O2WR.Sensor4 import Sensor4
from vehicle.OBD.O2WR.Sensor5 import Sensor5
from vehicle.OBD.O2WR.Sensor6 import Sensor6
from vehicle.OBD.O2WR.Sensor7 import Sensor7
from vehicle.OBD.O2WR.Sensor8 import Sensor8


class O2WR(Model):
    """O2WR model.

    Attributes
    ----------
    Sensor1: branch
        Wide range/band oxygen sensors (PID 24 - 2B and PID 34 - 3B)

        Unit: None
    Sensor2: branch
        Wide range/band oxygen sensors (PID 24 - 2B and PID 34 - 3B)

        Unit: None
    Sensor3: branch
        Wide range/band oxygen sensors (PID 24 - 2B and PID 34 - 3B)

        Unit: None
    Sensor4: branch
        Wide range/band oxygen sensors (PID 24 - 2B and PID 34 - 3B)

        Unit: None
    Sensor5: branch
        Wide range/band oxygen sensors (PID 24 - 2B and PID 34 - 3B)

        Unit: None
    Sensor6: branch
        Wide range/band oxygen sensors (PID 24 - 2B and PID 34 - 3B)

        Unit: None
    Sensor7: branch
        Wide range/band oxygen sensors (PID 24 - 2B and PID 34 - 3B)

        Unit: None
    Sensor8: branch
        Wide range/band oxygen sensors (PID 24 - 2B and PID 34 - 3B)

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new O2WR model."""
        super().__init__(parent)
        self.name = name

        self.Sensor1 = Sensor1("Sensor1", self)
        self.Sensor2 = Sensor2("Sensor2", self)
        self.Sensor3 = Sensor3("Sensor3", self)
        self.Sensor4 = Sensor4("Sensor4", self)
        self.Sensor5 = Sensor5("Sensor5", self)
        self.Sensor6 = Sensor6("Sensor6", self)
        self.Sensor7 = Sensor7("Sensor7", self)
        self.Sensor8 = Sensor8("Sensor8", self)
