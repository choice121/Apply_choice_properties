// =============================================================================
// gas-setup.js — Decrypt credentials and set up GAS environment
// Usage: node scripts/gas-setup.js [password]
// Run this once on any new Replit after pulling from GitHub.
// =============================================================================
const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const path = require('path');
const os = require('os');
const readline = require('readline');

const CREDS_FILE = path.join(__dirname, '..', 'credentials.enc');
const CLASPRC = path.join(os.homedir(), '.clasprc.json');
const ENV_FILE = path.join(__dirname, '..', '.env');
const CLIENT_ID = '13445296763-p6rrutohf9j3qc25n7io5c2elh5vo6hr.apps.googleusercontent.com';
const GCP_PROJECT = '13445296763';

function decrypt(encryptedJson, password) {
  const { salt, iv, tag, data } = JSON.parse(encryptedJson);
  const key = crypto.scryptSync(password, Buffer.from(salt, 'hex'), 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  try {
    const decrypted = Buffer.concat([decipher.update(Buffer.from(data, 'hex')), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    throw new Error('Wrong password or corrupted file');
  }
}

async function askPassword() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question('Enter password to unlock credentials: ', ans => { rl.close(); resolve(ans.trim()); }));
}

function writeEnvFile(vars) {
  const existing = fs.existsSync(ENV_FILE)
    ? fs.readFileSync(ENV_FILE, 'utf8').split('\n').filter(l => l.trim() && !l.startsWith('#'))
    : [];
  const existingMap = {};
  existing.forEach(line => {
    const [k, ...v] = line.split('=');
    if (k) existingMap[k.trim()] = v.join('=').trim();
  });
  Object.assign(existingMap, vars);
  const content = Object.entries(existingMap).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
  fs.writeFileSync(ENV_FILE, content);
}

function httpsPost(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = typeof body === 'string' ? body : new URLSearchParams(body).toString();
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(payload) },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); } });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function httpsGet(url, accessToken) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); } });
    });
    req.on('error', reject);
    req.end();
  });
}

async function refreshAccessToken(token, clientId, clientSecret) {
  const result = await httpsPost('https://oauth2.googleapis.com/token', {
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: token.refresh_token,
    grant_type: 'refresh_token',
  });
  if (result.error) throw new Error(`Token refresh failed: ${result.error_description || result.error}`);
  return result.access_token;
}

async function tryAutoAddRedirectUri(accessToken, redirectUri) {
  // Attempt to add redirect URI to the OAuth client via Cloud API
  // Requires cloud-platform scope — may not succeed, but we try
  return new Promise((resolve) => {
    const url = `https://oauth2.googleapis.com/v2/projects/${GCP_PROJECT}/clients/${CLIENT_ID}`;
    const body = JSON.stringify({ redirectUris: [redirectUri] });
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, path: u.pathname, method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          resolve(!j.error);
        } catch { resolve(false); }
      });
    });
    req.on('error', () => resolve(false));
    req.write(body);
    req.end();
  });
}

function consoleLink(redirectUri) {
  return `https://console.cloud.google.com/apis/credentials/oauthclient/${CLIENT_ID}?project=${GCP_PROJECT}`;
}

async function main() {
  if (!fs.existsSync(CREDS_FILE)) {
    console.error('credentials.enc not found. Make sure you pulled the latest repo.');
    process.exit(1);
  }

  const password = process.argv[2] || await askPassword();
  if (!password) { console.error('Password required'); process.exit(1); }

  let payload;
  try {
    const encrypted = fs.readFileSync(CREDS_FILE, 'utf8');
    payload = JSON.parse(decrypt(encrypted, password));
  } catch (e) {
    console.error('❌ ' + e.message);
    process.exit(1);
  }

  const replitDomain = process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
  const redirectUri = `https://${replitDomain}/auth/callback`;

  // Validate token and get fresh access token before writing clasprc
  console.log('\n🔍 Validating credentials...');
  let accessToken;
  let tokenValid = false;
  try {
    accessToken = await refreshAccessToken(
      payload.token,
      payload.oauth2ClientSettings.clientId,
      payload.oauth2ClientSettings.clientSecret
    );
    const me = await httpsGet('https://www.googleapis.com/oauth2/v2/userinfo', accessToken);
    if (me.email) {
      console.log(`✅ Credentials valid — logged in as ${me.email}`);
      tokenValid = true;
    } else {
      throw new Error('Unexpected response from userinfo endpoint');
    }
  } catch (e) {
    console.log(`⚠️  Token check failed: ${e.message}`);
  }

  // Write ~/.clasprc.json with fresh access token and isLocalCreds: true
  // so clasp uses the custom OAuth client (not the built-in clasp client)
  const freshToken = Object.assign({}, payload.token);
  if (accessToken) freshToken.access_token = accessToken;
  const clasprc = {
    token: freshToken,
    oauth2ClientSettings: {
      clientId: payload.oauth2ClientSettings.clientId,
      clientSecret: payload.oauth2ClientSettings.clientSecret,
      redirectUri,
    },
    isLocalCreds: true,
  };
  fs.writeFileSync(CLASPRC, JSON.stringify(clasprc, null, 2));
  console.log('✅ ~/.clasprc.json written');

  // Write .env
  writeEnvFile({
    GAS_SCRIPT_ID: payload.scriptId,
    GAS_OAUTH_CLIENT_ID: payload.oauth2ClientSettings.clientId,
    GAS_OAUTH_CLIENT_SECRET: payload.oauth2ClientSettings.clientSecret,
  });
  console.log('✅ .env written');

  if (tokenValid) {
    // Try to auto-register the redirect URI for this domain
    console.log('\n🌐 Registering redirect URI for this Replit domain...');
    const autoAdded = await tryAutoAddRedirectUri(accessToken, redirectUri);
    if (autoAdded) {
      console.log(`✅ Redirect URI auto-registered: ${redirectUri}`);
    } else {
      // Can't auto-add — show a helpful link (only needed if token gets revoked)
      console.log(`ℹ️  Could not auto-register redirect URI (requires Cloud admin scope).`);
      console.log(`   This only matters if your token is revoked and you need to re-authenticate.`);
      console.log(`   If that happens, add this redirect URI in Google Cloud Console:`);
      console.log(`   URI:  ${redirectUri}`);
      console.log(`   Link: ${consoleLink(redirectUri)}`);
    }

    console.log('\n🎉 Setup complete! You can now:');
    console.log('   npm run gas:pull   — pull latest code.gs from Apps Script');
    console.log('   npm run gas:push   — push code.gs to Apps Script');
    console.log('   npm run dev        — start the dashboard at /gas');
  } else {
    console.log('\n⚠️  Your credentials need to be refreshed. To re-authenticate:');
    console.log(`\n   1. Add this redirect URI to Google Cloud Console:`);
    console.log(`      URI:  ${redirectUri}`);
    console.log(`      Link: ${consoleLink(redirectUri)}`);
    console.log(`\n   2. Start the server: npm run dev`);
    console.log(`   3. Visit: https://${replitDomain}/auth/login`);
    console.log(`   4. Complete sign-in, then run: npm run gas:encrypt`);
    console.log(`      to save the new credentials for next time.\n`);
    process.exit(1);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
