#!/usr/local/bin/python3.10
#
#
# Convert vspec2protobuf wrapper for vspec2x
#

import sys
import vspec2x

if __name__ == "__main__":
    vspec2x.main(["--format", "protobuf"]+sys.argv[1:])
