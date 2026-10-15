# Promoted derived-record map — 2026-10-13

**POTWIERDZONE: all 14 confirmed promoted IDs have staged associations.** There are **11 direct PROMOTED documents, 3 reused canonical source documents, and 19 draft-owned chunks**. The canonical documents have **19 additional dependent chunks** to retain within this correction boundary: 18 registry-source chunks and one chunk belonging to another promoted draft. No case has `no_derived_match`.

**Static mapping, not live graph certification.** File-level builder manifests were read locally. No production OpenSPG calls, cookies, secret/runtime-state reads, builds, exports, graph deletions, status/candidate/policy edits, service operations or commits were performed. Only these report files were added; analysis scripts and intermediate artifacts were authored under `/tmp/opencode/`.

Companion: [Promoted_Derived_Record_Map_2026-10-13.json](Promoted_Derived_Record_Map_2026-10-13.json). It records every exact source URL, full promoted ID, document ID, all 38 dependent chunk IDs, source paths, shared-row associations, CSV SHA256 fingerprints, row counts and associated saved jobs. Its namespace/file inventory resolves exact absolute CSV paths. Relative snapshot paths are literal CSV values rooted at `/docker/openspg`.

## Input and method

- Input: `/docker/openspg/docs/reference/Source_Contamination_Audit_2026-10-13.json`, **`confirmed` filtered by exact `status == 'promoted'`**. Uncertain and pending/rejected/withdrawn cases excluded.
- Repository: `/docker/openspg`, branch `main`, base commit `79e376d241322b2debbffb900a68bcf67ae78004`. Existing user changes were preserved.
- Exporter and promoted-loader logic were read before matching. Python `csv.DictReader` with `newline=''` and `strict=True` parsed **21 CSVs / 2,888 logical records**, including multiline quoted cells. No line-splitting CSV parser, substring-ID search, title matching or fuzzy URL match was used.
- All fourteen promoted JSON files were read at their exact namespace/full-ID paths, checking ID, status and source URL against the audit. Their generated Markdown source paths were checked against chunk fields.
- Exact generated IDs were cross-checked using the production JavaScript `makeId` function: **28 document candidates and 19 promoted chunk IDs**. The analysis did not execute an exporter or builder.

### Exact matching rules and code evidence

1. **ID construction:** `/docker/openspg/scripts/lib/export_utils.mjs:32–55`. `makeId` applies NFKD, ASCII-style slug filtering, separator folding and uppercase. A slug body longer than 106 characters becomes its first 97 characters plus `_` and the first eight uppercase SHA1 hex characters of the **original input**. These exporters do **not** use the different `makePromotedId` helper in `promoted_knowledge.mjs`.
2. **Community:** `/docker/openspg/scripts/export_comarch_community_news.mjs:253–335,337–357,423–479`. Canonical news IDs use `makeId('COMMUNITY_DOC', sourceUrl)`; promoted documents always use `makeId('COMMUNITY_DOC_PROMOTED', draft.id)`. Promoted chunks use `makeId('COMMUNITY_CHUNK_PROMOTED', draft.id + '_' + sectionOrder)`. Two paragraphs form a chunk. Promoted records do not populate `news_topic` or attachment rows; those come from the API-index/detail branches.
3. **Taxbell:** `/docker/openspg/scripts/export_taxbell_reference.mjs:51–67,112–193`. Registry snapshots are grouped by exact generated `makeId('TBDOC', url)`, preferring the longest content. A promoted draft reuses that canonical ID when it is in `registryReferenceIds`; otherwise it creates `makeId('TBDOC_PROMOTED', draft.id)`. In either case its own chunks use `makeId('TBCHUNK_PROMOTED', draft.id + '_' + sectionOrder)`. Default splitting length is 1,800 and chunks of at most 80 characters are excluded (`:11,47–49`; splitter `/docker/openspg/scripts/lib/promoted_knowledge.mjs:153–179`).
4. **Ownership and dependency:** selected chunk IDs must equal the full generated IDs, with exact `sourcePath`, `sourceUrl` and `sourceDocumentRefId`. All other rows referring to the associated document by exact `sourceDocumentRefId` are separately enumerated. A shared document or source URL alone does not make its other chunks owned by the audited draft.
5. **Related rows:** exact `parentDocumentRefId`, `primaryDocumentRefId`, semicolon-separated `secondaryDocumentRefIds`, or Community `sourceUrl` fields were checked. Taxbell `source_topic.name == reference_document.topicArea` is an aggregate association, not a document FK or ownership claim (`export_taxbell_reference.mjs:195–228`). `knowledge_route.anchorObjects` was checked as a semicolon list; Taxbell entries are topic IDs, while Community entries are entity-type names, not document IDs (`Community :359–384`; Taxbell :209–220).
6. **Loader:** `/docker/openspg/scripts/lib/promoted_knowledge.mjs:604–616` loads promoted JSON snapshots from the namespace directory and filters their stored `status == 'promoted'`. It supplies relative JSON/Markdown paths and sorts by promotion time.

