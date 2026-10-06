
# AosEdge setup (manual)

**Manual steps for Aos-Edge**

Hint: This step is optional if the automation setup has already been completed.

- Sign in to the Aos Service Provider or OEM portal at [AosCloud](https://api.aoscloud.io/account/start) and import the required `.p12` certificate, such as `aos-user-oem.p12` or `aos-user-sp.p12`.
- Select [Service Provider](https://sp.aoscloud.io/sp/dashboard) and [OEM](https://oem.aoscloud.io/oem/dashboard) 
- Download the unit configuration template from [unitconfig.json](https://github.com/aosedge/meta-aos-vm/blob/demo_bosch/misc/unitconfig.json) and import it in [AosEdge Dashboard Target System](https://oem.aoscloud.io/oem/systems) edit the target system UNIT CONFIG.
- Create a [unit set](https://oem.aoscloud.io/oem/unit-sets) `ev-range-extender-unitset` and assign it to the provisioned VM so verification does not block the demo deployment.
  - Configure: Title `ev-range-extender-unitset`, Description `Optional`, Update Strategy `Minimize Unit Restart`, and enable `Is Verification Set`.

- Create a [subject](https://oem.aoscloud.io/oem/subjects) `ev-range-extender-subject` under Subjects on OEM, attach the target VM, bind the service to it.

  - On service add the services that are deployed `Range-Ai`,`Seat ECU`,`HVAC ECU`,`kuksa-syncer`,`ev-range-application`and `BMS`.

  - After creating the required unit_set and subject in the Aos dashboard, deployment can be bound to the target VM and services will be deployed on respective VM's.

  - Check application deployment on both VMs by logging in to the units via SSH and verify whether serivces are deployed by:

    ```bash
    crun --root=/run/crun list
    ```

 - Service deployments can be verfied on the [Aos dashboard - units portal](https://oem.aoscloud.io/oem/units) for the respective unit .
