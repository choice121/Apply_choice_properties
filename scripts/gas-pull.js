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
const scriptId = (process.env.GAS_SCRIPT_ID || '').trim();

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!scriptId) {
  fail('Missing GAS_SCRIPT_ID. Run gas:setup first or set GAS_SCRIPT_ID in your environment.');
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

function getClasprc() {
  const clasprcPath = path.join(os.homedir(), '.clasprc.json');
  if (!fs.existsSync(clasprcPath)) fail('No .clasprc.json found. Run: npm run gas:setup');
  return JSON.parse(fs.readFileSync(clasprcPath, 'utf8'));
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
  if (!res.body.access_token) {
    fail('Failed to refresh access token: ' + JSON.stringify(res.body));
  }
  return res.body.access_token;
}

const EXT_MAP = {
  SERVER_JS: '.gs',
  HTML: '.html',
  JSON: '.json',
};

async function main() {
  const clasprc = getClasprc();
  console.log(`Pulling from script ID: ${scriptId}`);

  const accessToken = await refreshAccessToken(clasprc);

  const res = await httpsRequest({
    hostname: 'script.googleapis.com',
    path: `/v1/projects/${scriptId}/content`,
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status !== 200) {
    fail(`API error ${res.status}: ${JSON.stringify(res.body)}`);
  }

  const files = res.body.files || [];
  if (files.length === 0) fail('No files returned from Apps Script project.');

  if (!fs.existsSync(backendDir)) {
    fs.mkdirSync(backendDir, { recursive: true });
  }

  console.log(`- Pulling ${files.length} file(s) into backend/`);
  for (const file of files) {
    const ext = EXT_MAP[file.type] || '.gs';
    const filename = file.name + ext;
    const filePath = path.join(backendDir, filename);
    fs.writeFileSync(filePath, file.source || '');
    console.log(`  ✅ ${filename}`);
  }

  console.log('Google Apps Script pull completed. Files synced to backend/');
}

main().catch(e => { console.error(e.message); process.exit(1); });
