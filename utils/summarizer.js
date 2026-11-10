const CURRENCY_SYMBOLS = { USD: '$', NGN: '₦', EUR: '€', GBP: '£' };

function safeActor(value) {
  const text = String(value);
  if (text.includes('@')) {
    const [user, domain] = text.split('@');
    return user.slice(0, 2) + '***@' + domain;
  }
  return text;
}

function summarize(source, payload) {
  const body = payload || {};
  const actor = safeActor(body.customerName || body.name || body.userId || 'Someone');
  const eventType = body.eventType || body.event || body.status || null;
  const amount = body.amount !== undefined ? body.amount : body.total;
  const items = body.items || body.product || null;
  const symbol = CURRENCY_SYMBOLS[body.currency] || (body.currency ? body.currency + ' ' : '');

  const parts = [];
  if (eventType) {
    parts.push(actor + ': ' + eventType);
  } else if (amount !== undefined && items) {
    parts.push(actor + ' placed an order');
  } else {
    parts.push(actor + ' sent an event');
  }

  if (amount !== undefined && typeof amount === 'number') {
    parts.push('for ' + symbol + amount.toFixed(2));
  }
  if (items) {
    parts.push('(' + items + ')');
  }

  return parts.join(' ') + ' via ' + source;
}

module.exports = { summarize };
