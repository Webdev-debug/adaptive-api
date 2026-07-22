const express = require('express');
const rateLimit = require('express-rate-limit');
const validateAndAdapt = require('./middleware/validateAndAdapt');
const trackUser = require('./middleware/trackUser');
const requireApiKey = require('./middleware/requireApiKey');
const { getEventsForUser } = require('./services/eventService');
const { getSchema, getSchemaHistory } = require('./services/schemaService');
const { generateApiKey } = require('./services/authService');
const { setForwardUrl, forwardEvent } = require('./services/forwardService');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many signups from this IP. Try again later.' }
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests. Slow down and try again in a minute.' }
});

app.post('/signup', signupLimiter, (req, res) => {
  const name = (req.body && req.body.name) || 'unnamed';
  const key = generateApiKey(name);
  res.json({ apiKey: key });
});

app.post('/configure/:source', requireApiKey, (req, res) => {
  const url = req.body && req.body.url;
  if (!url) {
    return res.status(400).json({ error: 'Provide a url in the request body' });
  }
  setForwardUrl(req.apiKey, req.params.source, url);
  res.json({ message: 'Forward URL saved', source: req.params.source, url });
});

app.post('/webhook/:source', webhookLimiter, requireApiKey, trackUser, (req, res, next) => {
  validateAndAdapt(req.params.source)(req, res, next);
}, async (req, res) => {
  const forwardResult = await forwardEvent(req.apiKey, req.params.source, req.body);
  res.json({ message: 'Event received', source: req.params.source, data: req.body, forward: forwardResult });
});

app.post('/orders', webhookLimiter, requireApiKey, trackUser, validateAndAdapt('createOrder'), (req, res) => {
  res.json({ message: 'Order received', data: req.body });
});

app.get('/history/:userId', requireApiKey, (req, res) => {
  const events = getEventsForUser(req.apiKey, req.params.userId);
  res.json({ userId: req.params.userId, events });
});

app.get('/schema/:resource', requireApiKey, (req, res) => {
  const schema = getSchema(req.apiKey, req.params.resource);
  if (!schema) {
    return res.status(404).json({ error: 'Resource not found' });
  }
  res.json(schema);
});

app.get('/schema/:resource/history', requireApiKey, (req, res) => {
  const history = getSchemaHistory(req.apiKey, req.params.resource);
  res.json({ resource: req.params.resource, history });
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
