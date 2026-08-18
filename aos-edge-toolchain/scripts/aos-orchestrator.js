#!/usr/bin/env node
// Copyright (c) 2026 Eclipse Foundation.
//
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

const io = require('socket.io-client');
const Docker = require('dockerode');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const http = require('http');

const execAsync = promisify(exec);

// ── Configuration ──────────────────────────────────────────────────────────
const kitManagerUrl = process.env.KIT_MANAGER_URL || 'https://kit.digitalauto.tech';
const instanceId = process.env.INSTANCE_ID || 'AET-ORCHESTRATOR';
const instanceName = process.env.INSTANCE_NAME || 'AOS Edge Toolchain';
const signalRelayPort = parseInt(process.env.SIGNAL_RELAY_PORT || '9100');
const maxWorkers = parseInt(process.env.MAX_WORKERS || '10');
const idleTimeoutMs = parseInt(process.env.IDLE_TIMEOUT_MINUTES || '30') * 60 * 1000;
const portRangeStart = parseInt(process.env.WORKER_PORT_START || '9101');
const portRangeEnd = parseInt(process.env.WORKER_PORT_END || '9199');
const workerImage = process.env.WORKER_IMAGE || 'aos-edge-toolchain:latest';
const broadcasterScriptHost = process.env.BROADCASTER_SCRIPT_HOST || '';
const aoscloudUrl = process.env.AOSCLOUD_URL || 'https://aoscloud.io:10000';
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy || '';

console.log('[Orchestrator] Starting:', instanceId);
console.log('[Orchestrator] Kit Manager:', kitManagerUrl);
console.log('[Orchestrator] Max workers:', maxWorkers);
console.log('[Orchestrator] Idle timeout:', process.env.IDLE_TIMEOUT_MINUTES || '30', 'min');
console.log('[Orchestrator] Port range:', portRangeStart + '-' + portRangeEnd);
console.log('[Orchestrator] Worker image:', workerImage);
if (proxyUrl) console.log('[Orchestrator] Proxy:', proxyUrl);

// ── State ──────────────────────────────────────────────────────────────────
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// userCN → worker info
const userMap = new Map();
// request_from (dashboard session) → userCN
const sessionMap = new Map();

// Port pool: track which ports are in use
const usedPorts = new Set();
function allocatePort() {
  for (let p = portRangeStart; p <= portRangeEnd; p++) {
    if (!usedPorts.has(p)) {
      usedPorts.add(p);
      return p;
    }
  }
  return null;
}
function releasePort(p) {
  usedPorts.delete(p);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function shortHash(cn) {
  return crypto.createHash('sha256').update(cn).digest('hex').substring(0, 8);
}

async function extractCertCN(p12Base64) {
  const tmpDir = '/tmp/orchestrator-certs';
  await fs.mkdir(tmpDir, { recursive: true });
  const tmpP12 = path.join(tmpDir, `cert-${Date.now()}.p12`);
  const tmpPem = tmpP12 + '.pem';

  try {
    const certBytes = Buffer.from(p12Base64, 'base64');
    await fs.writeFile(tmpP12, certBytes);

    // Extract PEM without password
    await execAsync(
      `openssl pkcs12 -in ${tmpP12} -nokeys -nodes -passin pass: -out ${tmpPem}`,
      { timeout: 10000 }
    );
    const { stdout } = await execAsync(
      `openssl x509 -in ${tmpPem} -noout -subject`,
      { timeout: 5000 }
    );

    const m = stdout.match(/CN\s*=\s*([^,/]+)/i);
    return m ? m[1].trim() : null;
  } catch (err) {
    console.error('[Orchestrator] Failed to extract cert CN:', err.message);
    return null;
  } finally {
    await fs.rm(tmpP12, { force: true }).catch(() => {});
    await fs.rm(tmpPem, { force: true }).catch(() => {});
  }
}

async function httpForward(port, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: '/api/command',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 180000  // 3 min for builds
    }, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseBody));
        } catch {
          resolve({ status: 'error', message: 'Invalid response from worker' });
        }
      });
    });
    req.on('error', (err) => {
      reject(new Error(`Worker unreachable on port ${port}: ${err.message}`));
    });
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Worker timeout on port ${port}`));
    });
    req.write(body);
    req.end();
  });
}

async function healthCheck(port) {
  try {
    await execAsync(`curl -s http://127.0.0.1:${port}/health`, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

// ── Worker Lifecycle ───────────────────────────────────────────────────────

