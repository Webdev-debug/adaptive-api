const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getSigningSecret } = require('./authService');
const { enqueueRetry } = require('./retryService');
const FORWARDS_PATH = path.join(__dirname, '..', 'models', 'forwards.json');

function loadAll() {
  const raw = fs.readFileSync(FORWARDS_PATH, 'utf-8');
  return JSON.parse(raw);
}

function saveAll(data) {
  fs.writeFileSync(FORWARDS_PATH, JSON.stringify(data, null, 2));
}

function setForwardUrl(apiKey, source, url) {
  const all = loadAll();
  if (!all[apiKey]) all[apiKey] = {};
  all[apiKey][source] = url;
  saveAll(all);
}

function getForwardUrl(apiKey, source) {
  const all = loadAll();
  if (!all[apiKey]) return null;
  return all[apiKey][source] || null;
}

function getAllForwardUrls(apiKey) {
  const all = loadAll();
  return all[apiKey] || {};
}

function signPayload(secret, payload) {
  const body = JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

async function forwardEvent(apiKey, source, payload) {
  const url = getForwardUrl(apiKey, source);
  if (!url) {
    return { forwarded: false, reason: 'no forward URL configured' };
  }
  const secret = getSigningSecret(apiKey);
  const signature = secret ? signPayload(secret, payload) : null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-driftless-signature': signature || ''
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timer);
    return { forwarded: true, status: res.status, signed: Boolean(signature) };
  } catch (e) {
    clearTimeout(timer);
    await enqueueRetry(apiKey, source, url, payload);
    return { forwarded: false, reason: e.message, queuedForRetry: true };
  }
}

module.exports = { setForwardUrl, getForwardUrl, getAllForwardUrls, forwardEvent };
