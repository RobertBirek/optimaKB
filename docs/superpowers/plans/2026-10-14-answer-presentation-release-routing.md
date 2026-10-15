# Answer Presentation and Release Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return source-attributed substantive excerpts instead of metadata dumps, and make the release tool search permitted Community release evidence.

**Architecture:** Keep the existing deterministic local-artifact backend and public MCP tools. Add named CSV fields and source metadata to selected hits; assemble bounded, coherent extracts with separate complete citations. Pass a server-selected release intent through the existing scoped routing path.

**Tech Stack:** Node.js ESM, existing CSV parser, filesystem reads constrained to allowed promoted metadata, Node assertions/test runner, real MCP JSON-RPC handler with isolated test ROOT.

## Global Constraints

- Approved spec: `docs/superpowers/specs/2026-10-14-answer-presentation-release-routing-design.md`.
- Runtime changes are limited to four files: `scripts/lib/knowledge_retrieval.mjs`, `scripts/erp_knowledge_answer.mjs`, `scripts/erp_knowledge_assistant.mjs`, `scripts/lib/erp_knowledge_mcp_core.mjs`.
- No new LLM, source/graph/schema mutation, exporter/build run, namespace permission expansion, policy/shadow change, reverse-proxy edit, commit or push.
- Prepare code in an isolated checkout. Preserve dirty main changes from source cleaning, pipeline corrections and operational reports.
- Start verification with `npm run check`; inspect each test's side effects before executing.
- Preserve CSV records, physical locators, artifact hashes/URIs, technical matching, invalid-CSV fail-closed behavior, legacy callers and provenance warnings.
- Source body limit: **2 principal sources, up to 3 sections per source, 4000 substantive characters total**. Citations are outside this budget.
- Full literal source URL is never clipped. Publication, update, retrieval, promotion and observation dates remain distinct.
- Missing dates remain null with a reason. Month-only dates and local times without timezone keep their precision; do not invent UTC or a day.
- Same-source grouping includes namespace, URL, owning path and version/date basis. Shared canonical ID/URL alone does not combine source versions.
- Frozen QA: exact questions/criteria in `Post_Correction_16Q_2026-10-13.json`; live baseline in `Live_Post_Correction_16Q_2026-10-14.json`. Do not rewrite queries, backfill unreturned facts or award PASS for IDs alone.
- Tests use isolated ROOT, no production logs/drafts/learning writes, no network or external fallback. Local test results are not live QA.
- Deployment and service reload are a separate authorized phase; no deployment during implementation tasks.

## File responsibilities and additive contracts

| File | Responsibility |
|---|---|
| `scripts/lib/knowledge_retrieval.mjs` | Expose CSV headers; named-field body/source extraction; body-relative preview anchoring. |
| `scripts/erp_knowledge_answer.mjs` | Body-aware scanner; constrained metadata resolution; source grouping, extracts, full citations. |
| `scripts/erp_knowledge_assistant.mjs` | Apply release intent after namespace filtering and normal classification. |
| `scripts/lib/erp_knowledge_mcp_core.mjs` | Forward internal intent for release tool and expose additive structured sources. |

New helpers are defined in the existing modules, not a new runtime layer:

- `getSourceFields(columns, record, artifact)` in retrieval returns `{ fields, bodyField, bodyText, identityText, source }`. `fields` maps exact CSV column names to strings; `source` holds `recordId`, `title`, `sourceUrl`, `owningPath`, `sourceDocumentRefId`, `sourceOrigin` and declared CSV date fields.
- `makeBodyPreview(bodyText, terms, focusHints, normalize)` in retrieval returns `{ snippet, bodyOffset, bodyMatchedTerms, stemMatchedTerms }`. Offset belongs to normalized display-body text, not a joined CSV record.
- `resolveSourceMetadata(source, namespace, allowedNamespaces, root)` in answer is read-only and returns structured dates, basis/precision, owning draft ID and unresolved reason.
- `assembleSourceExtracts(evidence, question, limits)` in answer returns `{ sources, extracts, omissions }`. Each extract binds a source key and real evidence locators; source objects retain full URL/dates and record IDs.
- `answerQuestion(question, allowedNamespaces = null, options = {})` and `classifyQuestion(question, routing, allowedNamespaces, options = {})` accept additive internal `options.intent === 'release'`.

## Task 1: Named fields and body-aware previews

