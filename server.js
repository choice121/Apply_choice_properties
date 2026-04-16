// =============================================================================
// LOCAL PREVIEW SERVER — FOR DEVELOPMENT USE ONLY
// =============================================================================
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 5000;
const HOST = '0.0.0.0';

const REPLIT_DOMAIN = process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
const REDIRECT_URI = `https://${REPLIT_DOMAIN}/auth/callback`;

const OAUTH_CLIENT_ID = process.env.GAS_OAUTH_CLIENT_ID || '';
const OAUTH_CLIENT_SECRET = process.env.GAS_OAUTH_CLIENT_SECRET || '';

const CLASP_SCOPES = [
  'https://www.googleapis.com/auth/script.projects',
  'https://www.googleapis.com/auth/script.deployments',
  'https://www.googleapis.com/auth/script.webapp.deploy',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

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

function httpsPost(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function saveClaspCredentials(tokens) {
  const clasprc = {
    token: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope || CLASP_SCOPES,
      token_type: tokens.token_type || 'Bearer',
      expiry_date: Date.now() + (tokens.expires_in || 3600) * 1000,
    },
    oauth2ClientSettings: {
      clientId: OAUTH_CLIENT_ID,
      clientSecret: OAUTH_CLIENT_SECRET,
      redirectUri: REDIRECT_URI,
    },
    isLocalCreds: false,
  };
  const clasprcPath = path.join(os.homedir(), '.clasprc.json');
  fs.writeFileSync(clasprcPath, JSON.stringify(clasprc, null, 2));
  return clasprcPath;
}

function handleAuthLogin(req, res) {
  if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Setup Required</title>
<style>body{font-family:sans-serif;max-width:500px;margin:40px auto;padding:20px;background:#f5f5f5}
.card{background:#fff;border-radius:12px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,.1)}
h2{color:#d32f2f}code{background:#f0f0f0;padding:2px 6px;border-radius:4px;font-size:.85em;word-break:break-all}
.step{margin:16px 0;padding:12px;background:#e8f5e9;border-radius:8px}
a.btn{display:block;margin:20px 0;padding:14px;background:#1a73e8;color:#fff;text-align:center;border-radius:8px;text-decoration:none;font-weight:bold}</style>
</head>
<body><div class="card">
<h2>One-time setup needed</h2>
<p>You need to create a Google OAuth client. Takes about 2 minutes:</p>
<div class="step"><strong>Step 1:</strong> Open this link:<br>
<a href="https://console.cloud.google.com/apis/credentials/oauthclient" target="_blank" style="color:#1a73e8">Google Cloud Console →</a></div>
<div class="step"><strong>Step 2:</strong> Select <strong>Web application</strong></div>
<div class="step"><strong>Step 3:</strong> Under "Authorized redirect URIs" add exactly:<br>
<code>${REDIRECT_URI}</code></div>
<div class="step"><strong>Step 4:</strong> Click Create, then copy the <strong>Client ID</strong> and <strong>Client Secret</strong></div>
<div class="step"><strong>Step 5:</strong> Paste both back in the Replit chat and I'll finish the setup automatically</div>
</div></body></html>`);
    return;
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(OAUTH_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(CLASP_SCOPES)}` +
    `&access_type=offline` +
    `&prompt=consent`;

  res.writeHead(302, { Location: authUrl });
  res.end();
}

async function handleAuthCallback(req, res) {
  const urlObj = new URL(`https://example.com${req.url}`);
  const code = urlObj.searchParams.get('code');
  const error = urlObj.searchParams.get('error');

  if (error || !code) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<html><body><h2 style="color:red">Auth failed: ${error || 'no code'}</h2></body></html>`);
    return;
  }

  try {
    const body = new URLSearchParams({
      code,
      client_id: OAUTH_CLIENT_ID,
      client_secret: OAUTH_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }).toString();

    const tokens = await httpsPost({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    }, body);

    if (tokens.error) throw new Error(tokens.error_description || tokens.error);

    const savedPath = saveClaspCredentials(tokens);
    console.log(`✅ Clasp credentials saved to ${savedPath}`);

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connected!</title>
<style>body{font-family:sans-serif;max-width:400px;margin:60px auto;padding:20px;text-align:center}
.card{background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.1)}
.check{font-size:64px}.title{color:#1e7e34;font-size:24px;margin:16px 0}p{color:#555}</style>
</head>
<body><div class="card">
<div class="check">&#x2705;</div>
<div class="title">Connected!</div>
<p>Google account linked successfully. Go back to Replit chat — I can now push code to your Apps Script automatically.</p>
</div></body></html>`);
  } catch (err) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<html><body style="font-family:sans-serif;padding:20px"><h2 style="color:red">Error</h2><p>${err.message}</p></body></html>`);
  }
}

const server = http.createServer(async (req, res) => {
  let urlPath = req.url.split('?')[0];

  if (urlPath === '/auth/login') { handleAuthLogin(req, res); return; }
  if (urlPath === '/auth/callback') { await handleAuthCallback(req, res); return; }

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
          if (err2) { res.writeHead(404); res.end('Not found'); }
          else { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(data2); }
        });
      } else { res.writeHead(500); res.end('Server error'); }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
