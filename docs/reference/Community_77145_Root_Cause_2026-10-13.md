# Community 77145 draft contamination — read-only root-cause investigation

Date: 2026-10-13. Checkout: `/docker/openspg`, HEAD `79e376d`.

## Diagnosis

The pipeline confused a search summary with source text, then allowed an app-scoped OpenSPG answer to replace it as “cleaned content.” The cleaner is not an extraction-only LLM client: it sends the input to a configured OpenSPG application and shared session. The tracked reviewer provisioning explicitly enables a KB. Neither cleaner acceptance nor draft validation checks that the returned text is faithful to the input. This explains how schema FK relations and a model refusal were saved under the Community thread URL.

**Confirmed:** the source candidate is a speculative summary, both saved drafts contain unsupported replacement text, the app/KB coupling exists in code, and the acceptance gap remains in the current checkout. **Strongly supported historical explanation:** KB-grounded generation during the cleaner call produced the FK response/refusal. The exact August request, active app configuration, retrieved chunks, and session state were not inspected, so the historical server-side retrieval mechanism is not independently proven.

All three Community drafts remain pending. Supported promoted-loader metadata contains no 77145 match. The external thread body remains unavailable in the evidence available to this investigation.

## Scope and evidence collection

- Read `scripts/AGENTS.md:1-9` and `docs/module-map.json:31-113`; applicable context is discovery/dashboard, shared ingestion and retrieval. Read targeted operational memory and source files.
- Runtime discovery was accessed only through supported `GET http://10.10.254.42:3410/panel/api/discovery`. Handler: `scripts/erp_kb_dashboard_server.mjs:4031-4033`; summary exposes candidate fields via `scripts/lib/dashboard_discovery.mjs:1735-1774`.
- Raw drafts were read with dedicated file-read tools. Inbox status and promoted corpus were checked only through `listInboxDrafts()` and `loadPromotedKnowledge()` from `scripts/lib/promoted_knowledge.mjs:584-617`.
- Read-only git history/diffs compared pre-August code with current code. No direct runtime `data/` reads, secret reads, extraction requests, LLM requests, tests, builds, cycles, status changes, service actions or commits were performed. This report is the only write.

## Exact discovery candidate: supported GET evidence

Candidate `candidate_4b349d49-7b3` was present in the GET response on 2026-10-13:

| Field | Observed value |
| --- | --- |
| Namespace / source namespace | `ComarchCommunityNews` / `ComarchCommunityNews` |
| Title | `Problemy z odbiorem faktur z KSEF - Społeczność ERP` |
| URL | `https://spolecznosc.comarch.pl/question/problemy-z-odbiorem-faktur-z-ksef-77145` |
| Query / query ID | `problemy z KSeF Optima 2026` / `generated_ComarchCommunityNews_14f8ca41c5` |
| Run | `discovery_daily_2026-06-06T20-08-19-295Z_a00c321f` |
| Provider / source tier | `api` / `community` |
| Published / retrieved | `2025-12-21T00:00:00.000Z` / `2026-06-06T20:08:25.514Z` |
| Candidate created | `2026-06-06T20:09:08.892Z` |
| Assessment | `CANDIDATE_ONLY`, confidence `0.7`, novelty `medium`, duplicate risk `low`, content risk `medium` |
| Assessment provenance | `dashboard-discovery-v1`, `deepseek-reasoner`, `openspg` |
| Current status | `DRAFTED` |
| Last drafting | `2026-08-02T10:52:52.942Z`, operator `anonymous` |
| Last linked draft | `draft_2026-08-02_a3442aa7_problemy-z-odbiorem-faktur-z-ksef-spo-ecznosc-erp` |
| Decision | operator `draft`; expected `CANDIDATE_ONLY`, actual `CREATE_DRAFT`; `evaluable:false` |
| Decision note | `Wątek społecznościowy o problemach z odbiorem faktur KSeF - istotny temat wsparcia` |
| Cleanup history | `cleanup`, `2026-06-30T08:28:07.456Z`; content and snippet changed |
| Stored content hash | `d76012b10896e22e179b0e9c93236d332a910fa6cfd2edae09bad7d3ef944b9c` |

The current `content` and `snippet` are identical, 889 characters. Complete returned content:

