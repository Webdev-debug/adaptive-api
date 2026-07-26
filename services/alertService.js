const fs = require('fs');
const path = require('path');
const ALERTS_PATH = path.join(__dirname, '..', 'models', 'alerts.json');

function loadAll() {
  const raw = fs.readFileSync(ALERTS_PATH, 'utf-8');
  return JSON.parse(raw);
}

function saveAll(data) {
  fs.writeFileSync(ALERTS_PATH, JSON.stringify(data, null, 2));
}

function setAlertUrl(apiKey, url) {
  const all = loadAll();
  all[apiKey] = url;
  saveAll(all);
}

function getAlertUrl(apiKey) {
  const all = loadAll();
  return all[apiKey] || null;
}

async function sendAlert(apiKey, resource, field, expectedType, actualType) {
  const url = getAlertUrl(apiKey);
  if (!url) return { sent: false, reason: 'no alert URL configured' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alert: 'breaking_change_detected',
        resource,
        field,
        expectedType,
        actualType,
        timestamp: new Date().toISOString()
      }),
      signal: controller.signal
    });
    clearTimeout(timer);
    return { sent: true };
  } catch (e) {
    clearTimeout(timer);
    return { sent: false, reason: e.message };
  }
}

module.exports = { setAlertUrl, getAlertUrl, sendAlert };
