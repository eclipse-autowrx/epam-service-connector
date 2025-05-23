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

## Step 1: Create unit and service on AOS Edge website
[How to](https://docs.aosedge.tech/docs/quick-start/)

Output: ypu will get a `service ID`

## Step 2: 
Go to file: service/meta/config.yaml, line 19, change `service_id` to `service ID`

## Step 3: sign and publish your service
```bash
cd service
aos-signer sign
aos-signer upload
```

Then wait for service deploy to unit. It take a few minutes.

# Step 4: 
Go to playground.digital.auto add a asset and perform test.
```
