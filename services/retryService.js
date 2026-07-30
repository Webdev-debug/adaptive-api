const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { withLock } = require('../utils/fileLock');
const QUEUE_PATH = path.join(__dirname, '..', 'models', 'retryqueue.json');

const MAX_ATTEMPTS = 5;

function loadQueue() {
  const raw = fs.readFileSync(QUEUE_PATH, 'utf-8');
  return JSON.parse(raw);
}

function saveQueue(data) {
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(data, null, 2));
}

function enqueueRetry(apiKey, source, url, payload) {
  return withLock('retryqueue', () => {
    const queue = loadQueue();
    queue.push({
      id: crypto.randomBytes(6).toString('hex'),
      apiKey,
      source,
      url,
      payload,
      attempts: 0,
      nextAttemptAt: new Date(Date.now() + 5000).toISOString(),
      status: 'pending'
    });
    saveQueue(queue);
  });
}

function getQueueStatus(apiKey) {
  const queue = loadQueue();
  return queue.filter(item => item.apiKey === apiKey);
}

async function processQueue() {
  await withLock('retryqueue', async () => {
    const queue = loadQueue();
    const now = new Date();
    let changed = false;

    for (const item of queue) {
      if (item.status !== 'pending') continue;
      if (new Date(item.nextAttemptAt) > now) continue;

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(item.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload),
          signal: controller.signal
        });
        clearTimeout(timer);
        item.status = 'delivered';
        changed = true;
      } catch (e) {
        item.attempts += 1;
        changed = true;
        if (item.attempts >= MAX_ATTEMPTS) {
          item.status = 'failed';
        } else {
          const delaySeconds = Math.pow(2, item.attempts) * 5;
          item.nextAttemptAt = new Date(Date.now() + delaySeconds * 1000).toISOString();
        }
      }
    }

    if (changed) saveQueue(queue);
  });
}

module.exports = { enqueueRetry, getQueueStatus, processQueue };
