#!/usr/bin/env node
// Unified dev server for SDV Blueprint standalone apps.
// Serves Dashboard and Deployment UI on a single port with routing.

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '3010');

const APPS = {
  '/dashboard': path.resolve(__dirname, 'dashboard'),
  '/deploy':    path.resolve(__dirname, '..', 'aos-cloud-deployment'),
};

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.map':  'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (url === '/') {
    res.writeHead(302, { Location: '/dashboard' });
    res.end();
    return;
  }

  for (const [prefix, dir] of Object.entries(APPS)) {
    if (url === prefix) {
      res.writeHead(302, { Location: prefix + '/' });
      res.end();
      return;
    }
    if (url.startsWith(prefix + '/')) {
      let rel = url.slice(prefix.length);
      if (rel === '/') rel = '/standalone.html';

      const filePath = path.join(dir, rel);
      if (!filePath.startsWith(dir)) {
        res.writeHead(403); res.end(); return;
      }

      const ext = path.extname(filePath);
      const mime = MIME[ext] || 'application/octet-stream';

      try {
        const data = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': mime });
        res.end(data);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found: ' + rel);
      }
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SDV Blueprint] Serving on http://localhost:${PORT}`);
  console.log(`  Dashboard:  http://localhost:${PORT}/dashboard`);
  console.log(`  Deployment: http://localhost:${PORT}/deploy`);
});