```text
User query: problemy z KSeF Optima 2026
- The page title suggests a discussion about issues receiving invoices from KSeF (Krajowy System Elektronicznego Faktoringu) in the Comarch ERP community.
- It appears to address problems related to odbiór faktur (invoice reception) from KSEF, likely within ERP Optima (Comarch Optima) usage.
- No detailed content snippets are provided, so the summary focuses on the likely scope: troubleshooting or questions about importing/receiving KSEF invoices in Optima in 2026.
- For precise guidance, the page would typically cover error messages, steps for configuring KSEF integration, authentication/tokens, certificate setup, connectivity, and reconciliation in Optima, plus potential updates or patches for 2026.
If you need exact solutions or steps, I can extract and summarize the specific Q&A from the linked page (once you provide the content o...
```

This is not thread text: it explicitly lacks details, speculates about likely topics, and even expands KSeF incorrectly. It contains neither FK definitions nor `chunk:0_*` references.

The SHA-256 computed in memory over the current GET content is `ab53f8210165a8c16f116ef32fcb40ed2bdc0d364d03ab87f27460742eac716b`, different from the stored hash. Cleanup spreads the old candidate and changes content/snippet without recalculating the hash (`dashboard_discovery.mjs:457-478`). This is a separate provenance defect; the shared stored hash does not authenticate either draft's transformed body.

## Raw drafts and corpus scope

Raw files below are under `downloads/knowledge_inbox/2026-08-02/`:

1. **`draft_2026-08-02_7b5dd1ca_problemy-z-odbiorem-faktur-z-ksef-spo-ecznosc-erp.json:1-30`**
   - Content at line 6 is a list of 11 schema relationships: `DokumentyKSeF → DokAtrybuty`, CRM relationships, payroll relationships, courier/payment configuration, bank reports and compensations, with `<reference id="chunk:0_0">` through `chunk:0_7` citations.
   - This body is unrelated to the available candidate text. Lines 16-27 retain candidate/run/hash and assessment metadata; line 29 records `2026-08-02T10:52:30.544Z`.
2. **`draft_2026-08-02_a3442aa7_problemy-z-odbiorem-faktur-z-ksef-spo-ecznosc-erp.json:1-30`**
   - Line 6 says supplied references contain only table relationships (`DokumentyKSeF`, `DokAtrybuty`, `CRMKontakty`), not raw web/article text, so cleaning cannot be done. The refusal itself was accepted as draft content.
   - Lines 16-27 have the same candidate/run/hash; line 29 records `2026-08-02T10:52:52.936Z`.
3. **`draft_2026-08-02_e107b7d2_comarch-betterfly-efaktury-automatyczna-wysy-ka-fs-do-ksef.json:1-30`**
   - URL at line 7 is Community Betterfly thread `77295`; content at line 6 contains only the page title between discovery boilerplate and the review footer. There are no FK relationships, chunk references or refusal text: **not the same observed contamination**, but also no useful thread body.
   - Candidate at line 20 is `candidate_4bb7c379-a37`; created `2026-08-02T10:54:41.561Z` (line 29).
   - Supported discovery GET for that candidate returns 197 characters: repeated title, `![logotype](assets/img/logo.svg)`, and `loader`. Its stored hash is `9a5d82440dcd5143b1ac7f4b23ad7d8c8c8491ba8581000f092d6e195619b274`; current-content SHA-256 is `750271761f1bf738dce73bff066dbb40d1a6999fb98faef39f77bbc39ded9d77`. It too was operator-drafted from `CANDIDATE_ONLY` by `anonymous`.

`listInboxDrafts()` returned exactly these three pending Community drafts. `loadPromotedKnowledge()` loaded **303 promoted records across all 14 configured namespaces**, including **12 Community records**. Searching loaded `id`, `sourceUrl`, `metadata` and `title` for `77145` returned **zero matches**. This establishes absence from the supported local promoted metadata corpus; it does not establish absence from independently ingested snapshots, staged CSV bodies or the live graph, which were not queried.

## Data-flow trace and missing guarantees

### 1. Search result → candidate (not fresh extraction)

`run_dashboard_discovery.mjs:150-160` requests external search with text enabled. API search requests summaries and at most 1500 text characters (`scripts/lib/external_search.mjs:137-151`). Its normalized snippet prefers `raw.summary`, then highlights/text, and truncates to 900 characters (`external_search.mjs:113-134`).

Candidate construction selects `result.raw?.text || result.text || result.snippet`, stores it as content, and hashes it (`run_dashboard_discovery.mjs:294-326`). Thus a generated search summary can become candidate content when raw text is missing. Assessment receives snippets and produces relevance/risk fields, not verified extracted thread text (`run_dashboard_discovery.mjs:163-209`). The June source response was not recovered; the current candidate matches the summary-fallback shape.

