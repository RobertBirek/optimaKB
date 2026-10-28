import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const policyUrl = new URL('./owa_relation_id_policy.json', import.meta.url);
const keyFields = ['sourceEntityRefId', 'predicate', 'legacyTargetRefId'];

function fail(reason, kind = 'invalid_owa_relation_policy', cause) {
  const error = new Error(`OWA relation policy: ${reason}`, { cause });
  error.kind = kind;
  error.reason = reason;
  throw error;
}

function object(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${name} must be an object`);
}

function shape(value, fields, name) {
  object(value, name);
  for (const field of fields) {
    if (!Object.hasOwn(value, field)) fail(`${name}.${field} is required`);
  }
  for (const field of Object.keys(value)) {
    if (!fields.includes(field)) fail(`${name} has unsupported field ${field}`);
  }
}

function text(value, name) {
  if (typeof value !== 'string' || !value.trim()) fail(`${name} must be a nonempty string`);
}

function relationKey(value) {
  object(value, 'keyFields');
  for (const field of keyFields) text(value[field], field);
  // No normalization, delimiter concatenation, JSON scalar decoding or NULL coercion here.
  return JSON.stringify(keyFields.map((field) => value[field]));
}

/** Validate a v1 policy without I/O. Entries and metadata are independent snapshots. */
export function compileOwaRelationPolicy(value) {
  shape(value, ['schemaVersion', 'namespace', 'database', 'observedAt', 'sourceEvidence', 'reservedIds', 'entries'], 'policy');
  if (value.schemaVersion !== 1) fail('unsupported schemaVersion');
  if (value.namespace !== 'OWAOntology') fail('namespace must be OWAOntology');
  if (value.database !== 'owaontology') fail('database must be owaontology');
  if (typeof value.observedAt !== 'string'
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value.observedAt)
      || !Number.isFinite(Date.parse(value.observedAt))) fail('observedAt must be an ISO timestamp');
  if (!Array.isArray(value.sourceEvidence) || value.sourceEvidence.length === 0) fail('sourceEvidence must be a nonempty array');
  const evidenceNames = new Set();
  const sourceEvidence = value.sourceEvidence.map((item) => {
    shape(item, ['name', 'sha256'], 'sourceEvidence');
    text(item.name, 'sourceEvidence.name');
    if (/[\\:]/.test(item.name) || item.name.split('/').some((part) => !part || part === '.' || part === '..')) {
      fail('sourceEvidence.name must be a portable relative name');
    }
    if (typeof item.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(item.sha256)) fail('sourceEvidence.sha256 must be a SHA256 digest');
    if (evidenceNames.has(item.name)) fail('duplicate sourceEvidence name');
    evidenceNames.add(item.name);
    return Object.freeze({ ...item });
  });
  if (!Array.isArray(value.reservedIds)) fail('reservedIds must be an array');
  const reservedIds = new Set();
  for (const id of value.reservedIds) {
    text(id, 'reservedIds id');
    if (reservedIds.has(id)) fail(`duplicate reservedIds ID ${id}`);
    reservedIds.add(id);
  }
  if (!Array.isArray(value.entries)) fail('entries must be an array');
  const byKey = new Map();
  const ids = new Set();
  const historicalIds = new Set();
  const entries = value.entries.map((entry) => {
    shape(entry, [...keyFields, 'id', 'state'], 'entry');
    const key = relationKey(entry);
    text(entry.id, 'entry.id');
    if (byKey.has(key)) fail(`duplicate relation key ${key}`);
    if (ids.has(entry.id)) fail(`duplicate relation ID ${entry.id}`);
    if (!['preserved', 'retired', 'new'].includes(entry.state)) fail(`unsupported entry state ${entry.state}`);
    ids.add(entry.id);
    if (entry.state !== 'new') historicalIds.add(entry.id);
    const snapshot = Object.freeze({ ...entry });
    byKey.set(key, snapshot);
    return snapshot;
  });
  for (const entry of entries) {
    if (entry.state === 'new' && reservedIds.has(entry.id)) fail(`new ID is reserved: ${entry.id}`);
  }
  if (historicalIds.size !== reservedIds.size || [...historicalIds].some((id) => !reservedIds.has(id))) {
    fail('reservedIds must exactly equal preserved and retired IDs');
  }
  return Object.freeze({
    schemaVersion: value.schemaVersion,
    namespace: value.namespace,
    database: value.database,
    observedAt: value.observedAt,
    sourceEvidence: Object.freeze(sourceEvidence),
    entries: Object.freeze(entries),
    byKey,
    reservedIds,
  });
}

/** Read only the static policy beside this module, hashing its exact UTF-8 file bytes. */
export function loadOwaRelationPolicy() {
  let bytes;
  try {
    bytes = readFileSync(policyUrl);
  } catch (error) {
    fail('cannot read adjacent policy JSON', 'owa_relation_policy_read_failed', error);
  }
  let value;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    fail('invalid policy JSON', 'owa_relation_policy_json_invalid', error);
  }
  return { policy: compileOwaRelationPolicy(value), sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** Exact historical identity only; unknown or retired tuples never acquire an ID. */
export function assignOwaRelationId(policy, fields) {
  if (!(policy?.byKey instanceof Map) || !(policy?.reservedIds instanceof Set)) fail('a compiled policy is required');
  const key = relationKey(fields);
  const entry = policy.byKey.get(key);
  if (!entry) fail(`unlisted relation key ${key}`, 'owa_relation_key_missing');
  if (entry.state === 'retired') fail(`retired relation ID ${entry.id}`, 'owa_relation_retired');
  if (entry.state !== 'preserved' && entry.state !== 'new') fail('unsupported entry state');
  if (policy.reservedIds.has(entry.id) !== (entry.state === 'preserved')) fail('entry conflicts with reservedIds');
  return { id: entry.id, kind: entry.state };
}
