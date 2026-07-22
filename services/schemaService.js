const fs = require('fs');
const path = require('path');
const SCHEMA_PATH = path.join(__dirname, '..', 'models', 'schemas.json');
const HISTORY_PATH = path.join(__dirname, '..', 'models', 'schemahistory.json');
const BREAKING_PATH = path.join(__dirname, '..', 'models', 'breakingchanges.json');

function loadAll() {
  const raw = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function saveAll(data) {
  fs.writeFileSync(SCHEMA_PATH, JSON.stringify(data, null, 2));
}

function loadHistory() {
  const raw = fs.readFileSync(HISTORY_PATH, 'utf-8');
  return JSON.parse(raw);
}

function saveHistory(data) {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(data, null, 2));
}

function loadBreaking() {
  const raw = fs.readFileSync(BREAKING_PATH, 'utf-8');
  return JSON.parse(raw);
}

function saveBreaking(data) {
  fs.writeFileSync(BREAKING_PATH, JSON.stringify(data, null, 2));
}

function recordHistory(apiKey, resource, version, addedFields) {
  const history = loadHistory();
  if (!history[apiKey]) history[apiKey] = {};
  if (!history[apiKey][resource]) history[apiKey][resource] = [];
  history[apiKey][resource].push({
    version,
    addedFields,
    timestamp: new Date().toISOString()
  });
  saveHistory(history);
}

function recordBreakingChange(apiKey, resource, field, expectedType, actualType) {
  const breaking = loadBreaking();
  if (!breaking[apiKey]) breaking[apiKey] = {};
  if (!breaking[apiKey][resource]) breaking[apiKey][resource] = [];
  breaking[apiKey][resource].push({
    field,
    expectedType,
    actualType,
    timestamp: new Date().toISOString()
  });
  saveBreaking(breaking);
}

function getBreakingChanges(apiKey, resource) {
  const breaking = loadBreaking();
  if (!breaking[apiKey]) return [];
  return breaking[apiKey][resource] || [];
}

function getSchema(apiKey, resource) {
  const all = loadAll();
  const account = all[apiKey];
  if (!account) return null;
  return account[resource] || null;
}

function getAllSchemas(apiKey) {
  const all = loadAll();
  return all[apiKey] || {};
}

function getSchemaHistory(apiKey, resource) {
  const history = loadHistory();
  if (!history[apiKey]) return [];
  return history[apiKey][resource] || [];
}

function createSchema(apiKey, resource, fields) {
  const all = loadAll();
  if (!all[apiKey]) all[apiKey] = {};
  const preparedFields = {};
  for (const name in fields) {
    preparedFields[name] = { type: fields[name].type, required: false, seenCount: 1 };
  }
  all[apiKey][resource] = { version: 1, eventCount: 1, fields: preparedFields };
  saveAll(all);
  recordHistory(apiKey, resource, 1, Object.keys(fields));
}

function updateSchema(apiKey, resource, newFields) {
  const all = loadAll();
  const current = all[apiKey][resource];
  current.version += 1;
  for (const name in newFields) {
    current.fields[name] = { type: newFields[name].type, required: false, seenCount: 0 };
  }
  all[apiKey][resource] = current;
  saveAll(all);
  recordHistory(apiKey, resource, current.version, Object.keys(newFields));
}

function trackOccurrence(apiKey, resource, presentFieldNames) {
  const all = loadAll();
  const schema = all[apiKey][resource];
  schema.eventCount = (schema.eventCount || 0) + 1;
  for (const name in schema.fields) {
    const field = schema.fields[name];
    if (presentFieldNames.includes(name)) {
      field.seenCount = (field.seenCount || 0) + 1;
    }
    field.required = schema.eventCount >= 3 && field.seenCount === schema.eventCount;
  }
  all[apiKey][resource] = schema;
  saveAll(all);
}

module.exports = { getSchema, getAllSchemas, getSchemaHistory, createSchema, updateSchema, trackOccurrence, recordBreakingChange, getBreakingChanges };
