
# Eclipse SDV Blueprint — Hybrid Cloud–Edge Application Lifecycle Management

This blueprint demonstrates an end-to-end workflow for developing, validating and orchestrating Mixed-Critical Software-Defined Vehicle (SDV) applications across cloud and HPC edge device.

It showcases how SDV applications are developed in the Playground Digital Auto Portal using the C++ and Python platforms, pushed to AosEdge registry, and deployed onto an in-vehicle HPC running AosCore software package. In the updated architecture, the AutoWorx Runtime is replaced by the Syncer, KUKSA Bridge, and Zenoh protocol, while Eclipse KUKSA remains a core component. Vehicle signals are exchanged across heterogeneous compute domains with HPCs, Zonal and End ECUs — through Eclipse SCore and Eclipse Zenoh.

---

## Demonstrated Use Case – EV Range Extender

Software defined Application  **EV Range Extender**.

The EV Range Extender application continuously monitors the vehicle's battery State of Charge (SoC). When the SoC drops below a predefined threshold, the application initiates a power-saving mode by identifying and reducing or disabling non-essential functions, such as HVAC climate control and seat heating, while maintaining all critical driving and safety functions.

### Use Case Flow

The table below shows how the EV Range Extender application monitors the battery State of Charge (SoC), evaluates vehicle functions, and automatically activates power-saving measures when required.

| | Step 1 | Step 2 | Step 3 |
| :--- | :--- | :--- | :--- |
| **Who** | EV Range Extender | EV Range Extender | Driver |
| **What** | Continuosly Monitors the Vehicle battery (State of Charge), and it drops below the predefined critical threshold. | EV Range Extender app automatically enters power-saving mode and instantly scaling down non-essential features (HVAC climate control, seat heating). | The EV Range Extender optimises energy consumption to extend the vehicle's driving range, while notifying the driver of the actions performed. |
| **Customer TouchPoints** | None | Cabin environment (HVAC eases off, seat heater turns off) | "Power Saving Mode" activated and Driving Range extended |


> **Why this matters for OEMs:** Unlike a manual "Eco Mode" button, the EV Range Extender showcases how SDV applications can continuously monitor vehicle conditions, make intelligent decisions, and automatically optimise energy usage to extend driving range while maintaining safety and enhancing the driver experience

###  VSS signal used in the EV Range Extender sdv application

| Infrastructure Layer | VSS Signal | Vehicle Functions Layer | Functionality of the signal |
|----|---|---|---|
| VM1      | `Vehicle.Powertrain.TractionBattery.StateOfCharge.Current` |  BMS | Triggers power-saving mode when charge is low |
| VM1	   |  `Vehicle.Powertrain.TractionBattery.CurrentVoltage` |  BMS | Battery voltage monitored by the Battery Monitoring System |
| VM1	   |  `Vehicle.Powertrain.TractionBattery.CurrentCurrent` |  BMS | Battery current monitored by the Battery Monitoring System |
| VM2      | `Vehicle.Cabin.HVAC.AmbientAirTemperature` |  HVAC ECU | Adjusted to save power and bridged to VM1 |
| VM2      | `Vehicle.Cabin.Seat.Row1.DriverSide.Heating` |  Seat ECU | Disabled to save power and bridged to VM1 |

| VM2      | `Vehicle.Cabin.Seat.Row1.DriverSide.HeatingCooling` |  Seat ECU | Disabled to save power and bridged to VM2 |

---

## SDV Application on digital.auto playground portal

