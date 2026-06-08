#!/usr/bin/env python3
# Copyright (c) 2026 Eclipse Foundation.
# SPDX-License-Identifier: MIT

"""KUKSA REST Bridge — lightweight HTTP proxy for KUKSA databroker gRPC API.

Exposes simple REST endpoints so that statically-linked C++ apps on AosEdge
can read/write vehicle signals without linking gRPC or protobuf.

Endpoints:
    GET  /api/v1/health                  → {"status":"ok", ...}
    GET  /api/v1/signals/<VSS-path>      → {"path":"…","value":"…","timestamp":"…"}
    POST /api/v1/signals/<VSS-path>      → set signal value (body: {"value": …})
"""

import json
import os
import sys
import traceback
from http.server import HTTPServer, BaseHTTPRequestHandler

KUKSA_HOST = os.environ.get('KUKSA_DATABROKER_HOST', '127.0.0.1')
KUKSA_PORT = int(os.environ.get('KUKSA_DATABROKER_PORT', '55555'))
BRIDGE_PORT = int(os.environ.get('BRIDGE_PORT', '8888'))

client = None


def get_client():
    global client
    if client is None:
        from kuksa_client.grpc import VSSClient
        client = VSSClient(KUKSA_HOST, KUKSA_PORT)
        client.connect()
        print(f'[Bridge] Connected to KUKSA databroker at {KUKSA_HOST}:{KUKSA_PORT}')
    return client


class KuksaBridgeHandler(BaseHTTPRequestHandler):

    def do_GET(self):
        if self.path == '/api/v1/health':
            try:
                get_client()
                self._respond(200, {'status': 'ok', 'kuksa': f'{KUKSA_HOST}:{KUKSA_PORT}'})
            except Exception as e:
                self._respond(503, {'status': 'error', 'error': str(e)})

        elif self.path.startswith('/api/v1/signals/'):
            signal_path = self.path[len('/api/v1/signals/'):]
            try:
                c = get_client()
                values = c.get_current_values([signal_path])
                dp = values.get(signal_path)
                if dp is not None and dp.value is not None:
                    self._respond(200, {
                        'path': signal_path,
                        'value': str(dp.value),
                        'timestamp': str(dp.timestamp) if dp.timestamp else '',
                    })
                else:
                    self._respond(200, {'path': signal_path, 'value': 'N/A', 'timestamp': ''})
            except Exception as e:
                self._respond(500, {'path': signal_path, 'error': str(e)})

        else:
            self._respond(404, {'error': 'Not found'})

    def do_POST(self):
        if self.path.startswith('/api/v1/signals/'):
            signal_path = self.path[len('/api/v1/signals/'):]
            content_length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(content_length)) if content_length > 0 else {}
            try:
                from kuksa_client.grpc import Datapoint
                c = get_client()
                value = body.get('value', 0)
                c.set_current_values({signal_path: Datapoint(value)})
                self._respond(200, {'status': 'ok', 'path': signal_path})
            except Exception as e:
                self._respond(500, {'error': str(e)})
        else:
            self._respond(404, {'error': 'Not found'})

    def _respond(self, code, data):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, fmt, *args):
        sys.stdout.write(f'[Bridge] {args[0]}\n') if args else None
        sys.stdout.flush()


if __name__ == '__main__':
    print(f'[Bridge] KUKSA Databroker: {KUKSA_HOST}:{KUKSA_PORT}')
    print(f'[Bridge] Listening on:    0.0.0.0:{BRIDGE_PORT}')
    server = HTTPServer(('0.0.0.0', BRIDGE_PORT), KuksaBridgeHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n[Bridge] Shutting down.')
