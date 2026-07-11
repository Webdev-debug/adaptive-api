const fs = require('fs');
const path = require('path');
const EVENTS_PATH = path.join(__dirname, '..', 'models', 'events.json');

function loadEvents() {
  const raw = fs.readFileSync(EVENTS_PATH, 'utf-8');
  return JSON.parse(raw);
}

function saveEvents(events) {
  fs.writeFileSync(EVENTS_PATH, JSON.stringify(events, null, 2));
}

function logEvent(userId, action, payload) {
  const events = loadEvents();
  events.push({
    userId,
    action,
    payload,
    timestamp: new Date().toISOString()
  });
  saveEvents(events);
}

function getEventsForUser(userId) {
  const events = loadEvents();
  return events.filter(e => e.userId === userId);
}

module.exports = { logEvent, getEventsForUser };
