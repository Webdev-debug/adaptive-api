const { isValidApiKey } = require('../services/authService');

function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || !isValidApiKey(key)) {
    return res.status(401).json({ error: 'Missing or invalid API key. Include it as the x-api-key header.' });
  }
  req.apiKey = key;
  next();
}

module.exports = requireApiKey;
