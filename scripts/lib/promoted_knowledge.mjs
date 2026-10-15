#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { createHash } from 'node:crypto';
import { appendDashboardAudit, listDashboardAudit, verifyDashboardAudit, captureDashboardAuditCheckpoint, verifyDashboardAuditCheckpoint, DASHBOARD_AUDIT_ROOT } from './dashboard_audit.mjs';
import { writeFileAtomically } from './atomic_file.mjs';

const ROOT = process.env.ROOT || '/docker/openspg';
export const RAW_INBOX_ROOT = path.join(ROOT, 'downloads/knowledge_inbox');
export const REVIEW_ROOT = path.join(ROOT, 'docs/reference/knowledge_inbox');
export const PROMOTED_ROOT = path.join(REVIEW_ROOT, 'promoted');
export const WITHDRAWN_ROOT = path.join(REVIEW_ROOT, 'withdrawn');
export const REGISTRY_PATH = path.join(REVIEW_ROOT, 'registry.json');

export const TARGET_KBS = {
  ComarchOptimaSchema: {
    kbName: 'Comarch Optima ERP MSSQL Schema',
    namespace: 'ComarchOptimaSchema',
  },
  ComarchOptimaAdditionalFunctions: {
    kbName: 'Comarch Optima Additional Functions',
    namespace: 'ComarchOptimaAdditionalFunctions',
  },
  ComarchOptimaSprint: {
    kbName: 'Comarch Optima Sprint and Prints',
    namespace: 'ComarchOptimaSprint',
  },
  ComarchOptimaReference: {
    kbName: 'Comarch Optima Reference',
    namespace: 'ComarchOptimaReference',
  },
  ComarchOptimaPartnerTechnical: {
    kbName: 'Comarch Optima Partner Technical',
    namespace: 'ComarchOptimaPartnerTechnical',
  },
  ComarchBetterflyReference: {
    kbName: 'Comarch Betterfly Reference',
    namespace: 'ComarchBetterflyReference',
  },
  ComarchCommunityNews: {
    kbName: 'Comarch Community News',
    namespace: 'ComarchCommunityNews',
  },
  ComarchOptimaBusinessSemantics: {
    kbName: 'Comarch Optima Business Semantics',
    namespace: 'ComarchOptimaBusinessSemantics',
  },
  TaxbellLegalReference: {
    kbName: 'Taxbell Legal Reference',
    namespace: 'TaxbellLegalReference',
  },
  TaxbellPayrollHRReference: {
    kbName: 'Taxbell Payroll HR Reference',
    namespace: 'TaxbellPayrollHRReference',
  },
  TaxbellAccountingVATReference: {
    kbName: 'Taxbell Accounting VAT Reference',
    namespace: 'TaxbellAccountingVATReference',
  },
  ComarchUniversalKnowledge: {
    kbName: 'Comarch Universal Knowledge',
    namespace: 'ComarchUniversalKnowledge',
  },
  OWAOntology: {
    kbName: 'OWA Platform Optima Ontology',
    namespace: 'OWAOntology',
  },
  InsERTGTSchema: {
    kbName: 'InsERT GT MSSQL Schema',
    namespace: 'InsERTGTSchema',
  },
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonIfExists(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  writeFileAtomically(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function rawDraftMarkdown(draft) {
  return [
    `# ${draft.title}`,
    '',
    `- id: \`${draft.id}\``,
    `- kb: \`${draft.kbName}\``,
    `- namespace: \`${draft.kbNamespace}\``,
    `- createdAt: \`${draft.createdAt}\``,
    draft.sourceUrl ? `- sourceUrl: ${draft.sourceUrl}` : null,
    draft.tags?.length ? `- tags: ${draft.tags.map((tag) => `\`${tag}\``).join(', ')}` : null,
    draft.metadata?.sourceTier ? `- sourceTier: \`${draft.metadata.sourceTier}\`` : null,
    '',
    '## Content',
    '',
    draft.content,
    '',
  ].filter(Boolean).join('\n');
}

function listFilesRecursive(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const results = [];
  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.isFile()) results.push(fullPath);
    }
  }
  walk(rootDir);
  return results.sort((a, b) => a.localeCompare(b));
}

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function truncate(value, limit = 1200) {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 3)}...`;
}

export function slug(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^\w\s.-]/g, '')
    .trim()
    .replace(/[\s./\\-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

export function makePromotedId(prefix, draftId) {
  const normalized = slug(draftId) || 'DRAFT';
  if (normalized.length <= 96) return `${prefix}_${normalized}`;

  const hash = createHash('sha256').update(normalized).digest('hex').slice(0, 15).toUpperCase();
  return `${prefix}_${normalized.slice(0, 80)}_${hash}`;
}

export function splitDraftContent(content, maxLength = 1800) {
  const paragraphs = normalizeWhitespace(content)
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (!paragraphs.length) return [];

  const chunks = [];
  let current = '';
  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= maxLength) {
      current = candidate;
      continue;
    }
    if (current) chunks.push(current);
    if (paragraph.length <= maxLength) {
      current = paragraph;
      continue;
    }
    for (let index = 0; index < paragraph.length; index += maxLength) {
      chunks.push(paragraph.slice(index, index + maxLength));
    }
    current = '';
  }
  if (current) chunks.push(current);
  return chunks;
}

export function loadRegistry() {
  return readJsonIfExists(REGISTRY_PATH, {
    generatedAt: new Date().toISOString(),
    entries: [],
  });
}

export function saveRegistry(registry) {
  writeJson(REGISTRY_PATH, {
    ...registry,
    generatedAt: new Date().toISOString(),
    entries: [...(registry.entries || [])].sort((a, b) => a.draftId.localeCompare(b.draftId)),
  });
}

export function findRawDrafts() {
  return listFilesRecursive(RAW_INBOX_ROOT)
    .filter((filePath) => filePath.endsWith('.json'))
    .map((filePath) => {
      const draft = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return {
        ...draft,
        rawJsonPath: filePath,
        rawMarkdownPath: filePath.replace(/\.json$/, '.md'),
      };
    })
    .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
}

export function findRawDraftById(draftId) {
  const draft = findRawDrafts().find((item) => item.id === draftId);
  if (!draft) throw new Error(`Draft not found: ${draftId}`);
  return draft;
}

export function reroutePendingDraft(draftId, targetNamespace, options = {}) {
  const draft = findRawDraftById(draftId);
  const target = TARGET_KBS[targetNamespace];
  if (!target) throw new Error(`Unsupported target kbNamespace: ${targetNamespace}`);
  if (draft.kbNamespace === targetNamespace) {
    throw new Error(`Draft already targets ${targetNamespace}`);
  }
  const registry = loadRegistry();
  const existing = registryEntryFor(registry, draftId);
  if (existing && existing.status !== 'pending') {
    throw new Error(`Only pending drafts can be rerouted. Current status: ${existing.status}`);
  }

  const at = new Date().toISOString();
  const before = {
    kbName: draft.kbName,
    kbNamespace: draft.kbNamespace,
  };
  const next = {
    ...draft,
    kbName: target.kbName,
    kbNamespace: target.namespace,
    metadata: {
      ...(draft.metadata || {}),
      routingHistory: [
        ...(Array.isArray(draft.metadata?.routingHistory) ? draft.metadata.routingHistory : []),
        {
          from: draft.kbNamespace,
          to: target.namespace,
          at,
          by: String(options.reroutedBy || process.env.USER || 'operator'),
          note: String(options.note || '').slice(0, 1000),
          automationJobId: String(options.automationJobId || ''),
        },
      ],
    },
  };
  delete next.rawJsonPath;
  delete next.rawMarkdownPath;

  const jsonTemp = `${draft.rawJsonPath}.${process.pid}.reroute.tmp`;
  const markdownTemp = `${draft.rawMarkdownPath}.${process.pid}.reroute.tmp`;
  const previousJson = fs.readFileSync(draft.rawJsonPath, 'utf8');
  const previousMarkdown = fs.existsSync(draft.rawMarkdownPath)
    ? fs.readFileSync(draft.rawMarkdownPath, 'utf8')
    : null;
  try {
    fs.writeFileSync(jsonTemp, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    fs.writeFileSync(markdownTemp, rawDraftMarkdown(next), 'utf8');
    fs.renameSync(jsonTemp, draft.rawJsonPath);
    fs.renameSync(markdownTemp, draft.rawMarkdownPath);
  } catch (error) {
    fs.rmSync(jsonTemp, { force: true });
    fs.rmSync(markdownTemp, { force: true });
    fs.writeFileSync(draft.rawJsonPath, previousJson, 'utf8');
    if (previousMarkdown == null) fs.rmSync(draft.rawMarkdownPath, { force: true });
    else fs.writeFileSync(draft.rawMarkdownPath, previousMarkdown, 'utf8');
    throw error;
  }

  return {
    draft: {
      ...next,
      rawJsonPath: draft.rawJsonPath,
      rawMarkdownPath: draft.rawMarkdownPath,
    },
    before,
    after: {
      kbName: next.kbName,
      kbNamespace: next.kbNamespace,
    },
    reroutedAt: at,
  };
}

export function registryEntryFor(registry, draftId) {
  return (registry.entries || []).find((entry) => entry.draftId === draftId) || null;
}

export function resolveOwaPromotionContent(draft) {
  if (draft.kbNamespace !== 'OWAOntology') return { content: draft.content, provenance: null };
  if (Object.hasOwn(draft, 'content')) {
    if (typeof draft.content !== 'string' || !draft.content.trim()) {
      const error = new Error('Explicit OWA content is empty or invalid');
      error.code = 'EXPLICIT_OWA_CONTENT_INVALID';
      throw error;
    }
    return { content: draft.content, provenance: null };
  }

  const fail = (code, message) => {
    const error = new Error(message);
    error.code = code;
    throw error;
  };
  const unsafe = (message) => fail('UNSAFE_LEGACY_OWA_SOURCE', message);
  const contained = (base, file) => {
    const relative = path.relative(base, file);
    return relative && relative !== '..' && !relative.startsWith(`..${path.sep}`)
      && !path.isAbsolute(relative);
  };
  try {
    const jsonPath = draft.rawJsonPath;
    const mdPath = draft.rawMarkdownPath;
    for (const file of [jsonPath, mdPath]) {
      if (typeof file !== 'string' || !path.isAbsolute(file)
          || file.split(path.sep).some((part) => part === '..' || part === '.')
          || !contained(RAW_INBOX_ROOT, file)) {
        unsafe('Unsupported raw source path');
      }
    }
    if (!jsonPath.endsWith('.json') || mdPath !== jsonPath.replace(/\.json$/, '.md')) {
      unsafe('Raw JSON/Markdown pair mismatch');
    }
    const root = fs.realpathSync(ROOT);
    const base = fs.realpathSync(RAW_INBOX_ROOT);
    if (!contained(root, base)) unsafe('Raw inbox escaped ROOT');
    const json = fs.realpathSync(jsonPath);
    const md = fs.realpathSync(mdPath);
    if (!contained(base, json) || !contained(base, md)) unsafe('Source escaped raw inbox');
    if (path.dirname(json) !== path.dirname(md)
        || path.basename(json) !== path.basename(jsonPath)
        || path.basename(md) !== path.basename(mdPath)) {
      unsafe('Resolved source pair mismatch');
    }
    for (const file of [json, md]) {
      const stat = fs.statSync(file);
      if (!stat.isFile() || stat.size > 1024 * 1024) unsafe('Source is not a bounded regular file');
    }
    const stored = JSON.parse(fs.readFileSync(json, 'utf8'));
    if (stored.id !== draft.id || stored.kbNamespace !== 'OWAOntology'
        || Object.hasOwn(stored, 'content')) {
      unsafe('Source identity/content drift');
    }
    const bytes = fs.readFileSync(md);
    const content = bytes.toString('utf8');
    if (!Buffer.from(content, 'utf8').equals(bytes) || !content.trim()) {
      fail('LEGACY_OWA_MD_UNAVAILABLE', 'Source is empty or not lossless UTF-8');
    }
    return {
      content,
      provenance: {
        method: 'legacy_owa_adjacent_markdown',
        schemaVersion: 1,
        rawJsonPath: path.relative(ROOT, jsonPath).replaceAll(path.sep, '/'),
        rawMarkdownPath: path.relative(ROOT, mdPath).replaceAll(path.sep, '/'),
        rawMarkdownSha256: createHash('sha256').update(bytes).digest('hex'),
      },
    };
  } catch (error) {
    if (!error.code || ['ENOENT', 'ENOTDIR'].includes(error.code)) {
      fail('LEGACY_OWA_MD_UNAVAILABLE', 'Legacy OWA Markdown is unavailable');
    }
    throw error;
  }
}

// Operator-only utility: explicitly persist a local observation in a precreated
// private backup. No authentication/genesis claim; no log mutation or pruning.
export function captureOwaRecoveryAuditCheckpoint(backupDir) {
  const inside = (base, file) => {
    const rel = path.relative(base, file);
    return rel !== '' && rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
  };
  if (typeof backupDir !== 'string' || !path.isAbsolute(backupDir) || path.normalize(backupDir) !== backupDir
    || !inside(path.resolve(ROOT), backupDir)) throw new Error('Invalid checkpoint backup directory');
  for (const base of [RAW_INBOX_ROOT, PROMOTED_ROOT, REGISTRY_PATH, DASHBOARD_AUDIT_ROOT]) {
    if (backupDir === base || inside(base, backupDir) || inside(backupDir, base)) throw new Error('Checkpoint backup overlaps protected paths');
  }
  let current = path.parse(backupDir).root;
  for (const part of backupDir.slice(current.length).split(path.sep)) {
    current = path.join(current, part);
    if (!fs.lstatSync(current).isDirectory() || fs.lstatSync(current).isSymbolicLink()) throw new Error('Unsafe checkpoint backup ancestor');
  }
  if (fs.statSync(backupDir).mode & 0o077) throw new Error('Checkpoint backup must be private');
  const bytes = Buffer.from(`${JSON.stringify(captureDashboardAuditCheckpoint(), null, 2)}\n`);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (!verifyDashboardAuditCheckpoint(bytes, sha256).ok) throw new Error('Checkpoint changed during capture');
  const file = path.join(backupDir, 'audit-checkpoint.json');
  const fd = fs.openSync(file, 'wx', 0o600);
  try { fs.writeFileSync(fd, bytes); fs.fchmodSync(fd, 0o600); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  // Persist all existing directory links, not merely the file's contents.
  for (let dir = backupDir;; dir = path.dirname(dir)) {
    const handle = fs.openSync(dir, 'r');
    try { fs.fsyncSync(handle); } finally { fs.closeSync(handle); }
    if (dir === path.resolve(ROOT)) break;
  }
  if (!fs.readFileSync(file).equals(bytes)) throw new Error('Checkpoint readback mismatch');
  return { path: path.relative(ROOT, file), sha256 };
}

// Recovery is atomic per file, not a transaction across the pair and audit.
// The private durable journal is the authority for interrupted-operation retries.
export async function recoverOwaPromotedContent(draftId, options = {}) {
  const fail = (message, code = 'OWA_RECOVERY_REFUSED', cause) => {
    throw Object.assign(new Error(message, { cause }), { code, stateUncertain: code === 'RECOVERY_STATE_UNCERTAIN' });
  };
  const uncertain = (message, cause) => fail(message, 'RECOVERY_STATE_UNCERTAIN', cause);
  const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
  const stable = (value) => {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
    return value;
  };
  const fingerprint = (value) => hash(JSON.stringify(stable(value)));
  const inside = (base, file) => {
    const rel = path.relative(base, file);
    return rel !== '' && rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
  };
  // Check every existing component before reading or creating anything beneath it.
  // Reject symlinks even when they happen to point back into the approved tree.
  const safe = (file) => {
    if (!inside(path.resolve(ROOT), file)) fail('Path outside ROOT');
    let current = path.parse(file).root;
    for (const part of file.slice(current.length).split(path.sep)) {
      current = path.join(current, part);
      try { if (fs.lstatSync(current).isSymbolicLink()) fail('Symlink in recovery path'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    return file;
  };
  const relativePath = (value) => {
    if (typeof value !== 'string' || !value || path.isAbsolute(value)
        || value.includes('\\') || value.split('/').some((part) => !part || part === '.' || part === '..')) fail('Invalid ROOT-relative path');
    return safe(path.resolve(ROOT, value));
  };
  const read = (file) => {
    safe(file);
    if (!fs.statSync(file).isFile()) fail('Not a regular recovery file');
    return fs.readFileSync(file);
  };
  const sync = (file) => { const fd = fs.openSync(file, 'r'); try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); } };
  const durableDirectories = (directory) => {
    safe(directory);
    let parent = path.resolve(ROOT);
    for (const component of path.relative(parent, directory).split(path.sep)) {
      const child = safe(path.join(parent, component));
      try { fs.mkdirSync(child, { mode: 0o700 }); }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
      safe(child);
      if (!fs.lstatSync(child).isDirectory()) fail('Backup ancestor is not a directory');
      // Also resync existing links: an earlier attempt may have created the
      // directory but failed before its parent fsync completed.
      sync(parent);
      parent = child;
    }
  };
  const durableWrite = (file, bytes, mode) => {
    safe(file);
    writeFileAtomically(file, bytes);
    fs.chmodSync(file, mode);
    sync(file); sync(path.dirname(file));
    if (!read(file).equals(Buffer.from(bytes))) fail('Recovery readback mismatch');
  };
  const exclusive = (file, bytes, mode) => {
    safe(file);
    const fd = fs.openSync(file, 'wx', mode);
    try { fs.writeFileSync(fd, bytes); fs.fchmodSync(fd, mode); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
    sync(path.dirname(file));
  };
  // Freeze caller-owned inputs before the first await.
  const manifest = JSON.parse(JSON.stringify(options.manifest ?? null));
  const { operationId, backupDir } = options;
  const actor = options.actor;
  const note = options.note ?? '';
  const dryRun = options.dryRun === true;
  if (typeof draftId !== 'string' || !draftId || draftId.length > 500
      || typeof operationId !== 'string' || !/^[A-Za-z0-9_.-]+$/.test(operationId)
      || ['.', '..'].includes(operationId) || operationId.length > 200
      || typeof actor !== 'string' || !actor.trim() || actor.length > 200
      || typeof note !== 'string' || note.length > 1000) fail('Invalid recovery identity/actor/note');
  if (manifest?.schemaVersion !== 1 || manifest.namespace !== 'OWAOntology'
      || !/^[a-f0-9]{64}$/.test(manifest.registrySha256) || !Array.isArray(manifest.records)
      || !manifest.records.length) fail('Invalid OWA manifest');
  const seen = new Set();
  const paths = new Set();
  for (const item of manifest.records) {
    if (typeof item.id !== 'string' || !item.id || seen.has(item.id)) fail('Manifest IDs must be unique and exact');
    seen.add(item.id);
    const resolved = {};
    for (const key of ['rawJson', 'rawMarkdown', 'promotedJson', 'promotedMarkdown']) {
      if (!/^[a-f0-9]{64}$/.test(item[`${key}Sha256`])) fail('Invalid manifest hash');
      const file = relativePath(item[`${key}Path`]);
      if (paths.has(file)) fail('Manifest paths overlap');
      paths.add(file); resolved[key] = file;
      if (key.startsWith('raw') ? !inside(RAW_INBOX_ROOT, file) : path.dirname(file) !== path.join(PROMOTED_ROOT, 'OWAOntology')) fail('Invalid source/target containment');
    }
    if (!resolved.rawJson.endsWith('.json') || resolved.rawMarkdown !== resolved.rawJson.replace(/\.json$/, '.md')
        || !resolved.promotedJson.endsWith('.json') || resolved.promotedMarkdown !== resolved.promotedJson.replace(/\.json$/, '.md')) fail('Manifest pair mismatch');
  }
  const record = manifest.records.find((item) => item.id === draftId);
  if (!record) fail('Exact ID absent from manifest');
  if (typeof backupDir !== 'string' || !path.isAbsolute(backupDir) || path.normalize(backupDir) !== backupDir) fail('Invalid backup directory');
  safe(backupDir); safe(REGISTRY_PATH);
  for (const base of [RAW_INBOX_ROOT, PROMOTED_ROOT, REGISTRY_PATH, DASHBOARD_AUDIT_ROOT]) {
    if (backupDir === base || inside(base, backupDir) || inside(backupDir, base)) fail('Backup overlaps source/target/registry');
  }
  const files = Object.fromEntries(['rawJson', 'rawMarkdown', 'promotedJson', 'promotedMarkdown'].map((key) => [key, relativePath(record[`${key}Path`])]));
  const operationDir = safe(path.join(backupDir, operationId));
  const dir = safe(path.join(operationDir, hash(draftId)));
  const journalPath = safe(path.join(dir, 'journal.json'));
  const backupJson = safe(path.join(dir, 'before.json'));
  const backupMarkdown = safe(path.join(dir, 'before.md'));
  let checkpointPath;
  const auditBinding = {};
  if (Object.hasOwn(manifest, 'auditCheckpoint')) {
    const ref = manifest.auditCheckpoint;
    if (!ref || typeof ref !== 'object' || Array.isArray(ref)
        || Object.keys(ref).sort().join(',') !== 'path,sha256'
        || typeof ref.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(ref.sha256)) fail('Invalid audit checkpoint reference');
    checkpointPath = relativePath(ref.path);
    if (!inside(backupDir, checkpointPath) || checkpointPath === operationDir || inside(operationDir, checkpointPath)) fail('Checkpoint outside backup or overlaps operation');
    auditBinding.auditCheckpoint = { ...ref, scope: 'checkpointed_retained_suffix', ancestryVerified: false };
  }
  const verifyCheckpoint = () => {
    safe(checkpointPath);
    let parent = path.dirname(checkpointPath);
    for (;;) {
      const stat = fs.lstatSync(parent);
      if (!stat.isDirectory() || (stat.mode & 0o077)) uncertain('Audit checkpoint backup is not private');
      if (parent === backupDir) break;
      parent = path.dirname(parent);
    }
    const stat = fs.lstatSync(checkpointPath);
    if (!stat.isFile() || stat.size < 1 || stat.size > 8 * 1024 * 1024 || (stat.mode & 0o077)) uncertain('Invalid audit checkpoint file/size/permissions');
    const verification = verifyDashboardAuditCheckpoint(read(checkpointPath), manifest.auditCheckpoint.sha256);
    if (!verification.ok || verification.truncated) uncertain('Audit checkpoint cannot be verified');
    return verification;
  };
  const binding = fingerprint({ manifest, draftId, operationId, actor, note });
  const eventId = `owa_recovery_${hash(JSON.stringify([operationId, draftId]))}`;
  // Lazy import avoids the automation -> promoted library initialization cycle.
  const locks = [];
  let pendingError, outcome;
  try {
    if (!dryRun) {
      const { acquireAutomationLock } = await import('./dashboard_automation.mjs');
      for (const name of ['registry', 'kb_OWAOntology']) locks.push(acquireAutomationLock(name, { operationId, draftId }));
    }
    const validateSources = () => {
      if (hash(read(REGISTRY_PATH)) !== manifest.registrySha256) fail('Registry hash drift');
      const entries = JSON.parse(read(REGISTRY_PATH)).entries?.filter((entry) => entry.draftId === draftId);
      const entry = entries?.[0];
      if (entries?.length !== 1 || entry.status !== 'promoted' || entry.kbNamespace !== 'OWAOntology'
          || ['rawJsonPath', 'promotedJsonPath', 'promotedMarkdownPath'].some((key) => entry[key] !== record[key])) fail('Registry identity/status/path drift');
      for (const key of ['rawJson', 'rawMarkdown']) if (hash(read(files[key])) !== record[`${key}Sha256`]) fail('Raw source hash drift');
      const raw = JSON.parse(read(files.rawJson));
      if (raw.id !== draftId || raw.kbNamespace !== 'OWAOntology' || Object.hasOwn(raw, 'content')) fail('Not an eligible legacy OWA source');
      return resolveOwaPromotionContent({ ...raw, rawJsonPath: files.rawJson, rawMarkdownPath: files.rawMarkdown });
    };
    const resolved = validateSources();
    let j;
    let originalJson, originalMarkdown;
    const resumed = fs.existsSync(dir);
    if (resumed) {
      try {
        j = JSON.parse(read(journalPath));
        // v2 binds the stable audit payload separately from its nullable actual
        // receipt. Pre-v2 journals are refused, never silently migrated.
        if (j.schemaVersion !== 2 || j.binding !== binding || j.eventId !== eventId
            || fingerprint(j.auditCheckpoint ?? null) !== fingerprint(auditBinding.auditCheckpoint ?? null)
            || fingerprint(j.record) !== fingerprint(record) || j.registrySha256 !== manifest.registrySha256
            || !['PREPARED', 'JSON_WRITTEN', 'FILES_WRITTEN', 'AUDIT_PENDING', 'AUDITED', 'COMMITTED', 'COMPENSATED'].includes(j.state)) uncertain('Journal binding/state mismatch');
        originalJson = read(backupJson); originalMarkdown = read(backupMarkdown);
      } catch (error) { uncertain('Cannot prove existing operation journal/backups', error); }
    } else {
      originalJson = read(files.promotedJson); originalMarkdown = read(files.promotedMarkdown);
    }
    if (hash(originalJson) !== record.promotedJsonSha256 || hash(originalMarkdown) !== record.promotedMarkdownSha256) fail('Original snapshot hash drift');
    const before = JSON.parse(originalJson);
    if (before.id !== draftId || before.kbNamespace !== 'OWAOntology' || before.status !== 'promoted'
        || before.sourceDraftPath !== record.rawJsonPath || Object.hasOwn(before, 'contentRecovery')
        || (Object.hasOwn(before, 'content') && before.content !== '')) fail('Snapshot is not an empty promoted OWA record');
    const prefix = originalMarkdown.toString('utf8');
    if (!Buffer.from(prefix).equals(originalMarkdown) || !/(?:^|\n)## Content(?:\r?\n[ \t]*)*$/.test(prefix)
        || (prefix.match(/^## Content\r?$/gm) || []).length !== 1) fail('Unexpected/nonempty promoted Markdown body');
    const recovery = j?.recovery ?? { ...resolved.provenance, operationId, actor, note, ...auditBinding, recoveredAt: new Date().toISOString() };
    if (fingerprint({ ...recovery, recoveredAt: null }) !== fingerprint({ ...resolved.provenance, operationId, actor, note, ...auditBinding, recoveredAt: null })
        || typeof recovery.recoveredAt !== 'string' || !/^\d{4}-\d\d-\d\dT.*Z$/.test(recovery.recoveredAt) || !Number.isFinite(Date.parse(recovery.recoveredAt))) uncertain('Recovery provenance mismatch');
    const afterJson = Buffer.from(`${JSON.stringify({ ...before, content: resolved.content, contentRecovery: recovery }, null, 2)}\n`);
    const afterMarkdown = Buffer.from(`${prefix}${prefix.endsWith('\n') ? '' : '\n'}${resolved.content}`);
    const beforeHashes = { json: hash(originalJson), markdown: hash(originalMarkdown) };
    const afterHashes = { json: hash(afterJson), markdown: hash(afterMarkdown) };
    if (j && (fingerprint(j.beforeHashes) !== fingerprint(beforeHashes) || fingerprint(j.afterHashes) !== fingerprint(afterHashes))) uncertain('Journal hashes mismatch');
    // Repair provenance/payload stay fixed. Omit `at` entirely: only the audit
    // helper can choose append time under its shared append lock, after midnight
    // or intervening writers. The journal records the found event's receipt.
    const auditInput = { id: eventId, actor, role: 'operator', action: 'knowledge_draft.recover_content', resourceType: 'knowledge_draft', resourceId: draftId, outcome: 'success', before: beforeHashes, after: afterHashes, metadata: { binding, operationId, method: recovery.method, recoveredAt: recovery.recoveredAt, rawJsonPath: record.rawJsonPath, rawMarkdownPath: record.rawMarkdownPath, rawMarkdownSha256: record.rawMarkdownSha256, note, ...auditBinding } };
    if (j && (!j.auditInput || fingerprint(j.auditInput) !== fingerprint(auditInput)
        || !((j.auditAt === null && j.auditHash === null)
          || (typeof j.auditAt === 'string' && Number.isFinite(Date.parse(j.auditAt)) && /^[a-f0-9]{64}$/.test(j.auditHash)))
        || (['AUDITED', 'COMMITTED'].includes(j.state) && j.auditAt === null))) uncertain('Journal audit payload/receipt mismatch');
    const findAudit = () => {
      // listDashboardAudit intentionally skips malformed lines; verification must
      // precede it so an interrupted append cannot masquerade as absence.
      const verification = checkpointPath ? verifyCheckpoint() : verifyDashboardAudit(10000);
      if (!verification.ok || verification.truncated) uncertain('Audit chain cannot be fully verified within supported window');
      const candidates = listDashboardAudit({ resourceId: draftId, limit: 1000 });
      if (candidates.length === 1000) uncertain('Recovery audit search window exhausted');
      const matches = candidates.filter((event) => event.id === eventId);
      if (matches.length > 1) uncertain('Duplicate recovery audit IDs');
      const event = matches[0];
      if (event && Object.keys(auditInput).some((key) => fingerprint(event[key]) !== fingerprint(auditInput[key]))) uncertain('Recovery audit binding mismatch');
      if (event && j?.auditAt != null && (event.at !== j.auditAt || event.hash !== j.auditHash)) uncertain('Recovery audit identity mismatch');
      return event;
    };
    let event = findAudit();
    const current = () => ({ json: hash(read(files.promotedJson)), markdown: hash(read(files.promotedMarkdown)) });
    const assertKnownPair = () => {
      const actual = current();
      if (![beforeHashes.json, afterHashes.json].includes(actual.json) || ![beforeHashes.markdown, afterHashes.markdown].includes(actual.markdown)
          || (actual.json === beforeHashes.json && actual.markdown === afterHashes.markdown)) uncertain('Unproven snapshot pair state');
      return actual;
    };
    let actual = assertKnownPair();
    if (!resumed && (event || fingerprint(actual) !== fingerprint(beforeHashes))) uncertain('Recovered state without journal');
    const validateModes = () => {
      if (!Number.isInteger(j.modes?.json) || !Number.isInteger(j.modes?.markdown)
          || Object.values(j.modes).some((mode) => mode < 0 || mode > 0o777)
          || (fs.statSync(backupJson).mode & 0o777) !== j.modes.json
          || (fs.statSync(backupMarkdown).mode & 0o777) !== j.modes.markdown) uncertain('Invalid original permissions');
    };
    if (dryRun) {
      if (j) validateModes();
      if (j && ['AUDIT_PENDING', 'AUDITED', 'COMMITTED'].includes(j.state) && !event) uncertain('Audit attempt cannot be proven absent on retry');
      // A read-only observation, not a reservation or a durable repair. Reuse
      // every source/pair/journal/audit check above, then recheck before return.
      validateSources();
      const observed = assertKnownPair();
      if (fingerprint(observed) !== fingerprint(actual) || fingerprint(findAudit() ?? null) !== fingerprint(event ?? null)
          || (j && fingerprint(JSON.parse(read(journalPath))) !== fingerprint(j))) uncertain('Preview state drift');
      return (outcome = {
        status: 'planned', draftId, operationId, eventId, beforeHashes, afterHashes,
        currentHashes: observed, contentSha256: hash(resolved.content),
        wouldChange: fingerprint(observed) !== fingerprint(afterHashes),
        previewOnly: true, journalPath, ...auditBinding,
      });
    }
    if (!j) {
      // Exclusive, restrictive directory BEFORE any pair backups. A crash here
      // deliberately requires operator reconciliation rather than blind reuse.
      durableDirectories(operationDir);
      fs.mkdirSync(dir, { mode: 0o700 }); sync(operationDir);
      j = { schemaVersion: 2, binding, eventId, record, registrySha256: manifest.registrySha256, ...auditBinding, recovery, beforeHashes, afterHashes, auditInput, auditAt: null, auditHash: null, modes: { json: fs.statSync(files.promotedJson).mode & 0o777, markdown: fs.statSync(files.promotedMarkdown).mode & 0o777 }, state: 'PREPARED' };
      exclusive(backupJson, originalJson, j.modes.json);
      exclusive(backupMarkdown, originalMarkdown, j.modes.markdown);
      exclusive(journalPath, `${JSON.stringify(j, null, 2)}\n`, 0o600);
    }
    validateModes();
    const checkpoint = (state) => {
      const next = { ...j, state };
      durableWrite(journalPath, `${JSON.stringify(next, null, 2)}\n`, 0o600);
      j = next;
    };
    let durabilityFailure;
    const targetDurabilityBarrier = () => {
      if (durabilityFailure) throw durabilityFailure;
      try {
        // Readability is not durability, including after an initial exclusive
        // write or checkpoint rename succeeded but its fsync failed. Revalidate
        // the actual current journal and immutable originals before EVERY target
        // write (forward, partial completion, reconciliation or compensation).
        if (fingerprint(JSON.parse(read(journalPath))) !== fingerprint(j)) uncertain('Current journal binding/state drift');
        if (checkpointPath) {
          verifyCheckpoint();
          sync(checkpointPath);
          for (let parent = path.dirname(checkpointPath);; parent = path.dirname(parent)) {
            sync(parent);
            if (parent === path.resolve(ROOT)) break;
          }
        }
        for (const [file, expectedHash, mode] of [[backupJson, beforeHashes.json, j.modes.json], [backupMarkdown, beforeHashes.markdown, j.modes.markdown]]) {
          if (hash(read(file)) !== expectedHash || (fs.statSync(file).mode & 0o777) !== mode) uncertain('Original backup hash/permission drift');
          sync(file);
        }
        sync(journalPath);
        // Re-establish every reachable link, even if all paths already exist.
        durableDirectories(dir);
        sync(dir);
      } catch (error) {
        // A failed barrier grants no permission to mutate even for rollback.
        // Preserve the current pair for a later validated retry/reconciliation.
        durabilityFailure = Object.assign(new Error('Target durability barrier failed', { cause: error }), { code: 'RECOVERY_STATE_UNCERTAIN', stateUncertain: true });
        throw durabilityFailure;
      }
    };
    const put = (key, bytes) => {
      targetDurabilityBarrier();
      durableWrite(files[key === 'json' ? 'promotedJson' : 'promotedMarkdown'], bytes, j.modes[key]);
    };
    if (['AUDIT_PENDING', 'AUDITED', 'COMMITTED'].includes(j.state) && !event) uncertain('Audit attempt cannot be proven absent on retry');
    const noop = j.state === 'COMMITTED' && fingerprint(actual) === fingerprint(afterHashes) && !!event;
    if (noop) return (outcome = { status: 'noop', draftId, operationId, eventId, beforeHashes, afterHashes, journalPath, contentRecovery: recovery, ...auditBinding });
    try {
      validateSources(); assertKnownPair();
      if (actual.json !== afterHashes.json) put('json', afterJson);
      checkpoint('JSON_WRITTEN');
      validateSources(); assertKnownPair();
      if (actual.markdown !== afterHashes.markdown) put('markdown', afterMarkdown);
      checkpoint('FILES_WRITTEN');
      validateSources();
      if (fingerprint(current()) !== fingerprint(afterHashes)) uncertain('Final pair readback mismatch');
      if (!event) {
        checkpoint('AUDIT_PENDING');
        try { appendDashboardAudit(auditInput); }
        catch (error) {
          // A thrown append may have persisted the event. Reconcile before
          // compensating; malformed/unreadable audit means no safe rollback.
          event = findAudit();
          if (!event) { checkpoint('FILES_WRITTEN'); throw error; }
        }
        event = findAudit();
        if (!event) uncertain('Audit append not visible');
      }
      j = { ...j, auditAt: event.at, auditHash: event.hash };
      validateSources();
      if (fingerprint(current()) !== fingerprint(afterHashes)) uncertain('Post-audit pair drift');
      checkpoint('AUDITED'); checkpoint('COMMITTED');
      return (outcome = { status: 'recovered', draftId, operationId, eventId, beforeHashes, afterHashes, journalPath, contentRecovery: recovery, ...auditBinding });
    } catch (error) {
      if (error.code === 'RECOVERY_STATE_UNCERTAIN') throw error;
      try { event = findAudit(); } catch (auditError) { uncertain('Failure with unprovable audit state', new AggregateError([error, auditError])); }
      if (event) uncertain('Audit committed; retry journal finalization', error);
      const errors = [];
      try { assertKnownPair(); } catch (pairError) { uncertain('Cannot compensate changed pair', new AggregateError([error, pairError])); }
      for (const [key, bytes] of [['json', originalJson], ['markdown', originalMarkdown]]) {
        try { put(key, bytes); } catch (compensationError) { errors.push(compensationError); }
      }
      if (!errors.length) {
        try { checkpoint('COMPENSATED'); } catch (journalError) { errors.push(journalError); }
      }
      if (errors.length) throw Object.assign(new AggregateError(errors, `Recovery compensation failed: ${error.message}`, { cause: error }), { code: 'RECOVERY_STATE_UNCERTAIN', stateUncertain: true });
      throw error;
    }
  } catch (error) {
    pendingError = error;
    throw error;
  } finally {
    const errors = [];
    for (const lock of locks.reverse()) { try { lock.release(); } catch (error) { errors.push(error); } }
    if (errors.length) throw Object.assign(new AggregateError(
      pendingError ? [pendingError, ...errors] : errors,
      pendingError ? `Recovery lock release failed after: ${pendingError.message}` : 'Recovery lock release failed after completed recovery',
      { cause: pendingError },
    ), {
      code: pendingError?.code ?? 'RECOVERY_LOCK_RELEASE_FAILED',
      stateUncertain: pendingError?.stateUncertain ?? (pendingError?.code === 'RECOVERY_STATE_UNCERTAIN'),
      outcome,
    });
  }
}

export function promoteDraft(draftId, options = {}) {
  const draft = findRawDraftById(draftId);
  const target = TARGET_KBS[draft.kbNamespace];
  if (!target) throw new Error(`Unsupported kbNamespace: ${draft.kbNamespace}`);

  const registry = loadRegistry();
  const existing = registryEntryFor(registry, draftId);
  if (existing?.status === 'promoted' && !options.force) {
    throw new Error(`Draft already promoted: ${draftId}`);
  }

  const resolved = resolveOwaPromotionContent(draft);
  const promotedAt = new Date().toISOString();
  const promoted = {
    ...draft,
    status: 'promoted',
    promotedAt,
    promotedBy: options.promotedBy || process.env.USER || 'operator',
    reviewNote: options.reviewNote || '',
    sourceDraftPath: path.relative(ROOT, draft.rawJsonPath).replaceAll(path.sep, '/'),
  };
  delete promoted.rawJsonPath;
  delete promoted.rawMarkdownPath;
  if (resolved.provenance) {
    promoted.content = resolved.content;
    promoted.contentProvenance = { ...resolved.provenance, capturedAt: promotedAt };
  }

  const targetDir = path.join(PROMOTED_ROOT, draft.kbNamespace);
  ensureDir(targetDir);
  const jsonPath = path.join(targetDir, `${draft.id}.json`);
  const mdPath = path.join(targetDir, `${draft.id}.md`);
  writeJson(jsonPath, promoted);

  const markdown = [
    `# ${promoted.title}`,
    '',
    `- draftId: \`${promoted.id}\``,
    `- kbNamespace: \`${promoted.kbNamespace}\``,
    `- status: \`${promoted.status}\``,
    `- promotedAt: \`${promoted.promotedAt}\``,
    promoted.sourceUrl ? `- sourceUrl: ${promoted.sourceUrl}` : null,
    promoted.tags?.length ? `- tags: ${promoted.tags.map((tag) => `\`${tag}\``).join(', ')}` : null,
    promoted.reviewNote ? `- reviewNote: ${promoted.reviewNote}` : null,
    '',
    '## Content',
    '',
    promoted.content,
    '',
  ].filter(Boolean).join('\n');
  fs.writeFileSync(mdPath, markdown, 'utf8');

  const nextEntry = {
    draftId,
    status: 'promoted',
    kbName: target.kbName,
    kbNamespace: target.namespace,
    title: promoted.title,
    sourceUrl: promoted.sourceUrl || '',
    rawJsonPath: path.relative(ROOT, draft.rawJsonPath).replaceAll(path.sep, '/'),
    promotedJsonPath: path.relative(ROOT, jsonPath).replaceAll(path.sep, '/'),
    promotedMarkdownPath: path.relative(ROOT, mdPath).replaceAll(path.sep, '/'),
    promotedAt,
    promotedBy: promoted.promotedBy,
    reviewNote: promoted.reviewNote,
  };

  registry.entries = [
    ...(registry.entries || []).filter((entry) => entry.draftId !== draftId),
    nextEntry,
  ];
  saveRegistry(registry);

  appendDashboardAudit({
    actor: promoted.promotedBy,
    role: 'operator',
    action: 'knowledge_draft.promote',
    resourceType: 'knowledge_draft',
    resourceId: draftId,
    before: existing,
    after: nextEntry,
  });

  return { promoted, jsonPath, mdPath, registryEntry: nextEntry };
}

export function rejectDraft(draftId, options = {}) {
  const draft = findRawDraftById(draftId);
  const registry = loadRegistry();
  const existing = registryEntryFor(registry, draftId);
  const rejectedAt = new Date().toISOString();
  const nextEntry = {
    draftId,
    status: 'rejected',
    kbName: draft.kbName,
    kbNamespace: draft.kbNamespace,
    title: draft.title,
    sourceUrl: draft.sourceUrl || '',
    rawJsonPath: path.relative(ROOT, draft.rawJsonPath).replaceAll(path.sep, '/'),
    rejectedAt,
    rejectedBy: options.rejectedBy || process.env.USER || 'operator',
    reviewNote: options.reviewNote || '',
  };

  registry.entries = [
    ...(registry.entries || []).filter((entry) => entry.draftId !== draftId),
    nextEntry,
  ];
  saveRegistry(registry);
  appendDashboardAudit({
    actor: nextEntry.rejectedBy,
    role: 'operator',
    action: 'knowledge_draft.reject',
    resourceType: 'knowledge_draft',
    resourceId: draftId,
    before: existing,
    after: nextEntry,
  });
  return nextEntry;
}

export function withdrawPromotedDraft(draftId, options = {}) {
  const draft = findRawDraftById(draftId);
  const registry = loadRegistry();
  const existing = registryEntryFor(registry, draftId);
  if (existing?.status !== 'promoted') {
    throw new Error(`Only promoted drafts can be withdrawn. Current status: ${existing?.status || 'pending'}`);
  }

  const withdrawnAt = new Date().toISOString();
  const targetDir = path.join(WITHDRAWN_ROOT, draft.kbNamespace);
  ensureDir(targetDir);
  const movedPaths = [];

  for (const key of ['promotedJsonPath', 'promotedMarkdownPath']) {
    const relativePath = existing[key];
    if (!relativePath) continue;
    const sourcePath = path.join(ROOT, relativePath);
    if (!fs.existsSync(sourcePath)) continue;
    const destinationPath = path.join(targetDir, path.basename(sourcePath));
    fs.renameSync(sourcePath, destinationPath);
    movedPaths.push({
      from: relativePath,
      to: path.relative(ROOT, destinationPath).replaceAll(path.sep, '/'),
    });
  }

  const nextEntry = {
    draftId,
    status: 'withdrawn',
    kbName: existing.kbName || draft.kbName,
    kbNamespace: existing.kbNamespace || draft.kbNamespace,
    title: existing.title || draft.title,
    sourceUrl: existing.sourceUrl || draft.sourceUrl || '',
    rawJsonPath: existing.rawJsonPath || path.relative(ROOT, draft.rawJsonPath).replaceAll(path.sep, '/'),
    withdrawnAt,
    withdrawnBy: options.withdrawnBy || process.env.USER || 'operator',
    reviewNote: options.reviewNote || '',
    previousPromotedAt: existing.promotedAt || '',
    movedPaths,
  };

  registry.entries = [
    ...(registry.entries || []).filter((entry) => entry.draftId !== draftId),
    nextEntry,
  ];
  saveRegistry(registry);
  appendDashboardAudit({
    actor: nextEntry.withdrawnBy,
    role: 'operator',
    action: 'knowledge_draft.withdraw',
    resourceType: 'knowledge_draft',
    resourceId: draftId,
    before: existing,
    after: nextEntry,
  });
  return nextEntry;
}

export function reopenPromotedDraft(draftId, options = {}) {
  const draft = findRawDraftById(draftId);
  const registry = loadRegistry();
  const existing = registryEntryFor(registry, draftId);
  if (existing?.status !== 'promoted') {
    throw new Error(`Only promoted drafts can be reopened. Current status: ${existing?.status || 'pending'}`);
  }

  const reopenedAt = new Date().toISOString();
  const archiveNamespace = existing.kbNamespace || draft.kbNamespace;
  const targetParent = path.join(WITHDRAWN_ROOT, archiveNamespace, draftId);
  ensureDir(targetParent);
  let targetDir = path.join(targetParent, reopenedAt);
  for (let offset = 1; fs.existsSync(targetDir); offset += 1) {
    targetDir = path.join(targetParent, new Date(Date.parse(reopenedAt) + offset).toISOString());
  }
  ensureDir(targetDir);

  const movedPaths = [];
  const previousRegistry = {
    ...registry,
    entries: [...(registry.entries || [])],
  };
  let registrySaveAttempted = false;
  try {
    for (const key of ['promotedJsonPath', 'promotedMarkdownPath']) {
      const relativePath = existing[key];
      const sourcePath = path.join(ROOT, relativePath);
      const destinationPath = path.join(targetDir, path.basename(sourcePath));
      fs.renameSync(sourcePath, destinationPath);
      movedPaths.push({
        from: relativePath,
        to: path.relative(ROOT, destinationPath).replaceAll(path.sep, '/'),
      });
    }

    const nextEntry = {
      draftId,
      status: 'pending',
      kbName: existing.kbName || draft.kbName,
      kbNamespace: existing.kbNamespace || draft.kbNamespace,
      title: existing.title || draft.title,
      sourceUrl: existing.sourceUrl || draft.sourceUrl || '',
      rawJsonPath: existing.rawJsonPath || path.relative(ROOT, draft.rawJsonPath).replaceAll(path.sep, '/'),
      reopenedAt,
      reopenedBy: options.reopenedBy || process.env.USER || 'operator',
      reviewNote: options.reviewNote || '',
      previousPromotedAt: existing.promotedAt || '',
      movedPaths,
    };

    registry.entries = [
      ...(registry.entries || []).filter((entry) => entry.draftId !== draftId),
      nextEntry,
    ];
    registrySaveAttempted = true;
    saveRegistry(registry);
    appendDashboardAudit({
      actor: nextEntry.reopenedBy,
      role: 'operator',
      action: 'knowledge_draft.reopen',
      resourceType: 'knowledge_draft',
      resourceId: draftId,
      before: existing,
      after: nextEntry,
    });
    return nextEntry;
  } catch (error) {
    const compensationErrors = [];
    if (registrySaveAttempted) {
      try {
        saveRegistry(previousRegistry);
      } catch (compensationError) {
        compensationErrors.push(new Error(
          `Registry compensation failed: ${compensationError.message}`,
          { cause: compensationError },
        ));
      }
    }

    let snapshotsRestored = true;
    for (const movedPath of [...movedPaths].reverse()) {
      try {
        fs.renameSync(path.join(ROOT, movedPath.to), path.join(ROOT, movedPath.from));
      } catch (compensationError) {
        snapshotsRestored = false;
        compensationErrors.push(new Error(
          `Snapshot compensation failed for ${movedPath.from}: ${compensationError.message}`,
          { cause: compensationError },
        ));
      }
    }
    if (snapshotsRestored) {
      try {
        fs.rmSync(targetDir, { recursive: true, force: true });
      } catch (compensationError) {
        compensationErrors.push(new Error(
          `Archive cleanup compensation failed: ${compensationError.message}`,
          { cause: compensationError },
        ));
      }
    }

    if (compensationErrors.length) {
      throw new AggregateError(
        compensationErrors,
        `Reopen compensation failed after original failure: ${error.message}`,
        { cause: error },
      );
    }
    throw error;
  }
}

export function listInboxDrafts() {
  const registry = loadRegistry();
  const statusById = new Map((registry.entries || []).map((entry) => [entry.draftId, entry]));
  return findRawDrafts().map((draft) => {
    const entry = statusById.get(draft.id);
    return {
      id: draft.id,
      title: draft.title,
      kbName: draft.kbName,
      kbNamespace: draft.kbNamespace,
      sourceUrl: draft.sourceUrl || '',
      tags: draft.tags || [],
      createdAt: draft.createdAt || '',
      status: entry?.status || 'pending',
      rawJsonPath: path.relative(ROOT, draft.rawJsonPath).replaceAll(path.sep, '/'),
      registryEntry: entry || null,
    };
  });
}

export function loadPromotedKnowledge(kbNamespace) {
  const target = TARGET_KBS[kbNamespace];
  if (!target) return [];
  const targetDir = path.join(PROMOTED_ROOT, kbNamespace);
  return listFilesRecursive(targetDir)
    .filter((filePath) => filePath.endsWith('.json'))
    .map((filePath) => ({
      ...JSON.parse(fs.readFileSync(filePath, 'utf8')),
      promotedJsonPath: path.relative(ROOT, filePath).replaceAll(path.sep, '/'),
      promotedMarkdownPath: path.relative(ROOT, filePath.replace(/\.json$/, '.md')).replaceAll(path.sep, '/'),
    }))
    .filter((draft) => draft.status === 'promoted')
    .sort((a, b) => String(a.promotedAt || '').localeCompare(String(b.promotedAt || '')));
}
