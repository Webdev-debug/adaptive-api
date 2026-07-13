const fs = require('fs');
const path = require('path');
const SCHEMA_PATH = path.join(__dirname, '..', 'models', 'schemas.json');

function loadAll() {
  const raw = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function saveAll(data) {
  fs.writeFileSync(SCHEMA_PATH, JSON.stringify(data, null, 2));
}

function getSchema(apiKey, resource) {
  const all = loadAll();
  const account = all[apiKey];
  if (!account) return null;
  return account[resource] || null;
}

function createSchema(apiKey, resource, fields) {
  const all = loadAll();
  if (!all[apiKey]) all[apiKey] = {};
  all[apiKey][resource] = { version: 1, fields };
  saveAll(all);
}

function updateSchema(apiKey, resource, newFields) {
  const all = loadAll();
  const current = all[apiKey][resource];
  current.version += 1;
  Object.assign(current.fields, newFields);
  all[apiKey][resource] = current;
  saveAll(all);
}

module.exports = { getSchema, createSchema, updateSchema };
