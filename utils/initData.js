const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'models');
const defaults = {
  'schemas.json': '{}', 'schemahistory.json': '{}', 'breakingchanges.json': '{}',
  'valueanomalies.json': '{}', 'apikeys.json': '{}', 'forwards.json': '{}',
  'alerts.json': '{}', 'dedup.json': '{}', 'events.json': '[]', 'retryqueue.json': '[]',
  'users.json': '{}', 'sessions.json': '{}'
};
function initData() {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  for (const name in defaults) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) fs.writeFileSync(file, defaults[name]);
  }
}
module.exports = { initData };
