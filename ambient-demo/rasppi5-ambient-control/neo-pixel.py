
# Copyright (c) 2025 Eclipse Foundation.
 
# This program and the accompanying materials are made available under the
# terms of the MIT License which is available at
# https://opensource.org/licenses/MIT.

# SPDX-License-Identifier: MIT

'''
This script is used to control the NeoPixel LED strip using CAN bus.
The script listens to the CAN bus for messages and updates the LED strip accordingly.

# The python-can package is used to interface with CAN (Controller Area Network) bus systems.
# In this script, CAN messages are received as objects with the following important attributes:
#   - arbitration_id: The CAN message identifier (integer).
#   - data: The payload of the CAN message (bytearray or bytes, up to 8 bytes for classic CAN).
#   - dlc: Data Length Code, the number of bytes in the data field.
#
# Example CAN message format:
#   - ID: 0x123
#   - Data: [0x01, 0xFF, 0xFF, 0xFF, 0x00]
#     - data[0]: Command (e.g., 0x01 for "on", 0x00 for "off")
#     - data[1]: Red value (0-255)
#     - data[2]: Green value (0-255)
#     - data[3]: Blue value (0-255)
#     - data[4]: Intensity (0-255)
#
# The script listens for messages with a specific arbitration_id (0x123) and expects 5 bytes of data.

Sample CAN message:
{
    "arbitration_id": 0x123,
    "data": [1, 255, 255, 255, 0],
    "dlc": 5,
    "extended_id": false,
}

cansend can0 123#01FF0000FF // Set color to red Intensity 100%
cansend can0 123#0000000000 // Turn off LEDs

'''

import can
import board
import neopixel
import time

# NeoPixel setup
NUM_PIXELS = 60
pixels = neopixel.NeoPixel(board.D18, NUM_PIXELS, brightness=0.3, auto_write=False)  # auto_write=False for manual show()
pixels.fill((0, 0, 0))  # Start with LEDs off
pixels.show()

# CAN setup
can_interface = 'can0'

def turn_color(color, intensity_byte):
    # Clamp intensity_byte to 0–255 and convert to 0.0–1.0 float
    intensity = max(0, min(intensity_byte, 255)) / 255.0

    r = int(((color >> 16) & 0xFF) * intensity)
    g = int(((color >> 8) & 0xFF) * intensity)
    b = int((color & 0xFF) * intensity)

    pixels.fill((r, g, b))
    pixels.show()


def main():
    bus = can.interface.Bus(channel=can_interface, interface='socketcan')
    print(f"Listening on CAN interface {can_interface}...")

    while True:
        msg = bus.recv()  # Wait for a CAN message

        if msg is None:
            continue  # Timeout or no message received

        # Debug: print received message
        print(f"Received: ID={hex(msg.arbitration_id)} Data={msg.data.hex()}")

        # Check for ID 0x123 and data pattern
        if msg.arbitration_id == 0x123 and len(msg.data) == 5:
            # msg.data example for on: 01 ff ff ff 00
            if msg.data[0] == 0x01:
                color = (msg.data[1] << 16) | (msg.data[2] << 8) | msg.data[3]
                turn_color(color, msg.data[4])
                print(f"LEDs ON (R={msg.data[1]}, G={msg.data[2]}, B={msg.data[3]})")
            elif msg.data[0] == 0x00:
                # Turn LEDs off
                pixels.fill((0, 0, 0))
                pixels.show()
                print("LEDs OFF")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pixels.fill((0, 0, 0))
        pixels.show()
        print("\nExiting and turning LEDs off.")