### 2. Candidate → cleaner → draft

`createDraftFromDiscoveryCandidate()` checks status, routing, existing corpus/draft and budget, then calls `cleanContent(candidate.content || candidate.snippet || '')` (`dashboard_discovery.mjs:1039-1079`). It does **not fetch the URL**. It wraps the returned text in discovery boilerplate and persists the old candidate hash and assessment metadata (`dashboard_discovery.mjs:1080-1111`). `discoveryModel` is the assessment model, not evidence of which model handled cleaning.

AI cleaning defaults on (`scripts/lib/content_cleaner.mjs:7-12`). With configured authentication/app/session, `defaultAiCleaner()` sends a cleaning prompt to `/v1/chat/completions` with `app_id`, `session_id`, `thinking_enabled:false`, `search_enabled:false` (`content_cleaner.mjs:302-335`). These flags do not establish that KB grounding is disabled: there is no extraction-only backend or explicit verified KB isolation in this path.

The reviewer provisioner deliberately aligns app ID with an existing project and deploys `kb: [{ id: project.id, name: project.name, enable: true }]` while copying the source chat configuration (`scripts/provision_dashboard_llm_reviewer.mjs:135-175`). Tracked service configuration selects app `4` and a fixed session (`docs/reference/ERP_KB_Dashboard_LLM_Reviewer.conf:1-6`). Repository project context identifies project `4` as `ComarchOptimaSchema` (`AGENTS.md:36-40`). **Confirmed design:** this cleaner can use a KB-enabled app, rather than a source-isolated LLM. **Unverified runtime detail:** which app/session/configuration was actually active on August 2 or is installed today; no installed secret/config inspection was used to assert it.

Response parsing accepts final SSE `answer` or completion content (`content_cleaner.mjs:262-299`). Any nonempty returned text is normalized and passed through boilerplate cleaning, then accepted (`content_cleaner.mjs:338-348`). Only thrown errors or empty output cause fallback. There is no check for novel FK claims, retrieval citations, refusals, title-only/shell content or correspondence with the source input. A successful wrong answer is therefore more dangerous here than a transport failure.

Other callers share the risk: scanner file/summary/authenticated-web branches call `cleanContent()` (`scripts/scan_dashboard_sources.mjs:256-291`). The generic provider path is different: it uses profile cleaning, and Community URLs default to `blog`, whose AI use is false (`scripts/lib/content_provider.mjs:171-202`; `content_cleaner.mjs:121-143`). Do not attribute all provider extraction to the app-backed cleaner.

### 3. Draft acceptance and automation

Draft validation checks required fields, namespace, maximum lengths, URL protocol, tags and metadata shape (`scripts/lib/knowledge_inbox.mjs:158-198`). Submission checks limits/domains, writes JSON/Markdown, and calls `triggerAutomationForDraft()` (`knowledge_inbox.mjs:200-228`). It does not compare body with source. Discovery wrapper text alone can satisfy required-content checks.

Automation runs only when configuration/namespace permit it and spawns a review job (`scripts/lib/dashboard_automation.mjs:980-1011`). Deterministic publication guards check namespace, **whole wrapped content** length 120–50000, NULs, URL protocol and duplicates against promoted records (`scripts/run_dashboard_automation.mjs:304-328`). They do not validate actual source-body availability/fidelity. Pending sibling drafts are not part of those duplicate checks.

The reviewer also uses app/session chat with `search_enabled:false`; its prompt includes draft text and URL/tier, **not original candidate text or an independently retrieved source body** (`run_dashboard_automation.mjs:194-265`). Publication requires approval, matching namespace, confidence floor and non-high duplicate/content risks, but does not explicitly gate `sourceQuality` or `factuality` (`run_dashboard_automation.mjs:271-301`). Guards/review precede promotion, then build and post-build validation (`run_dashboard_automation.mjs:507-524,589-648`). Generic promotion copies the raw draft without source validation (`scripts/lib/promoted_knowledge.mjs:296-341`). Consequently publication protection relies on reviewer judgment, not a deterministic source-fidelity invariant.

The daily semi-auto path requires official/professional tier (`run_dashboard_discovery.mjs:328-345`). These Community drafts instead have supported GET evidence of an **operator decision** overriding `CANDIDATE_ONLY`; that action is allowed by the reviewable-status and draft checks (`dashboard_discovery.mjs:513-516,1039-1049`). There is no evidence here of successful auto-publication or its historical reason for holding these drafts; only their current pending status is confirmed.

## Historical cause versus present vulnerability

