const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { withLock } = require('../utils/fileLock');
const DEDUP_PATH = path.join(__dirname, '..', 'models', 'dedup.json');

const WINDOW_MS = 5 * 60 * 1000;

function loadAll() {
  const raw = fs.readFileSync(DEDUP_PATH, 'utf-8');
  return JSON.parse(raw);
}

function saveAll(data) {
  fs.writeFileSync(DEDUP_PATH, JSON.stringify(data, null, 2));
}

function fingerprint(source, payload) {
  const body = JSON.stringify(payload);
  return crypto.createHash('sha256').update(source + body).digest('hex');
}

function checkAndRecord(apiKey, source, payload) {
  return withLock('dedup', () => {
    const all = loadAll();
    if (!all[apiKey]) all[apiKey] = [];

    const now = Date.now();
    all[apiKey] = all[apiKey].filter(entry => now - entry.seenAt < WINDOW_MS);

    const hash = fingerprint(source, payload);
    const existing = all[apiKey].find(entry => entry.hash === hash);

    if (existing) {
      saveAll(all);
      return { isDuplicate: true, firstSeenAt: new Date(existing.seenAt).toISOString() };
    }

    all[apiKey].push({ hash, seenAt: now });
    saveAll(all);
    return { isDuplicate: false };
  });
}

module.exports = { checkAndRecord };
