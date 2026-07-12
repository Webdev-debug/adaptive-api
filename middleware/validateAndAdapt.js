const { getSchema, updateSchema, createSchema } = require('../services/schemaService');

function validateAndAdapt(resource) {
  return (req, res, next) => {
    let schema = getSchema(resource);
    const body = req.body || {};

    if (!schema) {
      const initialFields = {};
      for (const field in body) {
        initialFields[field] = { type: typeof body[field], required: false };
      }
      createSchema(resource, initialFields);
      schema = getSchema(resource);
      return next();
    }

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
    }

    next();
  };
}

module.exports = validateAndAdapt;