The canonical JPK-download document for `6b5ac5ed` stores a URL **without** the final slash, while the audited draft URL **has** a final slash. This is a confirmed exporter-ID reuse match, not byte-equal URL matching. Both literal URLs are recorded in JSON. The other two reused documents have byte-equal source URLs.

## Coverage and retained rows

| Namespace | Audited IDs | Direct docs | Reused docs | Owned chunks | Other dependent chunks retained |
|---|---:|---:|---:|---:|---:|
| ComarchCommunityNews | 2 | 2 | 0 | 3 | 0 |
| TaxbellAccountingVATReference | 3 | 1 | 2 | 7 | 6 |
| TaxbellLegalReference | 2 | 1 | 1 | 2 | 13 |
| TaxbellPayrollHRReference | 7 | 7 | 0 | 7 | 0 |
| **Total** | **14** | **11** | **3** | **19** | **19** |

Exact staged directories:

- `/docker/openspg/exports/community_news/v1/`
- `/docker/openspg/exports/taxbell_accounting_vat_reference/v1/`
- `/docker/openspg/exports/taxbell_legal_reference/v1/`
- `/docker/openspg/exports/taxbell_payroll_hr_reference/v1/`

Each directory contains `reference_document.csv`, `chunk.csv`, `entry_guide.csv`, `knowledge_route.csv` and `_manifest.json`. Community additionally has `news_topic.csv` and `community_attachment.csv`; Taxbell has `source_topic.csv`. All of these CSVs were parsed.

| Export directory | Document rows total / retain | Chunk rows total / retain | Other staged rows retained |
|---|---:|---:|---|
| `community_news/v1` | 167 / 165 | 591 / 588 | 37 news topics, 246 attachments, 2 guides, 2 routes |
| `taxbell_accounting_vat_reference/v1` | 75 / 74 | 380 / 373 | 8 source topics, 2 guides, 1 route |
| `taxbell_legal_reference/v1` | 78 / 77 | 594 / 592 | 4 source topics, 2 guides, 1 route |
| `taxbell_payroll_hr_reference/v1` | 71 / 64 | 614 / 607 | 10 source topics, 2 guides, 1 route |

These retention counts are exact set complements under a **hypothetical draft-only removal**, not an instruction to withdraw all fourteen. Aggregates may require recomputation. Rows retained because they are outside this audit boundary are not thereby certified clean. No source-topic, route, guide, news-topic or attachment row is draft-owned by these fourteen. No guide or attachment has an exact reference to their associated document IDs, and neither Community case has a matching canonical document or exact-URL news-topic row.

## Per-ID associations

The JSON `records` array uses the same order as the input audit. Each record names one associated document; its `promotedChunkIds` enumerate **all** its own chunks, in section order. `otherDependentChunkGroupsRetain` enumerates **all** other chunks pointing to that document. Full URLs and literal paths are in the companion, not inferred from display titles.

