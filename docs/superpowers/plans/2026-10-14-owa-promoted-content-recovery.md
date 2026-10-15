# OWA Promoted Content Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore exactly 67 legacy OWA promoted bodies from their paired raw Markdown while preserving promotion history and preventing recurrence.

**Architecture:** Resolve missing JSON content only at OWA promotion time. Add a distinct recovery API/CLI that updates an existing empty promoted snapshot without re-promoting it or rewriting registry entries. Use an exact-ID/hash manifest, protected backups, a per-operation journal and supported locks for recovery; verify exports remain byte-identical.

**Tech Stack:** Node.js ESM, existing atomic writer, supported automation locks and audit helpers, SHA-256, isolated filesystem fixtures and fault injection.

## Global Constraints

- Approved spec: `docs/superpowers/specs/2026-10-14-owa-promoted-content-recovery-design.md`.
- Authorized records are exactly `emptyRecords[].id` in `docs/reference/OWA_Empty_Promoted_Diagnosis_2026-10-14.json`: 67 unique OWA IDs, including two uppercase legacy IDs. Do not lowercase or rebuild identifiers from titles. Two raw filenames are lowercase/descriptive while their JSON IDs are uppercase/short; bind identity by JSON fields and approved paths, not filename = draft ID.
- Runtime edits are limited to `scripts/lib/promoted_knowledge.mjs` and `scripts/manage_knowledge_inbox.mjs`. Tests are added under `scripts/test_*.mjs`.
- Keep `findRawDrafts()`, the OWA exporter and version selector unchanged. A global content fallback changed 63 selected IDs in diagnosis and is forbidden here.
- Existing nonempty JSON wins. OWA fallback applies to missing `content`, not an explicitly blank or invalid field. No fallback for other namespaces.
- Preserve raw JSON/MD bytes, registry bytes, original promotion dates/operator/review fields, existing metadata/tags/status/source declarations, and unrelated snapshots.
- Never use bare `promote --force` to repair history.
- Exact raw Markdown body is retained without cleaning, truncation, LLM use or new verification claims. A full-file UTF-8 SHA-256 is the content checksum; the diagnosis's trimmed `bodySha256` is not a replacement for `rawMarkdown.sha256`.
- No production export, build, schema change, graph mutation/deletion, Optima business write, policy/shadow change, commit or push.
- Develop in an isolated checkout; preserve all dirty-main answer-layer, cleaner, pipeline and report work.
- Begin checks with `npm run check`. Inspect side effects before running tests. All RED/GREEN/fault injection uses temporary ROOT, no real network or production writes.
- Code integration, dashboard reload and the 67-record operation are controlled later tasks, after code review—not effects of unit tests.

## File and API map

| File | Responsibility |
|---|---|
| `scripts/lib/promoted_knowledge.mjs` | Namespace-scoped content resolution, promotion integration, recovery state machine. |
| `scripts/manage_knowledge_inbox.mjs` | Explicit `recover-owa-content` command, dry-run and application of one manifest-bound record. |
| `scripts/test_owa_promotion_content.mjs` | Missing-content promotion, JSON preference and source containment. |
| `scripts/test_owa_snapshot_recovery.mjs` | Exact state preservation, drift, idempotency, audit/write failure compensation. |
| `scripts/test_owa_recovery_cli.mjs` | CLI inputs, manifest scoping, dry-run and isolated apply. |

New contracts:

- `resolveOwaPromotionContent(draft) -> { content, provenance }`, synchronous. No global-loader changes.
- `recoverOwaPromotedContent(draftId, options) -> Promise<{ status, draftId, operationId, beforeHashes, afterHashes, contentSha256, auditEventId }>`.
- `options`: `{ manifestPath, backupDir, operationId, recoveredBy, reviewNote, dryRun }`.
- Recovery outcomes: `planned`, `recovered`, `noop`, `reconciled`; drift or uncertain state throws a stable error code.
- CLI: `node scripts/manage_knowledge_inbox.mjs recover-owa-content <exactId> --manifest <file> --backup-dir <directory> --operation-id <id> --by <actor> --note <text> [--dry-run]`.

## Task 1: OWA-only missing-body promotion fallback

**Files:** modify `scripts/lib/promoted_knowledge.mjs`; create `scripts/test_owa_promotion_content.mjs`.

**Interfaces:** Consume real `findRawDraftById()` paths. Produce promotion content/provenance without changing raw loader results, ordinary non-OWA behavior or existing nonempty JSON.

- [ ] **Step 1: Establish isolated baseline**

