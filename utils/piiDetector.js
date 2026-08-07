function looksLikeEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function looksLikePhone(value) {
  return typeof value === 'string' && /^\+?[0-9][0-9\s\-]{7,14}[0-9]$/.test(value.trim());
}

function looksLikeCardNumber(value) {
  const digitsOnly = typeof value === 'string' ? value.replace(/\s|-/g, '') : String(value);
  return /^[0-9]{13,19}$/.test(digitsOnly);
}

function detectPII(body) {
  const findings = [];
  for (const field in body) {
    const value = body[field];
    if (looksLikeEmail(value)) {
      findings.push({ field, type: 'email' });
    } else if (looksLikeCardNumber(value)) {
      findings.push({ field, type: 'card_number' });
    } else if (looksLikePhone(value)) {
      findings.push({ field, type: 'phone' });
    }
  }
  return findings;
}

function maskValue(value, type) {
  if (type === 'email') {
    const [user, domain] = value.split('@');
    return user.slice(0, 2) + '***@' + domain;
  }
  if (type === 'phone') {
    return value.slice(0, 4) + '****' + value.slice(-2);
  }
  if (type === 'card_number') {
    return '**** **** **** ' + value.slice(-4);
  }
  return '***';
}

function redactPII(body, findings) {
  const redacted = Object.assign({}, body);
  findings.forEach(f => {
    redacted[f.field] = maskValue(String(body[f.field]), f.type);
  });
  return redacted;
}

module.exports = { detectPII, redactPII };