| Key | Namespace | Classification | Documents | Owned chunks | Other dependent chunks |
|---|---|---|---:|---:|---:|
| `de720ffd` | Accounting/VAT | direct PROMOTED | 1 | 5 | 0 |
| `bf920a10` | Legal | direct PROMOTED | 1 | 1 | 0 |
| `d1c8371c` | Payroll/HR | direct PROMOTED | 1 | 1 | 0 |
| `08cfe029` | Payroll/HR | direct PROMOTED | 1 | 1 | 0 |
| `6b5ac5ed` | Accounting/VAT | reused canonical | 1 | 1 | 4 |
| `dcfc95c2` | Accounting/VAT | reused canonical | 1 | 1 | 2 |
| `93f75109` | Legal | reused canonical | 1 | 1 | 13 |
| `0bdb5e10` | Payroll/HR | direct PROMOTED | 1 | 1 | 0 |
| `fb53cb2b` | Community | direct PROMOTED | 1 | 1 | 0 |
| `f0ede681` | Community | direct PROMOTED | 1 | 2 | 0 |
| `7c66353e` | Payroll/HR | direct PROMOTED | 1 | 1 | 0 |
| `a939510d` | Payroll/HR | direct PROMOTED | 1 | 1 | 0 |
| `9c43b46e` | Payroll/HR | direct PROMOTED | 1 | 1 | 0 |
| `4ce9f131` | Payroll/HR | direct PROMOTED | 1 | 1 | 0 |

### Direct-document IDs

All are exact rows of their namespace's `reference_document.csv`, with promoted Markdown in `localSnapshotPath`. Taxbell rows have `semanticType=taxbell_promoted_draft`; Community rows have `sourceType=promoted_knowledge_draft`.

- `de720ffd`: `TBDOC_PROMOTED_DRAFT_2026_07_01_DE720FFD_ZMIANY_W_JPK_VAT_DOPASOWANIE_DO_KSEF_NOWE_WZORY_JPK_V7M_3_JPK_V7K_3_NOWE_OZNACZE`
- `bf920a10`: `TBDOC_PROMOTED_DRAFT_2026_07_01_BF920A10_HTTPS_G_INFOR_PL_P_FILES_39075000_ZMIANY_W_PODATKACH_2026_39075452_PDF`
- `d1c8371c`: `TBDOC_PROMOTED_DRAFT_2026_06_30_D1C8371C_INFORMACJA_DOTYCZACA_PRAC_NAD_WDROZENIEM_DYREKTYWY_DOTYCZACEJ_ROWNOSCI_WYNAGRODZ`
- `08cfe029`: `TBDOC_PROMOTED_DRAFT_2026_07_02_08CFE029_PRZEGLAD_ZMIAN_W_PRAWIE_PRACY_W_2025_I_2026_R_INFOR_PL`
- `0bdb5e10`: `TBDOC_PROMOTED_DRAFT_2026_06_09_0BDB5E10_OGRANICZENIA_W_DOSTEPIE_DO_US_UG_ELEKTRONICZNYCH_ZUS_5_CZERWCA_2026_R_ZUS`
- `fb53cb2b`: `COMMUNITY_DOC_PROMOTED_DRAFT_2026_06_09_FB53CB2B_B_AD_PRZY_KONFIGURACJI_COMARCH_BETTERFLY_Z_KSEF`
- `f0ede681`: `COMMUNITY_DOC_PROMOTED_DRAFT_2026_08_02_F0EDE681_NOWA_WERSJA_COMARCH_ERP_OPTIMA_2026_2_1_JEST_JUZ_DOSTEPNA`
- `7c66353e`: `TBDOC_PROMOTED_DRAFT_2026_06_30_7C66353E_ZMIANY_W_STAZU_PRACY_WNIOSKI_O_ZASWIADCZENIA_Z_ZUS_OD_STYCZNIA_2026_R_ZUS`
- `a939510d`: `TBDOC_PROMOTED_DRAFT_2026_06_30_A939510D_PROJEKT_USTAWY_O_WZMOCNIENIU_STOSOWANIA_PRAWA_DO_JEDNAKOWEGO_WYNAGRODZENIA_MEZCZ`
- `9c43b46e`: `TBDOC_PROMOTED_DRAFT_2026_07_02_9C43B46E_ROCZNA_WALORYZACJA_NA_KONTACH_OSOB_UBEZPIECZONYCH_W_ZUS_ZUS`
- `4ce9f131`: `TBDOC_PROMOTED_DRAFT_2026_07_30_4CE9F131_OD_LIPCA_PROSTSZE_ZASADY_SK_ADANIA_WNIOSKOW_O_ZASI_KI`