async function createWorker(userCN, p12Base64) {
  const port = allocatePort();
  if (!port) {
    throw new Error(`No available ports. All ${maxWorkers} worker slots are in use.`);
  }

  const hash = shortHash(userCN);
  const containerName = `aos-worker-${hash}`;
  const volumeName = `${containerName}-certs`;
  const workerInstanceId = `AET-${hash}`;

  console.log(`[Orchestrator] Creating worker for CN="${userCN}": ${containerName} (port ${port})`);

  // Create cert volume
  try {
    await docker.createVolume({ Name: volumeName });
  } catch (e) {
    if (!e.message.includes('already exists')) throw e;
  }

  // Build docker run config
  const envVars = [
    `WORKER_MODE=true`,
    `INSTANCE_ID=${workerInstanceId}`,
    `INSTANCE_NAME=AOS Edge Toolchain (${userCN})`,
    `SIGNAL_RELAY_PORT=${port}`,
    `ORCHESTRATOR_URL=http://127.0.0.1:${signalRelayPort}`,
    `AOSCLOUD_URL=${aoscloudUrl}`,
    `NODE_TLS_REJECT_UNAUTHORIZED=0`,
  ];
  if (proxyUrl) {
    envVars.push(`HTTPS_PROXY=${proxyUrl}`);
    envVars.push(`https_proxy=${proxyUrl}`);
  }

  const binds = [
    `${volumeName}:/root/.aos/security`,
  ];
  // Optionally bind-mount broadcaster script from host for live updates
  if (broadcasterScriptHost) {
    binds.push(`${broadcasterScriptHost}:/usr/local/bin/aos-broadcaster.js:ro`);
  }

  const container = await docker.createContainer({
    Image: workerImage,
    name: containerName,
    Env: envVars,
    HostConfig: {
      NetworkMode: 'host',
      RestartPolicy: { Name: 'unless-stopped' },
      Binds: binds,
    },
    Entrypoint: ['sh'],
    Cmd: [
      '-c',
      'unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY && exec node /usr/local/bin/aos-broadcaster.js'
    ],
  });

  await container.start();
  console.log(`[Orchestrator] Worker container started: ${containerName}`);

  // Wait for worker to be healthy
  let healthy = false;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 1000));
    if (await healthCheck(port)) {
      healthy = true;
      break;
    }
  }
  if (!healthy) {
    console.warn(`[Orchestrator] Worker ${containerName} did not become healthy — continuing anyway`);
  }

  // Write the user's cert into the worker's volume via docker cp
  try {
    const certBytes = Buffer.from(p12Base64, 'base64');
    const tmpCertPath = `/tmp/orchestrator-cert-${hash}.p12`;
    await fs.writeFile(tmpCertPath, certBytes);

    // Copy cert into container and set permissions
    await execAsync(`docker cp ${tmpCertPath} ${containerName}:/root/.aos/security/aos-user-sp.p12`, { timeout: 10000 });
    await execAsync(`docker exec ${containerName} chmod 600 /root/.aos/security/aos-user-sp.p12`, { timeout: 5000 });
    await fs.unlink(tmpCertPath).catch(() => {});

    // Also generate PEM
    await execAsync(
      `docker exec ${containerName} sh -c 'openssl pkcs12 -in /root/.aos/security/aos-user-sp.p12 -out /root/.aos/security/aos-user-sp.pem -nodes -passin pass: 2>/dev/null || true'`,
      { timeout: 10000 }
    ).catch(() => {});
    console.log(`[Orchestrator] Cert written to worker ${containerName}`);
  } catch (certErr) {
    // Cert write failed — the worker is useless without a valid certificate.
    // Clean up everything and throw so the user gets a clear error.
    console.error(`[Orchestrator] Failed to write cert to worker ${containerName}: ${certErr.message}`);
    try {
      const container = docker.getContainer(containerName);
      await container.stop({ t: 5 }).catch(() => {});
      await container.remove({ force: true }).catch(() => {});
    } catch (cleanupErr) {
      console.warn(`[Orchestrator] Cleanup after cert failure error: ${cleanupErr.message}`);
    }
    try {
      const vol = docker.getVolume(volumeName);
      await vol.remove().catch(() => {});
    } catch (e) { /* ok */ }
    releasePort(port);
    throw new Error(`Failed to write certificate to build environment: ${certErr.message}`);
  }

  const workerInfo = {
    containerName,
    instanceId: workerInstanceId,
    port,
    volumeName,
    userCN,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    status: 'running',
  };

  userMap.set(userCN, workerInfo);
  return workerInfo;
}

