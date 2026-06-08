# Eclipse SDV Blueprint — Hybrid Cloud–Edge Application Lifecycle Management

This blueprint demonstrates an end-to-end workflow for developing, validating and orchestrating Mixed-Critical Software-Defined Vehicle (SDV) applications across cloud and HPC edge device.

It showcases how SDV applications are built in the cloud, pushed to AosEdge registry, and deployed onto an in-vehicle HPC running AosCore and Eclipse AutoWorx runtime components which includes Eclipse Velocitas, Eclipse Kuksa, and a Signal Gateway. Vehicle signals are exchanged across heterogeneous compute domains with HPCs, Zonal and End ECUs — through Eclipse SCore and Eclipse Zenoh.

---

## The Use Case — EV Range Extender

The demo application is an **EV Range Extender**.

When the vehicle's battery state of charge drops below a defined threshold, the system automatically enters a power-saving mode. It identifies non-essential features and turns them off or scales them down — e.g. HVAC climate control and seat heating — while keeping all core driving and safety functions fully intact.

### Customer Journey

The journey below shows how the system interacts across three steps — from the initial trigger to the automated system response:

| | Step 1 | Step 2 | Step 3 |
| :--- | :--- | :--- | :--- |
| **Who** | System | System | Driver |
| **What** | Vehicle battery (State of Charge) drops below the predefined critical threshold. | System automatically enters power-saving mode, instantly scaling down non-essential features (HVAC climate control, seat heating). | Driver continues driving safely with extended range and is notified of the system's actions. |
| **Customer TouchPoints** | None | Cabin environment (HVAC eases off, seat heater turns off) | "Power Saving Mode" activated and Driving Range extended |

> **Why this matters for OEMs:** Unlike a manual "Eco Mode" button, this journey highlights the **automated orchestration** of the Software-Defined Vehicle. The system constantly monitors the powertrain (Step 1), instantly communicates with the end ECUs to shut down cabin comforts (Step 2), and keeps the driver informed without requiring them to take their hands off the wheel (Step 3).

| Signal | Layer | Purpose |
|---|---|---|
| `Vehicle.Powertrain.TractionBattery.StateOfCharge.Current` | VM1 / BMS | Triggers power-saving mode when charge is low |
| `Vehicle.Powertrain.TractionBattery.CurrentVoltage` | VM1 / BMS | Battery voltage monitored by the Battery Monitoring System |
| `Vehicle.Powertrain.TractionBattery.CurrentCurrent` | VM1 / BMS | Battery current monitored by the Battery Monitoring System |
| `Vehicle.Cabin.HVAC.AmbientAirTemperature` | VM2 / HVAC ECU | Adjusted to save power and bridged to VM1 |
| `Vehicle.Cabin.Seat.Row1.DriverSide.Heating` | VM2 / Seat ECU | Disabled to save power and bridged to VM1 |
| `Vehicle.Cabin.Seat.Row1.DriverSide.HeatingCooling` | VM2 / Seat ECU | Disabled to save power and bridged to VM1 |

---

## Prototype on digital.auto playground

