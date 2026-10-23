import path from 'node:path';
import { splitDraftContent } from './promoted_knowledge.mjs';
import { makeId } from './export_utils.mjs';

const NAMESPACE = 'OWAOntology';

function titleKey(title) {
  return String(title || '').replace(/\r/g, '').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function nonemptyString(value) {
  return typeof value === 'string' && Boolean(value.trim());
}

// Pure lexical validation: rawDrafts supplies metadata, never Markdown content.
function inboxPath(value, root) {
  if (!nonemptyString(value) || value.includes('\0')) return null;
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, value);
  const relative = path.relative(resolvedRoot, resolved);
  const inboxRelative = path.relative(path.join(resolvedRoot, 'downloads/knowledge_inbox'), resolved);
  if (!inboxRelative || inboxRelative === '..' || inboxRelative.startsWith(`..${path.sep}`)
      || path.isAbsolute(inboxRelative)) return null;
  return relative;
}

export function assessOwaPromotedCoverage({ promotedDrafts, rawDrafts, chunkRows, root }) {
  const groups = new Map();
  for (const draft of promotedDrafts) {
    const key = titleKey(draft.title);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(draft);
  }

  // Compute collisions before evaluating groups so input order cannot select an owner.
  const ownerGroups = new Map();
  for (const [key, drafts] of groups) {
    for (const draft of drafts) {
      if (!nonemptyString(draft.title)) continue;
      const owner = makeId('OWA_ENTITY', draft.title);
      if (!ownerGroups.has(owner)) ownerGroups.set(owner, new Set());
      ownerGroups.get(owner).add(key);
    }
  }

  const issues = [];
  let coveredCount = 0;
  for (const key of [...groups.keys()].sort()) {
    const drafts = groups.get(key);
    const title = drafts.map((draft) => String(draft.title ?? '')).sort()[0];
    const draftIds = [...new Set(drafts.map((draft) => typeof draft.id === 'string' ? draft.id : ''))].sort();
    const owners = [...new Set(drafts.map((draft) => makeId('OWA_ENTITY', draft.title)))].sort();
    const entityId = owners.length === 1 ? owners[0] : undefined;
    const addIssue = (kind, reason) => {
      issues.push({ kind, title, draftIds, reason, ...(entityId ? { entityId } : {}) });
    };

    const segments = drafts.map((draft) => splitDraftContent(draft.content, 1800));
    if (drafts.some((draft, index) => !nonemptyString(draft.id) || !nonemptyString(draft.title)
        || !titleKey(draft.title) || draft.kbNamespace !== NAMESPACE
        || !nonemptyString(draft.content) || !segments[index].length)) {
      addIssue('invalid_draft', 'Every approved revision must have a nonempty ID, title and content in OWAOntology.');
      continue;
    }
    if (new Set(segments.map((parts) => JSON.stringify(parts))).size > 1) {
      addIssue('ambiguous_versions', 'Approved revisions have different full content segments; no version was selected.');
      continue;
    }
    if (owners.length !== 1 || ownerGroups.get(entityId).size > 1) {
      addIssue('ambiguous_identity', 'Titles do not identify one unique OWA entity owner.');
      continue;
    }

    const chunks = chunkRows.filter((row) => row.sourceDocumentRefId === entityId);
    if (!chunks.length) {
      addIssue('missing_chunks', 'No chunks have the exact expected sourceDocumentRefId.');
      continue;
    }
    const expected = segments[0];
    const ordered = chunks.map((row) => ({ row, order: typeof row.sectionOrder === 'string'
      || typeof row.sectionOrder === 'number' ? Number(row.sectionOrder) : NaN }))
      .sort((left, right) => left.order - right.order);
    if (ordered.length !== expected.length || ordered.some(({ order }, index) =>
      !Number.isSafeInteger(order) || order !== index + 1)) {
      addIssue('invalid_chunk_layout', 'Chunks must contain exactly sectionOrder 1..N without gaps, duplicates or extra segments.');
      continue;
    }
    if (ordered.some(({ row }, index) => row.content !== expected[index])) {
      addIssue('content_mismatch', 'Chunk contents differ from the complete approved segment sequence.');
      continue;
    }

    const paths = chunks.map((row) => inboxPath(row.sourcePath, root));
    const sourcePath = paths[0];
    const approvedIds = new Set(draftIds);
    const hasRawMapping = sourcePath && rawDrafts.some((raw) => raw.kbNamespace === NAMESPACE
      && approvedIds.has(raw.id) && inboxPath(raw.rawMarkdownPath, root) === sourcePath);
    if (!sourcePath || paths.some((value) => value !== sourcePath) || !hasRawMapping) {
      addIssue('invalid_provenance', 'All chunks must share an inbox path mapped to raw metadata of an equivalent approved OWA revision.');
      continue;
    }
    coveredCount += 1;
  }
  return { promotedCount: promotedDrafts.length, groupCount: groups.size, coveredCount, issues };
}
