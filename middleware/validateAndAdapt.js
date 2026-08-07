const { getSchema, updateSchema, createSchema, trackOccurrence, recordBreakingChange, recordAnomaly } = require('../services/schemaService');
const { sendAlert } = require('../services/alertService');
const { detectPII } = require('../utils/piiDetector');

function tryCoerce(value, targetType) {
  if (targetType === 'number' && typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))) {
    return { coerced: true, value: Number(value) };
  }
  if (targetType === 'boolean' && typeof value === 'string' && (value === 'true' || value === 'false')) {
    return { coerced: true, value: value === 'true' };
  }
  if (targetType === 'string' && (typeof value === 'number' || typeof value === 'boolean')) {
    return { coerced: true, value: String(value) };
  }
  return { coerced: false };
}

function validateAndAdapt(resource) {
  return async (req, res, next) => {
    const apiKey = req.apiKey;
    let schema = getSchema(apiKey, resource);
    const body = req.body || {};

    req.driftlessPII = detectPII(body);

    if (!schema) {
      const initialFields = {};
      for (const field in body) {
        initialFields[field] = { type: typeof body[field], value: body[field] };
      }
      createSchema(apiKey, resource, initialFields);
      return next();
    }

    const errors = [];
    const newFields = {};
    const breakingChanges = [];
    const coercions = [];

    for (const field in schema.fields) {
      const rule = schema.fields[field];
      if (rule.required && !(field in body)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    for (const field in body) {
      if (schema.fields[field]) {
        const expectedType = schema.fields[field].type;
        const actualType = typeof body[field];
        if (actualType !== expectedType) {
          const attempt = tryCoerce(body[field], expectedType);
          if (attempt.coerced) {
            body[field] = attempt.value;
            coercions.push({ field, from: actualType, to: expectedType });
          } else {
            errors.push(`Field ${field} expected ${expectedType}, got ${actualType}`);
            breakingChanges.push({ field, expectedType, actualType });
          }
        }
      } else {
        newFields[field] = { type: typeof body[field], value: body[field] };
      }
    }

    if (errors.length > 0) {
      breakingChanges.forEach(bc => {
        recordBreakingChange(apiKey, resource, bc.field, bc.expectedType, bc.actualType);
        sendAlert(apiKey, resource, bc.field, bc.expectedType, bc.actualType);
      });
      return res.status(400).json({ errors, breakingChangeDetected: breakingChanges.length > 0 });
    }

    if (Object.keys(newFields).length > 0) {
      updateSchema(apiKey, resource, newFields);
    }

    const anomalies = await trackOccurrence(apiKey, resource, body);
    if (anomalies && anomalies.length > 0) {
      anomalies.forEach(a => {
        recordAnomaly(apiKey, resource, a.field, a.value, a.expectedRange);
      });
    }

    req.driftlessAnomalies = anomalies || [];
    req.driftlessCoercions = coercions;
    req.body = body;
    next();
  };
}

module.exports = validateAndAdapt;
