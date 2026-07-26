const { getSchema, updateSchema, createSchema, trackOccurrence, recordBreakingChange } = require('../services/schemaService');
const { sendAlert } = require('../services/alertService');

function validateAndAdapt(resource) {
  return (req, res, next) => {
    const apiKey = req.apiKey;
    let schema = getSchema(apiKey, resource);
    const body = req.body || {};

    if (!schema) {
      const initialFields = {};
      for (const field in body) {
        initialFields[field] = { type: typeof body[field] };
      }
      createSchema(apiKey, resource, initialFields);
      return next();
    }

    const errors = [];
    const newFields = {};
    const breakingChanges = [];

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
          errors.push(`Field ${field} expected ${expectedType}, got ${actualType}`);
          breakingChanges.push({ field, expectedType, actualType });
        }
      } else {
        newFields[field] = { type: typeof body[field] };
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

    trackOccurrence(apiKey, resource, Object.keys(body));

    next();
  };
}

module.exports = validateAndAdapt;
