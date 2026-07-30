#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'child_process';

const CSV = '/docker/openspg/exports/insert_gt_schema/v1/object_dependency.csv';
const text = fs.readFileSync(CSV, 'utf8');

// Parse CSV
const rows = [];
let row = [], field = '', inQ = false;
for (let i = 0; i < text.length; i++) {
  const ch = text[i], nx = text[i+1];
  if (inQ) { if (ch === '"' && nx === '"') { field += '"'; i++; continue; } if (ch === '"') { inQ = false; continue; } field += ch; continue; }
  if (ch === '"') { inQ = true; continue; }
  if (ch === ',') { row.push(field.replace(/"/g, '')); field = ''; continue; }
  if (ch === '\n') { row.push(field.replace(/"/g, '')); if (row.length > 1) rows.push(row); row = []; field = ''; continue; }
  if (ch === '\r') continue;
  field += ch;
}
if (row.length > 1) rows.push(row);

const headers = rows.shift();
console.log('Rows to import:', rows.length);

const label1 = 'InsERTGTSchema.ObjectDependency';
const label2 = 'Entity';

function esc(v) {
  return String(v || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ').replace(/\r/g, '');
}

const NEO4J = ['docker', 'exec', '-i', 'release-openspg-neo4j', 'cypher-shell', '-u', 'neo4j', '-p', 'e5b0b65b78cda315782ea9deef5c198f5a0497707abb8fa3', '-d', 'insertgtschema', '--format', 'plain'];

const BATCH = 500;
let imported = 0;

for (let b = 0; b < rows.length; b += BATCH) {
  let cypher = '';
  for (let i = b; i < Math.min(b + BATCH, rows.length); i++) {
    const r = rows[i];
    if (r.length < 10) continue;
    const vals = {};
    for (let j = 0; j < headers.length; j++) vals[headers[j]] = r[j] || '';
    
    cypher += 'CREATE (n:`' + label1 + '`:`' + label2 + '` {';
    cypher += 'id: "' + esc(vals.id) + '", ';
    cypher += 'name: "' + esc(vals.name) + '", ';
    cypher += 'description: "' + esc(vals.description) + '", ';
    cypher += 'semanticType: "' + esc(vals.semanticType) + '", ';
    cypher += 'sourceObjectRefId: "' + esc(vals.sourceObjectRefId) + '", ';
    cypher += 'targetObjectRefId: "' + esc(vals.targetObjectRefId) + '", ';
    cypher += 'sourceObjectKind: "' + esc(vals.sourceObjectKind) + '", ';
    cypher += 'targetObjectKind: "' + esc(vals.targetObjectKind) + '", ';
    cypher += 'dependencyType: "' + esc(vals.dependencyType) + '", ';
    cypher += 'evidence: "' + esc(vals.evidence) + '"';
    cypher += '});\n';
  }

  try {
    execSync(NEO4J.join(' '), { input: cypher + ';\n', encoding: 'utf8', timeout: 120000, maxBuffer: 50 * 1024 * 1024 });
    imported += Math.min(BATCH, rows.length - b);
    console.log('Batch ' + (Math.floor(b/BATCH)+1) + ': ' + imported + '/' + rows.length);
  } catch(e) {
    console.error('Batch ' + (Math.floor(b/BATCH)+1) + ' error: ' + String(e.message).slice(0, 200));
  }
}

console.log('\nDone. Imported ' + imported + ' nodes.');
