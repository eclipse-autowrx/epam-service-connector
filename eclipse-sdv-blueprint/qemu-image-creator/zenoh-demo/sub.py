"""Zenoh subscriber for the VM1 -> VM2 demo.

Runs on VM2 (192.168.100.11). Listens on tcp/0.0.0.0:7447 and
subscribes to the wildcard key 'demo/vm/**'. VM1's pub.py opens a
TCP connection to this port and publishes samples on 'demo/vm/vm1'.
"""

import argparse
import json

import zenoh


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Zenoh subscriber (runs on VM2). Listens on tcp/0.0.0.0:7447."
    )
    parser.add_argument(
        "--key",
        default="demo/vm/**",
        help="Zenoh key expression to subscribe to (default: demo/vm/**)",
    )
    parser.add_argument(
        "--listen",
        default="tcp/0.0.0.0:7447",
        help="Endpoint to listen on (default: tcp/0.0.0.0:7447)",
    )
    return parser.parse_args()


def build_config(listen_endpoint: str) -> zenoh.Config:
    config = zenoh.Config()
    config.insert_json5("listen/endpoints", f'["{listen_endpoint}"]')
    return config


def listener(sample: zenoh.Sample) -> None:
    text = sample.payload.to_string()
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        data = text
    print(f"[SUB] key={sample.key_expr} msg={data}", flush=True)


def main() -> None:
    args = parse_args()

    print(f"[SUB] Opening Zenoh session, listening on '{args.listen}'", flush=True)
    with zenoh.open(build_config(args.listen)) as session:
        session.declare_subscriber(args.key, listener)
        print(f"[SUB] Subscribed to '{args.key}'. Waiting for samples... (Ctrl+C to exit)", flush=True)
        try:
            import time
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("[SUB] Stopping.")


if __name__ == "__main__":
    main()
