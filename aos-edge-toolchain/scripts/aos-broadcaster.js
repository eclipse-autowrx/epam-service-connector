#!/usr/bin/env node
// Copyright (c) 2026 Eclipse Foundation.
// 
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

const io = require('socket.io-client');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

const execAsync = promisify(exec);

const kitManagerUrl = process.env.KIT_MANAGER_URL || 'https://kit.digitalauto.tech';
const instanceId = process.env.INSTANCE_ID || 'AET-unknown';
const instanceName = process.env.INSTANCE_NAME || 'AOS Edge Toolchain';
const broadcastInterval = parseInt(process.env.BROADCAST_INTERVAL || '30000');
const workspaceDir = '/workspace';
const aoscloudUrl = process.env.AOSCLOUD_URL || 'https://aoscloud.io:10000';
const defaultServiceUuid = process.env.SERVICE_UUID || '';
const defaultUnitUid = process.env.UNIT_UID || '';
const defaultSubjectId = process.env.SUBJECT_ID || '';
const certPath = '/root/.aos/security/aos-user-sp.p12';
const oemCertPath = process.env.OEM_CERT_PATH || '/root/.aos/security/aos-user-oem.p12';

// Resolve the actual OEM cert at runtime: use dedicated OEM cert if present,
// otherwise fall back to SP cert (most setups only have one cert).
function resolveOemCertPath() {
  try {
    require('fs').accessSync(oemCertPath);
    return oemCertPath;
  } catch (e) { /* not found */ }
  try {
    require('fs').accessSync(certPath);
    return certPath;
  } catch (e) { /* not found */ }
  return oemCertPath; // let curl report the error
}
const workerMode = process.env.WORKER_MODE === 'true';
const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:9090';
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy || '';

console.log('[Broadcaster] Starting:', instanceId, workerMode ? '(worker mode)' : '');
console.log('[Broadcaster] Kit Manager:', kitManagerUrl);
if (workerMode) {
  console.log('[Broadcaster] Orchestrator URL:', orchestratorUrl);
}
if (proxyUrl) {
  console.log('[Broadcaster] Proxy:', proxyUrl);
}

let socket;
let broadcastTimer = null;

// --- Signal Relay: receives HTTP POST from Signal Reporter AOS service
// and forwards signal updates to all connected browser clients via Socket.IO.
const signalRelayPort = parseInt(process.env.SIGNAL_RELAY_PORT || '9100');
const signalHistory = [];          // ring buffer, last 500 entries
const SIGNAL_HISTORY_MAX = 500;

