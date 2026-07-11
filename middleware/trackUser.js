const { logEvent } = require('../services/eventService');

function trackUser(req, res, next) {
  const body = req.body || {};
  const userId = body.userId || req.query.userId || req.params.userId || 'anonymous';
  const action = req.method + ' ' + req.path;
  logEvent(userId, action, body);
  next();
}

module.exports = trackUser;
