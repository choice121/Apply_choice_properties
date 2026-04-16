#!/bin/bash
set -e

echo "=== Installing dependencies ==="
npm install --legacy-peer-deps

echo "=== Running GAS setup ==="
if [ -z "$GAS_SETUP_PASSWORD" ]; then
  echo "WARNING: GAS_SETUP_PASSWORD secret not set — skipping clasp setup."
  echo "Set the GAS_SETUP_PASSWORD secret to enable automatic clasp authentication."
else
  node scripts/gas-setup.js "$GAS_SETUP_PASSWORD"
fi

echo "=== Setup complete ==="
