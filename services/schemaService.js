const fs = require('fs');
const path = require('path');
const { withLock } = require('../utils/fileLock');
const SCHEMA_PATH = path.join(__dirname, '..', 'models', 'schemas.json');
const HISTORY_PATH = path.join(__dirname, '..', 'models', 'schemahistory.json');
const BREAKING_PATH = path.join(__dirname, '..', 'models', 'breakingchanges.json');
const ANOMALY_PATH = path.join(__dirname, '..', 'models', 'valueanomalies.json');

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
function loadAnomalies() {
  const raw = fs.readFileSync(ANOMALY_PATH, 'utf-8');
  return JSON.parse(raw);
}
function saveAnomalies(data) {
  fs.writeFileSync(ANOMALY_PATH, JSON.stringify(data, null, 2));
}

function recordHistory(apiKey, resource, version, addedFields) {
  const history = loadHistory();
  if (!history[apiKey]) history[apiKey] = {};
  if (!history[apiKey][resource]) history[apiKey][resource] = [];
  history[apiKey][resource].push({ version, addedFields, timestamp: new Date().toISOString() });
  saveHistory(history);
}

function recordBreakingChange(apiKey, resource, field, expectedType, actualType) {
  const breaking = loadBreaking();
  if (!breaking[apiKey]) breaking[apiKey] = {};
  if (!breaking[apiKey][resource]) breaking[apiKey][resource] = [];
  breaking[apiKey][resource].push({ field, expectedType, actualType, timestamp: new Date().toISOString() });
  saveBreaking(breaking);
}

function getBreakingChanges(apiKey, resource) {
  const breaking = loadBreaking();
  if (!breaking[apiKey]) return [];
  return breaking[apiKey][resource] || [];
}

function recordAnomaly(apiKey, resource, field, value, expectedRange) {
  const anomalies = loadAnomalies();
  if (!anomalies[apiKey]) anomalies[apiKey] = {};
  if (!anomalies[apiKey][resource]) anomalies[apiKey][resource] = [];
  anomalies[apiKey][resource].push({ field, value, expectedRange, timestamp: new Date().toISOString() });
  saveAnomalies(anomalies);
}

function getAnomalies(apiKey, resource) {
  const anomalies = loadAnomalies();
  if (!anomalies[apiKey]) return [];
  return anomalies[apiKey][resource] || [];
}

function toJsonSchema(schema) {
  const properties = {};
  const required = [];
  for (const name in schema.fields) {
    const f = schema.fields[name];
    properties[name] = { type: f.type === 'number' ? 'number' : f.type === 'boolean' ? 'boolean' : 'string' };
    if (f.required) required.push(name);
  }
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties,
    required,
    'x-driftless-version': schema.version,
    'x-driftless-eventsSeen': schema.eventCount || 0
  };
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
  return withLock('schemas', () => {
    const all = loadAll();
    if (!all[apiKey]) all[apiKey] = {};
    const preparedFields = {};
    for (const name in fields) {
      const f = { type: fields[name].type, required: false, seenCount: 1 };
      if (fields[name].type === 'number') {
        f.sum = fields[name].value;
        f.count = 1;
      }
      preparedFields[name] = f;
    }
    all[apiKey][resource] = { version: 1, eventCount: 1, fields: preparedFields };
    saveAll(all);
    recordHistory(apiKey, resource, 1, Object.keys(fields));
  });
}

function updateSchema(apiKey, resource, newFields) {
  return withLock('schemas', () => {
    const all = loadAll();
    const current = all[apiKey][resource];
    current.version += 1;
    for (const name in newFields) {
      const f = { type: newFields[name].type, required: false, seenCount: 0 };
      if (newFields[name].type === 'number') {
        f.sum = 0;
        f.count = 0;
      }
      current.fields[name] = f;
    }
    all[apiKey][resource] = current;
    saveAll(all);
    recordHistory(apiKey, resource, current.version, Object.keys(newFields));
  });
}

function trackOccurrence(apiKey, resource, body) {
  return withLock('schemas', () => {
    const all = loadAll();
    const schema = all[apiKey][resource];
    schema.eventCount = (schema.eventCount || 0) + 1;
    const anomalies = [];

    for (const name in schema.fields) {
      const field = schema.fields[name];
      const present = name in body;
      if (present) {
        field.seenCount = (field.seenCount || 0) + 1;

        if (field.type === 'number' && typeof body[name] === 'number') {
          const priorCount = field.count || 0;
          const priorMean = priorCount > 0 ? field.sum / priorCount : null;

          if (priorCount >= 5 && priorMean !== null && priorMean !== 0) {
            const ratio = body[name] / priorMean;
            if (ratio > 5 || ratio < 0.2) {
              anomalies.push({ field: name, value: body[name], expectedRange: `around ${priorMean.toFixed(2)}` });
            }
          }

          field.sum = (field.sum || 0) + body[name];
          field.count = priorCount + 1;
        }
      }
      field.required = schema.eventCount >= 3 && field.seenCount === schema.eventCount;
    }

    all[apiKey][resource] = schema;
    saveAll(all);
    return anomalies;
  });
}

module.exports = {
  getSchema, getAllSchemas, getSchemaHistory, createSchema, updateSchema,
  trackOccurrence, recordBreakingChange, getBreakingChanges,
  recordAnomaly, getAnomalies, toJsonSchema
};