Read repository/scripts instructions, module map pipeline section, approved spec and diagnosis. Create an isolated checkout. The target library may have existing main changes: capture exact current target-file hashes/diffs and carry only the approved current baseline into the isolated checkout before editing. Record that baseline; never reset dirty main to HEAD. Run `npm run check`; expected exit 0.

- [ ] **Step 2: Write RED against actual promotion**

Use a temporary ROOT set before dynamic import, dummy metadata-only raw OWA JSON and its adjacent `.md`. Seed an empty fixture registry and block network/process execution. Core regression:

```js
const id = 'DRAFT_2026-07-15_FIXTURE';
const markdown = '# Encja: Konto testowe\n\n## Opis biznesowy\nDokumentacja testowa, nie dane ERP.\n';
const rawDir = path.join(root, 'downloads/knowledge_inbox/2026-07-15');
fs.mkdirSync(rawDir, { recursive: true });
fs.writeFileSync(path.join(rawDir, `${id}.json`), JSON.stringify({
  id, kbName: 'OWA Platform Optima Ontology', kbNamespace: 'OWAOntology',
  title: 'Encja: Konto testowe', createdAt: '2026-07-15T00:00:00Z',
  metadata: { sourceTier: 'ontology', retrievedAt: '2026-07-15T00:00:00Z' },
}));
fs.writeFileSync(path.join(rawDir, `${id}.md`), markdown);
const { promoteDraft } = await import('./lib/promoted_knowledge.mjs');
const result = promoteDraft(id, { promotedBy: 'fixture' });
assert.equal(result.promoted.content, markdown);
assert(fs.readFileSync(result.mdPath, 'utf8').includes(markdown));
```

Run `node scripts/test_owa_promotion_content.mjs`. Expected RED: current promoted content is absent. Cleanup ROOT in `finally`, including failed assertions.

- [ ] **Step 3: Implement constrained resolver**

Add a helper in the existing library, using its ROOT/constants and `createHash`:

```js
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
  const fail = (code, message) => { const error = new Error(message); error.code = code; throw error; };
  try {
    const base = fs.realpathSync(RAW_INBOX_ROOT);
    const json = fs.realpathSync(draft.rawJsonPath);
    const expectedMd = draft.rawJsonPath.replace(/\.json$/, '.md');
    if (expectedMd === draft.rawJsonPath || draft.rawMarkdownPath !== expectedMd) {
      fail('UNSAFE_LEGACY_OWA_SOURCE', 'Raw JSON/Markdown pair mismatch');
    }
    const md = fs.realpathSync(expectedMd);
    for (const file of [json, md]) {
      const relative = path.relative(base, file);
      if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`)
          || path.isAbsolute(relative)) fail('UNSAFE_LEGACY_OWA_SOURCE', 'Source escaped raw inbox');
    }
    if (path.dirname(json) !== path.dirname(md)
        || path.basename(json, '.json') !== path.basename(md, '.md')
        || path.basename(json) !== path.basename(draft.rawJsonPath)) {
      fail('UNSAFE_LEGACY_OWA_SOURCE', 'Source pair mismatch');
    }
    const jsonStat = fs.statSync(json);
    if (!jsonStat.isFile() || jsonStat.size > 1024 * 1024) {
      fail('UNSAFE_LEGACY_OWA_SOURCE', 'Raw JSON is not a bounded regular file');
    }
    const stored = JSON.parse(fs.readFileSync(json, 'utf8'));
    if (stored.id !== draft.id || stored.kbNamespace !== 'OWAOntology'
        || Object.hasOwn(stored, 'content')) {
      fail('UNSAFE_LEGACY_OWA_SOURCE', 'Source identity/content drift');
    }
    const stat = fs.statSync(md);
    if (!stat.isFile() || stat.size > 1024 * 1024) {
      fail('UNSAFE_LEGACY_OWA_SOURCE', 'Source is not a bounded regular file');
    }
    const bytes = fs.readFileSync(md), content = bytes.toString('utf8');
    if (!Buffer.from(content, 'utf8').equals(bytes) || !content.trim()) {
      fail('LEGACY_OWA_MD_UNAVAILABLE', 'Source is empty or not lossless UTF-8');
    }
    return { content, provenance: { method: 'legacy_owa_adjacent_markdown', schemaVersion: 1,
      rawJsonPath: path.relative(ROOT, draft.rawJsonPath).replaceAll(path.sep, '/'),
      rawMarkdownPath: path.relative(ROOT, expectedMd).replaceAll(path.sep, '/'),
      rawMarkdownSha256: createHash('sha256').update(bytes).digest('hex') } };
  } catch (error) {
    if (!error.code || ['ENOENT', 'ENOTDIR'].includes(error.code)) {
      const missing = new Error('Legacy OWA Markdown is unavailable');
      missing.code = 'LEGACY_OWA_MD_UNAVAILABLE';
      throw missing;
    }
    throw error;
  }
}
```

The example still needs adversarial path hardening verified by tests: reject the raw inbox itself escaping ROOT via symlink, paths with traversal components, and a mismatched JSON/MD pair even if a symlink happens to resolve to an allowed file. Source containment must be proven before a content read. Reject unsupported source layouts rather than guessing paths.

At normal `promoteDraft()` build time call this helper. For OWA fallback only, set `promoted.content` and add `contentProvenance` with the returned method/path/hash plus `capturedAt=promotedAt`. Preserve existing JSON body bytes and legacy normal promotion timestamps. Do not mutate raw draft objects or insert content into `findRawDrafts()`.

- [ ] **Step 4: Verify JSON preference, namespace and refusal GREEN**

Add independent tests for nonempty JSON plus different MD, non-OWA metadata-only input receiving no OWA fallback, explicit empty/invalid OWA content, missing/empty MD, uppercase IDs paired with lowercase/descriptive filenames, BOM/newlines, invalid UTF-8, >1 MiB, path traversal and file/directory/inbox symlink escapes. Failed cases assert no promoted files/registry success/audit success. Run the new test and inspected existing promoted reopen/BusinessSemantics/Sprint fixtures with temporary ROOT; expected exit 0. Record test effects and task-only review package; no commit.

## Task 2: History-preserving, journaled snapshot recovery

**Files:** modify `scripts/lib/promoted_knowledge.mjs`; create `scripts/test_owa_snapshot_recovery.mjs`.

**Interfaces:** Consume Task 1 resolver and exact manifest record. Produce preserved-history snapshot pair plus recovery provenance and one deterministic audit event, without calling `promoteDraft --force`, `saveRegistry()` or any build.

- [ ] **Step 1: Add RED preservation fixture**

Seed a metadata-only raw OWA fixture, empty promoted JSON/MD and a rich registry entry containing old dates/operator/review/extra fields. Save exact before bytes. Call new API and assert:

```js
const result = await recoverOwaPromotedContent(id, options);
assert.equal(result.status, 'recovered');
const after = JSON.parse(fs.readFileSync(promotedJsonPath, 'utf8'));
assert.equal(after.content, rawMarkdownBytes.toString('utf8'));
assert.equal(after.promotedAt, before.promotedAt);
assert.equal(after.promotedBy, before.promotedBy);
assert.equal(after.reviewNote, before.reviewNote);
assert.deepEqual(after.metadata, before.metadata);
for (const key of Object.keys(before)) assert.deepEqual(after[key], before[key]);
assert.equal(after.contentRecovery.method, 'legacy_owa_adjacent_markdown');
assert.equal(after.contentRecovery.rawMarkdownSha256, sha256(rawMarkdownBytes));
assert.deepEqual(fs.readFileSync(registryPath), registryBeforeBytes);
assert.deepEqual(fs.readFileSync(rawJsonPath), rawJsonBeforeBytes);
assert.deepEqual(fs.readFileSync(rawMarkdownPath), rawMarkdownBytes);
```

`sha256` in tests is `bytes => createHash('sha256').update(bytes).digest('hex')`. Fixture `options` supplies an actual manifest, unique operation ID, temporary backup directory and actor. Run new test; expected RED: missing recovery API.

- [ ] **Step 2: Define manifest and operation state**

Manifest schema:

```js
{
  schemaVersion: 1,
  namespace: 'OWAOntology',
  registrySha256,
  records: [{ id, rawJsonPath, rawJsonSha256, rawMarkdownPath, rawMarkdownSha256,
    promotedJsonPath, promotedJsonSha256, promotedMarkdownPath, promotedMarkdownSha256 }]
}
```

Production manifest has exactly diagnosis `emptyRecords` IDs with fresh before hashes; tests may use one or two IDs. Validate unique exact IDs, namespace, ROOT-relative paths, source containment and target direct-child containment. An ID absent from manifest is refused. Existing raw/promoted/registry must all identify the same promoted OWA record. Never repair a different-status or already-populated unrelated snapshot.

Support locks without adding an eager dependency cycle: the new **async** API may dynamically import `acquireAutomationLock()` from `dashboard_automation.mjs` after the promoted library is initialized. Acquire `registry` then `kb_OWAOntology`, release in reverse `finally`. Do not call provider/config functions or pretend these advisory locks constrain every possible manual writer. Revalidate hashes/state under lock; no stale-lock deletion beyond existing helper behavior.

Use `backupDir/<safe operation ID>/<SHA256 exact draft ID>/` for backups/journal; validate operation ID against `[A-Za-z0-9_.-]+`, excluding `.` and `..`. Reject backup/source/target overlaps and symlink escapes. Backup uses exclusive creation, not overwrite. Preserve before JSON/MD bytes and permissions, source/registry hashes and all after hashes. A directory already present is reconciled by journal and hashes, never silently reused with different inputs.

- [ ] **Step 3: Implement guarded recovery and compensation**

State transitions:

1. Validate manifest/current state; resolve the exact MD; prepare after JSON from **existing promoted** object, not raw object, adding only `content` and `contentRecovery`.
2. Preserve the current Markdown prefix through its trailing empty `## Content`; replace only its empty content body with exact raw Markdown. Reject a nonempty/unexpected existing body instead of reconstructing its metadata header.
3. Write and fsync `PREPARED` journal plus immutable original pair backups before target writes.
4. Atomically write JSON, then MD via `writeFileAtomically()`, with byte readback. Journal each phase, keeping `JSON_WRITTEN`, `FILES_WRITTEN` and expected hashes explicit.
5. Append audit action `knowledge_draft.recover_content` with deterministic event ID from operation ID + exact draft ID. Include before/after hashes and recovery method—not complete source body. Use `listDashboardAudit()` to reconcile an event already appended under the same ID/hash; no raw manual audit-file rewrites.
6. Journal `AUDITED`/`COMMITTED`, return actual hashes and event ID. No registry write.
7. If a write or pre-append audit operation fails, restore exact original pair through the atomic writer and journal `COMPENSATED`; preserve the original error plus any compensation failure. Registry/raw remain untouched.
8. If audit may already be committed or a crash interrupted journal finalization, classify the actual pair/audit state. Finish a provably matching operation without duplicate audit or refuse with `RECOVERY_STATE_UNCERTAIN`. Never claim all files and audit are one atomic transaction.