### Reused canonical documents and dependency boundaries

**`6b5ac5ed` — Accounting/VAT:**

- Document: `TBDOC_HTTPS_WWW_PODATKI_GOV_PL_PODATKI_FIRMOWE_JEDNOLITY_PLIK_KONTROLNY_JPK_VAT_PLIKI_DO_POBRANIA_JPK_VAT`.
- Own chunk: `TBCHUNK_PROMOTED_DRAFT_2026_06_05_6B5AC5ED_SERWIS_O_PODATKACH_PLIKI_DO_POBRANIA_JPK_VAT_PODATKI_GOV_PL_1`.
- Retain the canonical document and four `taxbell_external_chunk` rows from literal snapshot path `downloads/taxbell/accounting_vat_reference/snapshots/3d9fd4ece3a1c84e.json`. The four full hashed IDs are individually enumerated in JSON; do not reconstruct them by truncating the document ID.

**`dcfc95c2` — Accounting/VAT:**

- Document: `TBDOC_HTTPS_WWW_PODATKI_GOV_PL_AKTUALNOSCI_NOWE_WZORY_STRUKTUR_JPK_VAT_DOSTEPNE_NA_EPUAP`.
- Own chunk: `TBCHUNK_PROMOTED_DRAFT_2026_07_24_DCFC95C2_NOWE_WZORY_STRUKTUR_JPK_VAT_DOSTEPNE_NA_EPUAP_1`.
- Retain external chunk `TBCHUNK_TBDOC_HTTPS_WWW_PODATKI_GOV_PL_AKTUALNOSCI_NOWE_WZORY_STRUKTUR_JPK_VAT_DOSTEPNE_NA_EPUAP_1` and **other-draft** chunk `TBCHUNK_PROMOTED_DRAFT_2026_06_05_E14D7C0A_NOWE_WZORY_STRUKTUR_JPK_VAT_DOSTEPNE_NA_EPUAP_PODATKI_GOV_PL_1`. The latter points to the same document but has its own promoted source path and a slash-suffixed URL. Its quality is outside this fourteen-ID audit.

**`93f75109` — Legal:**

- Document: `TBDOC_HTTPS_WWW_PODATKI_GOV_PL_PODATKI_FIRMOWE_CIT_CIT_KLASYCZNY_INFORMACJE_PODSTAWOWE_CIT_KLASYCZNY`.
- Own chunk: `TBCHUNK_PROMOTED_DRAFT_2026_07_27_93F75109_SERWIS_O_PODATKACH_INFORMACJE_PODSTAWOWE_CIT_KLASYCZNY_1`.
- Retain the canonical document and thirteen individually enumerated external chunks from `downloads/taxbell/legal_reference/snapshots/5c49e1df3f1d3768.json`.

### Content and shared metadata observations

- `de720ffd` has **five** owned chunks, including SHA1-suffixed IDs; a short-key or naive truncated-prefix match would not be a reliable deletion inventory. A correction review must include document summary/description as well as all chunk content. Its document's `topicArea` has no matching staged source-topic row; this is an absent aggregate association, not a missing document FK.
- `f0ede681` has **two** owned chunks despite the audit's source-body classification `title_only`. The promoted Markdown lines 10–19 include discovery scaffolding, query/source/tier metadata, the title and a review reminder. The current full draft content is 351 characters; staged chunks are 254 and 95 characters. This is not recovered article text and does not establish chronological content change. The other title-only cases also carry draft wrappers.
- `bf920a10` shares `TBTOPIC_TAXBELLLEGALREFERENCE_USTAWA`; `93f75109` shares `TBTOPIC_TAXBELLLEGALREFERENCE_PRAWO`.
- `6b5ac5ed` and `dcfc95c2` share `TBTOPIC_TAXBELLACCOUNTINGVATREFERENCE_VAT`.
- Payroll/HR: `d1c8371c` associates with `TBTOPIC_TAXBELLPAYROLLHRREFERENCE_PIP`; `08cfe029` with `TBTOPIC_TAXBELLPAYROLLHRREFERENCE_KADRY`; `a939510d` with `TBTOPIC_TAXBELLPAYROLLHRREFERENCE_TAXBELL`; `0bdb5e10`, `7c66353e`, `9c43b46e`, `4ce9f131` with `TBTOPIC_TAXBELLPAYROLLHRREFERENCE_ZUS`. These are deterministic first-keyword classifications, not legal/domain validation. Keep shared topic rows; recompute document counts where appropriate.

