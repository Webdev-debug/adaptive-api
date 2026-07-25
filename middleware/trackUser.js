const { logEvent } = require('../services/eventService');

function trackUser(req, res, next) {
  const body = req.body || {};
  const userId = body.userId || req.query.userId || req.params.userId || 'anonymous';
  const action = req.method + ' ' + req.path;
  const source = req.params.source || null;
  if (req.apiKey) {
    req.driftlessEventId = logEvent(req.apiKey, userId, action, body, source);
  }
  next();
}

module.exports = trackUser;