`contentRecovery` holds schema version, method, original raw paths/hash, operation ID, actor/note and recovery UTC time. Existing `metadata` and every old promoted property remain exactly equal. New provenance is explicitly repair time, not new promotion/source verification.

- [ ] **Step 4: Fault injection and no-op GREEN**

Run fixture cases independently:

- successful repair, rich registry and old fields byte/semantic equal;
- repeated same operation no-op, one audit event;
- matching partial JSON-after/MD-before state from journal reconciles safely;
- malformed manifest, wrong namespace/status/ID, raw/MD/target/registry drift refuses before write;
- existing different nonempty content and mismatching recovery marker refuses;
- injected first/second rename failure, audit failure before append, journal failure after files, ambiguous audit state, failed compensation;
- lock conflict and lock release on every exit;
- target/source/backup symlink/path escape;
- all source declarations remain unchanged, including partially verified ontology claims.

Use temporary sentinels/read guards, never `/etc/passwd` or real secret files as adversarial targets. Inspect existing `test_promoted_knowledge_reopen.mjs` for its compensation patterns. Run `node scripts/test_owa_snapshot_recovery.mjs`, Task 1 test, reopen and appropriate existing promoted fixtures; expected exit 0 with zero real network/process calls. Record RED/GREEN, fault phases and actual API shape for CLI task.

## Task 3: Explicit CLI, dry-run and manifest-bound batch

**Files:** modify `scripts/manage_knowledge_inbox.mjs`; create `scripts/test_owa_recovery_cli.mjs`.

**Interfaces:** CLI maps exact flags to Task 2 API and awaits it before exiting. No exporter, builder or automation trigger.

- [ ] **Step 1: Add RED CLI subprocess fixtures**

Use a disposable ROOT/backup manifest and spawn only the repository CLI in a dummy environment. Assert `--dry-run` returns `planned` with unchanged target/registry bytes and no success audit; apply returns `recovered`; repeat returns `noop`. Unknown IDs, missing flags and wrong manifests exit nonzero without modification. The child must not inherit real provider/auth credentials. Run `node scripts/test_owa_recovery_cli.mjs`; expected RED because the command is absent.

- [ ] **Step 2: Wire the command**

Add the API import and usage line. Add a branch before the unknown-command error:

```js
if (command === 'recover-owa-content') {
  if (!draftIdOrNamespace) throw new Error('recover-owa-content requires exact draftId');
  for (const flag of ['--manifest', '--backup-dir', '--operation-id']) {
    if (!argValue(args, flag)) throw new Error(`${flag} is required`);
  }
  const result = await recoverOwaPromotedContent(draftIdOrNamespace, {
    manifestPath: argValue(args, '--manifest'), backupDir: argValue(args, '--backup-dir'),
    operationId: argValue(args, '--operation-id'), recoveredBy: argValue(args, '--by', 'operator'),
    reviewNote: argValue(args, '--note', ''), dryRun: hasArg(args, '--dry-run'),
  });
  printJson({ ok: true, action: 'recover_owa_content', ...result });
  process.exit(0);
}
```