const http = require('http');
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const signalServer = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }
  if (req.method === 'POST' && req.url === '/signal') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const signal = JSON.parse(body);
        signalHistory.push(signal);
        if (signalHistory.length > SIGNAL_HISTORY_MAX) signalHistory.shift();
        if (socket && socket.connected) {
          socket.emit('broadcastToClient', {
            type: 'signal-update',
            kit_id: instanceId,
            ...signal
          });
        }
        if (relayIO) {
          relayIO.emit('signal', signal);
        }
        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end('{"ok":true}');
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end('{"ok":false,"error":"invalid json"}');
      }
    });
  } else if (req.method === 'GET' && req.url === '/signals') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify(signalHistory.slice(-100)));
  } else if (req.method === 'GET' && req.url.startsWith('/build-status/')) {
    const buildId = req.url.split('/')[2];
    const build = buildHistory.get(buildId);
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify(build || { status: 'not_found' }));
  } else if (req.method === 'GET' && req.url === '/builds') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify(getBuildStatus()));
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ ok: true, instanceId, uptime: process.uptime(), mode: workerMode ? 'worker' : 'standalone' }));
  } else if (req.method === 'POST' && req.url === '/api/command') {
    // Worker mode: receive commands from coordinator via HTTP
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        console.log('[Worker] Received command:', data.cmd || data.type, 'from coordinator');
        const response = await routeCommand(data);
        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify(response));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ status: 'error', message: e.message }));
      }
    });
  } else {
    res.writeHead(404, corsHeaders);
    res.end();
  }
});
const { Server: SocketIOServer } = require('socket.io');
const relayIO = new SocketIOServer(signalServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
relayIO.on('connection', (client) => {
  console.log('[SignalRelay] Dashboard connected:', client.id);
  client.emit('history', signalHistory.slice(-100));
  client.on('disconnect', () => {
    console.log('[SignalRelay] Dashboard disconnected:', client.id);
  });
});

signalServer.listen(signalRelayPort, '0.0.0.0', () => {
  console.log('[SignalRelay] HTTP + Socket.IO listener on port', signalRelayPort);
});

async function initCertFromEnv() {
  const certFile = process.env.CERT_FILE;
  if (!certFile) return;

  const certDir = '/root/.aos/security';
  const certDest = path.join(certDir, 'aos-user-sp.p12');

  try {
    await fs.mkdir(certDir, { recursive: true });
    await fs.copyFile(certFile, certDest);
    await fs.chmod(certDest, 0o600);
    console.log(`[Broadcaster] Certificate loaded: ${certFile} → ${certDest}`);
  } catch (err) {
    console.error(`[Broadcaster] CERT_FILE=${certFile} — failed to copy:`, err.message);
  }
}

// Route a command (from HTTP or Socket.IO) to the appropriate handler.
// Returns the response object that should be sent back to the caller.
async function routeCommand(data) {
  console.log('[Broadcaster] Routing command:', data.cmd || data.type);

  try {
    let response;

    switch (data.cmd || data.type) {
      case 'aos_build_deploy':
        response = await handleBuildDeploy(data);
        break;
      case 'aos_list_apps':
        response = await handleListApps(data);
        break;
      case 'aos_start_app':
        response = await handleStartApp(data);
        break;
      case 'aos_stop_app':
        response = await handleStopApp(data);
        break;
      case 'aos_get_deployment_status':
        response = await handleGetDeploymentStatus(data);
        break;
      case 'aos_upload_cert':
        response = await handleUploadCert(data);
        break;
      case 'aos_check_cert':
        response = await handleCheckCert(data);
        break;
      case 'aos_remove_cert':
        response = await handleRemoveCert(data);
        break;
      case 'aos_list_services':
        response = await handleListAosCloud(data, 'services');
        break;
      case 'aos_list_units':
        response = await handleListAosCloud(data, 'units');
        break;
      case 'aos_list_subjects':
        response = await handleListAosCloud(data, 'subjects');
        break;
      case 'aos_get_service_units':
        response = await handleGetServiceUnits(data);
        break;
      case 'aos_get_service_versions':
        response = await handleGetServiceVersions(data);
        break;
      case 'aos_get_unit_monitoring':
        response = await handleGetUnitMonitoring(data);
        break;
      case 'aos_get_alerts':
        response = await handleGetAlerts(data);
        break;
      case 'aos_request_service_log':
        response = await handleRequestServiceLog(data);
        break;
      case 'aos_get_service_log_status':
        response = await handleGetServiceLogStatus(data);
        break;
      case 'aos_get_service_stdout': {
        const sshPort = data.sshPort || 8942;
        const lines = data.lines || 50;
        const filter = data.filter || 'crun|aos-service|RangeExt|Reporter|Writer';
        try {
          await execAsync('which sshpass', { timeout: 3000 });
          const sshCmd = `sshpass -p Password1 ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -p ${sshPort} root@localhost "journalctl --no-pager -n ${lines} 2>&1 | grep -iE '${filter}'"`;
          const { stdout } = await execAsync(sshCmd, { timeout: 15000 });
          response = { kit_id: instanceId, type: 'aos_get_service_stdout', status: 'success', logs: stdout };
        } catch (err) {
          try {
            const serviceUuid = data.serviceUuid;
            const unitUid = data.unitUid;
            const subjectId = data.subjectId;
            if (!serviceUuid || !unitUid || !subjectId) {
              response = { kit_id: instanceId, type: 'aos_get_service_stdout', status: 'success', logs: 'Select a service and unit to fetch logs from AosCloud.' };
              break;
            }
            const existing = await curlAosCloud(`service-logs/?limit=10`);
            const items = existing.items || [];
            const ready = items.find(l => (l.state === 'ok' || l.state === 'done') && l.service === serviceUuid);
            if (ready) {
              try {
                const tmpFile = `/tmp/service-log-${ready.id}.tar.gz`;
                await execAsync(
                  `curl -k --http1.1 -o ${tmpFile} ${aoscloudUrl}/api/v11/service-logs/${ready.id}/download-log-file/ ` +
                  `--cert ${certPath} --cert-type P12`,
                  { env: { ...process.env }, timeout: 30000 }
                );
                const { stdout: logContent } = await execAsync(
                  `tar xzf ${tmpFile} -O 2>/dev/null || cat ${tmpFile}`,
                  { timeout: 10000 }
                );
                await execAsync(`rm -f ${tmpFile}`).catch(() => {});
                response = { kit_id: instanceId, type: 'aos_get_service_stdout', status: 'success', logs: logContent || 'Log file is empty.' };
              } catch (dlErr) {
                response = { kit_id: instanceId, type: 'aos_get_service_stdout', status: 'success', logs: `Log available (ID: ${ready.id}) but download/extract failed: ${dlErr.message?.slice(-100)}` };
              }
            } else {
              const now = new Date();
              const from = new Date(now.getTime() - 30 * 60000);
              const payload = JSON.stringify({
                unit: unitUid,
                service: serviceUuid,
                subject: subjectId,
                request_type: 'log',
                date_from: from.toISOString(),
                date_till: now.toISOString()
              });
              try {
                await execAsync(
                  `curl -k --http1.1 -X POST ${aoscloudUrl}/api/v11/service-logs/ ` +
                  `--cert ${certPath} --cert-type P12 ` +
                  `-H "accept: application/json" -H "Content-Type: application/json" ` +
                  `-d '${payload}'`,
                  { env: { ...process.env }, timeout: 15000 }
                );
                response = { kit_id: instanceId, type: 'aos_get_service_stdout', status: 'success', logs: 'Log request sent to AosCloud.\n\nThe unit will collect and upload logs. This may take 1-2 minutes.\nClick Refresh again to check if logs are ready.' };
              } catch (reqErr) {
                response = { kit_id: instanceId, type: 'aos_get_service_stdout', status: 'success', logs: `Failed to request logs: ${reqErr.message?.slice(-100)}` };
              }
            }
          } catch {
            response = { kit_id: instanceId, type: 'aos_get_service_stdout', status: 'success', logs: 'Could not reach AosCloud. Check certificate and connectivity.' };
          }
        }
        break;
      }
      case 'aos_get_build_status':
        response = {
          kit_id: instanceId,
          type: 'aos_get_build_status',
          status: 'success',
          build: data.buildId ? getBuildStatus(data.buildId) : null,
          builds: !data.buildId ? getBuildStatus() : undefined
        };
        break;
      case 'aos_signal_stream':
        response = {
          kit_id: instanceId,
          type: 'aos_signal_stream',
          status: 'success',
          signals: signalHistory.slice(-(data.limit || 100))
        };
        break;
      default:
        response = {
          id: data.id,
          kit_id: instanceId,
          type: data.type || data.cmd,
          status: 'error',
          message: 'Unknown command: ' + (data.cmd || data.type)
        };
    }

    response.id = data.id;
    response.request_from = data.request_from;
    return response;

  } catch (error) {
    console.error('[Broadcaster] Error handling command:', error.message);
    return {
      id: data.id,
      kit_id: instanceId,
      type: data.type || data.cmd,
      status: 'error',
      message: error.message
    };
  }
}

async function main() {
  await initCertFromEnv();

  // ── Worker mode: skip Kit Manager, serve commands via HTTP ──
  if (workerMode) {
    console.log('[Broadcaster] Worker mode active — listening for commands via HTTP');
    console.log('[Broadcaster] Signal relay on port', signalRelayPort);

    // Health report to coordinator every 30s
    setInterval(async () => {
      try {
        await execAsync(`curl -s -X POST ${orchestratorUrl}/api/worker-heartbeat -H 'Content-Type: application/json' -d '${JSON.stringify({ instanceId, port: signalRelayPort, status: 'running' })}'`, { timeout: 5000 });
      } catch (e) { /* orchestrator may be restarting */ }
    }, 30000);

    // Keep the process alive (signalServer is already listening)
    process.on('SIGINT', () => { process.exit(0); });
    process.on('SIGTERM', () => { process.exit(0); });
    return;
  }

  // ── Standalone mode: connect to Kit Manager ──
  const socketOpts = {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 5000,
    reconnectionDelayMax: 10000
  };

  socketOpts.rejectUnauthorized = false;

  if (proxyUrl) {
    try {
      const mod = await import('/usr/local/lib/node_modules/https-proxy-agent/dist/index.js');
      const HttpsProxyAgent = mod.HttpsProxyAgent || mod.default;
      const agent = new HttpsProxyAgent(proxyUrl);
      socketOpts.agent = agent;
      socketOpts.transports = ['polling', 'websocket'];
      console.log('[Broadcaster] Proxy agent configured');
    } catch (err) {
      console.warn('[Broadcaster] https-proxy-agent not available, proxy will not be used:', err.message);
    }
  }

  socket = io(kitManagerUrl, socketOpts);

  socket.on('connect', () => {
    console.log('[Broadcaster] Connected to Kit Manager');

    const registration = {
      kit_id: instanceId,
      name: instanceName,
      desc: 'AOS Edge Toolchain - Docker build service for AOS applications',
      support_apis: [
        'aos_build_deploy',
        'aos_list_apps',
        'aos_start_app',
        'aos_stop_app',
        'aos_get_deployment_status',
        'aos_upload_cert',
        'aos_check_cert',
        'aos_list_services',
        'aos_list_units',
        'aos_list_subjects',
        'aos_get_service_units',
        'aos_get_service_versions',
        'aos_get_unit_monitoring',
        'aos_get_alerts',
        'aos_request_service_log',
        'aos_get_service_log_status',
        'aos_get_build_status',
        'aos_get_service_stdout',
        'aos_signal_stream'
      ],
      type: 'aos-edge-toolchain',
      suffix: instanceId.split('-')[0],
      online: true
    };

    socket.emit('register_kit', registration);
    console.log('[Broadcaster] Registration sent:', registration.kit_id);
    startBroadcasting();
  });

  socket.on('connect_error', (error) => {
    console.error('[Broadcaster] Connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.warn('[Broadcaster] Disconnected:', reason);
    stopBroadcasting();
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('[Broadcaster] Reconnected after', attemptNumber, 'attempts');
    startBroadcasting();
  });

  socket.on('messageToKit', async (data) => {
    console.log('[Broadcaster] Received message:', data.cmd, data.type);

    const response = await routeCommand(data);

    response.id = data.id;
    response.request_from = data.request_from;
    socket.emit('messageToKit-kitReply', response);
    console.log('[Broadcaster] Response sent:', response.status);
  });
}

const SUPPORTED_ARCHS = {
  'x86_64': 'x86_64', 'amd64': 'x86_64',
  'aarch64': 'aarch64', 'arm64': 'aarch64',
};

// Detect the host (build machine) architecture
function detectHostArch() {
  const arch = process.arch;  // e.g. 'x64', 'arm64'
  if (arch === 'x64') return 'x86_64';
  if (arch === 'arm64') return 'aarch64';
  return 'x86_64';  // default
}

// Parse config.yaml and return all architectures declared in the config.
// For v2: collects from items[].images[].archInfo.architecture
// For v1: uses the single build.arch field
function detectArchs(yamlConfig) {
  let doc;
  try {
    doc = yaml.load(yamlConfig);
  } catch (e) {
    // Fallback to regex for malformed YAML
  }

  if (doc && doc.schemaVersion === 2 && doc.items) {
    const archs = new Set();
    for (const item of doc.items) {
      for (const img of (item.images || [])) {
        const a = (img.archInfo && img.archInfo.architecture) ? img.archInfo.architecture : null;
        if (a && a !== 'any') {
          const resolved = SUPPORTED_ARCHS[a];
          if (resolved) archs.add(resolved);
        }
      }
    }
    if (archs.size > 0) return Array.from(archs);
  }

  if (doc && doc.build && doc.build.arch) {
    const resolved = SUPPORTED_ARCHS[doc.build.arch];
    if (resolved) return [resolved];
  }

  // Regex fallback for unparseable YAML
  const newArchMatch = yamlConfig.match(/architecture:\s*['"]?(\w+)['"]?/);
  if (newArchMatch) {
    const resolved = SUPPORTED_ARCHS[newArchMatch[1]];
    if (resolved) return [resolved];
  }
  const archMatch = yamlConfig.match(/arch:\s*(\S+)/);
  if (archMatch) {
    const resolved = SUPPORTED_ARCHS[archMatch[1]];
    if (resolved) return [resolved];
  }

  throw new Error('Missing architecture field in config.yaml. Supported formats: arch: x86_64 (1.x) or archInfo.architecture: amd64 (2.x)');
}

// Pick the best architecture to build for: prefer the host arch if available
// in the config, otherwise use the first declared arch.
function detectArch(yamlConfig, preferredArch) {
  const archs = detectArchs(yamlConfig);
  const preferred = preferredArch || detectHostArch();
  if (archs.includes(preferred)) return preferred;
  return archs[0];
}

function compilerForArch(arch) {
  return arch === 'x86_64' ? 'g++' : 'aarch64-linux-gnu-g++';
}

async function bundleDynamicLibs(binaryPath, srcDir) {
  try {
    const { stdout } = await execAsync(`ldd ${binaryPath} 2>/dev/null`);
    if (stdout.includes('not a dynamic executable')) return false;

    const libsDir = path.join(srcDir, 'libs');
    await fs.mkdir(libsDir, { recursive: true });

    // Copy the ELF interpreter (ld-linux) — required because crun containers
    // have a minimal rootfs without a dynamic linker
    const { stdout: interpOut } = await execAsync(`readelf -l ${binaryPath} | grep 'interpreter' | sed 's/.*: //' | tr -d ']'`);
    const interp = interpOut.trim();
    if (interp) {
      await fs.copyFile(interp, path.join(libsDir, path.basename(interp)));
      console.log('[Build] Bundled dynamic linker:', path.basename(interp));
    }

    const lines = stdout.split('\n').filter(l => l.includes('=>'));
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const libPath = parts[2];
      if (libPath && libPath.startsWith('/')) {
        try { await fs.copyFile(libPath, path.join(libsDir, path.basename(libPath))); } catch (e) { /* skip */ }
      }
    }

    const binName = path.basename(binaryPath);
    const ldName = interp ? path.basename(interp) : 'ld-linux-x86-64.so.2';
    await fs.rename(path.join(srcDir, binName), path.join(srcDir, binName + '-bin'));
    const wrapper = `#!/bin/sh\nDIR=$(dirname $(readlink -f $0))\nexec $DIR/libs/${ldName} --library-path $DIR/libs $DIR/${binName}-bin "$@"\n`;
    await fs.writeFile(path.join(srcDir, binName), wrapper, { mode: 0o755 });
    console.log('[Build] Bundled', lines.length, 'libs + wrapper for', binName);
    return true;
  } catch (e) {
    console.warn('[Build] bundleDynamicLibs failed:', e.message);
    return false;
  }
}

const crypto = require('crypto');
const BUILD_HISTORY_MAX = 20;
const buildHistory = new Map();

// Parse YAML config into a structured object (handles both v1 and v2 formats).
// Returns a normalized config object with safe defaults for all fields.
function parseYamlConfig(yamlConfig) {
  let doc;
  try {
    doc = yaml.load(yamlConfig) || {};
  } catch (e) {
    doc = {};
  }

  const isV2 = doc && doc.schemaVersion === 2;

  // Publisher
  const publisher = (doc && doc.publisher) || {};
  const author = publisher.author || 'developer@example.com';
  const company = publisher.company || 'Example Corp';

  // Version
  const version = (isV2 && doc.items && doc.items[0] && doc.items[0].version)
    || (doc && doc.publish && doc.publish.version)
    || '1.0.0';

  // Identity (v2 only)
  const identity = (isV2 && doc.items && doc.items[0] && doc.items[0].identity) || {};
  const serviceId = identity.id || null;
  const codename = identity.codename || null;
  const title = identity.title || null;
  const description = identity.description || null;

  // Configuration
  const config = (isV2 && doc.items && doc.items[0] && doc.items[0].configuration)
    || (doc && doc.configuration)
    || {};
  const cmd = config.cmd || null;
  const workingDir = config.workingDir || '/';

  // Environment variables
  const env = config.env || null;

  // Quotas — support both v1 (quotas.cpu, quotas.mem) and v2 (quotas.cpuLimit, quotas.ramLimit)
  const quotas = config.quotas || {};
  const cpuLimit = quotas.cpuLimit || quotas.cpu || 1000;
  const ramLimit = quotas.ramLimit || quotas.mem || '10MB';
  const storageLimit = quotas.storageLimit || quotas.storage || '5MB';
  const stateLimit = quotas.stateLimit || quotas.state || '512KB';

  return {
    author, company, version, serviceId, codename, title, description,
    cmd, workingDir, env, cpuLimit, ramLimit, storageLimit, stateLimit,
  };
}

// Generate new aos-signer 2.x config format (schemaVersion: 2)
function generateNewConfigFormat(appName, arch, oldYamlConfig, serviceUuid) {
  const cfg = parseYamlConfig(oldYamlConfig);

  // Map arch names
  const archMap = { 'x86_64': 'amd64', 'aarch64': 'arm64' };
  const newArch = archMap[arch] || arch;

  // Use serviceUuid (from UI selection) first, then YAML id, then codename
  const effectiveId = serviceUuid || cfg.serviceId;
  const identityLine = effectiveId
    ? `      id: ${effectiveId}`
    : `      codename: "${cfg.codename || appName}"`;

  const resolvedCmd = cfg.cmd || `/${appName}`;

  // Build env lines if present
  const envLines = (cfg.env && cfg.env.length > 0)
    ? cfg.env.map(e => `        - "${e}"`).join('\n')
    : '';

  return `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
schemaVersion: 2

publisher:
  author: "${cfg.author}"
  company: "${cfg.company}"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: service
${identityLine}
      title: "${cfg.title || `${appName} Service`}"
      description: "${cfg.description || `Auto-generated service from AOS Edge Toolchain`}"
    version: "${cfg.version}"
    sourceFolder: "${appName}"

    images:
      - sourceFolder: "src_${arch}"
        archInfo:
          architecture: "${newArch}"

    configuration:
      workingDir: "${cfg.workingDir}"
      cmd: ${resolvedCmd}${envLines ? '\n      env:\n' + envLines : ''}
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: ${parseInt(String(cfg.cpuLimit)) || 1000}
        ramLimit: ${cfg.ramLimit}
        storageLimit: ${cfg.storageLimit}
        stateLimit: ${cfg.stateLimit}
        tmpLimit: 256MiB
        uploadSpeedLimit: 10K
        downloadSpeedLimit: 10K
        uploadLimit: 10GiB
        downloadLimit: 10GiB
        noFileLimit: 1024
        pidsLimit: 256
`;
}

function generatePythonConfig(appName, pyFileName, oldYamlConfig) {
  const cfg = parseYamlConfig(oldYamlConfig);

  // Use codename from YAML — aos-signer resolves the service by codename on AosCloud
  const identityLine = `      codename: "${cfg.codename || appName}"`;

  // Use cmd from YAML config as-is, fallback to /usr/bin/python3 -u /main.py
  const pythonCmd = cfg.cmd || `/usr/bin/python3 -u /${pyFileName}`;

  // Build env lines if present
  const envLines = (cfg.env && cfg.env.length > 0)
    ? cfg.env.map(e => `        - "${e}"`).join('\n')
    : '';

  return `# Configuration for AosEdge Update Bundle (schemaVersion: 2)
# Python service — architecture-independent
schemaVersion: 2

publisher:
  author: "${cfg.author}"
  company: "${cfg.company}"

publish:
  tlsKey: "aos-user-sp.p12"
  domain: "aoscloud.io"

items:
  - identity:
      type: service
${identityLine}
      title: "${cfg.title || `${appName} Service`}"
      description: "${cfg.description || `Auto-generated Python service from AOS Edge Toolchain`}"
    version: "${cfg.version}"
    sourceFolder: "${appName}"

    images:
      - sourceFolder: "src_any"
        archInfo:
          architecture: "any"

    configuration:
      workingDir: "/"
      cmd: ${pythonCmd}${envLines ? '\n      env:\n' + envLines : ''}
      instances:
        minInstances: 1
        priority: 10
      quotas:
        cpuLimit: ${parseInt(String(cfg.cpuLimit)) || 5000}
        ramLimit: ${cfg.ramLimit}
        storageLimit: ${cfg.storageLimit}
        stateLimit: ${cfg.stateLimit}
        tmpLimit: 256MiB
        uploadSpeedLimit: 10K
        downloadSpeedLimit: 10K
        uploadLimit: 10GiB
        downloadLimit: 10GiB
        noFileLimit: 1024
        pidsLimit: 256
`;
}

function emitProgress(buildId, stage, message, progress) {
  const entry = { stage, message, progress, ts: Date.now() };
  const build = buildHistory.get(buildId);
  if (build) build.logs.push(entry);
  const payload = { kit_id: instanceId, type: 'aos-build-progress', buildId, ...entry };
  console.log(`[Build:${buildId}] [${stage}] ${message}`);
  if (socket && socket.connected) {
    socket.emit('broadcastToClient', payload);
  }
  if (relayIO) {
    relayIO.emit('build-progress', payload);
  }
}

function getBuildStatus(buildId) {
  if (buildId) {
    const b = buildHistory.get(buildId);
    return b ? { ...b, logs: b.logs.slice() } : null;
  }
  const all = [];
  for (const [id, b] of buildHistory) {
    all.push({ buildId: id, appName: b.appName, status: b.status, startedAt: b.startedAt, finishedAt: b.finishedAt, logCount: b.logs.length });
  }
  return all;
}

async function handleBuildDeploy(data, buildId) {
  const language = data.language || 'python';
  const cppCode = data.cppCode || '';
  const pythonCode = data.pythonCode || '';

  // C++ builds are not supported in this version — reject early with a clear message
  if (language === 'cpp') {
    emitProgress(buildId, 'error', 'C++ builds are not supported in this version. Only Python deployments are available. Please switch to Python mode.', 0);
    buildHistory.set(buildId, { ...buildHistory.get(buildId), status: 'error', finishedAt: Date.now() });
    return;
  }
  const yamlConfig = data.yamlConfig || '';

  // Parse appName from YAML codename — the YAML is the single source of truth
  const cfg = parseYamlConfig(yamlConfig);
  const appName = cfg.codename || 'hello-python';

  if (!buildId) buildId = crypto.randomBytes(6).toString('hex');
  const buildDir = path.join('/workspace/builds', buildId);

  buildHistory.set(buildId, {
    appName, status: 'building', logs: [],
    startedAt: Date.now(), finishedAt: null
  });
  if (buildHistory.size > BUILD_HISTORY_MAX) {
    const oldest = buildHistory.keys().next().value;
    buildHistory.delete(oldest);
  }

  emitProgress(buildId, 'init', `Starting build for ${appName} (build: ${buildId}, language: ${language})`, 0);

  try {
    // New aos-signer 2.x format: config.yaml at root, service folder with src_<arch> structure
    const serviceFolder = path.join(buildDir, appName);
    const srcFolder = path.join(serviceFolder, `src_temp_${buildId}`);
    await fs.mkdir(srcFolder, { recursive: true });

    const certSrc = '/root/.aos/security/aos-user-sp.p12';
    try { await fs.copyFile(certSrc, path.join(buildDir, 'aos-user-sp.p12')); } catch (e) { /* ok */ }

    // ── Python Deployment Path ──
    if (language === 'python') {
      emitProgress(buildId, 'config', 'Python deployment — skipping compilation', 10);

      // Write Python source file — extract filename from YAML cmd, fallback to main.py
      const cfg = parseYamlConfig(yamlConfig);
      const cmdPath = cfg.cmd || '/usr/bin/python3 -u /main.py';
      const pyFileName = cmdPath.split('/').pop() || 'main.py';
      await fs.writeFile(path.join(srcFolder, pyFileName), pythonCode);

      // Python is arch-independent — use src_any
      const srcAnyFolder = path.join(serviceFolder, 'src_any');
      await fs.mkdir(srcAnyFolder, { recursive: true });
      await fs.copyFile(path.join(srcFolder, pyFileName), path.join(srcAnyFolder, pyFileName));

      // Clean up temp src folder
      await fs.rm(srcFolder, { recursive: true, force: true });

      // Generate config.yaml with Python-specific cmd (direct python3 invocation, no wrapper)
      const pythonConfig = generatePythonConfig(appName, pyFileName, yamlConfig);
      await fs.writeFile(path.join(buildDir, 'config.yaml'), pythonConfig);
      emitProgress(buildId, 'config', 'Generated config.yaml (schemaVersion: 2, Python)', 65);

      // Clear any stale batch.tar.gz from a previous build before signing
      await fs.rm(path.join(buildDir, 'batch.tar.gz')).catch(() => {});

      emitProgress(buildId, 'sign', 'Signing deployment bundle...', 70);
      await execAsync('aos-signer sign', { cwd: buildDir, env: { ...process.env } });

      const pkgStats = await fs.stat(path.join(buildDir, 'batch.tar.gz')).catch(() => null);
      if (!pkgStats) throw new Error('Deployment bundle not created after signing');
      const sizeMB = (pkgStats.size / (1024 * 1024)).toFixed(1);
      emitProgress(buildId, 'sign', `Deployment bundle signed: ${sizeMB} MB`, 75);

      emitProgress(buildId, 'upload', 'Uploading to AosCloud...', 80);
      try {
        const { stdout: uploadOut, stderr: uploadStderr } = await execAsync('aos-signer upload', { cwd: buildDir, env: { ...process.env } });
        const fullOutput = (uploadOut + ' ' + (uploadStderr || '')).trim();
        if (fullOutput.toLowerCase().includes('error') || fullOutput.toLowerCase().includes('failed')) {
          emitProgress(buildId, 'upload', `Upload rejected: ${fullOutput.slice(-200)}`, -1);
          const build = buildHistory.get(buildId);
          if (build) { build.status = 'error'; build.finishedAt = Date.now(); }
          const logSummary = (build?.logs || []).map(e => `[${e.stage}] ${e.message}`).join('\n');
          return { kit_id: instanceId, type: 'aos_build_deploy', status: 'error', buildId, appId: appName, message: logSummary };
        }
        emitProgress(buildId, 'upload', 'Upload complete — deployment bundle published to AosCloud', 100);
      } catch (uploadErr) {
        const errMsg = uploadErr.stderr || uploadErr.stdout || uploadErr.message || 'Unknown upload error';
        emitProgress(buildId, 'upload', `Upload failed: ${errMsg.slice(-200)}`, -1);
        const build = buildHistory.get(buildId);
        if (build) { build.status = 'error'; build.finishedAt = Date.now(); }
        const logSummary = (build?.logs || []).map(e => `[${e.stage}] ${e.message}`).join('\n');
        return { kit_id: instanceId, type: 'aos_build_deploy', status: 'error', buildId, appId: appName, message: logSummary };
      }

      const build = buildHistory.get(buildId);
      if (build) { build.status = 'success'; build.finishedAt = Date.now(); }
      const logSummary = (build?.logs || []).map(e => `[${e.stage}] ${e.message}`).join('\n');
      return { kit_id: instanceId, type: 'aos_build_deploy', status: 'success', buildId, appId: appName, message: logSummary };
    }

    // ── C++ Deployment Path (original) ──
    await fs.writeFile(path.join(srcFolder, 'main.cpp'), cppCode);

    const targetArch = detectArch(yamlConfig);
    const cxx = compilerForArch(targetArch);
    emitProgress(buildId, 'config', `Target: ${targetArch}, compiler: ${cxx}`, 10);

    const isGrpcProject = cppCode.includes('grpcpp') || cppCode.includes('grpc.pb.h');
    const builtBinary = path.join(buildDir, `${appName}-bin`);

    if (isGrpcProject) {
      emitProgress(buildId, 'proto', 'Generating gRPC proto stubs...', 15);
      const genDir = path.join(buildDir, 'generated');
      await fs.mkdir(path.join(genDir, 'kuksa/val/v1'), { recursive: true });
      const protoDir = '/usr/local/share/kuksa-proto';
      const grpcPlugin = (await execAsync('which grpc_cpp_plugin').catch(() => ({stdout:'/usr/bin/grpc_cpp_plugin'}))).stdout.trim();

      for (const proto of ['types', 'val']) {
        await execAsync(`protoc --proto_path=${protoDir} --cpp_out=${genDir} --grpc_out=${genDir} --plugin=protoc-gen-grpc=${grpcPlugin} ${protoDir}/kuksa/val/v1/${proto}.proto`);
      }
      emitProgress(buildId, 'proto', 'Proto stubs generated', 20);

      const grpcFlags = targetArch === 'x86_64'
        ? '$(pkg-config --cflags --libs grpc++ protobuf) -lpthread'
        : '-I/opt/grpc-aarch64/include -L/opt/grpc-aarch64/lib -lgrpc++ -lprotobuf -lpthread';
      const staticFlag = targetArch === 'x86_64' ? '' : '-static';
      const compileCmd = `${cxx} -std=c++17 -O2 ${staticFlag} -I${genDir} ` +
        `${srcFolder}/main.cpp ` +
        `${genDir}/kuksa/val/v1/types.pb.cc ${genDir}/kuksa/val/v1/types.grpc.pb.cc ` +
        `${genDir}/kuksa/val/v1/val.pb.cc ${genDir}/kuksa/val/v1/val.grpc.pb.cc ` +
        `${grpcFlags} -o ${builtBinary}`;
      emitProgress(buildId, 'compile', 'Compiling gRPC application...', 25);
      await execAsync(compileCmd, { cwd: buildDir, env: { ...process.env }, timeout: 300000 });
    } else {
      const staticFlag = '-static';
      const compileCmd = `${cxx} ${staticFlag} -std=c++17 -O2 ${srcFolder}/main.cpp -o ${builtBinary}`;
      emitProgress(buildId, 'compile', 'Compiling application...', 25);
      await execAsync(compileCmd, { cwd: buildDir, timeout: 60000 });
    }

    const { stdout: fileOut } = await execAsync(`file ${builtBinary}`);
    emitProgress(buildId, 'compile', `Binary: ${fileOut.trim().split(':').pop().trim().slice(0, 80)}`, 50);

    // Create proper src_<arch> folder structure for aos-signer 2.x
    const srcArchFolder = path.join(serviceFolder, `src_${targetArch}`);
    await fs.mkdir(srcArchFolder, { recursive: true });
    await fs.copyFile(builtBinary, path.join(srcArchFolder, appName));
    await fs.rm(path.join(srcArchFolder, 'main.cpp')).catch(() => {});

    // Clean up temp src folder
    await fs.rm(srcFolder, { recursive: true, force: true });

    if (isGrpcProject && targetArch === 'x86_64') {
      emitProgress(buildId, 'bundle', 'Bundling dynamic libraries...', 55);
      await bundleDynamicLibs(path.join(srcArchFolder, appName), srcArchFolder);
    }

    // Generate new config.yaml format at root (schemaVersion: 2)
    const newConfig = generateNewConfigFormat(appName, targetArch, yamlConfig, serviceUuid);
    await fs.writeFile(path.join(buildDir, 'config.yaml'), newConfig);
    emitProgress(buildId, 'config', 'Generated config.yaml (schemaVersion: 2)', 65);

    // Clear any stale batch.tar.gz from a previous build before signing
    await fs.rm(path.join(buildDir, 'batch.tar.gz')).catch(() => {});

    emitProgress(buildId, 'sign', 'Signing deployment bundle...', 70);
    await execAsync('aos-signer sign', { cwd: buildDir, env: { ...process.env } });

    // aos-signer 2.x creates batch.tar.gz instead of service.tar.gz
    const pkgStats = await fs.stat(path.join(buildDir, 'batch.tar.gz')).catch(() => null);
    if (!pkgStats) throw new Error('Deployment bundle not created after signing');
    const sizeMB = (pkgStats.size / (1024 * 1024)).toFixed(1);
    emitProgress(buildId, 'sign', `Deployment bundle signed: ${sizeMB} MB`, 75);

    emitProgress(buildId, 'upload', 'Uploading to AosCloud...', 80);
    try {
      const { stdout: uploadOut, stderr: uploadStderr } = await execAsync('aos-signer upload', { cwd: buildDir, env: { ...process.env } });
      const fullOutput = (uploadOut + ' ' + (uploadStderr || '')).trim();
      if (fullOutput.toLowerCase().includes('error') || fullOutput.toLowerCase().includes('failed')) {
        emitProgress(buildId, 'upload', `Upload rejected: ${fullOutput.slice(-200)}`, -1);
        const build = buildHistory.get(buildId);
        if (build) { build.status = 'error'; build.finishedAt = Date.now(); }
        const logSummary = (build?.logs || []).map(e => `[${e.stage}] ${e.message}`).join('\n');
        return { kit_id: instanceId, type: 'aos_build_deploy', status: 'error', buildId, appId: appName, message: logSummary };
      }
      emitProgress(buildId, 'upload', 'Upload complete — deployment bundle published to AosCloud', 100);
    } catch (uploadErr) {
      const errMsg = uploadErr.stderr || uploadErr.stdout || uploadErr.message || 'Unknown upload error';
      emitProgress(buildId, 'upload', `Upload failed: ${errMsg.slice(-200)}`, -1);
      const build = buildHistory.get(buildId);
      if (build) { build.status = 'error'; build.finishedAt = Date.now(); }
      const logSummary = (build?.logs || []).map(e => `[${e.stage}] ${e.message}`).join('\n');
      return { kit_id: instanceId, type: 'aos_build_deploy', status: 'error', buildId, appId: appName, message: logSummary };
    }

    const build = buildHistory.get(buildId);
    if (build) { build.status = 'success'; build.finishedAt = Date.now(); }
    const logSummary = (build?.logs || []).map(e => `[${e.stage}] ${e.message}`).join('\n');
    return {
      kit_id: instanceId, type: 'aos_build_deploy', status: 'success',
      buildId, appId: appName, executionId: appName, message: logSummary
    };

  } catch (error) {
    emitProgress(buildId, 'error', error.message, -1);
    const build = buildHistory.get(buildId);
    if (build) { build.status = 'error'; build.finishedAt = Date.now(); }
    const logSummary = (build?.logs || []).map(e => `[${e.stage}] ${e.message}`).join('\n');
    return {
      kit_id: instanceId, type: 'aos_build_deploy', status: 'error',
      buildId, message: logSummary, appId: appName
    };
  } finally {
    await execAsync(`rm -rf ${buildDir}`).catch(() => {});
  }
}

async function handleListApps(data) {
  return {
    kit_id: instanceId,
    type: 'aos_list_apps',
    status: 'success',
    applications: []
  };
}

async function handleStartApp(data) {
  return {
    kit_id: instanceId,
    type: 'aos_start_app',
    status: 'success',
    appId: data.appId,
    message: 'App start requested'
  };
}

async function handleStopApp(data) {
  return {
    kit_id: instanceId,
    type: 'aos_stop_app',
    status: 'success',
    appId: data.appId,
    message: 'App stop requested'
  };
}

async function curlAosCloud(apiPath, useOemCert) {
  const cert = useOemCert ? resolveOemCertPath() : certPath;
  const { stdout } = await execAsync(
    `curl -k --http1.1 ${aoscloudUrl}/api/v11/${apiPath} ` +
    `--cert ${cert} --cert-type P12 ` +
    `-H "accept: application/json"`,
    { env: { ...process.env }, timeout: 15000 }
  );
  return JSON.parse(stdout);
}

async function handleListAosCloud(data, resource) {
  console.log(`[AosCloud] Listing ${resource}...`);
  try {
    const result = await curlAosCloud(`${resource}/`);
    const items = result.items || result || [];

    let mapped;
    if (resource === 'services') {
      mapped = items.map((s) => ({
        // v11 API uses 'id' as the canonical UUID field; 'uuid' is a legacy alias
        uuid: s.id || s.uuid,
        title: s.title || s.name,
        description: s.description || '',
        provider: s.service_provider_title || '',
        codename: s.codename || ''
      }));
    } else if (resource === 'units') {
      mapped = items.map((u) => ({
        // v11 API uses 'id' as the canonical unit identifier for API calls;
        // 'system_uid' is the human-readable legacy ID shown in the UI.
        uid: u.id || u.system_uid,
        systemUid: u.system_uid || u.id || '',
        name: u.model?.name || u.name || u.display_name || 'Unknown',
        online: u.online_status === 'Online',
        status: u.online_status,
        manufacturer: u.manufacturer || ''
      }));
    } else {
      mapped = items.map((s) => ({
        id: s.id || s.subject_id,
        label: s.label || s.name || 'Unknown',
        isGroup: s.is_group || false
      }));
    }

    return {
      kit_id: instanceId,
      type: `aos_list_${resource}`,
      status: 'success',
      items: mapped,
      total: result.total || mapped.length,
      defaults: {
        serviceUuid: defaultServiceUuid,
        unitUid: defaultUnitUid,
        subjectId: defaultSubjectId
      }
    };
  } catch (error) {
    console.error(`[AosCloud] Error listing ${resource}:`, error.message);
    return {
      kit_id: instanceId,
      type: `aos_list_${resource}`,
      status: 'error',
      message: error.message
    };
  }
}

async function handleGetDeploymentStatus(data) {
  const serviceUuid = data.serviceUuid || defaultServiceUuid;
  const unitUid = data.unitUid || defaultUnitUid;
  const subjectId = data.subjectId || defaultSubjectId;

  if (!serviceUuid) {
    return {
      kit_id: instanceId,
      type: 'aos_get_deployment_status',
      status: 'error',
      message: 'No service UUID provided. Select a service or set SERVICE_UUID in .env'
    };
  }

  console.log('[DeploymentStatus] Fetching status for service:', serviceUuid);

  try {
    const service = await curlAosCloud(`services/${serviceUuid}/`);

    let unit = null;
    if (unitUid) {
      try {
        const units = await curlAosCloud('units/');
        const unitList = units.items || units || [];
        unit = unitList.find((u) => (u.id || u.system_uid) === unitUid) || null;
      } catch (e) { console.warn('[DeploymentStatus] Could not fetch units:', e.message); }
    }

    let subject = null;
    if (subjectId) {
      try {
        const subjects = await curlAosCloud('subjects/');
        const subjectList = subjects.items || subjects || [];
        subject = subjectList.find((s) => (s.id || s.subject_id) === subjectId) || null;
      } catch (e) { console.warn('[DeploymentStatus] Could not fetch subjects:', e.message); }
    }

    const versions = service.versions || [];
    const activeVersion = versions.find((v) => v.state === 'ready') || versions[0];
    const currentVersion = activeVersion ? activeVersion.version : 'unknown';

    return {
      kit_id: instanceId,
      type: 'aos_get_deployment_status',
      status: 'success',
      service: {
        uuid: service.uuid || serviceUuid,
        name: service.title || service.name || 'Unknown',
        description: service.description || '',
        currentVersion,
        totalVersions: versions.length,
        versions: versions.map((v) => ({
          version: v.version,
          state: v.state,
          createdAt: v.created_at
        }))
      },
      subject: subject ? {
        id: subject.id || subject.subject_id || subjectId,
        name: subject.label || subject.name || 'Unknown'
      } : null,
      unit: unit ? {
        uid: unit.system_uid || unitUid,
        name: unit.model?.name || unit.name || unit.display_name || 'Unknown',
        ip: unit.ip || 'unknown',
        online: unit.online_status === 'Online' || unit.online !== false,
        onlineStatus: unit.online_status,
        lastSeen: unit.last_seen
      } : null,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('[DeploymentStatus] Error:', error.message);
    return {
      kit_id: instanceId,
      type: 'aos_get_deployment_status',
      status: 'error',
      message: error.message
    };
  }
}

// Probe a .p12 to extract subject CN, issuer CN, and validity dates.
// Returns null on any failure (encrypted cert, missing openssl, malformed file).
// Best-effort: never throws.
async function extractCertIdentity(p12Path) {
  try {
    const pemPath = `${p12Path}.identity.pem`;
    await execAsync(`openssl pkcs12 -in ${p12Path} -nokeys -nodes -passin pass: -out ${pemPath}`, { timeout: 10000 });
    const { stdout } = await execAsync(`openssl x509 -in ${pemPath} -noout -subject -issuer -dates`, { timeout: 5000 });
    await fs.unlink(pemPath).catch(() => {});

    const pickCN = (line) => {
      const m = line.match(/CN\s*=\s*([^,/]+)/i);
      return m ? m[1].trim() : null;
    };
    const subjectLine = (stdout.match(/^subject=.*$/m) || [''])[0];
    const issuerLine  = (stdout.match(/^issuer=.*$/m)  || [''])[0];
    const notBefore   = (stdout.match(/^notBefore=(.+)$/m) || [, null])[1];
    const notAfter    = (stdout.match(/^notAfter=(.+)$/m)  || [, null])[1];

    const expiresInDays = notAfter
      ? Math.floor((new Date(notAfter).getTime() - Date.now()) / 86400000)
      : null;

    return {
      cn: pickCN(subjectLine),
      issuer: pickCN(issuerLine),
      notBefore,
      notAfter,
      expiresInDays
    };
  } catch (err) {
    console.warn('[Cert] Identity extraction failed:', err.message);
    return null;
  }
}

async function handleUploadCert(data) {
  const certDir = '/root/.aos/security';
  const certName = data.certName || 'aos-user-sp';
  const certPath = path.join(certDir, `${certName}.p12`);

  if (!data.certData) {
    return {
      kit_id: instanceId,
      type: 'aos_upload_cert',
      status: 'error',
      message: 'No certificate data provided'
    };
  }

  try {
    await fs.mkdir(certDir, { recursive: true });
    const certBytes = Buffer.from(data.certData, 'base64');
    await fs.writeFile(certPath, certBytes, { mode: 0o600 });
    console.log(`[Cert] Wrote certificate: ${certPath} (${certBytes.length} bytes)`);

    // Also generate .pem for curl usage
    try {
      const pemPath = path.join(certDir, `${certName}.pem`);
      await execAsync(`openssl pkcs12 -in ${certPath} -out ${pemPath} -nodes -passin pass:`, { timeout: 10000 });
      console.log(`[Cert] Generated PEM: ${pemPath}`);
    } catch (pemErr) {
      console.warn('[Cert] PEM generation failed (cert may require a password):', pemErr.message);
    }

    const identity = await extractCertIdentity(certPath);

    return {
      kit_id: instanceId,
      type: 'aos_upload_cert',
      status: 'success',
      message: `Certificate saved (${certBytes.length} bytes)`,
      certPath,
      identity
    };
  } catch (error) {
    console.error('[Cert] Upload error:', error.message);
    return {
      kit_id: instanceId,
      type: 'aos_upload_cert',
      status: 'error',
      message: error.message
    };
  }
}

async function handleCheckCert(data) {
  const certDir = '/root/.aos/security';
  const certName = data.certName || 'aos-user-sp';
  const p12Path = path.join(certDir, `${certName}.p12`);

  try {
    const stats = await fs.stat(p12Path).catch(() => null);
    if (!stats) {
      return {
        kit_id: instanceId,
        type: 'aos_check_cert',
        status: 'success',
        certLoaded: false,
        source: 'none',
        message: 'No certificate found'
      };
    }

    // Check if Key Vault env is set
    const vaultName = process.env.AZURE_KEY_VAULT_NAME || '';
    const identity = await extractCertIdentity(p12Path);

    return {
      kit_id: instanceId,
      type: 'aos_check_cert',
      status: 'success',
      certLoaded: true,
      certSize: stats.size,
      certPath: p12Path,
      source: vaultName ? 'keyvault' : 'manual',
      vaultName: vaultName || null,
      identity,
      message: `Certificate loaded (${stats.size} bytes)`
    };
  } catch (error) {
    return {
      kit_id: instanceId,
      type: 'aos_check_cert',
      status: 'error',
      message: error.message
    };
  }
}

async function handleRemoveCert(data) {
  const certDir = '/root/.aos/security';
  const certName = data.certName || 'aos-user-sp';
  const p12Path = path.join(certDir, `${certName}.p12`);
  const pemPath = path.join(certDir, `${certName}.pem`);

  try {
    let removed = 0;
    for (const p of [p12Path, pemPath]) {
      try { await fs.unlink(p); removed++; console.log(`[Cert] Removed: ${p}`); } catch (e) { /* not present */ }
    }
    return {
      kit_id: instanceId,
      type: 'aos_remove_cert',
      status: 'success',
      message: removed > 0 ? `Removed ${removed} file(s)` : 'No certificate to remove'
    };
  } catch (error) {
    console.error('[Cert] Remove error:', error.message);
    return {
      kit_id: instanceId,
      type: 'aos_remove_cert',
      status: 'error',
      message: error.message
    };
  }
}

async function handleGetServiceUnits(data) {
  const serviceUuid = data.serviceUuid;
  if (!serviceUuid) return { kit_id: instanceId, type: 'aos_get_service_units', status: 'error', message: 'No serviceUuid provided' };

  try {
    const result = await curlAosCloud(`services/${serviceUuid}/units/`);
    const items = result.items || result || [];

    // /services/{id}/units/ returns minimal data — enrich with /units/{uid}/ detail
    const enriched = await Promise.all(items.map(async (u) => {
      const uid = u.id || u.system_uid || u.uid;
      try {
        const detail = await curlAosCloud(`units/${uid}/`);
        // Find service instance run state from the unit's services_subjects
        let runState = '';
        let version = '';
        let error = '';
        const svcSubjects = detail.services_subjects || [];
        for (const ss of svcSubjects) {
          if (ss.service?.uuid === serviceUuid) {
            const inst = (ss.instances || [])[0];
            if (inst) { runState = inst.run_state || ''; version = inst.version || ''; error = inst.error_message || ''; }
            else if (ss.service_versions?.installed_service_version) { version = ss.service_versions.installed_service_version.version || ''; }
            if (ss.error_message) error = error || ss.error_message;
            break;
          }
        }
        return {
          uid,
          name: (detail.unit_sets?.[0]?.title ? detail.unit_sets[0].title + ' #' + (detail.system_uid || detail.id) : null)
                || detail.name || 'Unit-' + (detail.system_uid || detail.id),
          online: detail.online_status === 'Online',
          status: detail.online_status || 'Unknown',
          runState,
          version,
          error,
          ip: detail.ip || ''
        };
      } catch (e) {
        return { uid, name: uid.substring(0, 12), online: false, status: 'Unknown', runState: '', version: '', error: '', ip: '' };
      }
    }));

    return {
      kit_id: instanceId,
      type: 'aos_get_service_units',
      status: 'success',
      serviceUuid,
      units: enriched
    };
  } catch (error) {
    console.error('[AosCloud] Error getting service units:', error.message);
    return { kit_id: instanceId, type: 'aos_get_service_units', status: 'error', message: error.message };
  }
}

async function handleGetServiceVersions(data) {
  const serviceUuid = data.serviceUuid;
  if (!serviceUuid) return { kit_id: instanceId, type: 'aos_get_service_versions', status: 'error', message: 'No serviceUuid provided' };

  try {
    const service = await curlAosCloud(`services/${serviceUuid}/`);
    const versions = service.versions || [];
    return {
      kit_id: instanceId,
      type: 'aos_get_service_versions',
      status: 'success',
      serviceUuid,
      serviceName: service.title || service.name || 'Unknown',
      description: service.description || '',
      versions: versions.map((v) => ({
        id: v.id,
        version: v.version,
        state: v.state,
        createdAt: v.created_at
      })),
      totalVersions: versions.length
    };
  } catch (error) {
    console.error('[AosCloud] Error getting service versions:', error.message);
    return { kit_id: instanceId, type: 'aos_get_service_versions', status: 'error', message: error.message };
  }
}

async function handleGetUnitMonitoring(data) {
  const unitUid = data.unitUid;
  if (!unitUid) return { kit_id: instanceId, type: 'aos_get_unit_monitoring', status: 'error', message: 'No unitUid provided' };

  try {
    // Fetch monitoring AND unit detail in parallel. Unit detail provides the
    // hardware totals (CPU count, RAM total, partition sizes) that the
    // monitoring endpoint omits — without them we can't render real %.
    console.log(`[Monitoring] Fetching data for unit: ${unitUid}`);
    // Monitoring requires OEM cert — SP cert gets "forbidden"
    const [result, unitDetail] = await Promise.all([
      curlAosCloud(`units/${unitUid}/monitoring/`, true),
      curlAosCloud(`units/${unitUid}/`, true).catch(() => null)
    ]);
    console.log(`[Monitoring] Unit detail:`, unitDetail ? `got ${JSON.stringify(unitDetail).length} bytes` : 'null');
    console.log(`[Monitoring] Monitoring result type:`, Array.isArray(result) ? 'array' : typeof result, 'keys:', result ? Object.keys(result).join(',') : 'null');

    // Detect explicit error envelope (rare; usually the call either 200s with an
    // array of nodes, or curlAosCloud throws).
    if (!Array.isArray(result) && result && result.message && !result.nodes) {
      return { kit_id: instanceId, type: 'aos_get_unit_monitoring', status: 'error', message: result.message };
    }

    // Real shape from /api/v11/units/<uid>/monitoring/:
    //   [ { cpu:[{value,measurementType,nodeId,...}], ram:[...], disk:[{partition,value,...}], ... },
    //     { ...secondary node... }, {} ]
    // Each metric is a *time-series array* of measurements; we want the most
    // recent "node"-level entry. Service-level entries are surfaced separately.
    const nodes = Array.isArray(result) ? result : (result.nodes || []);
    const node  = nodes[0] || {};

    const pickNode = (arr) => (arr || []).find((m) => m.measurementType === 'node');

    const cpuM = pickNode(node.cpu);
    const ramM = pickNode(node.ram);

    // Per-partition disk usage from monitoring (node-level entries only).
    const partUsed = {};
    for (const m of (node.disk || [])) {
      if (m.measurementType === 'node' && m.partition) {
        partUsed[m.partition] = (partUsed[m.partition] || 0) + (m.value || 0);
      }
    }

    // Service-level CPU/RAM (per service-instance running on this unit).
    const serviceMap = new Map();
    const collect = (arr, key) => {
      for (const m of (arr || [])) {
        if (m.measurementType !== 'service' || !m.serviceId) continue;
        const k = m.serviceId;
        if (!serviceMap.has(k)) serviceMap.set(k, { id: k, cpu: 0, ram: 0 });
        if (key === 'cpu') serviceMap.get(k).cpu = m.value || 0;
        if (key === 'ram') serviceMap.get(k).ram = m.value || 0;
      }
    };
    collect(node.cpu, 'cpu');
    collect(node.ram, 'ram');
    const services = Array.from(serviceMap.values());

    // Hardware specs from unit detail. AosCloud returns one entry in `nodes`
    // per physical node (main + secondaries). We expose the FIRST node since
    // the monitoring entry we render is also from the first node — keeps the
    // totals consistent.
    let hw = null;
    if (unitDetail && Array.isArray(unitDetail.nodes) && unitDetail.nodes.length > 0) {
      const detailNode = unitDetail.nodes[0];
      const cpu0 = (detailNode.cpus || [])[0] || {};
      const partTotals = {};
      for (const p of (detailNode.partitions || [])) {
        if (p && p.totalSize != null) partTotals[p.name || `partition_${Object.keys(partTotals).length}`] = p.totalSize;
      }
      hw = {
        numCpus:        detailNode.num_cpus || cpu0.totalNumCores || 1,
        numCores:       cpu0.totalNumCores || detailNode.num_cpus || 1,
        numThreads:     cpu0.totalNumThreads || cpu0.totalNumCores || 1,
        cpuModel:       (cpu0.modelName || '').trim() || null,
        ramTotal:       detailNode.total_ram || 0,
        partitionTotals: partTotals,
        nodeCount:      unitDetail.nodes.length
      };
    }

    // Build per-partition disk view (used + total per partition, not just sum).
    const diskPartitions = [];
    const allPartNames = new Set([...Object.keys(partUsed), ...Object.keys(hw?.partitionTotals || {})]);
    for (const name of allPartNames) {
      diskPartitions.push({
        name,
        used:  partUsed[name] || 0,
        total: (hw?.partitionTotals || {})[name] || 0
      });
    }

    return {
      kit_id: instanceId,
      type: 'aos_get_unit_monitoring',
      status: 'success',
      unitUid,
      cpu: cpuM ? cpuM.value : 0,
      ram:  { used: ramM ? ramM.value : 0, total: hw ? hw.ramTotal : 0 },
      // Backwards-compatible scalar disk (sum of var + workdirs); new UI
      // should prefer `diskPartitions` for per-partition rendering.
      disk: { used: (partUsed.var || 0) + (partUsed.workdirs || 0), total: 0 },
      diskPartitions,
      services,
      hw,
      raw: result
    };
  } catch (error) {
    console.error('[AosCloud] Error getting monitoring:', error.message);
    return { kit_id: instanceId, type: 'aos_get_unit_monitoring', status: 'error', message: error.message };
  }
}

async function handleGetAlerts(data) {
  try {
    const result = await curlAosCloud('alerts/?limit=20');
    const items = result.items || result || [];

    return {
      kit_id: instanceId,
      type: 'aos_get_alerts',
      status: 'success',
      alerts: items.map((a) => ({
        id: a.id,
        timestamp: a.timestamp || a.created_at,
        tag: a.tag || a.alert_type || '',
        source: a.source || '',
        message: a.message || a.payload || '',
        severity: a.severity || 'info'
      })),
      total: result.total || items.length
    };
  } catch (error) {
    console.error('[AosCloud] Error getting alerts:', error.message);
    return { kit_id: instanceId, type: 'aos_get_alerts', status: 'error', message: error.message };
  }
}

async function handleRequestServiceLog(data) {
  const { serviceUuid, unitUid, subjectId, minutes } = data;
  if (!serviceUuid || !unitUid || !subjectId) {
    return { kit_id: instanceId, type: 'aos_request_service_log', status: 'error', message: 'serviceUuid, unitUid, and subjectId are required' };
  }

  try {
    const now = new Date();
    const from = new Date(now.getTime() - (minutes || 60) * 60000);
    const payload = JSON.stringify({
      log_id: `log-${Date.now()}`,
      service: serviceUuid,
      unit: unitUid,
      subject: subjectId,
      request_type: 'log',
      date_from: from.toISOString(),
      date_till: now.toISOString()
    });

    const { stdout } = await execAsync(
      `curl -k --http1.1 -X POST ${aoscloudUrl}/api/v11/service-logs/ ` +
      `--cert ${certPath} --cert-type P12 ` +
      `-H "accept: application/json" -H "Content-Type: application/json" ` +
      `-d ${JSON.stringify(payload)}`,
      { env: { ...process.env }, timeout: 15000 }
    );

    const items = JSON.parse(stdout);
    const requests = (Array.isArray(items) ? items : [items]).map((r) => ({
      id: r.id,
      state: r.state,
      nodeId: r.node_id,
      createdAt: r.created_at
    }));

    console.log(`[ServiceLog] Created ${requests.length} log request(s)`);
    return { kit_id: instanceId, type: 'aos_request_service_log', status: 'success', requests };
  } catch (error) {
    console.error('[ServiceLog] Error:', error.message);
    return { kit_id: instanceId, type: 'aos_request_service_log', status: 'error', message: error.message };
  }
}

async function handleGetServiceLogStatus(data) {
  try {
    const result = await curlAosCloud('service-logs/');
    const items = result.items || result || [];

    const logs = items.map((l) => ({
      id: l.id,
      state: l.state,
      service: l.service,
      serviceTitle: l.service_title,
      unit: l.unit,
      nodeId: l.node_id,
      requestType: l.request_type,
      dateFrom: l.date_from,
      dateTill: l.date_till,
      error: l.error_description,
      createdAt: l.created_at
    }));

    return { kit_id: instanceId, type: 'aos_get_service_log_status', status: 'success', logs, total: result.total || logs.length };
  } catch (error) {
    return { kit_id: instanceId, type: 'aos_get_service_log_status', status: 'error', message: error.message };
  }
}

function startBroadcasting() {
  if (broadcastTimer) return;
  broadcastStatus();
  broadcastTimer = setInterval(broadcastStatus, broadcastInterval);
  console.log('[Broadcaster] Status broadcasting started (interval:', broadcastInterval + 'ms)');
}

function stopBroadcasting() {
  if (broadcastTimer) {
    clearInterval(broadcastTimer);
    broadcastTimer = null;
  }
}

function broadcastStatus() {
  const statusUpdate = {
    kit_id: instanceId,
    data: { online: true, last_seen: new Date().toISOString() }
  };
  socket.emit('report-runtime-state', statusUpdate);
  console.log('[Broadcaster] Status broadcast:', statusUpdate.data.online, 'at', statusUpdate.data.last_seen);
}

process.on('SIGINT', () => { stopBroadcasting(); if (socket) socket.disconnect(); process.exit(0); });
process.on('SIGTERM', () => { stopBroadcasting(); if (socket) socket.disconnect(); process.exit(0); });

main().catch((err) => {
  console.error('[Broadcaster] Fatal error:', err);
  process.exit(1);
});
