# Aos API usage examples

## Overview

This project is Python based code examples for AOS API usage.
It is needed to install dependencies from requirements.txt file.

## Structure

 - `certificates` - code for working with PKCS12 certificates and keys
 - `services` - code for working with AOS services (list, search, get ID by codename, etc.)
 - `subjects` - code for working with AOS subjects (list, create, search, get ID by label, etc.)
 - `units` - code for working with AOS units (list, search, get ID by system UID, etc.)
 - `cli.py` - command line interface for AOS API usage

Example usage:

All examples prints URLs of the API calls (including data if it's needed).

List all available commands:

```bash
python cli.py --help
```

Assign service to subject:

Command shows how to assign service to subject.

```bash
python cli.py assign-service hello-world-python zonal-subject
```

Example output:
```bash
python cli.py assign-service hello-world-python MyTestSubj001
Service search URL: https://aoscloud.io:10000/api/v11/services/?search=hello-world-python
Subjects info URL: https://aoscloud.io:10000/api/v11/subjects/?label=MyTestSubj001
Trying to assign service "7c36c0b0-14b7-410c-9993-8ba7ce98e3e6" to subject "f4cd9709-e05c-439a-925d-b3b6e3ec6f1a"...
Assign service to subject URL:
   https://aoscloud.io:10000/api/v11/subjects/f4cd9709-e05c-439a-925d-b3b6e3ec6f1a/services/
   payload: {"service_ids": ["7c36c0b0-14b7-410c-9993-8ba7ce98e3e6"]}
Successfully assigned service "7c36c0b0-14b7-410c-9993-8ba7ce98e3e6" to subject "f4cd9709-e05c-439a-925d-b3b6e3ec6f1a".
```


Assign unit to subject:

Command shows how to assign unit to subject.
Subject will be created if it doesn't exist.

```bash
python cli.py assign-unit SYSTEM_UID LABEL
```

Example output (successful assignment):
```bash
python cli.py assign-unit 4d09e85405904f03b77dac5d794a3d07 MyTestSubj001
Subjects info URL: GET https://aoscloud.io:10000/api/v11/subjects/?label=MyTestSubj001
Unit search URL: GET https://aoscloud.io:10000/api/v11/units/?system_uid=4d09e85405904f03b77dac5d794a3d07
Trying to assign unit "70103210-b7c1-45fc-a8d1-7d88ebc7629f" to subject "ca6b61eb-9752-4b19-a465-c25b5f889bb2"...
Assign unit to subject URL:
   POST https://aoscloud.io:10000/api/v11/subjects/ca6b61eb-9752-4b19-a465-c25b5f889bb2/units/
   payload: {"system_uids": ["4d09e85405904f03b77dac5d794a3d07"]}
Unit "70103210-b7c1-45fc-a8d1-7d88ebc7629f" successfully assigned to subject "ca6b61eb-9752-4b19-a465-c25b5f889bb2".
```

Example output (already assigned unit):
```bash
python cli.py assign-unit 4d09e85405904f03b77dac5d794a3d07 MyTestSubj001
Subjects info URL: GET https://aoscloud.io:10000/api/v11/subjects/?label=MyTestSubj001
Unit search URL: GET https://aoscloud.io:10000/api/v11/units/?system_uid=4d09e85405904f03b77dac5d794a3d07
Trying to assign unit "70103210-b7c1-45fc-a8d1-7d88ebc7629f" to subject "ca6b61eb-9752-4b19-a465-c25b5f889bb2"...
Assign unit to subject URL:
   POST https://aoscloud.io:10000/api/v11/subjects/ca6b61eb-9752-4b19-a465-c25b5f889bb2/units/
   payload: {"system_uids": ["4d09e85405904f03b77dac5d794a3d07"]}
Unit "70103210-b7c1-45fc-a8d1-7d88ebc7629f" is already assigned to subject "ca6b61eb-9752-4b19-a465-c25b5f889bb2".```
