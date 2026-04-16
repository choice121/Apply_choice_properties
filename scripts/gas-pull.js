const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

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
const claspPath = path.join(root, '.clasp.json');
const scriptId = (process.env.GAS_SCRIPT_ID || '').trim();

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!scriptId) {
  fail('Missing GAS_SCRIPT_ID. Run gas:setup first or set GAS_SCRIPT_ID in your environment.');
}

if (!fs.existsSync(backendDir)) {
  fs.mkdirSync(backendDir, { recursive: true });
}

fs.writeFileSync(claspPath, JSON.stringify({ scriptId, rootDir: 'backend' }, null, 2) + '\n');
console.log(`Pulling from script ID: ${scriptId}`);

const result = spawnSync(
  path.join(root, 'node_modules', '.bin', 'clasp'),
  ['pull'],
  {
    cwd: root,
    stdio: 'inherit',
    env: process.env
  }
);

if (result.error) {
  fail(result.error.message);
}

if (result.status !== 0) {
  process.exit(result.status || 1);
}

console.log('Google Apps Script pull completed. Files synced to backend/');
