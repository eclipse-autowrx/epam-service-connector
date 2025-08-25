# Copyright (c) 2025 Eclipse Foundation.
# 
# This program and the accompanying materials are made available under the
# terms of the MIT License which is available at
# https://opensource.org/licenses/MIT.
#
# SPDX-License-Identifier: MIT

# Prepare environment variable for KUKSA
#export KUKSA_DATABROKER_METADATA_FILE=/home/root/vss.json

# Execute KUKSA
#./databroker-arm64 &


# Prepare environment variable for python
export PYTHONPATH=/home/root/python-packages

# Run python file
cd ./service/src && /usr/bin/python3 -u syncer.py &