We can develop and test the SDV application directly in the digital.auto Playground portal without requiring any hardware-specific knowledge. The dashboard provides a visual interface to demonstrate and validate the application’s functionality, enabling rapid development and evaluation in a simulated environment.

 **[Open Application on digital.auto Playground](https://playground.digital.auto/model/67f76c0d8c609a0027662a69/library/prototype/69ce30f438bb8e98f0af5ac8/code)**

The digital.auto Playground enables you to simulate vehicle signals and observe the application's behaviour in a virtual environment before deploying it to real hardware. This allows OEMs to validate business logic, verify signal interactions, and refine the end-to-end customer experience through rapid testing and iteration.

---

## Architecture Overview

The blueprint is implemented in two phases. 

**Phase 1** Leverages virtual machines, enabling teams to develop, test, and validate functionality without relying on physical hardware. 

**Phase 2** Transitions the solution to production-grade automotive hardware, enabling validation under real-world conditions and ensuring readiness for deployment. While the edge hardware is replaced with automotive-grade devices, the cloud infrastructure, application logic, and interfaces remain unchanged across both phases, providing a seamless path from development to production

---

## Phase 1 — Virtual Machines

![Architecture Phase 1](./images/architecture_phase1.svg)

Phase 1 is designed for rapid application development and validation. By running the full stack in QEMU-based virtual machines, developers can build, test, and refine functionality on standard computing platforms before moving to automotive hardware. This software-defined environment accelerates innovation while reducing dependency on physical devices.

### End-to-End EV Range Extender Application Workflow

```
1. Develop and configure EV Range Extender Application in digital.auto Playground portal
        ↓
2. App is published to the AosCloud App Registry once it is successfully build
        ↓
3. AosCore fetches the latest app and deploy it to the qemu VM
        ↓
4. AosCore on the qemu VM configure the app and systemd is running this app as service
        ↓
5. The app(service) reads/writes vehicle signals via eclipse-kuksa
        ↓
6. App(service) functionality will be updated in the digital.auto Playground dash board

```

### Component Distribution by Layer

| Layer | What It Is | What It Does |
|---|---|---|
|  **AosCloud** | Fleet Management + App Registry | Manages the lifecycle, versioning, and fleet-wide deployment of vehicle applications |
|  **QEMU-VM-1** (Linux) | AosCore + sdv app | The brain — runs the vehicle app, handles signal logic |
|  **QEMU-VM-2** (Linux) | Services running Seat Control Module, HVAC ECU, Range Compute AI, Battery Monitoring System | Simulates the end-ECU layer that controls physical components |
|  **Communication stack** | Eclipse Zenoh | Connects QEMU-VM-1 and QEMU-VM-2 — lightweight pub/sub messaging |

### Eclipse components inside the blueprint phase 1

| Component | Role |
|---|---|
| `syncer `       | Communication manager send the signal to dash board  |
| `eclipse-kuksa` | Vehicle signal broker — reads and writes VSS signals |
| `eclipse-zenoh` | Modern pub/sub communication protocol between HPC-VM and End-VM |


### System Setup Workflow

This section describes the end-to-end setup required to recreate the Phase 1 demo from scratch.

#### Automated setup

tbd

#### Manual setup

The setup is organized into sub-sections that guide the VM setup and deployment flow in a practical sequence.

- [Section 1 — VM setup and deployment flow](#section-1--vm-setup-and-deployment-flow)
- [Section 3 — Build and deploy the SDV application](#section-2--build-and-deploy-the-sdv-application)
- [Section 2 — AOSEdge setup](#section-3--aosedge-setup)


##### Section 1 — VM setup and deployment flow

**Prepare the VM environment**

This step sets up two qemu VM instances where the SDV application and its surrounding components are run.

- Download the latest AOS VM image package of bosch and provisioning script from the AOS Edge meta-aos-vm release page: [meta-aos-vm releases](https://github.com/aosedge/meta-aos-vm/releases/)VM images named Version 6.x.x-bosch.x (download latest release)

- Extract the image archive and start the QEMU-based VMs from the same directory:

```bash
tar -xvf aos-vm-image-genericx86-64-6.1.1-bosch.2.tar.xz
sudo ./aos_vm.sh run -f .
```
- If the AOS certificates are unavailable or the setup has not been completed, please follow the steps on[Aos QuickStart](https://docs.aosedge.tech/docs/quick-start/set-up/)

- Access the VM1 with `ssh root@10.0.0.100` and the secondary node with `ssh root@10.0.0.x`, where the address can be discovered with:

```bash
ip neigh
```

- Use `Password1` as the password when prompted to log in to the VMs.

- Monitor the boot and service logs with:

```bash
journalctl -f
```
- Provision the VM1 to AOS Cloud with on Host:

```bash
source ~/.aos/venv/bin/activate
aos-prov provision -u 10.0.0.100
```
If Unit shown offline on AOS Dashboard follow the [Debug Steps](#debug-steps-for-network-on-vms)
**Install the core components**

This step installs the core components e.g. `kuksa-client`, `zenoh`, and `pylibs`

- Download the AOS VM layers package from the same release page: [aos-vm layers package](https://github.com/aosedge/meta-aos-vm/releases/tag/v6.1.1-bosch.2)
- Extract the archive and publish the layers using the signing flow:

```bash
source ~/.aos/venv/bin/activate
tar -xvf aos-vm-layers-genericx86-64-6.1.1-bosch.2.tar.gz
cd layers
aos-signer go
```

- After the publish step, verify in the AOS Cloud Service Provider portal that the expected layers are available in the Layers section. The layers that should appear are `kuksa-client`, `zenoh`, and `pylibs`.
- Confirm that the uploaded layer is available for the target units and that it can be pulled by the VM.

**Deploy the demo services**

This step deploys the components which produces the data required for the SDV application.

- The demo-services repository contains the deployment bundles for the EV Range Extender use case: `bms`, `range-ai`, `seat-ecu`, and `hvac`.
- In the VM, navigate to the EV Range Extender service directory and package it for deployment:

```bash
source ~/.aos/venv/bin/activate
cd epam-service-connector/eclipse-sdv-blueprint/demo-services/ev-range-extender
aos-signer go
```
- Confirm that these application are then downloaded by the target VM after the cloud-side deployment is configured.

- If it return nothing on both VMs follow [Debug Steps for Application Deployment](#debug-steps-for-application-deployment)


**Playground Dashboard Connectivity**

The `kuksa-syncer` service is now part of this repository. Use the local service directory from this workspace and package it for Aos deployment from there.

```bash
source ~/.aos/venv/bin/activate
cd epam-service-connector/eclipse-sdv-blueprint/kuksa-syncer
aos-signer go
```

- Add the generated `kuksa-syncer` service to the created subject (`aos-bosch`) in the AOS dashboard.
- Verify the deployment result in Aos Dashboard → SOTA/FOTA → Deployment Bundles.
- If the deployment does not appear or is rejected, update the service version in `kuksa-syncer/config.yaml` and re-run `aos-signer go`.

##### Section 2 — Build and deploy the SDV application

- Sign in to the digital.auto Playground at [playground.digital.auto](https://playground.digital.auto).
- Open the EV Range Extender application from the playground at [this link](https://playground.digital.auto/model/67f76c0d8c609a0027662a69/library/prototype/69ce30f438bb8e98f0af5ac8/view).
- Upload sp.12 on the aos-deployment plugin(cetificates will be available in .aos/security).
- In the AOS Cloud Deployment view, first choose the C++ option, then select the EV Range Extender application from the dropdown menu, upload the required certificate, and click Build and Deploy.

##### Section 3 — AOSEdge setup

**Automated AOS Edge setup**

1. **Change into the automation directory**
   ```bash
   cd eclipse-sdv-blueprint/Aosedge-Automation
   ```

2. **Create and activate the Python virtual environment**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. **Install the required Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the automation script**
   ```bash
   python aos-automation.py
   ```

This script performs the end-to-end AOS Edge setup, including unit config updates, unit set creation, subject creation, and service assignment. It will prompt for the target unit system ID and then update the unit configuration automatically, removing the need for those manual steps in the AOS Cloud dashboard.

After deployment, log in to the units via SSH and verify that the services are running:

```bash
crun --root=/run/crun list
```

***Manual steps for AOS-Edge**

**Configure the OEM target systems**
- Open the AOS documentation portal at [AOS Edge Quick Start](https://docs.aosedge.tech/docs/quick-start/) and install the required certificates in the environment where the deployment tools are used.
- After this, create the required service and subject in the AOS dashboard so the deployment can be bound to the target VM which is followed on the aosedge quick start guide id not done .
- Sign in to the AOS Service Provider or OEM portal at [AOS Cloud](https://api.aoscloud.io/account/start) and import the required `.p12` certificate, such as `aos-user-oem.p12` or `aos-user-sp.p12`.
- Download the unit configuration template from [unitconfig.json](https://github.com/aosedge/meta-aos-vm/blob/demo_bosch/misc/unitconfig.json) and import it in AosEdge Dashboard →Target System →edit →UNIT CONFIG
- Create the unit set `ev-range-extender-unitset` and assign it to the provisioned VM so verification does not block the demo deployment.
  - Configure: Title `ev-range-extender-unitset`, Description `Optional`, Update Strategy `Minimize Unit Restart`, and enable `Is Verification Set`.
  - Save the unit set, then open the target VM in AosEdge Dashboard → Units, select its details, and add `ev-range-extender-unitset` under Manage Unit Sets.
  - Create the subject `ev-range-extender-subject` under Subjects on OEM, attach the target VM, and bind the service to it.
  - add the respective unit to subject.
  - On service add the services that are deployed `Range-Ai`,`Seat ECU`,`HVAC ECU`,`kuksa-syncer`,`ev-range-application`and `BMS`.

  - After creating the required unit_set and subject in the AOS dashboard, deployment can be bound to the target VM and services will be deployed on respective VM's.

  - Check application deployment on both VMs using

login to units using ssh and verify the serivces deployed or not using 

```bash
crun --root=/run/crun list
```

### Steps to demo
1. Complete the "SDV-Application-Compilation-and-Configuration" steps
1. Start the hardware simulator by running `./hardware-sim/pytk_hwsim.py` from the `eclipse-sdv-blueprint` directory (see `hardware-sim/README.md`).
1. Select ev-range-extender runtime on playground .If not added please add the runtime ont he playgound terminal.

1. Once the hardware simulator is running, launch the Playground application (SDV application).
1. Click the Start button in the hardware simulator to start simulating driving vehicle.

### Observe the threshold-based behaviour:
1. When the battery level reaches 50%, the HVAC fan is automatically turned off.
2. When the battery level reaches 30%, additional power-saving measures are applied, and the seat heating/cooling functions are turned off.
3. When the HVAC fan is turned off, a slight increase in the estimated driving range can be observed.
4. When the seat heating/cooling functions are also disabled, the estimated driving range increases furthe
5. Log in to QEMU-VM-1 using SSH:

```bash
ssh root@10.0.0.100
```
6. Monitor the application logs by running:

```bash
journalctl -f | grep "range-ext"
```
7. Check the application level logs

### Signal Flow and Internals

The demo runs as a closed loop across host, virtual machines, and the playground runtime.

1. **Hardware simulator (host side)** publishes battery and cabin control values.
2. **QEMU-VM-1 runtime stack** receives battery values and updates the vehicle signal broker.
3. **Vehicle signal broker (Kuksa)** stores and distributes current vehicle values used by the application and runtime services.
4. **Bridge layer** transfers cabin-related signal and  updates between QEMU-VM-1 and QEMU-VM-2 so both compute domains stay synchronized.
5. **VM2 ECU services** apply HVAC and seat actions and publish actuator status back to the dashboard.

---

## Phase 2 — Physical Hardware

![Architecture Phase 2](./images/architecture_phase2.svg)

Phase 2 replaces the virtual machines with **automotive hardware**. The cloud layer and application logic stay identical — this phase validates that the same software runs correctly on the hardware an OEM would actually put in a vehicle.

A key addition in Phase 2 is the **End ECU layer** (STM32), which represents the deepest level of the vehicle's electrical architecture — the microcontrollers directly attached to physical sensors and actuators like motors, lights, and HVAC.

**Note**: Phase 2 is still under development and is not ready for trial.

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

### Debug steps for network on VM's

Before performing these checks, verify the bridge and external interface names on your host and replace `aos-br0` / `eth0` if they differ.

2. Check the bridge and IP forwarding still exist

```bash
ip addr show aos-br0
cat /proc/sys/net/ipv4/ip_forward
```

This should show `10.0.0.1/24` on the bridge and `1` for forwarding. If forwarding shows `0`:

```bash
sudo sysctl -w net.ipv4.ip_forward=1
```

3. Check MASQUERADE rule exists (this is the one that keeps disappearing)

```bash
sudo iptables -t nat -L POSTROUTING -n -v
```

If it's empty, re-add it using your external interface name instead of `eth0`:

```bash
sudo iptables -t nat -A POSTROUTING -o <external-interface> -j MASQUERADE
```

4. Check FORWARD chain allows traffic both ways

```bash
sudo iptables -L FORWARD -n -v
```

It should show `aos-br0→<external-interface> ACCEPT` and `<external-interface>→aos-br0 ACCEPT` with state `RELATED,ESTABLISHED`. If missing:

```bash
sudo iptables -A FORWARD -i aos-br0 -o <external-interface> -j ACCEPT
sudo iptables -A FORWARD -i <external-interface> -o aos-br0 -m state --state RELATED,ESTABLISHED -j ACCEPT
```

Use the actual interface name on your machine, for example `eth0`, `ens33`, `enp3s0`, or another host-facing NIC.

### Debug Steps for Application Deployment

1. SSH into the Secondary-VM :

```bash
ssh ubuntu@10.0.0.X 
```

- If the filesystem is mounted read-only, remount it as writable:

```bash
mount -o rw,remount /
```

- note:To get to know Secondary-VM ip 
```bash
ip neigh
```

2. Open `/etc/hosts` for editing with `vi`:

```bash
vi /etc/hosts
```

3. Add the following entry to the file:

```text
10.0.0.100 main
```

4. Save and exit `vi`:

- press `Esc`
- type `:wq`
- press `Enter`

5. Verify DNS resolution for `main`:

```bash
nslookup main
```

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
| digital.auto Playground | [playground.digital.auto](https://playground.digital.auto) |
| Development Repository | [eclipse-autowrx/epam-service-connector](https://github.com/eclipse-autowrx/epam-service-connector) |
| digital.auto Website | [www.digital.auto](https://www.digital.auto) |
| Aos Cloud | [AOS Cloud](https://api.aoscloud.io/account/start) |
---
