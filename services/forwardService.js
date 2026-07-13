const fs = require('fs');
const path = require('path');
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

async function forwardEvent(apiKey, source, payload) {
  const url = getForwardUrl(apiKey, source);
  if (!url) {
    return { forwarded: false, reason: 'no forward URL configured' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timer);
    return { forwarded: true, status: res.status };
  } catch (e) {
    clearTimeout(timer);
    return { forwarded: false, reason: e.message };
  }
}

module.exports = { setForwardUrl, getForwardUrl, forwardEvent };
