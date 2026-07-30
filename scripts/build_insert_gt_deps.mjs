#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { csvEscape } from './lib/export_utils.mjs';

const ROOT = '/docker/openspg';
const OUTPUT_DIR = path.join(ROOT, 'exports/insert_gt_schema/v1');
const SQL_ROOT = path.join(ROOT, 'downloads/google_drive/insert_gt/extracted/Skrypty_SQL_1_89_HF1');
const DB_NAME = 'pomagier';

function strikeBrackets(v) { return String(v||'').replace(/^\[|\]$/g, ''); }
function slugify(v) { return String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,80); }
function norm(t) { return String(t||'').replace(/\r/g,'').trim(); }

function parseSqlMeta(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const text = norm(fs.readFileSync(filePath, 'utf8'));
  const m = text.match(/CREATE\s+(PROCEDURE|PROC|FUNCTION|VIEW|TRIGGER)\s+(?:\[([^\]]+)\]\.)?\[([^\]]+)\]/i);
  return m ? { objectType: m[1].toUpperCase(), schema: m[2]||'dbo', name: m[3], fullText: text } : null;
}

function resolveTableRef(tableName, schema, knownTables) {
  const cleaned = strikeBrackets(String(tableName||''));
  const targetId = `${DB_NAME}:TABLE:${schema||'dbo'}.${cleaned}`;
  return knownTables.has(targetId) ? { id: targetId, name: cleaned } : null;
}

function extractDeps(fullText, objectRefId, objectKind, knownTables, seen) {
  const deps = [];

  function push(targetId, targetName, targetKind, depType, evidence) {
    const key = `${objectRefId}:${depType}:${targetId}`;
    if (seen.has(key)) return;
    seen.add(key);
    deps.push({
      id: `DEP:${slugify(objectRefId)}:${depType}:${slugify(targetId)}`,
      name: `${objectRefId.split(':').pop()} ${depType.toLowerCase()} ${targetName}`,
      description: `${depType} dependency to ${targetName}`,
      semanticType: 'object_dependency',
      sourceObjectRefId: objectRefId,
      targetObjectRefId: targetId,
      sourceObjectKind: objectKind,
      targetObjectKind: targetKind,
      dependencyType: depType,
      evidence: String(evidence||'').slice(0, 180),
    });
  }

  // FROM/JOIN -> TABLE/VIEW reads
  const readRe = /(?:FROM|JOIN|APPLY)\s+(\[?(?:dbo\]\.)?\[?\w+\]?)(?:\.\[?(\w+)\]?)?/gi;
  let m;
  while ((m = readRe.exec(fullText)) !== null) {
    const schema = m[2] ? strikeBrackets(m[1]) : 'dbo';
    const tbl = m[2] ? strikeBrackets(m[2]) : strikeBrackets(m[1]);
    const target = resolveTableRef(tbl, schema, knownTables);
    if (target && target.id !== objectRefId) push(target.id, target.name, 'TABLE', 'SQL_READ', m[0]);
  }

  // INSERT/UPDATE/DELETE/MERGE -> TABLE writes
  const writeRe = /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|MERGE)\s+(\[?(?:dbo\]\.)?\[?\w+\]?)(?:\.\[?(\w+)\]?)?/gi;
  while ((m = writeRe.exec(fullText)) !== null) {
    const schema = m[2] ? strikeBrackets(m[1]) : 'dbo';
    const tbl = m[2] ? strikeBrackets(m[2]) : strikeBrackets(m[1]);
    const target = resolveTableRef(tbl, schema, knownTables);
    if (target && target.id !== objectRefId) push(target.id, target.name, 'TABLE', 'SQL_WRITE', m[0]);
  }

  // EXEC -> PROCEDURE calls
  const execRe = /EXEC(?:UTE)?\s+(\[?(?:dbo\]\.)?\[?\w+\]?)(?:\.\[?(\w+)\]?)?/gi;
  while ((m = execRe.exec(fullText)) !== null) {
    const schema = m[2] ? strikeBrackets(m[1]) : 'dbo';
    const name = m[2] ? strikeBrackets(m[2]) : strikeBrackets(m[1]);
    if (name === objectRefId.split(':').pop()) continue;
    const targetId = `${DB_NAME}:PROCEDURE:${schema}.${name}`;
    push(targetId, name, 'PROCEDURE', 'EXEC_CALL', m[0]);
  }

  return deps;
}

async function main() {
  // Load known table IDs from the live CSV
  const tableCsv = path.join(OUTPUT_DIR, 'table.csv');
  if (!fs.existsSync(tableCsv)) { console.error('table.csv not found'); process.exit(1); }
  const tableText = fs.readFileSync(tableCsv, 'utf8');
  const knownTables = new Set();
  for (const line of tableText.split('\n').slice(1)) {
    const id = line.split(',')[0].replace(/^"|"$/g, '');
    if (id) knownTables.add(id);
  }
  console.log(`Loaded ${knownTables.size} tables as targets`);

  const seen = new Set();
  const allDeps = [];
  const sources = [
    { dir: 'Stored Procedures', kind: 'PROCEDURE' },
    { dir: 'Functions', kind: 'FUNCTION' },
    { dir: 'Views', kind: 'VIEW' },
  ];

  let totalProcessed = 0;

  // Also check live SP and function names so we use correct IDs
  const liveSpIds = new Map();
  for (const csvName of ['stored_procedure.csv', 'function.csv', 'view.csv']) {
    const csvPath = path.join(OUTPUT_DIR, csvName);
    if (!fs.existsSync(csvPath)) continue;
    for (const line of fs.readFileSync(csvPath,'utf8').split('\n').slice(1)) {
      const id = line.split(',')[0].replace(/^"|"$/g, '');
      if (id) liveSpIds.set(id.split(':').pop()?.toLowerCase(), id);
    }
  }

  for (const src of sources) {
    const srcDir = path.join(SQL_ROOT, src.dir);
    if (!fs.existsSync(srcDir)) { console.log(`  ${src.dir}: dir not found`); continue; }
    const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.sql'));

    for (const file of files) {
      const parsed = parseSqlMeta(path.join(srcDir, file));
      if (!parsed || parsed.name.startsWith('__')) continue;
      totalProcessed++;

      // Use live ID from CSV if available, otherwise construct
      let objectId = `${DB_NAME}:${src.kind}:${parsed.schema}.${parsed.name}`;
      const liveKey = parsed.name.toLowerCase();
      if (liveSpIds.has(liveKey)) objectId = liveSpIds.get(liveKey);

      const deps = extractDeps(parsed.fullText, objectId, src.kind, knownTables, seen);
      allDeps.push(...deps);
    }
  }

  console.log(`Processed ${totalProcessed} objects, extracted ${allDeps.length} dependencies`);

  // Write CSV
  const headers = ['id','name','description','semanticType','sourceObjectRefId','targetObjectRefId','sourceObjectKind','targetObjectKind','dependencyType','evidence'];
  const lines = [headers.join(',')];
  for (const d of allDeps) {
    lines.push(headers.map(h => csvEscape(d[h]||'')).join(','));
  }
  const outPath = path.join(OUTPUT_DIR, 'object_dependency.csv');
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
  console.log(`object_dependency.csv: ${allDeps.length} rows`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
