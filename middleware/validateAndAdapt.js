const { getSchema, updateSchema } = require('../services/schemaService');

function validateAndAdapt(resource) {
  return (req, res, next) => {
    const schema = getSchema(resource);
    if (!schema) {
      return res.status(500).json({ error: `No schema found for ${resource}` });
    }

    const body = req.body;
    const errors = [];
    const newFields = {};

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
        }
      } else {
        newFields[field] = { type: typeof body[field], required: false };
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    if (Object.keys(newFields).length > 0) {
      updateSchema(resource, newFields);
      console.log(`Schema for ${resource} updated with new fields:`, newFields);
    }

    next();
  };
}

module.exports = validateAndAdapt;
