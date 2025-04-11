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
        - syncer.py             // this is the main app to connect between unit and plsyground.digital.auto.
        - ...
- run.sh                        // this is a temporary solution to execute KUKSA and service manually while waiting for layer and service developement
```

# Installation

## Step 1: copy KUKSA data broker to unit

> Notice: in my case, unit ssh port is `8992`, consider to change it to match with your device

### Chip intel
```bash
scp -P 8992 -r kuksa/databroker-amd64 root@localhost:/home/root
```

### Chip ARM (Raspberry, Potenta, Jetson Orin, Jetson Nano,...)
```bash
scp -P 8992 -r kuksa/databroker-arm64 root@localhost:/home/root
```

## Step 2: copy VSS JSON file to unit
```bash
scp -P 8992 -r kuksa/vss.json root@localhost:/home/root
```

## Step 3: copy Python libs to unit
```bash
scp -P 8992 -r python-packages root@localhost:/home/root
```

## Step 4: Execute run.sh
```bash
ssh -P 8992 root@localhost

cd /home/root
chmod +x run.sh
./run.sh
```