async function stopWorker(userCN) {
  const info = userMap.get(userCN);
  if (!info) return;

  console.log(`[Orchestrator] Stopping worker for CN="${userCN}": ${info.containerName}`);
  info.status = 'stopping';

  try {
    const container = docker.getContainer(info.containerName);
    await container.stop({ t: 10 }).catch(() => {});
    await container.remove({ force: true }).catch(() => {});
  } catch (e) {
    console.warn(`[Orchestrator] Error stopping container ${info.containerName}:`, e.message);
  }

  // Clean up volume
  try {
    const vol = docker.getVolume(info.volumeName);
    await vol.remove().catch(() => {});
  } catch (e) { /* ok */ }

  releasePort(info.port);
  userMap.delete(userCN);

  // Clean up any session mappings for this user
  for (const [session, cn] of sessionMap) {
    if (cn === userCN) sessionMap.delete(session);
  }

  console.log(`[Orchestrator] Worker stopped: ${info.containerName} (port ${info.port} released)`);
}

async function updateWorkerCert(containerName, userCN, p12Base64) {
  const hash = shortHash(userCN);
  const tmpCertPath = `/tmp/orchestrator-cert-${hash}.p12`;
  const certBytes = Buffer.from(p12Base64, 'base64');
  await fs.writeFile(tmpCertPath, certBytes);

  try {
    // Copy new cert into existing container, overwriting the old one
    await execAsync(`docker cp ${tmpCertPath} ${containerName}:/root/.aos/security/aos-user-sp.p12`, { timeout: 10000 });
    await execAsync(`docker exec ${containerName} chmod 600 /root/.aos/security/aos-user-sp.p12`, { timeout: 5000 });
    // Regenerate PEM from the new cert
    await execAsync(
      `docker exec ${containerName} sh -c 'openssl pkcs12 -in /root/.aos/security/aos-user-sp.p12 -out /root/.aos/security/aos-user-sp.pem -nodes -passin pass: 2>/dev/null || true'`,
      { timeout: 10000 }
    ).catch(() => {});
    console.log(`[Orchestrator] Cert updated in existing worker ${containerName} for CN="${userCN}"`);
  } finally {
    await fs.unlink(tmpCertPath).catch(() => {});
  }
}

async function getOrCreateWorker(userCN, p12Base64) {
  // Return existing worker if running, but always update the cert
  const existing = userMap.get(userCN);
  if (existing && existing.status === 'running') {
    existing.lastActivity = Date.now();
    await updateWorkerCert(existing.containerName, userCN, p12Base64);
    return existing;
  }

  // If existing worker is in a bad state, clean it up first
  if (existing) {
    await stopWorker(userCN);
  }

  // Check max workers limit
  if (userMap.size >= maxWorkers) {
    // Try to find an idle worker to evict
    const now = Date.now();
    let oldestIdle = null;
    let oldestTime = now;
    for (const [cn, info] of userMap) {
      if (info.lastActivity < oldestTime) {
        oldestTime = info.lastActivity;
        oldestIdle = cn;
      }
    }
    if (oldestIdle && (now - oldestTime) > idleTimeoutMs) {
      console.log(`[Orchestrator] Evicting idle worker for CN="${oldestIdle}" to make room`);
      await stopWorker(oldestIdle);
    } else {
      throw new Error(`All ${maxWorkers} worker slots are in use. Please wait for an idle worker to be released.`);
    }
  }

  return createWorker(userCN, p12Base64);
}

// ── Idle Monitor ───────────────────────────────────────────────────────────

