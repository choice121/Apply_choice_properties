// =============================================================================
// gas-setup.js — Decrypt credentials and set up GAS environment
// Usage: node scripts/gas-setup.js <password>
// Run this once on any new Replit after importing from GitHub.
// =============================================================================
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const CREDS_FILE = path.join(__dirname, '..', 'credentials.enc');
const CLASPRC = path.join(os.homedir(), '.clasprc.json');
const ENV_FILE = path.join(__dirname, '..', '.env');

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

  const clasprc = {
    token: payload.token,
    oauth2ClientSettings: {
      clientId: payload.oauth2ClientSettings.clientId,
      clientSecret: payload.oauth2ClientSettings.clientSecret,
      redirectUri,
    },
    isLocalCreds: false,
  };

  fs.writeFileSync(CLASPRC, JSON.stringify(clasprc, null, 2));
  console.log('✅ ~/.clasprc.json written');

  writeEnvFile({
    GAS_SCRIPT_ID: payload.scriptId,
    GAS_OAUTH_CLIENT_ID: payload.oauth2ClientSettings.clientId,
    GAS_OAUTH_CLIENT_SECRET: payload.oauth2ClientSettings.clientSecret,
  });
  console.log('✅ .env file written');

  console.log('\n🎉 Setup complete! You can now run: npm run gas:push');
  console.log(`\n⚠️  Note: On a new Replit, add this redirect URI to your Google OAuth client:`);
  console.log(`   ${redirectUri}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
