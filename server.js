// =============================================================================
// LOCAL PREVIEW SERVER — FOR DEVELOPMENT USE ONLY
// =============================================================================
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Load .env if present (written by gas:setup on fresh environments)
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && k.trim() && !process.env[k.trim()]) {
      process.env[k.trim()] = v.join('=').trim();
    }
  });
}

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
  'https://www.googleapis.com/auth/script.processes',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/logging.read',
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

const { execFile } = require('child_process');

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: { raw: data } }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function httpsPost(options, body) {
  return httpsRequest(options, body).then(r => r.body);
}

function httpsGet(url, accessToken) {
  const u = new URL(url);
  return httpsRequest({
    hostname: u.hostname,
    path: u.pathname + u.search,
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

function getClasprc() {
  const p = path.join(os.homedir(), '.clasprc.json');
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

async function getFreshAccessToken() {
  const clasprc = getClasprc();
  if (!clasprc) throw new Error('Not authenticated. Run gas:setup or visit /auth/login');
  const { token, oauth2ClientSettings } = clasprc;
  if (token.expiry_date > Date.now() + 60000) return token.access_token;
  const body = new URLSearchParams({
    client_id: oauth2ClientSettings.clientId,
    client_secret: oauth2ClientSettings.clientSecret,
    refresh_token: token.refresh_token,
    grant_type: 'refresh_token',
  }).toString();
  const result = await httpsPost({
    hostname: 'oauth2.googleapis.com',
    path: '/token',
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
  }, body);
  if (result.error) throw new Error(result.error_description || result.error);
  clasprc.token.access_token = result.access_token;
  clasprc.token.expiry_date = Date.now() + (result.expires_in || 3600) * 1000;
  fs.writeFileSync(path.join(os.homedir(), '.clasprc.json'), JSON.stringify(clasprc, null, 2));
  return result.access_token;
}

function runGasPush() {
  return new Promise((resolve) => {
    const scriptId = process.env.GAS_SCRIPT_ID || '';
    const env = { ...process.env, GAS_SCRIPT_ID: scriptId };
    execFile('node', [path.join(__dirname, 'scripts/gas-push.js')], { env }, (err, stdout, stderr) => {
      resolve({ success: !err, output: (stdout + stderr).trim() });
    });
  });
}

function handleGasDashboard(req, res) {
  const scriptId = process.env.GAS_SCRIPT_ID || '';
  const isAuth = !!getClasprc();
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Apps Script Dashboard</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f1117;color:#e0e0e0;min-height:100vh}
.header{background:#1a1d26;border-bottom:1px solid #2a2d3a;padding:16px 20px;display:flex;align-items:center;justify-content:space-between}
.header h1{font-size:18px;color:#fff;font-weight:600}
.header .sub{font-size:12px;color:#888;margin-top:2px}
.badge{font-size:11px;padding:3px 8px;border-radius:12px;font-weight:600}
.badge.ok{background:#1a3a1a;color:#4caf50}
.badge.warn{background:#3a1a1a;color:#f44336}
.content{padding:20px;max-width:900px;margin:0 auto}
.card{background:#1a1d26;border:1px solid #2a2d3a;border-radius:10px;margin-bottom:16px;overflow:hidden}
.card-header{padding:12px 16px;border-bottom:1px solid #2a2d3a;display:flex;align-items:center;justify-content:space-between}
.card-header h2{font-size:14px;color:#fff;font-weight:600}
.card-body{padding:16px}
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:6px;border:none;font-size:13px;font-weight:600;cursor:pointer;transition:opacity .2s}
.btn-primary{background:#1a73e8;color:#fff}
.btn-danger{background:#c62828;color:#fff}
.btn:hover{opacity:.85}
.btn:disabled{opacity:.4;cursor:default}
.process-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #2a2d3a;font-size:13px}
.process-row:last-child{border-bottom:none}
.status-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.s-ok{background:#4caf50}.s-fail{background:#f44336}.s-run{background:#ff9800}.s-cancel{background:#9e9e9e}
.fn-name{color:#90caf9;font-family:monospace;font-size:12px;min-width:160px}
.fn-time{color:#888;font-size:12px;margin-left:auto}
.fn-dur{color:#aaa;font-size:12px;width:60px;text-align:right}
.output-box{background:#0a0c12;border:1px solid #2a2d3a;border-radius:6px;padding:12px;font-family:monospace;font-size:12px;color:#a5d6a7;white-space:pre-wrap;max-height:200px;overflow-y:auto;margin-top:8px}
.output-box.err{color:#ef9a9a}
.empty{color:#555;font-size:13px;text-align:center;padding:24px}
#pushBtn{min-width:100px}
#pushOutput{display:none;margin-top:12px}
.scriptid{font-family:monospace;font-size:11px;color:#888;word-break:break-all}
a{color:#90caf9;text-decoration:none}
a:hover{text-decoration:underline}
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="header h1">Apps Script Dashboard</div>
    <div class="sub">Choice Properties Backend</div>
  </div>
  <span class="badge ${isAuth ? 'ok' : 'warn'}">${isAuth ? '&#x25CF; Connected' : '&#x25CF; Not connected'}</span>
</div>
<div class="content">

  <div class="card">
    <div class="card-header">
      <h2>Deploy Code</h2>
      <a href="https://script.google.com/d/${scriptId}/edit" target="_blank" style="font-size:12px;color:#90caf9">Open in Apps Script &rarr;</a>
    </div>
    <div class="card-body">
      <p class="scriptid">Script ID: ${scriptId || 'Not configured'}</p>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" id="pushBtn" onclick="pushCode()">&#x2191; Push backend/code.gs</button>
        <button class="btn" style="background:#2a2d3a;color:#ccc" onclick="loadProcesses()">&#x21bb; Refresh Logs</button>
      </div>
      <div id="pushOutput" class="output-box"></div>
    </div>
  </div>

  <div class="card">
    <div class="card-header"><h2>Deployments</h2></div>
    <div class="card-body" id="deployContainer">
      <div class="empty">Loading...</div>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <h2>Recent Executions</h2>
      <a href="/auth/login" style="font-size:12px;color:#ff9800" id="reauthLink" style="display:none">Re-authorize to enable &rarr;</a>
    </div>
    <div class="card-body" id="processContainer">
      <div class="empty">Loading...</div>
    </div>
  </div>

</div>
<script>
async function pushCode() {
  const btn = document.getElementById('pushBtn');
  const out = document.getElementById('pushOutput');
  btn.disabled = true;
  btn.textContent = 'Pushing...';
  out.style.display = 'block';
  out.className = 'output-box';
  out.textContent = 'Running push...';
  try {
    const r = await fetch('/gas/api/push', { method: 'POST' });
    const d = await r.json();
    out.textContent = d.output;
    out.className = 'output-box ' + (d.success ? '' : 'err');
    btn.innerHTML = d.success ? '&#x2713; Pushed!' : '&#x2717; Failed';
  } catch(e) {
    out.textContent = e.message;
    out.className = 'output-box err';
    btn.textContent = 'Error';
  }
  setTimeout(() => { btn.disabled = false; btn.innerHTML = '&#x2191; Push backend/code.gs'; }, 3000);
}

async function loadDeployments() {
  const c = document.getElementById('deployContainer');
  try {
    const r = await fetch('/gas/api/deployments');
    const d = await r.json();
    if (d.error) { c.innerHTML = '<div class="empty" style="color:#f44336">' + (typeof d.error === 'object' ? d.error.message : d.error) + '</div>'; return; }
    const deps = d.deployments || [];
    if (!deps.length) { c.innerHTML = '<div class="empty">No deployments found.</div>'; return; }
    c.innerHTML = deps.map(dep => {
      const desc = dep.deploymentConfig ? dep.deploymentConfig.description || 'Unnamed' : 'HEAD';
      const ver = dep.deploymentConfig ? ('v' + (dep.deploymentConfig.versionNumber || '—')) : 'Dev';
      const url = dep.entryPoints && dep.entryPoints[0] && dep.entryPoints[0].webApp ? dep.entryPoints[0].webApp.url : null;
      return '<div class="process-row"><span class="status-dot s-ok"></span><span class="fn-name">' + desc + '</span><span style="font-size:11px;color:#aaa">' + ver + '</span>' + (url ? '<a href="' + url + '" target="_blank" style="margin-left:auto;font-size:12px">Open &rarr;</a>' : '<span class="fn-time">—</span>') + '</div>';
    }).join('');
  } catch(e) {
    c.innerHTML = '<div class="empty" style="color:#f44336">' + e.message + '</div>';
  }
}

async function loadProcesses() {
  const container = document.getElementById('processContainer');
  container.innerHTML = '<div class="empty">Loading...</div>';
  try {
    const r = await fetch('/gas/api/processes');
    const d = await r.json();
    if (d.needsReauth) {
      document.getElementById('reauthLink').style.display = 'inline';
      container.innerHTML = '<div class="empty" style="color:#ff9800">Extra permission needed — tap <a href="/auth/login" style="color:#ff9800">Re-authorize</a> above to enable execution logs.</div>';
      return;
    }
    if (d.error) { container.innerHTML = '<div class="empty" style="color:#f44336">' + (typeof d.error === 'object' ? d.error.message : d.error) + '</div>'; return; }
    const procs = d.processes || [];
    if (!procs.length) { container.innerHTML = '<div class="empty">No executions found yet.</div>'; return; }
    container.innerHTML = procs.map(p => {
      const sc = p.processStatus === 'COMPLETED' ? 's-ok' : p.processStatus === 'FAILED' ? 's-fail' : p.processStatus === 'RUNNING' ? 's-run' : 's-cancel';
      const start = p.startTime ? new Date(p.startTime).toLocaleString() : '—';
      const dur = p.duration ? (parseFloat(p.duration) < 60 ? parseFloat(p.duration).toFixed(1) + 's' : Math.floor(parseFloat(p.duration)/60) + 'm') : '—';
      return '<div class="process-row"><span class="status-dot ' + sc + '"></span><span class="fn-name">' + (p.functionName || '(unknown)') + '</span><span style="font-size:11px;color:#666">' + (p.processType || '') + '</span><span class="fn-time">' + start + '</span><span class="fn-dur">' + dur + '</span></div>';
    }).join('');
  } catch(e) {
    container.innerHTML = '<div class="empty" style="color:#f44336">' + e.message + '</div>';
  }
}

loadDeployments();
loadProcesses();
</script>
</body></html>`);
}

async function handleGasApiProcesses(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  try {
    const token = await getFreshAccessToken();
    const scriptId = process.env.GAS_SCRIPT_ID || '';
    if (!scriptId) { res.end(JSON.stringify({ error: 'GAS_SCRIPT_ID not configured' })); return; }
    const result = await httpsGet(
      `https://script.googleapis.com/v1/processes:listScriptProcesses?scriptId=${scriptId}&pageSize=20`,
      token
    );
    if (result.body.error && result.body.error.code === 403) {
      res.end(JSON.stringify({ needsReauth: true, error: result.body.error.message }));
      return;
    }
    res.end(JSON.stringify(result.body));
  } catch (e) {
    res.end(JSON.stringify({ error: e.message }));
  }
}

async function handleGasApiDeployments(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  try {
    const token = await getFreshAccessToken();
    const scriptId = process.env.GAS_SCRIPT_ID || '';
    if (!scriptId) { res.end(JSON.stringify({ error: 'GAS_SCRIPT_ID not configured' })); return; }
    const result = await httpsGet(
      `https://script.googleapis.com/v1/projects/${scriptId}/deployments`,
      token
    );
    res.end(JSON.stringify(result.body));
  } catch (e) {
    res.end(JSON.stringify({ error: e.message }));
  }
}

async function handleGasApiPush(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  try {
    const result = await runGasPush();
    res.end(JSON.stringify(result));
  } catch (e) {
    res.end(JSON.stringify({ success: false, output: e.message }));
  }
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
  if (urlPath === '/gas') { handleGasDashboard(req, res); return; }
  if (urlPath === '/gas/api/processes') { await handleGasApiProcesses(req, res); return; }
  if (urlPath === '/gas/api/deployments') { await handleGasApiDeployments(req, res); return; }
  if (urlPath === '/gas/api/push' && req.method === 'POST') { await handleGasApiPush(req, res); return; }

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