function startIdleMonitor() {
  setInterval(async () => {
    try {
      const now = Date.now();
      for (const [userCN, info] of userMap) {
        if (info.status !== 'running') continue;
        if (now - info.lastActivity > idleTimeoutMs) {
          try {
            console.log(`[Orchestrator] Worker for CN="${userCN}" idle for ${Math.round((now - info.lastActivity) / 60000)}min — stopping`);
            await stopWorker(userCN);
          } catch (e) {
            console.error(`[Orchestrator] Failed to stop idle worker for CN="${userCN}":`, e.message);
          }
        }
      }
    } catch (e) {
      console.error('[Orchestrator] Idle monitor check error:', e.message);
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
  console.log('[Orchestrator] Idle monitor started (check interval: 5 min, timeout:', process.env.IDLE_TIMEOUT_MINUTES || '30', 'min)');
}

// ── HTTP Server (heartbeat endpoint + signal relay) ────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const signalHistory = [];
const SIGNAL_HISTORY_MAX = 500;

const httpServer = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  // Worker heartbeat
  if (req.method === 'POST' && req.url === '/api/worker-heartbeat') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { instanceId: workerId, port, status } = JSON.parse(body);
        // Update lastActivity for the worker
        for (const [cn, info] of userMap) {
          if (info.instanceId === workerId || info.port === port) {
            info.lastActivity = Date.now();
            if (status) info.status = status;
            break;
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end('{"ok":true}');
      } catch {
        res.writeHead(400, corsHeaders);
        res.end('{"ok":false}');
      }
    });
    return;
  }

  // Signal relay: receive from worker or external sources, forward to browser
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
      } catch {
        res.writeHead(400, corsHeaders);
        res.end('{"ok":false}');
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/signals') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify(signalHistory.slice(-100)));
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({
      ok: true,
      instanceId,
      uptime: process.uptime(),
      workers: userMap.size,
      maxWorkers,
      portsUsed: usedPorts.size,
    }));
    return;
  }

  // Worker list (for debugging)
  if (req.method === 'GET' && req.url === '/api/workers') {
    const workers = [];
    for (const [cn, info] of userMap) {
      workers.push({
        userCN: cn,
        containerName: info.containerName,
        port: info.port,
        status: info.status,
        idleMinutes: Math.round((Date.now() - info.lastActivity) / 60000),
      });
    }
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ workers, total: workers.length, maxWorkers }));
    return;
  }

  res.writeHead(404, corsHeaders);
  res.end();
});

const { Server: SocketIOServer } = require('socket.io');
const relayIO = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
relayIO.on('connection', (client) => {
  console.log('[Orchestrator] Signal relay client connected:', client.id);
  client.emit('history', signalHistory.slice(-100));
  client.on('disconnect', () => {
    console.log('[Orchestrator] Signal relay client disconnected:', client.id);
  });
});

httpServer.listen(signalRelayPort, '0.0.0.0', () => {
  console.log('[Orchestrator] HTTP + Signal relay on port', signalRelayPort);
});

// ── Startup Reconciliation ──────────────────────────────────────────────────

