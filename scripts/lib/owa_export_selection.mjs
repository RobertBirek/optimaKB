import path from 'node:path';
import { makeId } from './export_utils.mjs';
import { splitDraftContent } from './promoted_knowledge.mjs';

const NAMESPACE = 'OWAOntology';

// Keep title grouping and content equivalence consistent with the coverage gate.
function titleKey(title) {
  return String(title || '').replace(/\r/g, '').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function nonemptyString(value) {
  return typeof value === 'string' && Boolean(value.trim());
}

function lexical(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

// Lexical containment only; this pure selector never resolves symlinks or reads files.
function scopedPath(value, root, directory) {
  if (!nonemptyString(value) || value.includes('\0')) return null;
  const resolved = path.resolve(root, value);
  const relative = path.relative(path.resolve(root, directory), resolved);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return null;
  return resolved;
}

function indexBy(records, field) {
  const index = new Map();
  for (const record of records) {
    const key = record[field];
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(record);
  }
  return index;
}

export function selectOwaExportDrafts({ promotedDrafts, registryEntries, rawDrafts, root }) {
  const issues = [];
  const addIssue = (kind, records, reason, entityId) => {
    const title = records.map((record) => typeof record.title === 'string' ? record.title : '').sort()[0] || '';
    const draftIds = [...new Set(records.map((record) => {
      const id = Object.hasOwn(record, 'draftId') ? record.draftId : record.id;
      return typeof id === 'string' ? id : '';
    }))].sort();
    issues.push({ kind, title, draftIds, reason, ...(entityId ? { entityId } : {}) });
  };
  if (!nonemptyString(root) || root.includes('\0')) {
    addIssue('invalid_provenance', [], 'A nonempty ROOT is required to qualify inbox provenance.');
    return { drafts: [], issues };
  }

  const snapshotDirectory = `docs/reference/knowledge_inbox/promoted/${NAMESPACE}`;
  const inboxDirectory = 'downloads/knowledge_inbox';
  const snapshotsById = indexBy(promotedDrafts, 'id');
  const registryById = indexBy(registryEntries, 'draftId');
  const rawById = indexBy(rawDrafts, 'id');
  const owaRegistryIds = new Set(registryEntries.filter((entry) => entry.kbNamespace === NAMESPACE)
    .map((entry) => entry.draftId));
  // An unrelated namespace is ignored, but cannot conceal an OWA snapshot's drift.
  const candidates = promotedDrafts.filter((draft) => draft.kbNamespace === NAMESPACE
    || owaRegistryIds.has(draft.id)
    || scopedPath(draft.promotedJsonPath, root, snapshotDirectory)
    || scopedPath(draft.promotedMarkdownPath, root, snapshotDirectory));
  const activeEntries = registryEntries.filter((entry) => entry.kbNamespace === NAMESPACE && entry.status === 'promoted');
  const relevantIds = new Set([...candidates.map((draft) => draft.id), ...activeEntries.map((entry) => entry.draftId)]);
  const duplicateIds = new Set();
  for (const id of relevantIds) {
    if (!nonemptyString(id)) continue;
    for (const [label, index] of [['snapshot', snapshotsById], ['registry', registryById], ['raw', rawById]]) {
      const records = index.get(id) || [];
      if (records.length <= 1) continue;
      duplicateIds.add(id);
      addIssue('ambiguous_identity', records, `The approved ID has multiple ${label} records; its identity is not unique.`);
    }
  }

  // Validate the reverse direction too: no active registry entry may disappear.
  for (const entry of activeEntries) {
    if (!nonemptyString(entry.draftId) || !snapshotsById.has(entry.draftId)) {
      addIssue('invalid_registry', [entry], 'An active OWA registry entry must identify an existing promoted snapshot.');
    }
  }

  const groups = new Map();
  for (const draft of candidates) {
    if (!nonemptyString(draft.id) || !nonemptyString(draft.title) || !titleKey(draft.title)
        || draft.kbNamespace !== NAMESPACE || !nonemptyString(draft.content)
        || !splitDraftContent(draft.content, 1800).length) {
      addIssue('invalid_draft', [draft], 'Every approved revision must have a nonempty ID, title and content in OWAOntology.');
      continue;
    }
    if (duplicateIds.has(draft.id)) continue;
    const entry = registryById.get(draft.id)?.[0];
    const jsonPath = scopedPath(draft.promotedJsonPath, root, snapshotDirectory);
    const markdownPath = scopedPath(draft.promotedMarkdownPath, root, snapshotDirectory);
    if (!entry || draft.status !== 'promoted' || entry.status !== 'promoted' || entry.kbNamespace !== NAMESPACE
        || !jsonPath || !markdownPath
        || jsonPath !== scopedPath(entry.promotedJsonPath, root, snapshotDirectory)
        || markdownPath !== scopedPath(entry.promotedMarkdownPath, root, snapshotDirectory)) {
      addIssue('invalid_registry', [draft], 'Snapshot and its single registry entry must agree on OWA namespace, promoted status and snapshot paths.');
      continue;
    }

    const raw = rawById.get(draft.id)?.[0];
    const rawJsonPath = scopedPath(raw?.rawJsonPath, root, inboxDirectory);
    const rawMarkdownPath = scopedPath(raw?.rawMarkdownPath, root, inboxDirectory);
    if (!raw || raw.kbNamespace !== NAMESPACE || !rawJsonPath || !rawMarkdownPath
        || !rawJsonPath.endsWith('.json') || rawMarkdownPath !== rawJsonPath.replace(/\.json$/, '.md')
        || rawJsonPath !== scopedPath(entry.rawJsonPath, root, inboxDirectory)
        || rawJsonPath !== scopedPath(draft.sourceDraftPath, root, inboxDirectory)) {
      addIssue('invalid_provenance', [draft], 'Each approved revision must map by ID to one OWA raw JSON/Markdown pair inside ROOT/inbox, consistent with registry and snapshot source paths.');
      continue;
    }
    const key = titleKey(draft.title);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ...draft, rawMarkdownPath });
  }

  const ownerGroups = new Map();
  for (const [key, drafts] of groups) {
    for (const draft of drafts) {
      const owner = makeId('OWA_ENTITY', draft.title);
      if (!ownerGroups.has(owner)) ownerGroups.set(owner, new Set());
      ownerGroups.get(owner).add(key);
    }
  }

  const selected = [];
  for (const drafts of groups.values()) {
    const owners = [...new Set(drafts.map((draft) => makeId('OWA_ENTITY', draft.title)))];
    const entityId = owners.length === 1 ? owners[0] : undefined;
    if (new Set(drafts.map((draft) => JSON.stringify(splitDraftContent(draft.content, 1800)))).size > 1) {
      addIssue('ambiguous_versions', drafts, 'Approved revisions have different full content segments; no version was selected.', entityId);
      continue;
    }
    if (owners.length !== 1 || ownerGroups.get(entityId).size > 1) {
      addIssue('ambiguous_identity', drafts, 'Titles do not identify one unique OWA entity owner.', entityId);
      continue;
    }
    const ordered = [...drafts].sort((left, right) => lexical(left.id, right.id));
    selected.push({ ...ordered[0], equivalentDraftIds: ordered.map((draft) => draft.id) });
  }

  if (!candidates.length && !issues.length) {
    addIssue('empty_approved_corpus', [], 'No active approved OWA snapshots were supplied; an empty export is refused.');
  }
  // Stable diagnostics as well as stable selection, independent of loader order.
  const orderedIssues = [...new Set(issues.map((issue) => JSON.stringify(issue)))].sort().map((issue) => JSON.parse(issue));
  return {
    drafts: orderedIssues.length ? [] : selected.sort((left, right) => left.title.localeCompare(right.title, 'pl') || lexical(left.id, right.id)),
    issues: orderedIssues,
  };
}
