const express = require('express');
const validateAndAdapt = require('./middleware/validateAndAdapt');
const trackUser = require('./middleware/trackUser');
const { getEventsForUser } = require('./services/eventService');
const { getSchema } = require('./services/schemaService');

const app = express();
app.use(express.json());
app.use(trackUser);
app.use(express.static('public'));

app.post('/webhook/:source', (req, res, next) => {
  validateAndAdapt(req.params.source)(req, res, next);
}, (req, res) => {
  res.json({ message: 'Event received', source: req.params.source, data: req.body });
});

app.post('/orders', validateAndAdapt('createOrder'), (req, res) => {
  res.json({ message: 'Order received', data: req.body });
});

app.get('/history/:userId', (req, res) => {
  const events = getEventsForUser(req.params.userId);
  res.json({ userId: req.params.userId, events });
});

app.get('/schema/:resource', (req, res) => {
  const schema = getSchema(req.params.resource);
  if (!schema) {
    return res.status(404).json({ error: 'Resource not found' });
  }
  res.json(schema);
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
