# Ambient Light Control Demo

This project demonstrates a complete end-to-end flow for controlling a vehicle's ambient lighting system using a distributed setup involving AOS on Raspberry Pi device, Embedded device, KUKSA, and a CAN bus.

The demo showcases how a high-level application can publish data to the KUKSA databroker, which is then translated into low-level hardware commands to control an LED strip.

## System Architecture and Flow

The system consists of three main software components running on two separate Raspberry Pi devices connected via a CAN bus.

![System Architecture Diagram](https://bewebstudio.digitalauto.tech/data/projects/ih1XKDE24yRM/diagram.png)

![Real setup](https://bewebstudio.digitalauto.tech/data/projects/ih1XKDE24yRM/IMG20250905132530.jpg)





### Flow Breakdown:

1.  **Develop**: The `QM App` is developed in the `playground.digital.auto` environment, designed to call the standard COVESA API for vehicle data.

2.  **Deploy**: The app is deployed to a `Service` running on the main Raspberry Pi (AOS).

3.  **Service Interaction**: The `Service` communicates with the built-in `KUKSA` databroker, which manages vehicle signal data.

4.  **KUKSA Bridge**: The `service-kuksa-2-can.py` script also communicates with `KUKSA`, subscribing to signal changes. When a relevant signal (like ambient light color) is updated, the script reads it.

5.  **CAN Broadcast**: The script translates the high-level KUKSA signal into a low-level `CAN` message and broadcasts it onto the bus.

6.  **Hardware Control**: The `neo-pixel.py` script, running on the embedded Raspberry Pi, receives the `CAN` message and directly manipulates the `RGB LED` hardware.

> [!NOTE]
> [Watch the demo on YouTube](https://youtu.be/VwRVVdifP_c)  
> *(This is a YouTube link)*

## Link QM App on playground
https://playground.digital.auto/model/67f76c0d8c609a0027662a69/library/prototype/67f789368c609a00276647c5/code

## Components

*   `qm_app_python/`: Contains the `QM App` (`qm_app.py`) that calls the COVESA API.
*   `rasppi5-aos/`: Contains the `service-kuksa-2-can.py` script that bridges `KUKSA` data to the `CAN` bus.
*   `rasppi5-ambient-control/`: Contains the `neo-pixel.py` script for direct hardware control of the `RGB LED` strip.
