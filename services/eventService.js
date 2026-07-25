const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const EVENTS_PATH = path.join(__dirname, '..', 'models', 'events.json');

function loadEvents() {
  const raw = fs.readFileSync(EVENTS_PATH, 'utf-8');
  return JSON.parse(raw);
}

function saveEvents(events) {
  fs.writeFileSync(EVENTS_PATH, JSON.stringify(events, null, 2));
}

function logEvent(apiKey, userId, action, payload, source) {
  const events = loadEvents();
  const id = crypto.randomBytes(8).toString('hex');
  events.push({
    id,
    apiKey,
    userId,
    action,
    source: source || null,
    payload,
    timestamp: new Date().toISOString()
  });
  saveEvents(events);
  return id;
}

function getEventsForUser(apiKey, userId) {
  const events = loadEvents();
  return events.filter(e => e.apiKey === apiKey && e.userId === userId);
}

function getEventById(apiKey, eventId) {
  const events = loadEvents();
  return events.find(e => e.apiKey === apiKey && e.id === eventId) || null;
}

module.exports = { logEvent, getEventsForUser, getEventById };