You can explore and run the prototype directly in the digital.auto playground — no hardware needed:

 **[Open Prototype on digital.auto Playground](https://playground.digital.auto/model/67f76c0d8c609a0027662a69/library/prototype/69ce30f438bb8e98f0af5ac8/code)**

The playground lets you simulate vehicle signals and see the app's logic in action before touching any real device. OEMs can use this to validate business logic, test signal flows, and iterate on the customer journey end-to-end.

---

## Architecture Overview

The blueprint is implemented in two phases. 

**Phase 1** uses virtual machines so teams can develop and test without physical hardware. 

**Phase 2** moves to real automotive-grade hardware for production-readiness validation. Both phases share the same cloud layer and application logic — only the edge hardware changes.

---

## Phase 1 — Virtual Machines

![Architecture Phase 1](./images/architecture_phase1.svg)

Phase 1 is designed for **rapid development and validation**. Everything runs inside virtual machines (QEMU), so any developer can spin up the full stack on a standard laptop or cloud server. All the components that will eventually run on real car hardware are running here as software — making it fast and safe to iterate.

### How the flow works

```
1. EV Range Extender Prototype 
        ↓
2. App is published to the AosCloud App Registry
        ↓
3. AosCloud fetches the app and pushes it to the HPC-VM (App Fetching)
        ↓
4. AosCore on the HPC-VM executes the app via the digital.auto runtime
        ↓
5. The app reads/writes vehicle signals via eclipse-kuksa
        ↓
6. Signals flow between HPC-VM and End-VM over eclipse-zenoh
```

### What's running in each layer

| Layer | What It Is | What It Does |
|---|---|---|
|  **AosCloud** | Fleet Management + App Registry | Stores, versions and distributes vehicle apps to the fleet |
|  **HPC-VM** (Linux) | AosCore + digital.auto + Eclipse AutoWorx stack | The brain — runs the vehicle app, handles signal logic |
|  **End-VM** (Linux) | Seat Control Module, HVAC ECU, Range Compute AI, Battery Monitoring System | Simulates the end-ECU layer that controls physical components |
|  **Communication stack** | Eclipse Zenoh | Connects HPC-VM and End-VM — lightweight pub/sub messaging |

### Eclipse components inside the blueprint phase 1

| Component | Role |
|---|---|
| `eclipse-autoworx` | Automates app lifecycle management on the vehicle |
| `eclipse-kuksa` | Vehicle signal broker — reads and writes VSS signals |
| `eclipse-velocitas` | Framework for building vehicle apps in Python/C++ |
| `eclipse-zenoh` | Modern pub/sub communication protocol between HPC-VM and End-VM |

### Automated Setup

1. A helper script is available to create VMs [here](qemu-image-creator/README.md)
	```bash
		# go to the project directory
		cd eclipse-sdv-blueprint
		
		# create python virtual environment
		python3 -m venv .venv
		source .venv/bin/activate
		pip install -r qemu-image-creator/requirements.txt
		
		# execute the setup step
		# hint: you will be prompted for sudo access to install missing packages
		python qemu-image-creator/setup.py
	```
1. When the automated setup script is ran:
	- HPC-VM and End VM is launched by default
	- digital.auto runtime is automatically launched. 



### Manual Setup

Follow the manual steps only if the above script fails.

**Prerequisites**

- Two VMs setup with communication with each other.
- Docker installed inside VM1 / HPC-VM
- Access to [playground.digital.auto](https://playground.digital.auto)

**Run the SDV Runtime**

1. Pull the runtime image inside VM1 / HPC-VM
```bash
docker pull ghcr.io/eclipse-autowrx/sdv-runtime:latest
```

2. Start the runtime
```bash
docker run -d \
  -e RUNTIME_NAME="MyRuntimeName" \
  ghcr.io/eclipse-autowrx/sdv-runtime:latest
```

> `RUNTIME_NAME` is the identifier you'll use to register this runtime on the playground.
> VM2 does not run an additional digital.auto runtime; it only runs the cabin ECUs and the stateless Zenoh relay.

### Application Execution

**Register your runtime on the Playground**

1. Go to [playground.digital.auto](https://playground.digital.auto) and log in
2. Navigate to **Profile → My Assets → Runtimes**
3. Click **Add Asset**
4. Enter the same `RUNTIME_NAME` from step 2
	- **hint**: Name of the default runtime is "ev-range" for the automated setup
5. Set **Type = Runtime** and click **Save**

**Open and run the prototype**

1. Open the [EV Range Extender prototype](https://playground.digital.auto/model/67f76c0d8c609a0027662a69/library/prototype/69ce30f438bb8e98f0af5ac8/code)
2. Select the runtime you just registered
3. Click **Execute** — vehicle signals will start flowing in real time

### Start the hardware simulator

With both VMs running and the EV Range Extender application executed from the digital.auto playground against your registered runtime, launch the host-side hardware simulator (the Tk dashboard) so you can drive the inputs manually:

```bash
./hardware-sim/setup.sh
pip install -r hardware-sim/requirements.txt
python hardware-sim/pytk_dashboard.py
```

See the [hardware simulator README](hardware-sim/README.md) for the full control and status map.

### Steps to demo

Follow these steps:

1. **Run the hardware simulator.**
2. **After the hardware simulator is running, execute the playground application (SDV code).**
3. **Press the Start button in the hardware simulator** to begin battery drain.
4. **Observe threshold behavior:**
	- Up to **50% battery**, the HVAC fan is reduced gradually; once the battery reaches **50%**, the fan turns off.
	- At **30% battery**, stricter power-saving behavior is applied and seat heating/cooling are turned off.
	- When the fan turns off, a small rise in range can be observed. When seat heating/cooling also turn off, the range increases further.

![Hardware simulator in action](./images/demo.gif)

### Signal Flow and Internals

The demo runs as a closed loop across host, virtual machines, and the playground runtime.

1. **Hardware simulator (host side)** publishes battery and cabin control values.
2. **VM1 runtime stack** receives battery values and updates the vehicle signal broker.
3. **digital.auto playground application** reads battery state from the runtime and applies power-saving decisions based on thresholds.
4. **Vehicle signal broker (Kuksa)** stores and distributes current vehicle values used by the application and runtime services.
5. **Bridge layer** transfers cabin-related updates between VM1 and VM2 so both compute domains stay synchronized.
6. **VM2 ECU services** apply HVAC and seat actions and publish actuator status back to the dashboard.
7. **Dashboard indicators** reflect the latest actuator state and make the system response visible in real time.

---

## Phase 2 — Physical Hardware

![Architecture Phase 2](./images/architecture_phase2.svg)

Phase 2 replaces the virtual machines with **automotive hardware**. The cloud layer and application logic stay identical — this phase validates that the same software runs correctly on the hardware an OEM would actually put in a vehicle.

A key addition in Phase 2 is the **End ECU layer** (STM32), which represents the deepest level of the vehicle's electrical architecture — the microcontrollers directly attached to physical sensors and actuators like motors, lights, and HVAC.

### How the flow works

```
1. Same cloud flow as Phase 1 (AosCloud → App Registry → App Fetching)
        ↓
2. App runs on a NXP S32G2 board (automotive-grade processor)
        ↓
3. HPC communicates with Zonal Raspberry Pi over eclipse-score / SOME-IP
        ↓
4. Zonal Pi communicates with End STM32 microcontroller over eclipse-zenoh
        ↓
5. STM32 directly controls HVAC, infotainment display, seat ventilation
```

### What's running in each layer

| Layer | Hardware | Software | What It Does |
|---|---|---|---|
|  **AosCloud** | — | Fleet Management + App Registry | Same as Phase 1 |
|  **HPC** | NXP S32G2 | AosCore + digital.auto + `eclipse-autosd` | Automotive-grade compute, runs the main app logic |
|  **Zonal** | Raspberry Pi | Linux + Eclipse AutoWorx stack | Bridges HPC signals to physical ECU layer |
|  **End ECU** | STM32 | `eclipse-threadX` | Directly controls physical actuators (HVAC, lights, display) |
|  **HPC ↔ Zonal** | — | Eclipse SCore / SOME-IP | Standard automotive bus protocol |
|  **Zonal ↔ End** | — | Eclipse Zenoh | Lightweight pub/sub messaging for constrained devices |

### Additional signals unlocked in Phase 2

| Signal | Layer | Purpose |
|---|---|---|
| `Vehicle.Cabin.HVAC.TargetTemperature` | End ECU | Adjust climate control for power saving |
| `Vehicle.Infotainment.Display.Brightness` | End ECU | Dim screen to reduce power draw |
| `Vehicle.Cabin.Seat.Ventilation.Level` | End ECU | Disable seat ventilation |

> **For OEMs:** Phase 2 is where you validate that the app behaviour confirmed in the Playground and Phase 1 translates faithfully onto your target hardware. The signal list above represents exactly the vehicle capabilities your app will control in a real car.

### Additional Eclipse components inside the blueprint phase 2

| Component | Role |
|---|---|
| `eclipse-autosd` | Automotive grade Linux OS from RedHat |
| `eclipse-zenoh` | Modern communication protocol designed for SDV |
| `eclipse-threadx` | Safe RTOS for microcontrollers |

---

## Phase Comparison

| | Phase 1 | Phase 2 |
|---|---|---|
| **Goal** | Develop & validate logic | Validate on real hardware |
| **HPC** | Linux VM (QEMU) | NXP S32G2 |
| **Zonal** | Not present | Raspberry Pi |
| **End ECU** | Linux VM (QEMU) | STM32 |
| **HPC ↔ End comms** | Eclipse Zenoh | — |
| **HPC ↔ Zonal comms** | — | Eclipse SCore / SOME-IP |
| **Zonal ↔ End comms** | — | Eclipse Zenoh |
| **Setup complexity** | Low — just Docker | Requires hardware |
| **Best for** | App development, signal testing, OEM demos | Pre-production validation |

---

## Project Resources

| Resource | Link |
|---|---|
| digital.auto Playground (Prototype) | [playground.digital.auto](https://playground.digital.auto) |
| Development Repository | [eclipse-autowrx/epam-service-connector](https://github.com/eclipse-autowrx/epam-service-connector) |
| digital.auto Website | [www.digital.auto](https://www.digital.auto) |

---