## Saved builder evidence

All statuses below are **POTWIERDZONE only as local manifest entries**, not newly checked API responses or node-level evidence. Exact absolute manifest paths, job timestamps where available, file paths and CSV SHA256 values appear in JSON `manifestPaths` and `csvInventory`.

| Namespace / project | ReferenceDocument job | Chunk job | Other saved jobs |
|---|---|---|---|
| Community / 11 | 877 FINISH, 167 rows, 2026-10-13 05:15:17–05:16:04 | 880 FINISH, 591 rows, 05:17:20–05:18:10 | NewsTopic 878; CommunityAttachment 879; KnowledgeRoute 209; EntryGuide 210 — all FINISH |
| Accounting/VAT / 14 | 875 FINISH, 75 rows, 2026-10-12 14:20:43–14:21:21 | 876 FINISH, 380 rows, 14:21:23–14:22:10 | SourceTopic 258; KnowledgeRoute 259; EntryGuide 260 — all FINISH |
| Legal / 12 | 871 FINISH, 78 rows, 2026-10-12 14:13:21–14:14:00 | 872 FINISH, 594 rows, 14:14:01–14:15:03 | SourceTopic 248; KnowledgeRoute 249; EntryGuide 250 — all FINISH |
| Payroll/HR / 13 | 873 FINISH, 71 rows, 2026-10-12 14:15:56–14:16:35 | 874 FINISH, 614 rows, 14:16:36–14:17:40 | SourceTopic 253; KnowledgeRoute 254; EntryGuide 255 — all FINISH |

Saved row counts for recent document/chunk jobs equal staged row counts. **Equal counts are not proof of equal imported bytes.** The manifests contain no per-ID membership assertion or imported-content fingerprint proving that the current CSV bytes were loaded. Older route/guide/topic jobs are not evidence of recent reimport. Top-level manifest `generatedAt` is also not a substitute for per-job timestamps.

## Would blind withdrawal/rebuild leave old graph nodes?

**WNIOSEK: yes, if earlier imports materialized the nodes and the declared UPSERT semantics apply. This path has no deletion of omitted IDs. Actual current graph presence remains NIEUSTALONE.**

### Confirmed code/API-contract evidence

- `/docker/openspg/scripts/lib/promoted_knowledge.mjs:412–468`: `withdrawPromotedDraft` moves promoted JSON/Markdown files to the withdrawn directory and changes the local registry. It does not submit any graph deletion. The loader then omits withdrawn snapshots (`:604–616`).
- `/docker/openspg/scripts/lib/build_runner_core.mjs:14–65`: the submitted payload declares `type: 'FILE_EXTRACT'`, `dataSourceType: 'CSV'`, `lifeCycle: 'ONCE'`, **`action: 'UPSERT'`**. Entity mapping contains only the CSV's submitted rows; no tombstones, missing-ID reconciliation, graph replacement or delete action is supplied.
- `/docker/openspg/scripts/lib/build_client.mjs:39–65`: submissions go to **`POST /public/v1/builder/job/submit`**; status/list methods are reads. The examined client offers no graph-delete step. This is static code evidence of the API request, not a production call or runtime contract test.
- `/docker/openspg/scripts/build_kb_runner.mjs:431–467,498–534`: zero-row files are skipped; an existing upload may be reused and a `FINISH` file job skipped unless the filename is in `OPENSPG_FORCE_FILES`. No CSV content-hash comparison is performed there. Force causes reupload/reimport, not graph pruning. Thus an unforced rebuild may not import revised files at all.
- Supporting historical documentation: `/docker/openspg/docs/reference/OpenSPG_KB_Operational_Memory.md:119–133` describes two transient Legal promoted-document nodes that required explicit separately approved deletion after a corrected export/build. This is a recorded precedent, not an independent verification of today's nodes.