All path/hash checks live in the library too, not only CLI argument handling. Output only bounded result metadata/hashes, not entire source content. Normal list/show/promote/reject/withdraw commands retain behavior.

- [ ] **Step 3: Verify CLI and whole patch**

Run `npm run check`, all three new tests, inspected existing atomic/reopen/promoted BusinessSemantics/Sprint tests and explicit syntax checks for new scripts. Keep fixture writes in temporary ROOT. Run `git diff --check` and final independent code review. No live repair before review. Record isolated checkout path, source hashes and complete uncommitted patch; no commit/push.

## Task 4: Controlled integration, recovery67 and readback

**Files:** read exact diagnosis JSON/spec/approved code reports. New operation report: `docs/reference/OWA_Content_Recovery_Execution_2026-10-14.md` and JSON. Backups/journal: `backups/manual-repairs/owa-content-recovery-20261014/`, outside automated pruning and Git.

**Interfaces:** Use reviewed CLI for exact 67 IDs; never manually edit raw/promoted files or reuse `promote --force`. Only CLI writes paired snapshot contents and supported audit.

- [ ] **Step 1: Preflight and complete protected backup**

Confirm reviewed target files match main's captured baseline or stop for conflict. Transfer only reviewed library/CLI/tests via controlled patch, preserving all unrelated main work. Verify hashes, syntax and mcpbot readability.

Use supported loaders to verify exactly 134 OWA promoted records, exactly 67 missing bodies and identical authorized ID set. Freshly hash all 67 raw JSON/MD, all 134 promoted pairs, complete registry, exporter code and five CSVs plus manifest. Stop on unexpected drift; don't refresh accepted diagnosis silently.

Create protected durable backup of exact 67 original pairs plus registry and hash manifests with safe relative paths; verify backup byte hashes and offline reconstruction. Capture mcpbot access and permissions. Create immutable operation manifest using full `rawMarkdown.sha256`, not the trimmed-body hash. Record exclusive window/no active promotion/build actions and supported lock behavior. No broad pause/shadow/timer changes unless separately necessary and recorded.

- [ ] **Step 2: Dry-run then apply the exact ID list**

Run reviewed CLI `--dry-run` for every ID, verify zero target changes. Apply sequentially as `mcpbot` using one safe operation ID and manifest, journaling/checkpointing each result. On interruption, reconcile actual hashes/journal/audit before retry; never replay uncertain writes blindly. Do not add fallback records or neighboring title versions to reach a count.

- [ ] **Step 3: Verify preservation and selection invariants**

Read back all 67 promoted JSON/MD pairs: full content SHA equals raw MD byte hash, metadata/history/date fields equal originals, valid recovery provenance and exactly one committed audit outcome per operation/ID. Verify 67 other nonempty OWA snapshots and all outside-namespace snapshot hashes unchanged; raw files and registry byte-identical.

Five production CSV hashes, manifest and selected 67-ID set must equal baseline. Verify the selector's code and every raw input hash unchanged; the existing diagnosis's read-only exporter reconstruction may be rerun without its write-side entrypoint if further proof is required. Count current promoted OWA: 134, empty bodies: 0. No production export/build or graph query/mutation is needed to prove this snapshot-only change.

- [ ] **Step 4: Prevent future empty promotion and close**

Identify long-lived dashboard/MCP entrypoints importing the changed promotion module. Check no active operations, then reload only affected services in a controlled deployment step; don't restart Docker/proxy/timers or grant new tool permissions. Verify health, original automation configuration and semantic read availability. No synthetic production promotion is necessary; future-promotion behavior is proven by isolated actual-helper tests.

Record snapshot recovery, archival/source-fidelity limits and independent routing/status-blind-export findings as separate follow-ups. Keep backup/journal, code uncommitted and worktree available. Do not present unchanged export as a new build or source declarations as newly verified MSSQL facts.

## Self-review coverage

- Task 1 prevents future OWA-only missing-content loss without altering selector inputs.
- Task 2 preserves state/history and handles exact-ID recovery, idempotency and partial failures.
- Task 3 makes recovery a supported explicit CLI action without build side effects.
- Task 4 binds backup/authorized67 scope and proves content recovery plus unchanged source/registry/export invariants.
- Normal re-promotion/force semantics and all other namespaces remain outside the repair path.