- `git show f3061b3:scripts/lib/content_cleaner.mjs` (June 30 commit) contains the same app-backed cleaner and unconditional acceptance at lines 302-348. `git diff f3061b3 HEAD -- scripts/lib/content_cleaner.mjs` is empty.
- `git show 8887b33:scripts/lib/dashboard_discovery.mjs` (July 20 commit) contains the same candidate-clean-draft path at lines 1039-1128. Later diffs do not repair this path; `knowledge_inbox.mjs` also has no diff from that revision.
- Reviewer provisioner changes since June 30 concern list pagination, not `kb.enable:true`. Changing the configured model to OpenAI on August 30 (`0c0da0c`) does not isolate the cleaner from a KB or fix output acceptance.
- Therefore this is **a current code vulnerability**, conditional on app-backed AI cleaning being configured, not merely an obsolete historical model issue. Exact current live app grounding and whether any live process has a different deployed revision were not tested.

### Hypotheses and limits

1. **High-confidence historical mechanism:** the KB-enabled cleaner app supplied schema references and generated either FK output or a refusal about those references. Two independent raw outputs and unchanged call-path code support this. `search_enabled:false` was insufficient as an isolation guarantee. Exact server-side retrieval trace remains unobserved.
2. **Possible session influence:** fixed session reuse could explain prior schema context or related outputs. No session history was read; fresh retrieval versus remembered context cannot be distinguished.
3. **Possible duplicate creation race:** both drafts share candidate/hash and were saved 22.392 seconds apart. Duplicate/status checks occur before `await cleanContent()`, with no per-candidate lock or post-await recheck (`dashboard_discovery.mjs:1044-1079,1112-1119`; source lookup `dashboard_source_list.mjs:267-275`). Two overlapping requests could pass checks and the last save could retain only the second draft ID. This is a supported possible race, not a proven request timeline.
4. The current candidate was cleaned June 30 and its stored hash is stale. Exact pre-cleanup bytes were not recovered. Do not treat the current GET text as an independently preserved August request log.

## Smallest proposed regression and repair scope (not executed)

1. **Offline regression at the cleaner boundary:** inject/mock a successful LLM response containing the exact FK/chunk-reference fixture and, separately, the refusal fixture, against the 77145 summary. Both must be rejected as cleaned source content. Keep a positive removal-only case to verify genuine boilerplate cleaning. Existing test coverage asserts only advertisement/newsletter removal (`scripts/test_discovery_draft_cleaning.mjs:8-51`), not hostile or unrelated successful answers.
2. **Source-availability regression at draft/publication boundary:** use the 77295 title/logo/loader fixture and 77145 speculative summary. Neither may be treated as verified thread body, even when discovery boilerplate exceeds the current 120-character guard. Check rejection/hold before submission can start automation; assert no live network, builds or job spawning.
3. **Minimal code repair:** make ingestion cleaning source-isolated (deterministic removal-only cleaning is the narrowest option; any LLM alternative needs a verified non-KB, fresh-context extraction path). Add explicit acceptance checks tied to immutable raw source text/provenance, not just an output blacklist. Gate draft creation/publication on source-body availability and preserve separate raw/input/output hashes plus cleaner provenance. A blacklist alone does not catch title-only or plausible invented answers.
4. **Bounded artifact repair:** review the two 77145 pending drafts as contaminated and 77295 as insufficient source; perform any rejection/replacement only in a separately authorized operation. Obtain real thread text before replacement. Audit other drafts from the same cleaner/app/time window using supported loaders. No promoted 77145 match was found, so this evidence does not justify a blanket corpus deletion or rebuild. If wider audit finds promoted contamination, scope withdrawal/export/rebuild to those verified records.
5. **Separate small correctness items:** recalculate or distinguish hashes after cleanup; add per-candidate serialization and a post-cleaning duplicate/status recheck. They address provenance and duplicate races, not the central KB-contamination mechanism.

## External source availability

The coordinating assistant fetched the exact 77145 URL with `exa_web_fetch_exa` during this investigation. The result contained only the page title and `loader`, not thread content. The delegated investigator did not trigger another extraction. Existing local collection documentation also describes the Community site as JS-driven, with plain HTTP exposing shell/loader and historical full-thread collection requiring Chromium (`docs/reference/ERP_Knowledge_Assistant_Community_FullThread_Report.md:20-27`). That historical method is not evidence that 77145 is retrievable today. **No verified body for 77145 is available here; the FK response, refusal and speculative summary cannot substitute for it.**
