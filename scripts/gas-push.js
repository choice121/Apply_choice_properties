const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const backendDir = path.join(root, 'backend');
const codePath = path.join(backendDir, 'code.gs');
const manifestPath = path.join(backendDir, 'appsscript.json');
const claspPath = path.join(root, '.clasp.json');
const scriptId = (process.env.GAS_SCRIPT_ID || '').trim();

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!scriptId) {
  fail('Missing GAS_SCRIPT_ID. Run: GAS_SCRIPT_ID="your-script-id" npm run gas:push');
}

if (!fs.existsSync(codePath)) {
  fail('Missing backend/code.gs. Nothing to push.');
}

if (!fs.existsSync(manifestPath)) {
  fail('Missing backend/appsscript.json.');
}

fs.writeFileSync(claspPath, JSON.stringify({ scriptId, rootDir: 'backend' }, null, 2) + '\n');

const result = spawnSync(path.join(root, 'node_modules', '.bin', 'clasp'), ['push', '--force'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env
});

if (result.error) {
  fail(result.error.message);
}

if (result.status !== 0) {
  process.exit(result.status || 1);
}

console.log('Google Apps Script push completed.');
