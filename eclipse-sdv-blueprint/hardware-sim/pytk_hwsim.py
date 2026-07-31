#!/usr/bin/env python3
# Copyright (c) 2026 Eclipse Foundation.
#
# This program and the accompanying materials are made available under the
# terms of the MIT License which is available at
# https://opensource.org/licenses/MIT.
#
# SPDX-License-Identifier: MIT
"""EV Range Extender host dashboard (Tk + TCP).

Publishes host controls to VM ECUs via direct TCP connections:
  - sim/battery/* -> vm1 bms.py        (TCP port 7460)
  - sim/cabin/temp -> vm2 hvac_ecu.py  (TCP port 7461)
  - sim/cabin/seat/* -> vm2 seat_ecu.py (TCP port 7462)

Receives reverse status from VM2 ECUs on the same persistent connections:
  - dash/status/hvac  (from hvac_ecu.py)
  - dash/status/seat  (from seat_ecu.py)

Wire format (both directions): newline-delimited JSON.
"""

from __future__ import annotations

import argparse
import json
import logging
import logging.handlers
import socket
import sys
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from tkinter import BooleanVar, Canvas, Frame, IntVar, StringVar, Tk, ttk
from typing import Callable, Optional

# Setup logging
LOG_FILE = "/tmp/pytk_hwsim.log"
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
handler = logging.handlers.RotatingFileHandler(LOG_FILE, maxBytes=5*1024*1024, backupCount=3)
formatter = logging.Formatter('%(asctime)s.%(msecs)03d [%(name)s] %(levelname)s: %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
handler.setFormatter(formatter)
logger.addHandler(handler)


DEFAULT_VM1_IP = "192.168.100.10"
DEFAULT_VM2_IP = "192.168.100.11"
DEFAULT_BMS_PORT = 7460
DEFAULT_HVAC_PORT = 7461
DEFAULT_SEAT_PORT = 7462

STATUS_KEY_HVAC = "dash/status/hvac"
STATUS_KEY_SEAT = "dash/status/seat"

INDICATOR_COLORS = {
    "green": "#2ecc71",
    "red": "#e74c3c",
    "blue": "#3498db",
    "grey": "#7f8c8d",
}


@dataclass
class Signal:
    display: str
    key: str
    unit: str
    vmin: float
    vmax: float
    step: float
    default: float
    is_int: bool = False
    is_toggle: bool = False
    on_value: float = 1.0
    off_value: float = 0.0
    mutex_with: Optional[str] = None


BATTERY_SIGNALS = (
    Signal("Battery Voltage", "sim/battery/voltage", "V", 320.0, 420.0, 1.0, 380.0),
    Signal("Battery Current", "sim/battery/current", "A", 0.0, 200.0, 1.0, 30.0),
    Signal("Battery %", "sim/battery/soc", "%", 0.0, 100.0, 1.0, 80.0),
)

HVAC_SIGNALS = (
    Signal("Fan Speed", "sim/cabin/temp", "%", 0, 100, 1, 0, is_int=True),
)

SEAT_SIGNALS = (
    Signal(
        "Seat Heating",
        "sim/cabin/seat/heating",
        "",
        0,
        100,
        1,
        0,
        is_int=True,
        is_toggle=True,
        on_value=100,
        off_value=0,
        mutex_with="sim/cabin/seat/hc",
    ),
    Signal(
        "Seat Cooling",
        "sim/cabin/seat/hc",
        "",
        -100,
        0,
        1,
        0,
        is_int=True,
        is_toggle=True,
        on_value=-100,
        off_value=0,
        mutex_with="sim/cabin/seat/heating",
    ),
)

ALL_SECTIONS = (
    ("Battery (VM1 - bms.py)", BATTERY_SIGNALS),
    ("Cabin HVAC (VM2 - hvac_ecu.py)", HVAC_SIGNALS),
    ("Cabin Seat (VM2 - seat_ecu.py)", SEAT_SIGNALS),
)


class TcpBus:
    """Direct TCP transport for dashboard-to-ECU signaling.

    The dashboard acts as the TCP *client*: it connects to each VM ECU on
    its listen port and holds the connection open.  Signal values are sent
    outbound over these connections.  ECUs write reverse-status frames back
    on the same socket, so no extra listen port is needed on the dashboard.

    Wire format (both directions): newline-delimited JSON.
        Outbound  {"key": "sim/battery/soc", "value": 80,
                   "source": "host", "ts": "..."}
        Inbound   {"topic": "dash/status/hvac", "key": "hvac.fan_speed",
                   "value": 30.0, "status": "on", "source": "vm2", "ts": "..."}

    ``subscribe`` key_expr is matched against the "topic" field (if present)
    or the "key" field as fallback.
    """

    def __init__(self, key_routes: dict[str, tuple[str, int]]) -> None:
        self.source = socket.gethostname()
        self._routes: dict[str, tuple[str, int]] = key_routes
        self._sockets: dict[tuple[str, int], socket.socket] = {}
        self._lock = threading.Lock()
        self._subscribers: list[tuple[str, Callable[[str, dict], None]]] = []
        # One reader thread per unique endpoint (handles inbound reverse frames).
        seen: set[tuple[str, int]] = set()
        for ep in key_routes.values():
            if ep not in seen:
                seen.add(ep)
                threading.Thread(
                    target=self._reader_loop, args=(ep,), daemon=True
                ).start()
        logger.debug(f"TcpBus init with routes: {key_routes}")

    # ── Connection management ────────────────────────────────────────────────

    def _connect(self, addr: tuple[str, int]) -> Optional[socket.socket]:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(3.0)
            sock.connect(addr)
            sock.settimeout(None)
            logger.info(f"TcpBus: connected to {addr[0]}:{addr[1]}")
            return sock
        except OSError as exc:
            try:
                sock.close()
            except Exception:
                pass
            logger.debug(f"TcpBus: cannot connect to {addr}: {exc}")
            return None

    def _get_socket(self, addr: tuple[str, int]) -> Optional[socket.socket]:
        with self._lock:
            sock = self._sockets.get(addr)
            if sock is not None:
                return sock
        sock = self._connect(addr)
        if sock is None:
            return None
        with self._lock:
            existing = self._sockets.get(addr)
            if existing is not None:
                try:
                    sock.close()
                except Exception:
                    pass
                return existing
            self._sockets[addr] = sock
        return sock

    def _drop_socket(self, addr: tuple[str, int], sock: socket.socket) -> None:
        with self._lock:
            if self._sockets.get(addr) is sock:
                del self._sockets[addr]
        try:
            sock.close()
        except Exception:
            pass

    # ── Reader thread (inbound reverse-status frames) ────────────────────────

    def _reader_loop(self, addr: tuple[str, int]) -> None:
        """Maintain a TCP connection to *addr* and dispatch inbound frames."""
        while True:
            sock = self._get_socket(addr)
            if sock is None:
                time.sleep(2.0)
                continue
            buf = b""
            try:
                while True:
                    chunk = sock.recv(4096)
                    if not chunk:
                        break
                    buf += chunk
                    while b"\n" in buf:
                        line, buf = buf.split(b"\n", 1)
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            msg = json.loads(line.decode())
                        except Exception:
                            continue
                        # Match on "topic" if present, else fall back to "key".
                        topic = str(msg.get("topic", msg.get("key", "")))
                        logger.debug(f"TcpBus RECV topic='{topic}' from {addr}")
                        for k, cb in self._subscribers:
                            if topic == k:
                                try:
                                    cb(topic, msg)
                                except Exception as exc:
                                    logger.error(f"TcpBus callback error: {exc}")
            except OSError:
                pass
            finally:
                self._drop_socket(addr, sock)
            logger.debug(f"TcpBus: lost connection to {addr}, retrying in 1s")
            time.sleep(1.0)

    # ── Public API ───────────────────────────────────────────────────────────

    def put(self, key: str, value: float | int) -> None:
        endpoint = self._routes.get(key)
        if endpoint is None:
            logger.warning(f"TcpBus: no route for key '{key}'")
            return
        payload = (
            json.dumps({
                "key": key,
                "value": value,
                "source": self.source,
                "ts": datetime.now(timezone.utc).isoformat(),
            })
            + "\n"
        ).encode()
        sock = self._get_socket(endpoint)
        if sock is None:
            logger.warning(
                f"TcpBus: no connection to {endpoint}, dropping put '{key}'"
            )
            return
        try:
            sock.sendall(payload)
            logger.debug(
                f"TcpBus PUT {endpoint[0]}:{endpoint[1]} key={key} value={value}"
            )
        except OSError as exc:
            logger.warning(f"TcpBus: send failed to {endpoint}: {exc}")
            self._drop_socket(endpoint, sock)

    def subscribe(self, key_expr: str, callback: Callable[[str, dict], None]) -> None:
        self._subscribers.append((key_expr, callback))
        logger.info(f"TcpBus: subscriber registered for '{key_expr}'")

    def close(self) -> None:
        with self._lock:
            sockets = list(self._sockets.values())
            self._sockets.clear()
        for sock in sockets:
            try:
                sock.close()
            except Exception:
                pass


class SignalRow:
    def __init__(self, parent: Frame, sig: Signal, publish: Callable[[Signal, float | int], None]) -> None:
        self.sig = sig
        self.publish = publish
        self._float = sig.default
        self._building = True
        self._user_dragging = False
        self._remote_hush_until = 0.0

        ttk.Label(parent, text=sig.display, width=24).grid(row=0, column=0, sticky="w", padx=(8, 4), pady=4)

        if sig.is_toggle:
            self.var = None
            self.scale = None
            self.spin = None
            self._toggle_var = BooleanVar(value=(sig.default == sig.on_value))
            self._toggle = ttk.Checkbutton(
                parent,
                text="Off",
                variable=self._toggle_var,
                command=self._on_toggle,
            )
            self._toggle.grid(row=0, column=1, sticky="w", padx=4, pady=4)
            ttk.Label(parent, text=sig.unit, width=4).grid(row=0, column=3, sticky="w", padx=(0, 8), pady=4)
            parent.columnconfigure(1, weight=1)
            self._refresh_toggle_label()
            self._building = False
            return

        self.var = IntVar(value=int(round(sig.default))) if sig.is_int else None
        self.scale = ttk.Scale(
            parent,
            from_=sig.vmin,
            to=sig.vmax,
            orient="horizontal",
            command=self._on_scale,
            length=320,
        )
        self.scale.set(sig.default)
        self.scale.bind("<ButtonPress-1>", self._on_scale_press)
        self.scale.bind("<ButtonRelease-1>", self._on_scale_release)
        self.scale.grid(row=0, column=1, sticky="we", padx=4, pady=4)

        increment = sig.step if sig.step else (1 if sig.is_int else 0.1)
        if sig.is_int:
            self.spin = ttk.Spinbox(
                parent,
                from_=sig.vmin,
                to=sig.vmax,
                increment=increment,
                width=8,
                command=self._on_spin,
                textvariable=self.var,
            )
            self.var.set(int(round(sig.default)))
        else:
            self.spin = ttk.Spinbox(
                parent,
                from_=sig.vmin,
                to=sig.vmax,
                increment=increment,
                width=8,
                command=self._on_spin,
            )
            self.spin.set(f"{sig.default:.2f}")

        self.spin.bind("<Return>", lambda _e: self._on_spin())
        self.spin.bind("<FocusOut>", lambda _e: self._on_spin())
        self.spin.grid(row=0, column=2, sticky="e", padx=4, pady=4)

        ttk.Label(parent, text=sig.unit, width=4).grid(row=0, column=3, sticky="w", padx=(0, 8), pady=4)
        parent.columnconfigure(1, weight=1)
        self._building = False

    def _refresh_toggle_label(self) -> None:
        try:
            self._toggle.configure(text="On" if self._toggle_var.get() else "Off")
        except Exception:
            pass

    def _on_toggle(self) -> None:
        if self._building:
            return
        on = bool(self._toggle_var.get())
        value = self.sig.on_value if on else self.sig.off_value
        self._float = value
        self._refresh_toggle_label()
        logger.info(f"TOGGLE: {self.sig.key} -> {value} ({'ON' if on else 'OFF'})")
        self.publish(self.sig, value)

    def _on_scale_press(self, _event) -> None:
        self._user_dragging = True

    def _on_scale_release(self, _event) -> None:
        self._user_dragging = False
        self._remote_hush_until = time.monotonic() + 0.4

    def is_user_dragging(self) -> bool:
        return self._user_dragging

    def _on_scale(self, raw: str) -> None:
        if self._building:
            return
        try:
            value = float(raw)
        except ValueError:
            return

        if self.sig.is_int:
            value = int(round(value))
            if self.var is not None and self.var.get() != value:
                self.var.set(value)
        else:
            value = round(value, 2)
            try:
                self.spin.delete(0, "end")
                self.spin.insert(0, f"{value:.2f}")
            except Exception:
                pass

        self._float = value
        self._remote_hush_until = time.monotonic() + 1.0
        logger.info(f"SCALE: {self.sig.key} -> {value}")
        self.publish(self.sig, value)

    def _on_spin(self) -> None:
        if self._building:
            return
        try:
            value = float(self.spin.get())
        except (ValueError, TypeError):
            return

        if self.sig.is_int:
            value = int(round(value))
        value = max(self.sig.vmin, min(self.sig.vmax, value))
        if self._float == value:
            return

        self._float = value
        self._remote_hush_until = time.monotonic() + 1.0
        self.scale.set(value)
        logger.info(f"SPIN: {self.sig.key} -> {value}")
        self.publish(self.sig, value)

    def set_value_silent(self, value: float) -> None:
        if self.sig.is_toggle:
            return
        if self._user_dragging:
            return
        if time.monotonic() < self._remote_hush_until:
            return

        if self.sig.is_int:
            value = int(round(value))
        value = max(self.sig.vmin, min(self.sig.vmax, value))
        if self._float == value:
            return

        self._building = True
        try:
            self._float = value
            self.scale.set(value)
            if self.sig.is_int and self.var is not None:
                self.var.set(int(value))
            else:
                try:
                    self.spin.delete(0, "end")
                    self.spin.insert(0, f"{value:.2f}")
                except Exception:
                    pass
        finally:
            self._building = False

    def set_toggle_silent(self, on: bool) -> None:
        if not self.sig.is_toggle:
            return
        on = bool(on)
        if self.is_on() == on:
            return
        self._building = True
        try:
            self._toggle_var.set(on)
            self._refresh_toggle_label()
            self._float = self.sig.on_value if on else self.sig.off_value
        finally:
            self._building = False

    def is_on(self) -> bool:
        if not self.sig.is_toggle:
            return False
        return bool(self._toggle_var.get())


class IndicatorPanel:
    def __init__(self, parent: Frame, root: Tk) -> None:
        self._root = root
        self._last_color: dict[str, str] = {}
        self._last_text: dict[str, str] = {}
        self._seat_values: dict[str, int] = {}
        self._pending_hvac_msg: Optional[dict] = None
        self._hvac_after_id: Optional[str] = None

        hvac = ttk.LabelFrame(parent, text="HVAC Status (from VM2)", padding=(8, 6))
        hvac.pack(fill="x", expand=False, padx=10, pady=(8, 0))

        hvac_row = Frame(hvac)
        hvac_row.pack(fill="x", expand=True)
        ttk.Label(hvac_row, text="Fan", width=10).grid(row=0, column=0, sticky="w", padx=(4, 8), pady=4)
        self._hvac_canvas = Canvas(hvac_row, width=22, height=22, highlightthickness=0, bd=0)
        self._hvac_circle = self._hvac_canvas.create_oval(3, 3, 19, 19, fill=INDICATOR_COLORS["grey"], outline="#333")
        self._hvac_canvas.grid(row=0, column=1, padx=4, pady=4)
        self._hvac_text = StringVar(value="awaiting ECU...")
        ttk.Label(hvac_row, textvariable=self._hvac_text, anchor="w").grid(row=0, column=2, sticky="we", padx=(8, 4), pady=4)
        hvac_row.columnconfigure(2, weight=1)

        seat = ttk.LabelFrame(parent, text="Seat Status (from VM2)", padding=(8, 6))
        seat.pack(fill="x", expand=False, padx=10, pady=(8, 0))

        seat_heat = Frame(seat)
        seat_heat.pack(fill="x", expand=True)
        ttk.Label(seat_heat, text="Heating", width=10).grid(row=0, column=0, sticky="w", padx=(4, 8), pady=4)
        self._seat_heat_canvas = Canvas(seat_heat, width=22, height=22, highlightthickness=0, bd=0)
        self._seat_heat_circle = self._seat_heat_canvas.create_oval(3, 3, 19, 19, fill=INDICATOR_COLORS["grey"], outline="#333")
        self._seat_heat_canvas.grid(row=0, column=1, padx=4, pady=4)
        self._seat_heat_text = StringVar(value="awaiting ECU...")
        ttk.Label(seat_heat, textvariable=self._seat_heat_text, anchor="w").grid(row=0, column=2, sticky="we", padx=(8, 4), pady=4)
        seat_heat.columnconfigure(2, weight=1)

        seat_cool = Frame(seat)
        seat_cool.pack(fill="x", expand=True)
        ttk.Label(seat_cool, text="Cooling", width=10).grid(row=0, column=0, sticky="w", padx=(4, 8), pady=4)
        self._seat_cool_canvas = Canvas(seat_cool, width=22, height=22, highlightthickness=0, bd=0)
        self._seat_cool_circle = self._seat_cool_canvas.create_oval(3, 3, 19, 19, fill=INDICATOR_COLORS["grey"], outline="#333")
        self._seat_cool_canvas.grid(row=0, column=1, padx=4, pady=4)
        self._seat_cool_text = StringVar(value="awaiting ECU...")
        ttk.Label(seat_cool, textvariable=self._seat_cool_text, anchor="w").grid(row=0, column=2, sticky="we", padx=(8, 4), pady=4)
        seat_cool.columnconfigure(2, weight=1)

    def on_hvac_sample(self, _key: str, msg: dict) -> None:
        # Coalesce bursty reverse updates to avoid indicator/text flicker.
        self._pending_hvac_msg = msg
        if self._hvac_after_id is None:
            self._hvac_after_id = self._root.after(80, self._flush_hvac)

    def on_seat_sample(self, _key: str, msg: dict) -> None:
        self._root.after_idle(self._apply_seat, msg)

    def set_initial_from_controls(self, hvac_value: float, seat_heating_on: bool, seat_cooling_on: bool) -> None:
        hvac_status = "on" if float(hvac_value) > 0 else "off"
        self._apply_hvac({
            "status": hvac_status,
            "source": "local-default",
        })

        self._seat_values["seat.heating"] = 100 if seat_heating_on else 0
        self._seat_values["seat.heating_cooling"] = -100 if seat_cooling_on else 0
        self._apply_seat({
            "key": "seat.heating",
            "value": self._seat_values["seat.heating"],
        })
        self._apply_seat({
            "key": "seat.heating_cooling",
            "value": self._seat_values["seat.heating_cooling"],
        })

    def _flush_hvac(self) -> None:
        self._hvac_after_id = None
        msg = self._pending_hvac_msg
        self._pending_hvac_msg = None
        if msg is None:
            return
        self._apply_hvac(msg)

    def _render(self, lane: str, canvas: Canvas, oval_id: int, text_var: StringVar, color: str, text: str) -> None:
        if self._last_color.get(lane) != color:
            canvas.itemconfigure(oval_id, fill=INDICATOR_COLORS[color])
            self._last_color[lane] = color
        if self._last_text.get(lane) != text:
            text_var.set(text)
            self._last_text[lane] = text

    def _apply_hvac(self, msg: dict) -> None:
        value = msg.get("value")
        if value is not None:
            try:
                status = "on" if float(value) > 0 else "off"
            except (TypeError, ValueError):
                status = str(msg.get("status", "off")).lower()
        else:
            status = str(msg.get("status", "off")).lower()
        color = "green" if status == "on" else "red"
        text = f"Fan {status.upper()}  src={msg.get('source', '?')}"
        self._render("hvac", self._hvac_canvas, self._hvac_circle, self._hvac_text, color, text)

    def _apply_seat(self, msg: dict) -> None:
        key = str(msg.get("key", ""))
        try:
            val = int(msg.get("value", 0))
        except Exception:
            val = 0
        self._seat_values[key] = val

        heating = self._seat_values.get("seat.heating", 0)
        hc = self._seat_values.get("seat.heating_cooling", 0)

        heat_on = (heating != 0) or (hc > 0)
        cool_on = (hc < 0)

        self._render(
            "seat_heat",
            self._seat_heat_canvas,
            self._seat_heat_circle,
            self._seat_heat_text,
            "red" if heat_on else "grey",
            f"heating={heating} hc={hc}",
        )
        self._render(
            "seat_cool",
            self._seat_cool_canvas,
            self._seat_cool_circle,
            self._seat_cool_text,
            "blue" if cool_on else "grey",
            f"hc={hc}",
        )


class Dashboard:
    _REVERSE_INHIBIT_SECS = 1.2
    _STARTUP_INITIAL_PUBLISH_DELAY_MS = 1000
    _AUTO_ACTION_DELAY_MS = 1400
    _STARTUP_SYNC_INTERVAL_MS = 1000
    _STARTUP_SYNC_MAX_RETRIES = 20
    _STARTUP_REPLAY_TICKS = 8

    _DRAIN_TICK_MS = 1000
    _SOC_DRAIN_PER_TICK = 1.0

    def __init__(self, root: Tk, bus: TcpBus) -> None:
        self.root = root
        self.bus = bus
        self._reverse_inhibit: dict[str, float] = {}
        self._rows_by_key: dict[str, SignalRow] = {}

        self._drain_running = False
        self._drain_after_id: Optional[str] = None

        self._startup_sync_after_id: Optional[str] = None
        self._startup_sync_retries_left = self._STARTUP_SYNC_MAX_RETRIES
        self._startup_replay_ticks_left = self._STARTUP_REPLAY_TICKS
        self._startup_replay_keys: tuple[str, ...] = (
            "sim/battery/voltage",
            "sim/battery/current",
            "sim/battery/soc",
        )
        self._startup_vm2_pending: set[str] = {
            "sim/cabin/temp",
            "sim/cabin/seat/heating",
            "sim/cabin/seat/hc",
        }

        root.title("EV Range Extender - Hardware Simulator")
        root.geometry("640x740")

        self.status_var = StringVar(value="Ready. Move a slider or toggle to publish.")

        sim_frame = ttk.LabelFrame(root, text="Drive", padding=(8, 6))
        sim_frame.pack(fill="x", expand=False, padx=10, pady=(8, 0))
        sim_inner = Frame(sim_frame)
        sim_inner.pack(fill="x", expand=True, padx=4, pady=4)

        self._sim_btn_var = StringVar(value="Start")
        ttk.Button(sim_inner, textvariable=self._sim_btn_var, command=self._toggle_simulation, width=18).grid(
            row=0, column=0, padx=(0, 12), pady=2
        )
        self._sim_status_var = StringVar(value="Idle - press Start to drive")
        ttk.Label(sim_inner, textvariable=self._sim_status_var, anchor="w").grid(row=0, column=1, sticky="we", padx=4)
        sim_inner.columnconfigure(1, weight=1)

        for section_title, sigs in ALL_SECTIONS:
            frame = ttk.LabelFrame(root, text=section_title, padding=(8, 6))
            frame.pack(fill="x", expand=False, padx=10, pady=(8, 0))
            for sig in sigs:
                row_frame = Frame(frame)
                row_frame.pack(fill="x", expand=True)
                self._rows_by_key[sig.key] = SignalRow(row_frame, sig, self._publish)

        self.indicators = IndicatorPanel(root, root)

        hvac_row = self._rows_by_key.get("sim/cabin/temp")
        seat_heat_row = self._rows_by_key.get("sim/cabin/seat/heating")
        seat_cool_row = self._rows_by_key.get("sim/cabin/seat/hc")
        self.indicators.set_initial_from_controls(
            hvac_value=float(hvac_row._float) if hvac_row is not None else 0.0,
            seat_heating_on=seat_heat_row.is_on() if seat_heat_row is not None else False,
            seat_cooling_on=seat_cool_row.is_on() if seat_cool_row is not None else False,
        )

        try:
            self.bus.subscribe(STATUS_KEY_HVAC, self._on_hvac_reverse)
            self.bus.subscribe(STATUS_KEY_SEAT, self._on_seat_reverse)
        except Exception as exc:
            ts = datetime.now().strftime("%H:%M:%S")
            self.status_var.set(f"[{ts}] WARN reverse subscribe failed: {exc}")

        self.root.after(self._STARTUP_INITIAL_PUBLISH_DELAY_MS, self._publish_startup_defaults)
        self.root.after(self._AUTO_ACTION_DELAY_MS, self._apply_default_user_action)
        self._startup_sync_after_id = self.root.after(
            self._STARTUP_SYNC_INTERVAL_MS,
            self._startup_sync_tick,
        )

        status = ttk.Frame(root, padding=(8, 4))
        status.pack(fill="x", side="bottom")
        ttk.Label(status, textvariable=self.status_var, anchor="w").pack(fill="x", expand=True)

        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

    def _publish_startup_defaults(self) -> None:
        # Make startup transfer explicit in logs to simplify bring-up debugging.
        logger.info("STARTUP_DEFAULTS: publishing initial control values")
        for row in self._rows_by_key.values():
            sig = row.sig
            value = sig.on_value if sig.is_toggle and row.is_on() else row._float
            logger.info(f"STARTUP_DEFAULTS: {sig.key} -> {value}")
            self._publish(sig, value, inhibit_reverse=False)
        ts = datetime.now().strftime("%H:%M:%S")
        self.status_var.set(
            f"[{ts}] Startup publish defaults: sim/cabin/temp=0, sim/cabin/seat/heating=0, sim/cabin/seat/hc=0"
        )

    def _apply_default_user_action(self) -> None:
        """Simulate an initial user action from code after startup defaults.

        Requirement: keep defaults at zero, then set seat cooling ON and
        fan speed to 30 as if a user changed controls.
        """
        fan_row = self._rows_by_key.get("sim/cabin/temp")
        cool_row = self._rows_by_key.get("sim/cabin/seat/hc")
        if fan_row is not None:
            fan_row.set_value_silent(30)
            self._publish(fan_row.sig, 30)
        if cool_row is not None and not cool_row.is_on():
            cool_row.set_toggle_silent(True)
            self._publish(cool_row.sig, cool_row.sig.on_value)

        ts = datetime.now().strftime("%H:%M:%S")
        self.status_var.set(
            f"[{ts}] Auto action applied: fan=30, seat cooling=ON"
        )

    def _publish_row_default(self, key: str) -> None:
        row = self._rows_by_key.get(key)
        if row is None:
            return
        sig = row.sig
        value = sig.on_value if sig.is_toggle and row.is_on() else row._float
        self._publish(sig, value, inhibit_reverse=False)

    def _startup_sync_tick(self) -> None:
        self._startup_sync_after_id = None
        replay_active = self._startup_replay_ticks_left > 0
        pending_active = bool(self._startup_vm2_pending)
        if not pending_active and not replay_active:
            return
        if pending_active and self._startup_sync_retries_left <= 0:
            ts = datetime.now().strftime("%H:%M:%S")
            pending = ", ".join(sorted(self._startup_vm2_pending))
            self.status_var.set(f"[{ts}] WARN startup sync pending for: {pending}")
            pending_active = False

        if pending_active:
            for key in sorted(self._startup_vm2_pending):
                self._publish_row_default(key)

        # Replay battery startup values for a short window so late subscribers
        # (runtime/playground path) still receive initial HW state.
        if replay_active:
            for key in self._startup_replay_keys:
                self._publish_row_default(key)
            self._startup_replay_ticks_left -= 1

        if pending_active:
            self._startup_sync_retries_left -= 1

        if self._startup_vm2_pending or self._startup_replay_ticks_left > 0:
            self._startup_sync_after_id = self.root.after(
                self._STARTUP_SYNC_INTERVAL_MS,
                self._startup_sync_tick,
            )

    def _on_hvac_reverse(self, key: str, msg: dict) -> None:
        logger.info(f"HVAC_REVERSE: received {msg}")
        self.indicators.on_hvac_sample(key, msg)
        value = msg.get("value")
        if value is None:
            logger.warning(f"HVAC_REVERSE: no value in message")
            return

        row = self._rows_by_key.get("sim/cabin/temp")
        if row is None or row.is_user_dragging():
            logger.debug(f"HVAC_REVERSE: row None or user dragging, skipping update")
            return

        try:
            v = float(value)
        except Exception as e:
            logger.warning(f"HVAC_REVERSE: failed to parse value {value}: {e}")
            return

        if int(round(v)) == int(round(row._float)):
            self._startup_vm2_pending.discard("sim/cabin/temp")

        if row._float == int(round(v)):
            logger.debug(f"HVAC_REVERSE: value unchanged ({v})")
            return

        if time.monotonic() <= self._reverse_inhibit.get("sim/cabin/temp", 0.0):
            logger.debug(f"HVAC_REVERSE: inhibit active, skipping")
            return

        logger.info(f"HVAC_REVERSE: updating dashboard fan speed to {v}")
        self.root.after_idle(lambda vv=v: row.set_value_silent(vv))

    def _on_seat_reverse(self, key: str, msg: dict) -> None:
        logger.info(f"SEAT_REVERSE: received {msg}")
        self.indicators.on_seat_sample(key, msg)

        sig_key = str(msg.get("key", ""))
        try:
            v_int = int(msg.get("value"))
        except Exception as e:
            logger.warning(f"SEAT_REVERSE: failed to parse value: {e}")
            return

        if sig_key == "seat.heating":
            logger.info(f"SEAT_REVERSE: heating key, value={v_int}")
            row = self._rows_by_key.get("sim/cabin/seat/heating")
            heat_on = v_int > 0
            if row is not None:
                if row.is_on() == heat_on:
                    self._startup_vm2_pending.discard("sim/cabin/seat/heating")
                if time.monotonic() > self._reverse_inhibit.get("sim/cabin/seat/heating", 0.0):
                    logger.info(f"SEAT_REVERSE: updating dashboard heating toggle to {heat_on}")
                    self.root.after_idle(lambda r=row, on=heat_on: r.set_toggle_silent(on))
            if heat_on:
                cooling_row = self._rows_by_key.get("sim/cabin/seat/hc")
                if cooling_row is not None:
                    self.root.after_idle(lambda r=cooling_row: r.set_toggle_silent(False))

        if sig_key == "seat.heating_cooling":
            logger.info(f"SEAT_REVERSE: heating_cooling key, value={v_int}")
            row = self._rows_by_key.get("sim/cabin/seat/hc")
            cool_on = v_int < 0
            if row is not None:
                if row.is_on() == cool_on:
                    self._startup_vm2_pending.discard("sim/cabin/seat/hc")
                if time.monotonic() > self._reverse_inhibit.get("sim/cabin/seat/hc", 0.0):
                    logger.info(f"SEAT_REVERSE: updating dashboard cooling toggle to {cool_on}")
                    self.root.after_idle(lambda r=row, on=cool_on: r.set_toggle_silent(on))
            if cool_on:
                heating_row = self._rows_by_key.get("sim/cabin/seat/heating")
                if heating_row is not None:
                    self.root.after_idle(lambda r=heating_row: r.set_toggle_silent(False))

    def _publish(self, sig: Signal, value: float | int, inhibit_reverse: bool = True) -> None:
        if sig.is_toggle and sig.mutex_with and value == sig.on_value:
            partner = self._rows_by_key.get(sig.mutex_with)
            if partner is not None and partner.is_on():
                partner.set_toggle_silent(False)
                try:
                    self.bus.put(partner.sig.key, partner.sig.off_value)
                    if inhibit_reverse:
                        self._reverse_inhibit[partner.sig.key] = time.monotonic() + self._REVERSE_INHIBIT_SECS
                except Exception:
                    pass

        try:
            self.bus.put(sig.key, value)
            if inhibit_reverse:
                self._reverse_inhibit[sig.key] = time.monotonic() + self._REVERSE_INHIBIT_SECS
            ts = datetime.now().strftime("%H:%M:%S")
            if sig.is_toggle:
                state = "On" if value == sig.on_value else "Off"
                self.status_var.set(f"[{ts}] PUT {sig.key} = {int(value)} ({state})")
            elif sig.is_int:
                self.status_var.set(f"[{ts}] PUT {sig.key} = {int(value)} {sig.unit}")
            else:
                self.status_var.set(f"[{ts}] PUT {sig.key} = {value:.2f} {sig.unit}")
        except Exception as exc:
            ts = datetime.now().strftime("%H:%M:%S")
            self.status_var.set(f"[{ts}] ERROR publishing {sig.key}: {exc}")

    def _toggle_simulation(self) -> None:
        if self._drain_running:
            self._drain_running = False
            if self._drain_after_id is not None:
                try:
                    self.root.after_cancel(self._drain_after_id)
                except Exception:
                    pass
                self._drain_after_id = None
            self._sim_btn_var.set("Start")
            self._sim_status_var.set("Stopped")
            return

        self._drain_running = True
        self._sim_btn_var.set("Stop")
        self._sim_status_var.set("Running - battery draining")
        self._drain_after_id = self.root.after(self._DRAIN_TICK_MS, self._drain_tick)

    def _drain_tick(self) -> None:
        if not self._drain_running:
            return

        soc_row = self._rows_by_key.get("sim/battery/soc")
        if soc_row is None:
            self._drain_running = False
            self._sim_btn_var.set("Start")
            self._sim_status_var.set("Stopped - SoC row missing")
            return

        next_soc = max(0.0, round(float(soc_row._float) - self._SOC_DRAIN_PER_TICK, 2))

        soc_row._building = True
        try:
            soc_row._float = next_soc
            soc_row.scale.set(next_soc)
            if soc_row.var is not None:
                soc_row.var.set(int(round(next_soc)))
            else:
                soc_row.spin.delete(0, "end")
                soc_row.spin.insert(0, f"{next_soc:.2f}")
        finally:
            soc_row._building = False

        self._publish(soc_row.sig, int(round(next_soc)))
        self._sim_status_var.set(f"Running - battery at {next_soc:.0f}%")

        if next_soc <= 0.0:
            self._drain_running = False
            self._drain_after_id = None
            self._sim_btn_var.set("Start")
            self._sim_status_var.set("Stopped - battery depleted")
            return

        self._drain_after_id = self.root.after(self._DRAIN_TICK_MS, self._drain_tick)

    def _on_close(self) -> None:
        self._drain_running = False
        if self._drain_after_id is not None:
            try:
                self.root.after_cancel(self._drain_after_id)
            except Exception:
                pass
        if self._startup_sync_after_id is not None:
            try:
                self.root.after_cancel(self._startup_sync_after_id)
            except Exception:
                pass
        try:
            self.bus.close()
        finally:
            self.root.destroy()


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="EV Range Extender hardware dashboard")
    p.add_argument("--vm1", default=DEFAULT_VM1_IP)
    p.add_argument("--vm2", default=DEFAULT_VM2_IP)
    p.add_argument("--bms-port", type=int, default=DEFAULT_BMS_PORT)
    p.add_argument("--hvac-port", type=int, default=DEFAULT_HVAC_PORT)
    p.add_argument("--seat-port", type=int, default=DEFAULT_SEAT_PORT)
    return p.parse_args()


def main() -> int:
    args = parse_args()
    key_routes: dict[str, tuple[str, int]] = {
        "sim/battery/voltage":    (args.vm1, args.bms_port),
        "sim/battery/current":    (args.vm1, args.bms_port),
        "sim/battery/soc":        (args.vm1, args.bms_port),
        "sim/cabin/temp":         (args.vm2, args.hvac_port),
        "sim/cabin/seat/heating": (args.vm2, args.seat_port),
        "sim/cabin/seat/hc":      (args.vm2, args.seat_port),
    }

    print(
        f"[pytk] TCP routes: VM1={args.vm1}:{args.bms_port}  "
        f"VM2={args.vm2}:{args.hvac_port}/{args.seat_port}",
        flush=True,
    )
    logger.info(f"Dashboard starting - routes: {key_routes}, log: {LOG_FILE}")

    bus = TcpBus(key_routes)
    root = Tk()
    Dashboard(root, bus)
    try:
        root.mainloop()
    except KeyboardInterrupt:
        logger.info("Dashboard interrupted by user")
        pass
    finally:
        logger.info("Dashboard shutdown")
        bus.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
