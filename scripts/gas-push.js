const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');

const root = path.resolve(__dirname, '..');

const envFile = path.join(root, '.env');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && k.trim() && !process.env[k.trim()]) {
      process.env[k.trim()] = v.join('=').trim();
    }
  });
}

const backendDir = path.join(root, 'backend');
const codePath = path.join(backendDir, 'code.gs');
const manifestPath = path.join(backendDir, 'appsscript.json');
const scriptId = (process.env.GAS_SCRIPT_ID || '').trim();

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!scriptId) fail('Missing GAS_SCRIPT_ID. Run gas:setup first.');
if (!fs.existsSync(codePath)) fail('Missing backend/code.gs. Nothing to push.');
if (!fs.existsSync(manifestPath)) fail('Missing backend/appsscript.json.');

function getClasprc() {
  const clasprcPath = path.join(os.homedir(), '.clasprc.json');
  if (!fs.existsSync(clasprcPath)) fail('No .clasprc.json found. Run: npm run gas:setup');
  return JSON.parse(fs.readFileSync(clasprcPath, 'utf8'));
}

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function refreshAccessToken(clasprc) {
  const { clientId, clientSecret } = clasprc.oauth2ClientSettings;
  const { refresh_token } = clasprc.token;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token,
    grant_type: 'refresh_token',
  }).toString();
  const res = await httpsRequest({
    hostname: 'oauth2.googleapis.com',
    path: '/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
    },
  }, body);
  if (!res.body.access_token) fail('Failed to refresh access token: ' + JSON.stringify(res.body));
  return res.body.access_token;
}

async function main() {
  const clasprc = getClasprc();
  const accessToken = await refreshAccessToken(clasprc);

  const files = [
    {
      name: 'appsscript',
      type: 'JSON',
      source: fs.readFileSync(manifestPath, 'utf8'),
    },
    {
      name: 'code',
      type: 'SERVER_JS',
      source: fs.readFileSync(codePath, 'utf8'),
    },
  ];

  console.log(`Pushing ${files.length} file(s) to script ID: ${scriptId}`);

  const body = JSON.stringify({ files });
  const res = await httpsRequest({
    hostname: 'script.googleapis.com',
    path: `/v1/projects/${scriptId}/content`,
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  }, body);

  if (res.status !== 200) {
    fail(`Push failed (${res.status}): ${JSON.stringify(res.body)}`);
  }

  console.log(`  ✅ appsscript.json`);
  console.log(`  ✅ code.gs`);
  console.log('Google Apps Script push completed.');
}

main().catch(e => { console.error(e.message); process.exit(1); });
