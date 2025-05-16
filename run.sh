# Prepare environment variable for KUKSA
#export KUKSA_DATABROKER_METADATA_FILE=/home/root/vss.json

# Execute KUKSA
#./databroker-amd64 &


# Prepare environment variable for python
export PYTHONPATH=/home/root/python-packages

# Run python file
cd ./service/src && /usr/bin/python3 -u syncer.py &