**Files:**
- Modify: `scripts/lib/knowledge_retrieval.mjs:18–79`.
- Modify: `scripts/erp_knowledge_answer.mjs:98–151`.
- Test: `scripts/test_erp_knowledge_retrieval.mjs`.
- Create: `scripts/test_answer_body_fields.mjs`.

**Interfaces:** Consume existing parser/scoring/locators. Produce named source fields and additive hit body/source information for Task 2. Do not alter the renderer or release routing yet.

- [ ] **Step 1: Verify isolation and baseline**

Read `scripts/AGENTS.md`, module map retrieval working set and approved spec. Establish an isolated checkout; do not start services or install packages for these core-module tests. Record baseline SHA and dirty-main preservation. Run `npm run check`; expected exit 0.

- [ ] **Step 2: Add a failing body-masking regression**

Create an isolated fixture whose early ID/URL matches the query before the body. Use valid multiline CSV and restore ROOT/fetch in `finally`. Core assertion:

```js
const columns = ['id', 'name', 'sourceDocumentRefId', 'sourceUrl', 'content'];
const cells = ['TBDOC_INFORMACJE', 'Informacje CIT', 'TBDOC_INFORMACJE_CIT',
  'https://example.test/informacje-cit',
  '## Stawki\nStawka ogólna wynosi 19%; 9% jest warunkowe i dotyczy dochodów innych niż kapitałowe.'];
const csv = [columns, cells].map(row => row.map(value =>
  `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n') + '\n';
