# Introduction

This guidance aim to setup a serivce on EPAM unit to receive python code from playground.digital.auto and execute code.

## Folder struture
```bash
- kuksa                         // this folder for KUKSA data broker
    - databroker-amd64          // bin file for amd
    - databroker-arm64          // bin file for arm
    - vss.json                  // covesa API definition
- python-packages               // this folder contain all require pytho libs
    -
    -
- service                       // this folder for the connector service
    - meta
        - config.yaml
    - src
        - app
            - syncer.py             // this is the main app to connect between unit and plsyground.digital.auto.
            - ...
- run.sh                        // this is a temporary solution to execute KUKSA and service manually while waiting for layer and service developement
```

# Installation

## Step 0: Follow this guide to prapare a Raspberry device with AOS
https://github.com/aosedge/meta-aos-rpi

## Step 1: Create unit and service on AOS Edge website
[How to](https://docs.aosedge.tech/docs/quick-start/)


Output: you will get a `service ID`

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
