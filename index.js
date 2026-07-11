const express = require('express');
const validateAndAdapt = require('./middleware/validateAndAdapt');
const trackUser = require('./middleware/trackUser');
const { getEventsForUser } = require('./services/eventService');

const app = express();
app.use(express.json());
app.use(trackUser);
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send('API is alive');
});

app.post('/orders', validateAndAdapt('createOrder'), (req, res) => {
  res.json({ message: 'Order received', data: req.body });
});

app.get('/history/:userId', (req, res) => {
  const events = getEventsForUser(req.params.userId);
  res.json({ userId: req.params.userId, events });
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