fs.writeFileSync(path.join(root, 'chunk.csv'), csv);
const { scanArtifact } = await import('./erp_knowledge_answer.mjs');
const scan = scanArtifact('chunk.csv', ['informacje', 'warunkowe', 'kapitalowe']);
assert.equal(scan.hits[0].bodyField, 'content');
assert(scan.hits[0].snippet.includes('9%'));
assert(!scan.hits[0].snippet.includes('TBDOC_INFORMACJE'));
assert.equal(scan.hits[0].source.sourceUrl, 'https://example.test/informacje-cit');
```

Add controls for shuffled column order, stem-only matching, Business Semantics full description, document summary, technical records without a body, and malformed quoted CSV. Run `node scripts/test_answer_body_fields.mjs`; expected RED: missing named body contract or metadata instead of substantive content.

- [ ] **Step 3: Preserve parser fields and implement source extraction**

Change the valid parser return only:

```js
return { columns: records[0]?.cells || [], records: records.slice(1), warnings: [] };
```

Keep malformed returns fail-closed; do not reinterpret physical locators.

Initial complete field helper:

```js
export function getSourceFields(columns, record, artifact = '') {
  const fields = Object.fromEntries(columns.map((name, index) =>
    [String(name).trim(), String(record.cells?.[index] ?? '')]));
  const priorities = /business_description\.csv$/i.test(artifact)
    ? ['description', 'content', 'summary']
    : /reference_document\.csv$/i.test(artifact)
      ? ['summary', 'content', 'description']
      : ['content', 'summary', 'description', 'definitionPreview'];
  const bodyField = priorities.find(name => fields[name]?.trim()) || null;
  const provenanceFields = new Set(['id', 'sourceUrl', 'sourcePath', 'localSnapshotPath',
    'publishedAt', 'lastModified', 'retrievedAt', 'contentHash']);
  const technicalText = Object.entries(fields)
    .filter(([name]) => !provenanceFields.has(name))
    .map(([, value]) => value).filter(Boolean).join(' | ');
  return {
    fields,
    bodyField: bodyField || 'technical_fields',
    bodyText: bodyField ? fields[bodyField] : technicalText,
    identityText: record.cells ? record.cells.join(' | ') : String(record.text || ''),
    source: {
      recordId: fields.id || null,
      title: fields.name || fields.title || null,
      sourceUrl: fields.sourceUrl || null,
      owningPath: fields.sourcePath || fields.localSnapshotPath || null,
      sourceDocumentRefId: fields.sourceDocumentRefId || null,
      sourceOrigin: fields.sourceOrigin || fields.sourceType || fields.semanticType || null,
      csvDates: { publishedAt: fields.publishedAt || null,
        lastModified: fields.lastModified || null, retrievedAt: fields.retrievedAt || null },
    },
  };
}
```

Refine field policy only with a failing compatibility test; never replace `content` with a short preview when full content exists. Plain text artifacts retain their current path.

- [ ] **Step 4: Anchor previews only in body text**

Implement the helper using existing bounded term matching:

```js
export function makeBodyPreview(bodyText, terms, focusHints, normalize) {
  const text = String(bodyText || '').replace(/\s+/g, ' ').trim();
  const normalized = normalize(text);
  const bodyMatchedTerms = terms.filter(term => containsTerm(normalized, term));
  const stemMatchedTerms = terms.filter(term => term.length >= 8
    && !bodyMatchedTerms.includes(term) && normalized.includes(term.slice(0, 5)));
  const anchors = [...focusHints, ...terms.filter(term => DOCUMENT_CODES.has(term)),
    ...bodyMatchedTerms];
  let index = anchors.map(term => findTermIndex(normalized, term)).find(value => value >= 0);
  if (index === undefined) index = stemMatchedTerms.length
    ? normalized.indexOf(stemMatchedTerms[0].slice(0, 5)) : 0;
  const bodyOffset = Math.max(0, index - 60);
  const prefix = bodyOffset ? '...' : '';
  const available = MAX_SNIPPET_LENGTH - prefix.length;
  const fragment = text.slice(bodyOffset, bodyOffset + available);
  const snippet = prefix + (text.length > bodyOffset + available
    ? `${fragment.slice(0, -3)}...` : fragment);
  return { snippet, bodyOffset, bodyMatchedTerms, stemMatchedTerms };
}
```

In `scanArtifact`, get named fields from `parsed.columns`, keep existing relevance scoring/technical matching and use `makeBodyPreview` for the selected body instead of a joined-record anchor. Add `recordId`, `bodyField`, `bodyText`, `source`, `bodyOffset`, body/stem matches to hits, keeping `line`, `endLine`, `score`, `snippet`, `matchedTerms` for compatibility. UTF normalization offsets must refer to the normalized display representation; a dedicated diacritic/whitespace test must reject accidental raw-index misuse. No URL or ID controls answer position.

- [ ] **Step 5: Verify Task 1 GREEN**

Run `node scripts/test_answer_body_fields.mjs`, `npm run test:retrieval`, `npm run test:answer-focus`, then explicit `node --check` for modified/new scripts and `git diff --check`. Expected exit 0, original technical/doc-code/scoping cases preserved. Record RED/GREEN and task-only diff for review; no commit.

## Task 2: Structured citations, source dates and coherent extracts

**Files:**
- Modify: `scripts/erp_knowledge_answer.mjs:162–303` and read-only metadata helpers in that same file.
- Create: `scripts/test_answer_source_citations.mjs`.
- Create: `scripts/test_answer_extracts.mjs`.
- Test: `scripts/test_erp_knowledge_retrieval.mjs`, `scripts/test_erp_knowledge_answer_focus.mjs`.

**Interfaces:** Consume Task 1 hit bodies/source fields. Produce `answer.sources`, `answer.extracts`, `answer.omissions` and source-attributed Markdown. Do not change `evidenceAssessment` into verification of facts or effective dates.

- [ ] **Step 1: Add failing attribution/date tests**

Create temp ROOT with same-namespace promoted JSON at `docs/reference/knowledge_inbox/promoted/TaxbellLegalReference/draft_fixture.json`. It contains `id`, `status:'promoted'`, namespace, exact source URL and metadata publication `2025-12`, update `2026-02-27T18:03:45+01:00`, retrieval timestamp, and a later promotion timestamp. Core assertions:

```js
const source = { recordId: 'CHUNK_FIXTURE', title: 'Poradnik',
  sourceUrl: 'https://example.test/book.pdf?version=2026%2F02&chapter=1',
  owningPath: 'docs/reference/knowledge_inbox/promoted/TaxbellLegalReference/draft_fixture.md',
  sourceDocumentRefId: 'DOC_CANONICAL', csvDates: { publishedAt: '2026-10-13T12:00:00Z' } };
const meta = resolveSourceMetadata(source, 'TaxbellLegalReference',
  new Set(['TaxbellLegalReference']), root);