### Correction implications

1. Local withdrawal plus export removes future staged draft rows; it does **not** establish removal of previously imported graph objects. Under UPSERT, omitted objects remain unless separately reconciled. Even a corrected draft retaining its document ID can produce fewer chunks, leaving old tail chunk IDs unmentioned by the new import.
2. The maximum fourteen-ID **draft-owned** inventory here is **11 documents + 19 chunks**. The three reused canonical documents are not owned by the contaminated drafts. Deleting their entire dependency sets would also affect **18 registry chunks and one other-draft chunk**.
3. This is a correction boundary, not authorization for blanket withdrawal or a graph deletion list. The audit explicitly calls for partial-span review for material such as `08cfe029` and `d1c8371c`; preserving valid source content may be preferable to whole-record withdrawal after review. Canonical documents' content was not classified by this mapping.
4. Any later authorized remediation needs an old-versus-new exact-ID reconciliation and separate live readback. It must distinguish replacement IDs, obsolete chunks, shared canonical documents and shared aggregates. Forced imports alone do not prove cleanup.
5. **NIEUSTALONE:** actual graph exposure, graph edges, graph nodes under historical ID algorithms, nodes no longer represented in staged files, and backend runtime deletion semantics. This report neither enumerates nor certifies those. No production API was called to resolve them.

## Validation

- `npm run check`: passed (syntax checks; no runtime tests executed).
- `python3 scripts/validate-module-map.py`: passed, four modules.
- `/tmp/opencode/map-promoted-derived.py`: strict CSV parse, shape/unique-ID checks, all chunk/document FK existence, manifest row-count equality, 14 complete unique promoted IDs and exact source-path/ID/URL ownership assertions passed.
- `/tmp/opencode/verify-promoted-ids.mjs`: production `makeId` equality passed for 28 document candidates and 19 chunks.
- Final report validator: compares all per-ID associations, dependency groups, file fingerprints/counts and saved jobs against the read-only analysis and staged files. No parsing errors or missing claimed chunk references.

### Machine-readable handoff

```yaml
task_id: Promoted_Derived_Record_Map_2026-10-13
agent: OpenCode
host: local workspace host
repository: /docker/openspg
base_branch: main
base_commit: 79e376d241322b2debbffb900a68bcf67ae78004
result_commit: uncommitted
changed_files:
  - docs/reference/Promoted_Derived_Record_Map_2026-10-13.md
  - docs/reference/Promoted_Derived_Record_Map_2026-10-13.json
skills_used: [codex-delegation, verification-before-completion]
commands_run:
  - git status --short
  - git branch --show-current
  - git rev-parse HEAD
  - npm run check
  - python3 scripts/validate-module-map.py
  - python3 /tmp/opencode/map-promoted-derived.py
  - node /tmp/opencode/verify-promoted-ids.mjs
  - python3 /tmp/opencode/inspect-promoted-bodies.py
  - python3 /tmp/opencode/compact-promoted-map.py
  - python3 /tmp/opencode/validate-promoted-report.py
validation:
  passed: [14 unique complete IDs, 21 strict multiline CSVs, exact generated IDs, all claimed chunk references, manifest row counts, final report parity, syntax checks, module map]
  failed: []
  not_run: [live graph certification, production API calls, exporter, builder]
confirmed_findings: [11 direct documents, 3 reused documents, 19 owned chunks, 19 other dependent chunks]
inferences: [UPSERT omission is not graph deletion, forced imports do not prune old nodes]
hypotheses: []
risks: [shared canonical dependency loss under broad deletion, obsolete graph chunks after content shortening]
approval_required: []
recommended_next_action: Review exact replacement or withdrawal scope; any graph reconciliation requires a separately authorized live operation.
```
