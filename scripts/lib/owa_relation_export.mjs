import path from 'node:path';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { makeId } from './export_utils.mjs';
import { truncate } from './promoted_knowledge.mjs';
import { parseOwaRelationSection } from './owa_relation_parser.mjs';
import { assignOwaRelationId } from './owa_relation_policy.mjs';

/** Build relations from a selector-qualified snapshot, never from raw content. */
export function buildOwaRelationRows({ draft, entityId, root, policy }) {
  const relations = parseOwaRelationSection(draft.content);
  const rows = [];
  const auditRows = [];
  if (!relations.length) return { rows, auditRows };

  const relativePath = (value) => path.relative(path.resolve(root), path.resolve(root, value)).replaceAll(path.sep, '/');
  const source = {
    promotedJsonPath: relativePath(draft.promotedJsonPath),
    promotedMarkdownPath: relativePath(draft.promotedMarkdownPath),
    rawJsonPath: relativePath(draft.sourceDraftPath),
    rawMarkdownPath: relativePath(draft.rawMarkdownPath),
    contentSha256: createHash('sha256').update(draft.content, 'utf8').digest('hex'),
  };

  for (const relation of relations) {
    // Historical logical targets identify policy entries, not approved graph FKs.
    const legacyTargetRefId = makeId('OWA_ENTITY', relation.targetLabel);
    const assignment = assignOwaRelationId(policy, {
      sourceEntityRefId: entityId, predicate: relation.predicate, legacyTargetRefId,
    });
    rows.push({
      id: assignment.id,
      name: relation.predicate,
      description: relation.joinCondition,
      semanticType: 'ontology_relation',
      sourceEntityRefId: entityId,
      targetEntityRefId: '',
      predicate: relation.predicate,
      cardinality: relation.cardinality,
      relationType: relation.relationType,
      joinCondition: relation.joinCondition,
      status: relation.status,
      summary: truncate(`${relation.predicate} ${relation.joinCondition}`.trim(), 1200),
    });
    auditRows.push({
      id: assignment.id,
      sourceEntityRefId: entityId,
      predicate: relation.predicate,
      rawSourceLabel: relation.sourceLabel,
      rawTargetLabel: relation.targetLabel,
      legacyTargetRefId,
      targetResolution: { status: 'unresolved', resolvedRefId: '', reason: 'not_approved' },
      idAssignment: { kind: assignment.kind },
      draftId: draft.id,
      equivalentDraftIds: [...draft.equivalentDraftIds],
      source: { ...source, ...relation.source, evidence: relation.evidence },
    });
  }
  return { rows, auditRows };
}

