// Display-only provenance from already parsed records. No filesystem resolver.
const ARTIFACTS = new Set(['ontology_entity', 'ontology_field', 'ontology_relation',
  'workflow_pattern', 'chunk'].map(name => `exports/owa_ontology/v1/${name}.csv`));
const BUSINESS_ARTIFACTS = new Set(['business_description', 'business_rule', 'business_domain', 'code_meaning']
  .map(name => `exports/optima_business_semantics/v1/${name}.csv`));

function safeOwnerPath(value) {
  if (typeof value !== 'string' || /[\\%?#\x00-\x1f\x7f]/.test(value)
      || value.split('/').some(part => !part || part === '.' || part === '..')
      || value !== value.trim()) return null;
  return value.startsWith('downloads/knowledge_inbox/')
    || value.startsWith('docs/reference/knowledge_inbox/promoted/OWAOntology/') ? value : null;
}

/** Cite the exact scanner bytes/physical record, never a guessed document URL.
 * Owner paths are optional display metadata, not read capabilities.
 * @param {import('./owa_query_context.mjs').ParsedRow} row
 */
export function describeLocalSource(row) {
  if (!(row?.namespace === 'OWAOntology' && ARTIFACTS.has(row.artifact)
      || row?.namespace === 'ComarchOptimaBusinessSemantics' && BUSINESS_ARTIFACTS.has(row.artifact))
      || !Number.isSafeInteger(row.line) || row.line <= 0
      || !Number.isSafeInteger(row.endLine) || row.endLine < row.line
      || typeof row.contentHash !== 'string' || !/^sha256:[a-fA-F0-9]{64}$/.test(row.contentHash)
      || typeof row.fields?.id !== 'string' || !row.fields.id.trim()
      || /[\x00-\x1f\x7f]/.test(row.fields.id) || row.fields.sourceUrl) return null;
  return { kind: 'local_artifact', recordId: row.fields.id, artifact: row.artifact,
    locator: row.endLine > row.line ? `L${row.line}-L${row.endLine}` : `L${row.line}`,
    contentHash: row.contentHash,
    owningPath: safeOwnerPath(row.fields.sourcePath || row.fields.localSnapshotPath), sourceUrl: null };
}
