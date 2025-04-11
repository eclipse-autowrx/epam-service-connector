#!/usr/bin/env python3

"""O2 model."""

# pylint: disable=C0103,R0801,R0902,R0915,C0301,W0235


from velocitas_sdk.model import (
    Model,
)

from vehicle.OBD.O2.Sensor1 import Sensor1
from vehicle.OBD.O2.Sensor2 import Sensor2
from vehicle.OBD.O2.Sensor3 import Sensor3
from vehicle.OBD.O2.Sensor4 import Sensor4
from vehicle.OBD.O2.Sensor5 import Sensor5
from vehicle.OBD.O2.Sensor6 import Sensor6
from vehicle.OBD.O2.Sensor7 import Sensor7
from vehicle.OBD.O2.Sensor8 import Sensor8


class O2(Model):
    """O2 model.

    Attributes
    ----------
    Sensor1: branch
        Oxygen sensors (PID 14 - PID 1B)

        Unit: None
    Sensor2: branch
        Oxygen sensors (PID 14 - PID 1B)

        Unit: None
    Sensor3: branch
        Oxygen sensors (PID 14 - PID 1B)

        Unit: None
    Sensor4: branch
        Oxygen sensors (PID 14 - PID 1B)

        Unit: None
    Sensor5: branch
        Oxygen sensors (PID 14 - PID 1B)

        Unit: None
    Sensor6: branch
        Oxygen sensors (PID 14 - PID 1B)

        Unit: None
    Sensor7: branch
        Oxygen sensors (PID 14 - PID 1B)

        Unit: None
    Sensor8: branch
        Oxygen sensors (PID 14 - PID 1B)

        Unit: None
    """

    def __init__(self, name, parent):
        """Create a new O2 model."""
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