/** Pure audit: only selector-qualified snapshots and the static policy are authority. */
export function assessOwaRelationExport({ root, manifest, auditBytes, relationRows, selectedDrafts, policy, policySha256 }) {
  const issues = [];
  const warnings = [];
  const addIssue = (kind, reason, relationId) => issues.push({ kind, ...(relationId ? { relationId } : {}), reason });
  const expectedRows = [];
  const expectedAuditRows = [];
  let reconstructed = false;
  if (!Array.isArray(selectedDrafts) || !selectedDrafts.length) {
    addIssue('empty_approved_corpus', 'No qualified approved OWA snapshots are available for reconstruction.');
  } else {
    try {
      for (const draft of selectedDrafts) {
        const built = buildOwaRelationRows({ draft, entityId: makeId('OWA_ENTITY', draft.title), root, policy });
        expectedRows.push(...built.rows);
        expectedAuditRows.push(...built.auditRows);
      }
      reconstructed = true;
    } catch (error) {
      expectedRows.length = 0;
      expectedAuditRows.length = 0;
      addIssue(error.kind || 'relation_reconstruction_failed', error.reason || error.message);
    }
  }

  // Counts and readiness never come from the untrusted JSON's resolution claims.
  const result = () => ({ rowCount: Array.isArray(relationRows) ? relationRows.length : 0,
    unresolvedCount: expectedAuditRows.length, publicationReady: false, issues, warnings });
  if (expectedAuditRows.length) warnings.push(`OWA unresolved relation targets: ${expectedAuditRows.length}; publicationReady=false`);

  const descriptor = manifest?.relationAudit;
  const descriptorFields = ['schemaVersion', 'fileName', 'rowCount', 'sha256', 'policySha256'];
  if (!descriptor || descriptor.schemaVersion !== 1 || descriptor.fileName !== 'relation_audit.json'
      || !isDeepStrictEqual(Object.keys(descriptor).sort(), descriptorFields.sort())) {
    addIssue('missing_or_unsupported_relation_audit', 'OWA requires the complete v1 relation_audit.json descriptor.');
    return result();
  }
  if (auditBytes == null) {
    addIssue('missing_relation_audit', 'The declared relation audit sidecar is unavailable.');
    return result();
  }
  const bytes = Buffer.isBuffer(auditBytes) ? auditBytes : Buffer.from(auditBytes, 'utf8');
  if (descriptor.sha256 !== createHash('sha256').update(bytes).digest('hex')) {
    addIssue('relation_audit_hash_mismatch', 'Descriptor SHA256 differs from the actual sidecar bytes.');
  }
  let audit;
  try {
    audit = JSON.parse(bytes.toString('utf8'));
  } catch {
    addIssue('invalid_relation_audit_json', 'The sidecar bytes are not valid JSON.');
    return result();
  }
  if (!audit || typeof audit !== 'object' || Array.isArray(audit) || !Array.isArray(audit.rows)) {
    addIssue('invalid_relation_audit_json', 'The sidecar must be an object containing a rows array.');
    return result();
  }
  const { rows: auditRows, ...metadata } = audit;
  if (!isDeepStrictEqual(metadata, { schemaVersion: 1, namespace: 'OWAOntology',
    policy: { schemaVersion: 1, sha256: policySha256, observedAt: policy?.observedAt } })) {
    addIssue('relation_audit_metadata_mismatch', 'Sidecar envelope and policy metadata must exactly match the static policy.');
  }
  if (!Number.isSafeInteger(descriptor.rowCount) || descriptor.rowCount !== auditRows.length
      || (reconstructed && descriptor.rowCount !== expectedAuditRows.length) || descriptor.policySha256 !== policySha256) {
    addIssue('relation_audit_descriptor_mismatch', 'Descriptor rowCount/policySha256 differs from the sidecar or approved reconstruction.');
  }

  function indexRows(rows, label) {
    const index = new Map();
    for (const row of rows) {
      if (!row || typeof row.id !== 'string' || !row.id) {
        addIssue(`invalid_${label}_id`, 'Each relation row requires a nonempty string ID.');
        continue;
      }
      if (index.has(row.id)) addIssue(`duplicate_${label}_id`, 'Relation IDs must be unique.', row.id);
      else index.set(row.id, row);
    }
    return index;
  }
  function compareRows(actual, expected, label) {
    const actualIndex = indexRows(actual, label);
    const expectedIndex = indexRows(expected, 'expected');
    for (const [id, row] of expectedIndex) {
      if (!actualIndex.has(id)) addIssue(`missing_${label}_id`, 'An approved relation ID is absent from the export.', id);
      else if (!isDeepStrictEqual(actualIndex.get(id), row)) {
        addIssue(`${label}_row_mismatch`, 'All fields must exactly match the approved snapshot and static policy reconstruction.', id);
      }
    }
    for (const id of actualIndex.keys()) {
      if (!expectedIndex.has(id)) addIssue(`extra_${label}_id`, 'The export contains an ID not reconstructed from approved snapshots.', id);
    }
  }
  if (reconstructed) {
    compareRows(auditRows, expectedAuditRows, 'audit');
    compareRows(Array.isArray(relationRows) ? relationRows : [], expectedRows, 'csv');
  }
  return result();
}
