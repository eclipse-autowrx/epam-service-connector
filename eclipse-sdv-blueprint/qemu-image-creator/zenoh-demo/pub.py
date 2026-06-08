"""Zenoh publisher for the VM1 -> VM2 demo.

Runs on VM1 (192.168.100.10). Opens a TCP connection to VM2's
listener at tcp/192.168.100.11:7447 and publishes a JSON sample
on the key 'demo/vm/vm1' every --interval seconds.
"""

import argparse
import json
import socket
import time
from datetime import datetime

import zenoh


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Zenoh publisher (runs on VM1). Connects to VM2's listener."
    )
    parser.add_argument(
        "--key",
        default="demo/vm/vm1",
        help="Zenoh key expression to publish on (default: demo/vm/vm1)",
    )
    parser.add_argument(
        "--peer",
        default="tcp/192.168.100.11:7447",
        help="Endpoint of the VM2 subscriber (default: tcp/192.168.100.11:7447)",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=1.0,
        help="Publish interval in seconds (default: 1.0)",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=0,
        help="Number of messages to publish (0 = forever)",
    )
    parser.add_argument(
        "--name",
        default=socket.gethostname(),
        help="Sender name embedded in the payload (default: hostname)",
    )
    return parser.parse_args()


def build_config(peer_endpoint: str) -> zenoh.Config:
    config = zenoh.Config()
    config.insert_json5("connect/endpoints", f'["{peer_endpoint}"]')
    config.insert_json5("listen/endpoints", '["tcp/0.0.0.0:0"]')
    return config


def main() -> None:
    args = parse_args()

    print(f"[PUB] Opening Zenoh session, dialling '{args.peer}'", flush=True)
    with zenoh.open(build_config(args.peer)) as session:
        publisher = session.declare_publisher(args.key)
        print(f"[PUB] Publishing on '{args.key}' every {args.interval}s", flush=True)

        index = 0
        while args.count == 0 or index < args.count:
            payload = {
                "from": args.name,
                "index": index,
                "timestamp": datetime.now().isoformat(timespec="milliseconds"),
                "message": f"Hello from {args.name} #{index}",
            }
            publisher.put(json.dumps(payload))
            print(f"[PUB] key={args.key} msg={payload}", flush=True)
            index += 1
            time.sleep(args.interval)


if __name__ == "__main__":
    main()