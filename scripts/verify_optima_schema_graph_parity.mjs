#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.env.ROOT || '/docker/openspg';
const EXPORT_DIR = process.env.OPENSPG_SCHEMA_EXPORT_DIR || path.join(ROOT, 'exports/optima_schema/v1');
const IMPORT_DIR = process.env.OPENSPG_NEO4J_IMPORT_DIR || path.join(ROOT, 'data/neo4j/import/optima-schema-parity');
const CONTAINER = process.env.OPENSPG_NEO4J_CONTAINER || 'release-openspg-neo4j';
const DATABASE = process.env.OPENSPG_NEO4J_DATABASE || 'comarchoptimaschema';

const LABELS = {
  'database_instance.csv': 'DatabaseInstance',
  'table.csv': 'Table',
  'column.csv': 'Column',
  'primary_key.csv': 'PrimaryKey',
  'foreign_key.csv': 'ForeignKey',
  'index.csv': 'Index',
  'constraint.csv': 'Constraint',
  'view.csv': 'View',
  'stored_procedure.csv': 'StoredProcedure',
  'function.csv': 'Function',
  'trigger.csv': 'Trigger',
  'parameter.csv': 'Parameter',
  'object_dependency.csv': 'ObjectDependency',
  'table_query_guide.csv': 'TableQueryGuide',
  'join_path_guide.csv': 'JoinPathGuide',
  'sql_object_guide.csv': 'SqlObjectGuide',
  'schema_change.csv': 'SchemaChange',
  'chunk.csv': 'Chunk',
};

function parseCsvIds(raw) {
  const ids = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    const next = raw[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field.replace(/\r$/, '')); ids.push(row[0]); row = []; field = ''; }
    else field += char;
  }
  return ids.slice(1).filter(Boolean);
}

function runDockerCypher(query) {
  const command = [
    'exec "$NEO4J_HOME/bin/cypher-shell"',
    '-u "$OPENSPG_NEO4J_USER"',
    '-p "$OPENSPG_NEO4J_PASSWORD"',
    '--format plain',
    `-d "${DATABASE}"`,
    '"$1"',
  ].join(' ');
  const result = spawnSync('docker', ['exec', CONTAINER, 'sh', '-c', command, 'sh', query], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'cypher-shell failed');
  return String(result.stdout || '').trim().split(/\r?\n/).at(-1);
}

fs.mkdirSync(IMPORT_DIR, { recursive: true });
const results = [];
for (const [fileName, labelName] of Object.entries(LABELS)) {
  const ids = parseCsvIds(fs.readFileSync(path.join(EXPORT_DIR, fileName), 'utf8'));
  fs.writeFileSync(path.join(IMPORT_DIR, fileName), `id\n${ids.map((id) => `"${id.replaceAll('"', '""')}"`).join('\n')}\n`);
  const query = `LOAD CSV WITH HEADERS FROM 'file:///optima-schema-parity/${fileName}' AS row `
    + `WITH collect(row.id) AS expectedIds MATCH (n:\`ComarchOptimaSchema.${labelName}\`) `
    + 'RETURN toString(size(expectedIds)) + "|" + toString(count(n)) + "|" '
    + '+ toString(count(CASE WHEN NOT n.id IN expectedIds THEN 1 END)) AS result;';
  const [expected, actual, stale] = runDockerCypher(query).replaceAll('"', '').split('|').map(Number);
  results.push({ fileName, expected, actual, stale, matches: expected === actual && stale === 0 });
}

const report = { ok: results.every((item) => item.matches), checkedAt: new Date().toISOString(), results };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) process.exitCode = 1;
