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
  const secret = 'wsec_' + crypto.randomBytes(24).toString('hex');
  const keys = loadKeys();
  keys[key] = { name: name || 'unnamed', secret, createdAt: new Date().toISOString(), revoked: false };
  saveKeys(keys);
  return { key, secret };
}

function isValidApiKey(key) {
  const keys = loadKeys();
  return Boolean(keys[key]) && !keys[key].revoked;
}

function getSigningSecret(apiKey) {
  const keys = loadKeys();
  const account = keys[apiKey];
  return account ? account.secret : null;
}

function revokeKey(apiKey) {
  const keys = loadKeys();
  if (!keys[apiKey]) return false;
  keys[apiKey].revoked = true;
  saveKeys(keys);
  return true;
}

function getKeyInfo(apiKey) {
  const keys = loadKeys();
  const account = keys[apiKey];
  if (!account) return null;
  return { name: account.name, createdAt: account.createdAt, revoked: account.revoked || false };
}

module.exports = { generateApiKey, isValidApiKey, getSigningSecret, revokeKey, getKeyInfo };
