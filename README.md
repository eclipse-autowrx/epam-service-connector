# Introduction

This guidance aim to setup a serivce on EPAM unit to receive python code from playground.digital.auto and execute code.

## Folder struture
```bash
- service                       // this folder for the connector service
    - meta
        - config.yaml           // service config file
    - src
        - app
            - syncer.py         // this is the main app to connect between unit and plsyground.digital.auto.
            - ...
```

# Installation

## Step 1: Create unit and service on AOS Edge website

Follow this guide and create the Aos service: [AosEdge Quick start](https://docs.aosedge.tech/docs/quick-start/)

Output: you will get a `service ID`

Here are some hints to get you started with Aos solutions:

1. If using virtualbox, the version 7.1.6 is recommended. There is a [bug](https://github.com/VirtualBox/virtualbox/issues/271) in version 7.2.x which makes it unsuitable for AosCore.

1. Be aware that if the unit is created behind a corporate proxy, it may interfere with connection to AosCloud.

1. When creating a service in AosCloud, reserve at least the amount of resources given by `meta/config.yaml`.

   e.g. 
   ```yaml
       # Quotas assigned to service
       quotas:
           cpu: 10000
           mem: 100MB
           state: 128KB
           storage: 20MB
           # upload_speed: 1MB
           # download_speed: 1MB
           # upload: 512MB
           # download: 512MB
           temp: 128KB
   ```
   ![Service resources](assets/images/01_epam_service_resource.png)

1. This service has dependency to "aos-pylibs-layer". This layer must be uploaded to AosCloud Layers tab.
   
   You can download the latest version from the layer from [here](https://github.com/aosedge/meta-aos-vm/releases).

   e.g. aos-pylibs-layer-genericx86-64-1.0.0.tar.gz

   ![Layers tab](assets/images/02_layer.png)

1. download `unitconfig.json` from the release page in previous step.
   
   create a new Target System and paste the json contents there.

   ![Target systems](assets/images/03_target_system.png)

1. After all the steps as in the official Aos Quick Start, make sure of the following:
   1. Unit is `Online`
   2. Service status is `ready`
   3. In the Unit Details, Subject/Service status is `Installed`

1. Finally fetch the `system id` from the `UUID` of the `Services` tab
   
   ![service id](assets/images/04_service_id.png)

## Step 2: 
Go to file: service/meta/config.yaml, line 19, change `service_id` to `service ID`

## Step 3
Go to file: service/src/app/syncer.py, line 25, change DEFAULT_RUNTIME_NAME = 'EPAM-SERVICE-001' to a another unique name.
```python
# set a secret name
DEFAULT_RUNTIME_NAME = 'EPAM-ANHB-81'
```

## Step 4: sign and publish your service
```bash
cd service
aos-signer sign
aos-signer upload
```

Then wait for service deploy to unit. It take a few minutes.

# Step 5: Test with existing prototype
Go to playground.digital.auto perform below action:
1. Register and Login(if you don't have account yet)
2. Test with existing prototype.
   2.1 Goto this prototype:
   https://playground.digital.auto/model/67d275636e5b6c002746bf4f/library/prototype/6810400bf7ffb78147e4a882/code

   2.2 Expand terminal panel
   ![image](https://bewebstudio.digitalauto.tech/data/projects/ih1XKDE24yRM/expland_terminal.png)

   2.3 Click 'Add runtime' (only do this action one time)
    ![image](https://bewebstudio.digitalauto.tech/data/projects/ih1XKDE24yRM/add_runtime.png)

   2.4 Enter your runtime name, format: Runtime-{your_unique runtime name}
    => As above config: it is: `Runtime-EPAM-ANHB-81`, then click add and close dialog.
   ![image](https://bewebstudio.digitalauto.tech/data/projects/ih1XKDE24yRM/set_runtime_name.png)

   2.5 When the runtime list reload, pick your runtime. Then click run button to execute the code on aos unit.
   2.6 Switch to dashboard to see the result.
   
# Step 6: Test with your own prototype   
1. Create e vehicle model(if you don't have any) with VSS v4.1
2. Create a prototype
3. Go to tab Code: learn from step 5 code, modify it for your purpose
4. Execute new code with your runtime selected
