// Copyright (c) 2026 Eclipse Foundation. SPDX-License-Identifier: MIT
//
// SDV Blueprint Dashboard — connects to the broadcaster via Kit Manager
// Socket.IO, receives live signal updates, and renders them.

(function () {
  'use strict';

  const KIT_MANAGER_URL = 'https://kit.digitalauto.tech';

  // Current signal values
  const signals = {
    'Vehicle.Speed': null,
    'Vehicle.Powertrain.TractionBattery.StateOfCharge.Current': null,
    'Vehicle.Powertrain.Range': null,
    'Vehicle.Cabin.HVAC.AmbientAirTemperature': null,
    'Vehicle.Cabin.HVAC.TargetTemperature': null,
    'Vehicle.Cabin.Lights.AmbientLight.Intensity': null,
    'Vehicle.Cabin.Seat.Heating': null,
    'Vehicle.Cabin.Seat.VentilationLevel': null,
    'Vehicle.Infotainment.Display.Brightness': null
  };

  const logs = [];
  let socket = null;
  let connected = false;

  // Short display names
  const SHORT = {
    'Vehicle.Speed': 'Speed',
    'Vehicle.Powertrain.TractionBattery.StateOfCharge.Current': 'SoC',
    'Vehicle.Powertrain.Range': 'Range',
    'Vehicle.Cabin.HVAC.AmbientAirTemperature': 'Ambient Temp',
    'Vehicle.Cabin.HVAC.TargetTemperature': 'Target Temp',
    'Vehicle.Cabin.Lights.AmbientLight.Intensity': 'Lights',
    'Vehicle.Cabin.Seat.Heating': 'Seat Heat',
    'Vehicle.Cabin.Seat.VentilationLevel': 'Seat Vent',
    'Vehicle.Infotainment.Display.Brightness': 'Display'
  };

  const UNITS = {
    'Vehicle.Speed': 'km/h',
    'Vehicle.Powertrain.TractionBattery.StateOfCharge.Current': '%',
    'Vehicle.Powertrain.Range': 'km',
    'Vehicle.Cabin.HVAC.AmbientAirTemperature': '°C',
    'Vehicle.Cabin.HVAC.TargetTemperature': '°C',
    'Vehicle.Cabin.Lights.AmbientLight.Intensity': '%',
    'Vehicle.Cabin.Seat.Heating': '',
    'Vehicle.Cabin.Seat.VentilationLevel': '',
    'Vehicle.Infotainment.Display.Brightness': '%'
  };

  const MAX_VAL = {
    'Vehicle.Speed': 200,
    'Vehicle.Powertrain.TractionBattery.StateOfCharge.Current': 100,
    'Vehicle.Powertrain.Range': 550,
    'Vehicle.Cabin.HVAC.AmbientAirTemperature': 50,
    'Vehicle.Cabin.HVAC.TargetTemperature': 30,
    'Vehicle.Cabin.Lights.AmbientLight.Intensity': 100,
    'Vehicle.Cabin.Seat.Heating': 1,
    'Vehicle.Cabin.Seat.VentilationLevel': 3,
    'Vehicle.Infotainment.Display.Brightness': 100
  };

  const BAR_COLOR = {
    'Vehicle.Speed': '#4f8ff7',
    'Vehicle.Powertrain.TractionBattery.StateOfCharge.Current': '#34d399',
    'Vehicle.Powertrain.Range': '#a78bfa',
    'Vehicle.Cabin.HVAC.AmbientAirTemperature': '#fbbf24',
    'Vehicle.Cabin.HVAC.TargetTemperature': '#fb923c',
    'Vehicle.Cabin.Lights.AmbientLight.Intensity': '#fbbf24',
    'Vehicle.Cabin.Seat.Heating': '#f87171',
    'Vehicle.Cabin.Seat.VentilationLevel': '#34d399',
    'Vehicle.Infotainment.Display.Brightness': '#4f8ff7'
  };

  function addLog(msg) {
    const ts = new Date().toLocaleTimeString();
    logs.push({ ts, msg });
    if (logs.length > 200) logs.shift();
    renderLogs();
  }

  // --- Socket.IO connection ---
  window.dashConnect = function () {
    const instanceInput = document.getElementById('instance-id');
    const instanceId = instanceInput.value.trim();
    if (!instanceId) return;

    if (socket) { socket.disconnect(); socket = null; }

    addLog('Connecting to ' + KIT_MANAGER_URL + '...');
    document.getElementById('conn-dot').className = 'dot off';
    document.getElementById('conn-text').textContent = 'Connecting...';

    socket = io(KIT_MANAGER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 3000
    });

    socket.on('connect', function () {
      connected = true;
      document.getElementById('conn-dot').className = 'dot on';
      document.getElementById('conn-text').textContent = 'Connected';
      addLog('Connected to Kit Manager');

      // Request recent signal history from broadcaster
      const reqId = 'dash-' + Date.now();
      socket.emit('messageToKit', {
        id: reqId,
        cmd: 'aos_signal_stream',
        to_kit_id: instanceId,
        type: 'aos_signal_stream',
        limit: 100
      });
    });

    socket.on('disconnect', function () {
      connected = false;
      document.getElementById('conn-dot').className = 'dot off';
      document.getElementById('conn-text').textContent = 'Disconnected';
      addLog('Disconnected');
    });

    socket.on('connect_error', function (err) {
      addLog('Connection error: ' + err.message);
    });

    // Signal updates relayed by broadcaster
    socket.on('broadcastToClient', function (msg) {
      if (msg.type === 'signal-update' && msg.signal) {
        handleSignalUpdate(msg.signal, msg.value, msg.ts);
      }
    });

    // Replies to our requests
    socket.on('messageToKit-kitReply', function (msg) {
      if (msg.type === 'aos_signal_stream' && msg.signals) {
        msg.signals.forEach(function (s) {
          handleSignalUpdate(s.signal, s.value, s.ts);
        });
        addLog('Loaded ' + msg.signals.length + ' historical signals');
      }
    });
  };

  function handleSignalUpdate(path, value, ts) {
    if (!(path in signals)) return;
    var v = parseFloat(value);
    if (isNaN(v)) v = value === 'true' ? 1 : (value === 'false' ? 0 : null);
    signals[path] = v;
    renderSignals();
    renderMode();
  }

  // --- Rendering ---

  function renderSignals() {
    var grid = document.getElementById('signals-grid');
    if (!grid) return;

    var html = '';
    for (var path in signals) {
      var v = signals[path];
      var display = v !== null ? (Number.isInteger(v) ? v : parseFloat(v).toFixed(1)) : '--';
      var pct = v !== null ? Math.min(100, Math.max(0, (v / (MAX_VAL[path] || 100)) * 100)) : 0;
      var color = BAR_COLOR[path] || '#4f8ff7';

      html += '<div class="gauge">'
        + '<div class="label">' + (SHORT[path] || path) + '</div>'
        + '<div class="value">' + display + ' <span class="unit">' + (UNITS[path] || '') + '</span></div>'
        + '<div class="bar"><div class="bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div>'
        + '</div>';
    }
    grid.innerHTML = html;
  }

  function renderMode() {
    var soc = signals['Vehicle.Powertrain.TractionBattery.StateOfCharge.Current'];
    var mode = (soc !== null && soc < 20) ? 'POWER_SAVE' : 'NORMAL';

    var modeBox = document.getElementById('mode-box');
    if (modeBox) {
      modeBox.className = 'mode-box mode-' + mode;
      modeBox.textContent = mode.replace('_', ' ');
    }

    var rest = document.getElementById('restrictions');
    if (!rest) return;

    var lights   = signals['Vehicle.Cabin.Lights.AmbientLight.Intensity'];
    var seatHeat = signals['Vehicle.Cabin.Seat.Heating'];
    var range    = signals['Vehicle.Powertrain.Range'];

    rest.innerHTML =
      '<div><span>Mode</span><span class="val">' + mode + '</span></div>'
      + '<div><span>Range</span><span class="val">' + (range !== null ? range.toFixed(0) + ' km' : '--') + '</span></div>'
      + '<div><span>SoC</span><span class="val">' + (soc !== null ? soc.toFixed(1) + '%' : '--') + '</span></div>'
      + '<div><span>Lights</span><span class="val">' + (lights !== null ? lights.toFixed(0) + '%' : '--') + '</span></div>'
      + '<div><span>Seat Heating</span><span class="val">' + (seatHeat !== null ? (seatHeat > 0 ? 'ON' : 'OFF') : '--') + '</span></div>';
  }

  function renderLogs() {
    var area = document.getElementById('log-area');
    if (!area) return;
    var html = '';
    for (var i = logs.length - 1; i >= Math.max(0, logs.length - 100); i--) {
      html += '<div><span class="ts">' + logs[i].ts + '</span>' + logs[i].msg + '</div>';
    }
    area.innerHTML = html;
  }

  // Initial render
  document.addEventListener('DOMContentLoaded', function () {
    renderSignals();
    renderMode();
  });
})();