assert.equal(meta.publication.value, '2025-12');
assert.equal(meta.publication.precision, 'month');
assert.equal(meta.publication.basis, 'promoted_source_metadata');
assert.equal(meta.owningDraftId, 'draft_fixture');
```

Add RED cases for complete long URL rendering, unknown date reason, no timezone assumption, wrong namespace/URL/ID, path traversal, symlink escape, and canonical document metadata not replacing owning chunk metadata. Assert no reads outside allowed base with adversarial fixture files. Run `node scripts/test_answer_source_citations.mjs`; expected RED before resolver/citation implementation.

- [ ] **Step 2: Implement the bounded metadata resolver**

Use `path.resolve` and `fs.realpathSync` for ROOT's namespace promoted directory and requested JSON. Allowed path must be a direct child `<draft ID>.json` of that real directory; `.md` is converted only at the final extension. Verify namespace permission before I/O; reject paths with traversal components, unknown extension or foreign namespace. Resolve namespace directory itself against the allowed promoted root; do not let a namespace symlink escape it. Verify JSON `id` equals filename stem, `kbNamespace` equals the current group and `sourceUrl` equals the hit's literal URL.

Return only source date/provenance fields, not arbitrary JSON contents. Missing source dates remain null. Date field constructor:

```js
function sourceDate(value, basis) {
  if (!value) return { value: null, precision: null, timezone: null, basis,
    reason: 'source_date_unavailable' };
  const text = String(value);
  const month = /^\d{4}-\d{2}$/.test(text);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(text);
  const datetime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/.test(text);
  if (!month && !day && !datetime) return { value: null, precision: null,
    timezone: null, basis, reason: 'invalid_source_date' };
  return { value: text, precision: month ? 'month' : day ? 'day' : 'datetime',
    timezone: datetime ? /(?:Z|[+-]\d{2}:\d{2})$/.exec(text)?.[0] || 'unspecified' : null,
    basis, reason: null };
}
```

Validate actual calendar components separately (invalid month/day cannot pass merely by shape), preserving partial precision rather than converting strings into invented dates. Valid promoted metadata takes precedence; ordinary CSV dates may be used only with a declared nonpromoted basis. If a path identifies promoted origin but metadata resolution fails, do **not** relabel its CSV promotion time as source publication. Report null with `metadata_path_rejected`, `metadata_identity_mismatch`, or `source_date_unavailable` as appropriate. Cache validated reads per request only.

Bounded promoted-path branch, after the date constructor is defined:

```js
export function resolveSourceMetadata(source, namespace, allowedNamespaces, root = ROOT) {
  const unknown = reason => ({ owningDraftId: null,
    publication: { ...sourceDate(null, 'unresolved'), reason },
    update: { ...sourceDate(null, 'unresolved'), reason },
    retrieved: { ...sourceDate(null, 'unresolved'), reason },
    dateResolutionReason: reason });
  if (allowedNamespaces && !allowedNamespaces.has(namespace)) return unknown('metadata_path_rejected');
  const value = String(source.owningPath || '');
  if (value.includes('\\') || value.split('/').some(part => part === '..' || part === '.')) {
    return unknown('metadata_path_rejected');
  }
  const match = /^docs\/reference\/knowledge_inbox\/promoted\/([^/]+)\/([^/]+)\.(md|json)$/.exec(value);
  if (!match || match[1] !== namespace) return unknown('metadata_path_rejected');
  try {
    const promotedBase = fs.realpathSync(path.join(root, 'docs/reference/knowledge_inbox/promoted'));
    const namespaceBase = fs.realpathSync(path.join(promotedBase, namespace));
    if (path.dirname(namespaceBase) !== promotedBase || path.basename(namespaceBase) !== namespace) {
      return unknown('metadata_path_rejected');
    }
    const file = fs.realpathSync(path.join(namespaceBase, `${match[2]}.json`));
    if (path.dirname(file) !== namespaceBase || path.basename(file) !== `${match[2]}.json`) {
      return unknown('metadata_path_rejected');
    }
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > 1024 * 1024) return unknown('metadata_path_rejected');
    const draft = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (draft.id !== match[2] || draft.kbNamespace !== namespace || draft.status !== 'promoted'
        || draft.sourceUrl !== source.sourceUrl) return unknown('metadata_identity_mismatch');
    const metadata = draft.metadata || {};
    return { owningDraftId: draft.id,
      publication: sourceDate(metadata.sourcePublicationDate, 'promoted_source_metadata'),
      update: sourceDate(metadata.sourceUpdatedAt, 'promoted_source_metadata'),
      retrieved: sourceDate(metadata.sourceRetrievedAt || metadata.retrievedAt, 'promoted_source_metadata'),
      dateResolutionReason: metadata.sourcePublicationDate ? null : 'source_date_unavailable' };
  } catch {
    return unknown('source_date_unavailable');
  }
}
```

For a positively identified ordinary nonpromoted source, add the documented CSV-date branch before the promoted-path branch: use `sourceDate` with basis `declared_csv_source_date` and no filesystem read. Do not use that branch merely because a promoted path failed matching. Use Task 1's `sourceOrigin` field and test both ordinary-origin acceptance and declared-promoted origin refusal. Unknown origin remains unknown. The promoted path example is intentionally strict; expand formats only with a specific valid exporter fixture and equivalent isolation checks.

- [ ] **Step 3: Add RED tests for bounded source extracts**

Feed real-shaped evidence from an isolated named CSV fixture into `buildPragmaticAnswer`/`assembleSourceExtracts`. Selected body sections include:

```js
const rateBody = '## Stawki\nStawka ogólna to 19%. Stawka 9% jest warunkowa, dla dochodów innych niż kapitałowe. Dwa limity dotyczą bieżących przychodów i wcześniejszej sprzedaży z VAT. Banki i SKOK mają odrębne zasady.';
const outcomeBody = '## Wynik wątku\nAutor podziękował 23 marca 2026. Nie podał przyczyny błędu ani wyniku ponownego połączenia. Sugestia nie jest potwierdzoną naprawą.';
const response = { primaryKb: { name: 'TaxbellLegalReference', artifacts: [] }, supportKbs: [] };
function fixtureAnswer(body) {
  const evidence = [{ kb: 'TaxbellLegalReference', artifact: 'fixture/chunk.csv',
    contentHash: 'sha256:fixture', hits: [{ line: 2, endLine: 3, score: 10,
      snippet: 'Metadata preview deliberately has no requested facts.', matchedTerms: [],
      bodyField: 'content', bodyText: body,
      source: { recordId: 'CHUNK_FIXTURE', title: 'Przykład', sourceUrl: 'https://example.test/source',
        owningPath: null, sourceDocumentRefId: 'DOC_FIXTURE', csvDates: {} } }] }];
  return buildPragmaticAnswer('Wyjaśnij ograniczenia źródła.', response, evidence);
}
const answerWithRateFixture = fixtureAnswer(rateBody);
const answerWithOutcomeFixture = fixtureAnswer(outcomeBody);
assert(renderAnswerMarkdown(answerWithRateFixture).includes('9% jest warunkowa'));
assert(renderAnswerMarkdown(answerWithOutcomeFixture).includes('Nie podał przyczyny'));
```

Complete the fixture `answerWithRateFixture` and `answerWithOutcomeFixture` using actual `buildPragmaticAnswer` output, not pre-rendered strings. Assert full URL/date from structured sources is in the output independently of preview clipping. Add tests for version-separated same URL, three-section/two-source/4000-character budgets, deduplication, source-condition paragraph atomicity and explicit omissions. Run `node scripts/test_answer_extracts.mjs`; expected RED: only old preview dump, no attributed substantive extracts.

- [ ] **Step 4: Assemble coherent extracts from selected allowed evidence**

Implement `assembleSourceExtracts()` in the answer module. Group by namespace + exact URL + owning path + date/version basis, not shared reference ID alone. Rank source groups by substantive query relevance while retaining existing selected-evidence/scoped candidates. Treat paragraphs and heading-associated body sections as atomic units; deduplicate exact normalized units within the same version. Use at most 2 principal groups, 3 sections each, 4000 substantive characters total. A short section without exact query terms may still carry the selected source's conditions/outcome.

If expansion is needed, rescan only already permitted artifacts and gather exact same-owner/version siblings; require allowed namespace before scanning and resolving metadata. Do not follow source URLs, arbitrary paths or expand into forbidden KBs. Record each sibling's real artifact hash and physical locator. A group whose complete condition paragraph exceeds the remaining budget is omitted with an explicit reason, not split into a misleading unconditional statement. A table is retained with headings/row boundaries when it fits; otherwise indicate incomplete coverage.

Result contract:

```js
{
  sources: [{ key, namespace, recordIds, title, sourceUrl, owningPath,
    publication, update, retrieved, owningDraftId, dateResolutionReason }],
  extracts: [{ sourceKey, text, bodyField, artifact, line, endLine, contentHash }],
  omissions: [{ sourceKey, reason: 'answer_budget' }]
}
```

All properties are obtained from observed evidence/validated metadata; no new fact synthesis. Add fields to `answer` without deleting legacy evidence. Render a substantive section with source labels, then complete source citations outside the body budget. Show unknown dates explicitly and distinguish source publication/update/retrieval. Keep local-artifact/no-KAG declaration, confidence meaning, insufficient/unverified status and validity caveats. Legacy technical/no-source hits keep compatible artifact snippets rather than being misattributed to an invented URL.

- [ ] **Step 5: Verify Task 2 GREEN**

Run `node scripts/test_answer_source_citations.mjs`, `node scripts/test_answer_extracts.mjs`, Task 1 test, retrieval/focus tests and `git diff --check`. Expected exit 0; no network attempts, no outside reads, no false date certainty. Record exact body/source budget assertions and review package. No production writes or commit.

## Task 3: Internal release intent and scoped MCP exposure

**Files:**
- Modify: `scripts/erp_knowledge_assistant.mjs:653–802`.
- Modify: `scripts/erp_knowledge_answer.mjs:317–325`.
- Modify: `scripts/lib/erp_knowledge_mcp_core.mjs:309–315,583–605`.
- Create: `scripts/test_release_tool_intent.mjs`.
- Test: `scripts/test_erp_knowledge_blended_routes.mjs`, `scripts/test_erp_knowledge_mcp_profiles.mjs`.

**Interfaces:** Add third `options` argument to answer and fourth to classify; defaults preserve current callers. Only server-known release tool sets `intent:'release'`. Forward additive `sources` to domain structuredContent.

- [ ] **Step 1: Add RED actual-dispatch regression**

Use the exact Q10 question from frozen QA and an isolated Product profile fixture containing relevant Community chunks. No external provider or live-learning output. Assert actual `tools/call` result cites those permitted release chunks, January publication, full source URL and unconfirmed-patch clause. Compare generic docs versus release using the same question; separately inspect routed KBs.

Pure permission controls:

```js
const query = 'Kiedy ogłoszono dostępność Comarch ERP Optima 2026.2.1 i co datowane komentarze styczniowe mówią o operacjach wielofirmowych i zapowiedzianej poprawce? Podaj daty publikacji i zmiany wątku 77465 oraz źródło; czy wdrożenie poprawki potwierdzono?';
const both = new Set(['ComarchOptimaReference', 'ComarchCommunityNews']);
const release = classifyQuestion(query, routing, both, { intent: 'release' });
assert.equal(release.primaryRoute.primaryKb, 'ComarchCommunityNews');
const restricted = classifyQuestion(query, routing,
  new Set(['ComarchOptimaReference']), { intent: 'release' });