async function reconcileOrphans() {
  console.log('[Orchestrator] Checking for orphaned workers from previous run...');
  try {
    const containers = await docker.listContainers({ all: true });
    const orphaned = containers.filter(c =>
      c.Names && c.Names.some(n => n.startsWith('/aos-worker-'))
    );

    for (const c of orphaned) {
      const name = (c.Names[0] || '').replace(/^\//, '');
      console.log(`[Orchestrator] Cleaning up orphaned container: ${name}`);
      try {
        const container = docker.getContainer(c.Id);
        await container.stop({ t: 5 }).catch(() => {});
        await container.remove({ force: true }).catch(() => {});
      } catch (e) {
        console.warn(`[Orchestrator] Failed to remove orphaned container ${name}:`, e.message);
      }
    }

    // Clean up orphaned volumes
    const volumes = await docker.listVolumes({});
    const orphanedVols = (volumes.Volumes || []).filter(v =>
      v.Name && v.Name.startsWith('aos-worker-') && v.Name.endsWith('-certs')
    );
    for (const v of orphanedVols) {
      console.log(`[Orchestrator] Cleaning up orphaned volume: ${v.Name}`);
      try {
        const vol = docker.getVolume(v.Name);
        await vol.remove().catch(() => {});
      } catch (e) {
        console.warn(`[Orchestrator] Failed to remove orphaned volume ${v.Name}:`, e.message);
      }
    }

    if (orphaned.length > 0 || orphanedVols.length > 0) {
      console.log(`[Orchestrator] Cleaned up ${orphaned.length} orphaned container(s) and ${orphanedVols.length} volume(s)`);
    } else {
      console.log('[Orchestrator] No orphaned workers found');
    }
  } catch (e) {
    console.warn('[Orchestrator] Orphan reconciliation error (non-fatal):', e.message);
  }
}

// ── Kit Manager Connection ─────────────────────────────────────────────────

let socket;

async function main() {
  // Clean up any orphaned workers from a previous orchestrator run before
  // connecting to Kit Manager. This prevents port conflicts and container
  // name collisions when users re-upload certificates.
  await reconcileOrphans();
  const socketOpts = {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 5000,
    reconnectionDelayMax: 10000,
  };

  socketOpts.rejectUnauthorized = false;

  if (proxyUrl) {
    try {
      const mod = await import('/usr/local/lib/node_modules/https-proxy-agent/dist/index.js');
      const HttpsProxyAgent = mod.HttpsProxyAgent || mod.default;
      socketOpts.agent = new HttpsProxyAgent(proxyUrl);
      socketOpts.transports = ['polling', 'websocket'];
      console.log('[Orchestrator] Proxy agent configured');
    } catch (err) {
      console.warn('[Orchestrator] https-proxy-agent not available:', err.message);
    }
  }

  socket = io(kitManagerUrl, socketOpts);

  socket.on('connect', () => {
    console.log('[Orchestrator] Connected to Kit Manager');

    socket.emit('register_kit', {
      kit_id: instanceId,
      name: instanceName,
      desc: 'AOS Edge Toolchain — Multi-tenant orchestrator',
      support_apis: [
        'aos_build_deploy',
        'aos_list_apps',
        'aos_start_app',
        'aos_stop_app',
        'aos_get_deployment_status',
        'aos_upload_cert',
        'aos_check_cert',
        'aos_remove_cert',
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
        'aos_signal_stream',
        'aos_get_toolchain_info',
        'aos_get_unit_info',
        'aos_run_automation'
      ],
      type: 'aos-edge-toolchain',
      suffix: 'AET',
      online: true
    });
    console.log('[Orchestrator] Registration sent');

    // Status broadcast every 30s
    setInterval(() => {
      if (socket && socket.connected) {
        socket.emit('report-runtime-state', {
          kit_id: instanceId,
          data: { online: true, last_seen: new Date().toISOString(), workers: userMap.size }
        });
      }
    }, 30000);
  });

  socket.on('connect_error', (error) => {
    console.error('[Orchestrator] Connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.warn('[Orchestrator] Disconnected:', reason);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('[Orchestrator] Reconnected after', attemptNumber, 'attempts');
  });

  // ── Command Routing ────────────────────────────────────────────────────

  socket.on('messageToKit', async (data) => {
    const cmd = data.cmd || data.type;
    const requestFrom = data.request_from || 'unknown';
    console.log(`[Orchestrator] Received: ${cmd} from ${requestFrom}`);

    try {
      let response;

      // ── Cert management (handled by orchestrator) ──
      if (cmd === 'aos_upload_cert') {
        response = await handleUploadCert(data, requestFrom);
      } else if (cmd === 'aos_check_cert') {
        response = await handleCheckCert(data, requestFrom);
      } else if (cmd === 'aos_remove_cert') {
        response = await handleRemoveCert(data, requestFrom);
      } else {
        // ── All other commands: forward to user's worker ──
        const userCN = sessionMap.get(requestFrom);
        if (!userCN) {
          response = {
            id: data.id,
            kit_id: instanceId,
            type: cmd,
            status: 'error',
            message: 'No certificate uploaded. Please upload your .p12 certificate first.'
          };
        } else {
          const worker = userMap.get(userCN);
          if (!worker || worker.status !== 'running') {
            // Worker died or was cleaned up — clear session mapping
            sessionMap.delete(requestFrom);
            response = {
              id: data.id,
              kit_id: instanceId,
              type: cmd,
              status: 'error',
              message: 'Your build environment is no longer available. Please re-upload your certificate.'
            };
          } else {
            // Forward to worker
            worker.lastActivity = Date.now();
            try {
              response = await httpForward(worker.port, data);
              // Ensure kit_id reflects the orchestrator, not the worker
              response.kit_id = instanceId;
            } catch (fwErr) {
              console.error(`[Orchestrator] Forward error to ${worker.containerName}:`, fwErr.message);
              // Check whether the worker is truly dead or just temporarily slow
              const workerAlive = await healthCheck(worker.port);
              if (!workerAlive) {
                // Worker is gone — clean up stale state so the user can recover
                console.log(`[Orchestrator] Worker ${worker.containerName} is dead — cleaning up`);
                await stopWorker(userCN);
                response = {
                  id: data.id,
                  kit_id: instanceId,
                  type: cmd,
                  status: 'error',
                  message: 'Build environment was lost (worker crashed or was stopped). Please re-upload your certificate to create a new one.'
                };
              } else {
                // Worker is alive but didn't respond in time — keep it, return the error
                response = {
                  id: data.id,
                  kit_id: instanceId,
                  type: cmd,
                  status: 'error',
                  message: `Worker did not respond in time: ${fwErr.message}`
                };
              }
            }
          }
        }
      }

      response.id = data.id;
      response.request_from = data.request_from;
      socket.emit('messageToKit-kitReply', response);
      console.log(`[Orchestrator] Response sent for ${cmd}: ${response.status}`);

    } catch (error) {
      console.error('[Orchestrator] Error:', error.message);
      socket.emit('messageToKit-kitReply', {
        id: data.id,
        kit_id: instanceId,
        type: cmd,
        status: 'error',
        message: error.message
      });
    }
  });

  // Start idle monitor after Kit Manager connection
  startIdleMonitor();
}

// ── Cert Handlers ──────────────────────────────────────────────────────────

async function handleUploadCert(data, requestFrom) {
  if (!data.certData) {
    return {
      kit_id: instanceId,
      type: 'aos_upload_cert',
      status: 'error',
      message: 'No certificate data provided'
    };
  }

  // Extract CN from the uploaded p12
  const userCN = await extractCertCN(data.certData);
  if (!userCN) {
    return {
      kit_id: instanceId,
      type: 'aos_upload_cert',
      status: 'error',
      message: 'Could not extract identity from certificate. Ensure it is a valid .p12 file without password protection.'
    };
  }

  console.log(`[Orchestrator] Cert upload: CN="${userCN}", session=${requestFrom}`);

  try {
    // Get or create worker for this CN
    const worker = await getOrCreateWorker(userCN, data.certData);

    // Map this dashboard session to the user CN
    sessionMap.set(requestFrom, userCN);

    return {
      kit_id: instanceId,
      type: 'aos_upload_cert',
      status: 'success',
      message: `Certificate loaded. Dedicated build environment ready (port ${worker.port}).`,
      identity: { cn: userCN },
      worker: {
        instanceId: worker.instanceId,
        port: worker.port,
        signalRelayPort: worker.port,
      }
    };
  } catch (err) {
    return {
      kit_id: instanceId,
      type: 'aos_upload_cert',
      status: 'error',
      message: err.message
    };
  }
}

async function handleCheckCert(data, requestFrom) {
  const userCN = sessionMap.get(requestFrom);

  if (!userCN) {
    return {
      kit_id: instanceId,
      type: 'aos_check_cert',
      status: 'success',
      certLoaded: false,
      source: 'none',
      message: 'No certificate uploaded yet'
    };
  }

  const worker = userMap.get(userCN);
  if (!worker || worker.status !== 'running') {
    sessionMap.delete(requestFrom);
    return {
      kit_id: instanceId,
      type: 'aos_check_cert',
      status: 'success',
      certLoaded: false,
      source: 'none',
      message: 'Build environment not available'
    };
  }

  // Forward to worker to check its cert
  try {
    const workerResponse = await httpForward(worker.port, {
      cmd: 'aos_check_cert',
      certName: data.certName || 'aos-user-sp'
    });
    return {
      ...workerResponse,
      kit_id: instanceId,
      worker: {
        instanceId: worker.instanceId,
        port: worker.port,
        userCN,
      }
    };
  } catch {
    return {
      kit_id: instanceId,
      type: 'aos_check_cert',
      status: 'success',
      certLoaded: true,
      source: 'manual',
      message: `Certificate loaded for ${userCN}`,
      identity: { cn: userCN },
      worker: {
        instanceId: worker.instanceId,
        port: worker.port,
        userCN,
      }
    };
  }
}

async function handleRemoveCert(data, requestFrom) {
  const userCN = sessionMap.get(requestFrom);

  if (!userCN) {
    return {
      kit_id: instanceId,
      type: 'aos_remove_cert',
      status: 'success',
      message: 'No certificate to remove'
    };
  }

  await stopWorker(userCN);
  sessionMap.delete(requestFrom);

  return {
    kit_id: instanceId,
    type: 'aos_remove_cert',
    status: 'success',
    message: `Certificate removed. Build environment for ${userCN} has been shut down.`
  };
}

// ── Startup ────────────────────────────────────────────────────────────────

process.on('SIGINT', async () => {
  console.log('[Orchestrator] Shutting down...');
  // Stop all workers
  for (const [cn] of userMap) {
    await stopWorker(cn).catch(() => {});
  }
  if (socket) socket.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[Orchestrator] Shutting down...');
  for (const [cn] of userMap) {
    await stopWorker(cn).catch(() => {});
  }
  if (socket) socket.disconnect();
  process.exit(0);
});

main().catch((err) => {
  console.error('[Orchestrator] Fatal error:', err);
  process.exit(1);
});
