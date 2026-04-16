// =============================================================================
// gas-encrypt.js — Encrypt GAS credentials for safe storage in the repo
// Usage: node scripts/gas-encrypt.js <password>
// =============================================================================
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const CREDS_FILE = path.join(__dirname, '..', 'credentials.enc');
const CLASPRC = path.join(os.homedir(), '.clasprc.json');

function encrypt(plaintext, password) {
  const salt = crypto.randomBytes(32);
  const key = crypto.scryptSync(password, salt, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    data: encrypted.toString('hex'),
  });
}

async function askPassword() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question('Enter encryption password: ', ans => { rl.close(); resolve(ans.trim()); }));
}

async function main() {
  const password = process.argv[2] || await askPassword();
  if (!password) { console.error('Password required'); process.exit(1); }

  if (!fs.existsSync(CLASPRC)) { console.error('~/.clasprc.json not found. Run auth first.'); process.exit(1); }

  const clasprc = JSON.parse(fs.readFileSync(CLASPRC, 'utf8'));
  const scriptId = process.env.GAS_SCRIPT_ID || '';
  if (!scriptId) { console.error('GAS_SCRIPT_ID env var not set'); process.exit(1); }

  const payload = {
    token: clasprc.token,
    oauth2ClientSettings: {
      clientId: clasprc.oauth2ClientSettings.clientId,
      clientSecret: clasprc.oauth2ClientSettings.clientSecret,
    },
    scriptId,
  };

  const encrypted = encrypt(JSON.stringify(payload), password);
  fs.writeFileSync(CREDS_FILE, encrypted);
  console.log('✅ Credentials encrypted and saved to credentials.enc');
  console.log('   Commit credentials.enc to your repo — it is safe to share.');
}

main().catch(e => { console.error(e.message); process.exit(1); });