assert.notEqual(restricted.primaryRoute.primaryKb, 'ComarchCommunityNews');
assert.throws(() => classifyQuestion(query, routing, new Set(), { intent: 'release' }));
```

Run `node scripts/test_release_tool_intent.mjs`; expected RED before option forwarding. Check that the test observes actual route/evidence rather than crediting a tool label.

- [ ] **Step 2: Forward server-only intent through the existing signatures**

Update helper and call site:

```js
async function answerQuestionTool(question, allowedNamespaces, options = {}) {
  const { answer } = await answerQuestion(question, allowedNamespaces, options);
  return { text: renderAnswerMarkdown(answer), structured: answer };
}
```

```js
const result = await answerQuestionTool(query, allowedNss,
  name === 'optima_release.search' ? { intent: 'release' } : {});
```

In the domain structured result add `sources: result.structured?.sources || []`, preserving evidence, warnings, validity, correlation and knowledge-status interpretation.

Update `answerQuestion(question, allowedNamespaces = null, options = {})` and call `classifyQuestion(question, routing, allowedNamespaces, options)`; the question string is unchanged.

- [ ] **Step 3: Apply intent after namespace filtering and ordinary fallbacks**

Update classifier signature to accept `options = {}`. After normal fallback has established a permitted primary route, but before support-set construction, use:

```js
if (options.intent === 'release') {
  const community = routeScores.find(route => route.primaryKb === 'ComarchCommunityNews');
  if (community) {
    const official = routeScores.find(route => route.primaryKb === 'ComarchOptimaReference');
    primary = {
      ...community,
      score: Math.max(community.score, 1),
      matched: [...new Set([...(community.matched || []), 'server-selected release intent'])],
      supportKbs: [...new Set([...(community.supportKbs || []),
        ...(official ? ['ComarchOptimaReference'] : [])])],
    };
  }
}
```

`routeScores` is built only from `filterRouting()` output; do not import an unrestricted Community route when absent. No public intent argument or scope override is introduced. Empty routing remains fail-closed. Verify official support stays allowed and generic docs routing remains unchanged.

- [ ] **Step 4: Verify Task 3 GREEN and compatibility**

Run `node scripts/test_release_tool_intent.mjs`, `npm run test:blended-routes`, `npm run test:mcp-profiles`, Task 1/2 tests and syntax checks. Inspect profile tests first for isolation. Expected exit 0, same-query release route differs at actual dispatch, excluded namespace never appears, wrappers retain warnings and full citations. No commit or service restart.

## Task 4: Frozen-source 16-question comparison and final review

**Files:**
- Create: `scripts/test_answer_presentation_16q.mjs`.
- Read: original/local and live QA JSON, correction pack, actual old→new map and durable source evidence under `backups/manual-repairs/source-correction-20261013/`.
- Reports: `docs/reference/Answer_Presentation_16Q_After_2026-10-14.md` and JSON in the isolated checkout only.

**Interfaces:** Consume the three reviewed tasks. Exercise actual JSON-RPC domain dispatch and renderer, not direct payload lookup. Keep exact frozen queries and scoring criteria. This phase is local verification; live repeat follows authorized deployment later.

- [ ] **Step 1: Freeze inputs without touching production artifacts**

Author a read-only fixture-preparation utility outside runtime modules. Copy only needed CSV artifacts, routing/reference files and validated same-namespace promoted JSON metadata into an isolated temporary ROOT. Record original file hashes and owning metadata hashes; preserve paths required by citation resolution. Avoid symlink shortcuts to production `data`, `.env` or secrets. Source QA evidence is read-only; backup archives are not extracted into production. The frozen book summary is source-fidelity evidence, not current-law certification.

- [ ] **Step 2: Run actual handler requests with the original sixteen questions**

Set provider disabled (`EXA_PROVIDER=mcp`, empty `EXA_MCP_COMMAND`), `EXA_AUTO_DRAFT=0`, `ENABLE_LIVE_LEARNING=0`, a temporary ROOT and throwing/counting `fetch`. Learning-gap recording may ignore that flag; the temporary ROOT contains any incidental logs. Use the original namespace profile and real public tool per question, `as_of=2026-10-13`, `limit=5`, unique post-fix correlation IDs. Do not enable new public options or bypass normal scope.

For each response, store full actual text/structured fields and hash; extract answer facts excluding the echoed question, source URLs, date basis and corrected-ID/locator coverage. Score against the original criteria. Keep a regression assertion that Q07/Q10/Q16 improve to supplied substantive evidence with full citations, not just a correct route/ID. Report every remaining PARTIAL/MISS; do not tune the benchmark by changing questions or source truth.

- [ ] **Step 3: Final ordered verification**

After reading side effects, run:

```sh
npm run check
node scripts/test_answer_body_fields.mjs
node scripts/test_answer_source_citations.mjs
node scripts/test_answer_extracts.mjs
node scripts/test_release_tool_intent.mjs
npm run test:answer-focus
npm run test:retrieval
npm run test:blended-routes
npm run test:mcp-profiles
node scripts/test_answer_presentation_16q.mjs
git diff --check
```

Expected: all implementation regressions and compatibility suites exit 0. The QA runner outputs sixteen scored results plus raw proof/coverage, and must not hide remaining quality gaps. Explicit `node --check` covers new test files omitted from package script. No live stack startup, source refresh, report replacement on main or rebuild.

- [ ] **Step 4: Whole-change review and deployment handoff**

Review all four runtime diffs and tests against source-body selection, condition retention, full URLs, truthful date resolution, path/scope isolation and actual release dispatch. Record final source/test hashes and uncommitted diff. Preserve worktree, main user work and live baseline. Identify the actual MCP services importing the changed core before later integration/reload; do not claim deployed behavior from local tests.

## Self-review coverage

- Task 1 covers named fields, metadata/body masking, stem-only anchors and technical compatibility.
- Task 2 covers whole-unit excerpts, bounded sibling expansion, source-version identity, full URLs, source-date precision and constrained metadata reads.
- Task 3 covers server-selected release intent, same-query dispatch regression and permission invariants.
- Task 4 checks all sixteen unchanged questions and records local/live separation plus deployment requirements.
- No task permits changing source corpus, graph, automation policy, namespace scopes, TLS settings or baseline gold.
