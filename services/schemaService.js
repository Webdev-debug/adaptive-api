const fs = require('fs');
const path = require('path');
const SCHEMA_PATH = path.join(__dirname, '..', 'models', 'schemas.json');

function loadAllSchemas() {
  const raw = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function saveAllSchemas(schemas) {
  fs.writeFileSync(SCHEMA_PATH, JSON.stringify(schemas, null, 2));
}

function getSchema(resource) {
  const schemas = loadAllSchemas();
  return schemas[resource] || null;
}

function updateSchema(resource, newFields) {
  const schemas = loadAllSchemas();
  const current = schemas[resource];
  current.version += 1;
  Object.assign(current.fields, newFields);
  schemas[resource] = current;
  saveAllSchemas(schemas);
}

module.exports = { getSchema, updateSchema };
