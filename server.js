// =============================================================================
// LOCAL PREVIEW SERVER — FOR DEVELOPMENT USE ONLY
// =============================================================================
// This file is NOT used in production. Cloudflare Pages serves static files
// directly — no Node.js server runs at all in production.
//
// Usage (local preview only):
//   node server.js          → serves the site at http://localhost:5000
//   npm run dev             → same via package.json
//   npm run preview         → same via package.json
//
// Environment variables it reads (optional for local preview):
//   BACKEND_URL             → Google Apps Script web app URL
//   GEOAPIFY_API_KEY        → Address autocomplete key
//   LISTING_SITE_URL        → Base URL of the main listing platform
//
// In production, generate-config.js runs at Cloudflare Pages build time
// and writes config.js from CF environment variables. That is the only
// mechanism that injects keys into the browser. This server is irrelevant
// to production and should never be set as the Cloudflare build command.
// =============================================================================
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5000;
const HOST = '0.0.0.0';

function getRuntimeConfig() {
  return {
    BACKEND_URL: (process.env.BACKEND_URL || '').replace(/\/$/, ''),
    GEOAPIFY_API_KEY: process.env.GEOAPIFY_API_KEY || '',
    LISTING_SITE_URL: (process.env.LISTING_SITE_URL || 'https://choice-properties-site.pages.dev').replace(/\/$/, ''),
  };
}

function isPublicAsset(urlPath) {
  if (urlPath.includes('..') || urlPath.includes('\\')) return false;
  if (urlPath === '/' || urlPath === '/index.html' || urlPath === '/config.js') return true;
  if (urlPath === '/_headers' || urlPath === '/_redirects') return true;
  return /^\/(?:css|js)\/[A-Za-z0-9._/-]+$/.test(urlPath);
}

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  if (urlPath === '/favicon.ico') {
    res.writeHead(204, { 'Cache-Control': 'public, max-age=86400' });
    res.end();
    return;
  }

  if (!isPublicAsset(urlPath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }

  if (urlPath === '/config.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(`window.CP_CONFIG = ${JSON.stringify(getRuntimeConfig(), null, 2)};\n`);
    return;
  }

  const filePath = path.join(__dirname, urlPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(__dirname, 'index.html'), (err2, data2) => {
          if (err2) {
            res.writeHead(404);
            res.end('Not found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data2);
          }
        });
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
