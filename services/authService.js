const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const KEYS_PATH = path.join(__dirname, '..', 'models', 'apikeys.json');

function loadKeys() {
  const raw = fs.readFileSync(KEYS_PATH, 'utf-8');
  return JSON.parse(raw);
}

function saveKeys(keys) {
  fs.writeFileSync(KEYS_PATH, JSON.stringify(keys, null, 2));
}

function generateApiKey(name) {
  const key = 'dk_' + crypto.randomBytes(16).toString('hex');
  const keys = loadKeys();
  keys[key] = { name: name || 'unnamed', createdAt: new Date().toISOString() };
  saveKeys(keys);
  return key;
}

function isValidApiKey(key) {
  const keys = loadKeys();
  return Boolean(keys[key]);
}

module.exports = { generateApiKey, isValidApiKey };
