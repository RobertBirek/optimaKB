# OWA collective correction: source advisory, 2026-10-23

## Recommendation and scope

Prepare a new, explicitly reviewed synthesis for **Korekta zbiorcza FA**. Accept neither promoted snapshot unchanged and do not select by length, draft date, promotion date or confidence label. This document is an advisory, not an approved/promoted knowledge record or authorization to change the corpus.

The official help describes a standard **Korekta zbiorcza/rabat** workflow available from both **Faktury Sprzedaży (FS)** and **Faktury Zakupu (FZ)** lists. It supports linking multiple invoices to one collective correction. The sources do not support the first draft's restriction to Additional Functions, its categorical API-absence claim, or its per-source-invoice generation hypothesis. The second draft better approximates a collective document, but its API entry, general formal-correction scope, exact relations and effects lack adequate evidence.

Keep four evidence levels separate:

1. Historical **COM 2016** example: static code inspection, no execution.
2. **2026.4.1** database documentation: version-specific documentary evidence, no live SQL proof.
3. Official help under **2026** and current-linked **2026_5** URLs: archived public GETs on 2026-10-23; both display **20/09/2022** as the article update date. The URL version and retrieval date do not establish a 2026 article revision or installed-runtime behavior.
4. Present MCP/API, deployed SQL mappings and business effects: **runtime untested**.

## Reproducible source inventory

Paths below are original production paths, read-only. Line numbers refer to those files, except official-help line numbers, which refer to the archived UTF-8 text extraction. SHA256 values cover full original file bytes, not excerpts.

### Promoted snapshots (UTF-8)

**A**: `/docker/openspg/docs/reference/knowledge_inbox/promoted/OWAOntology/draft_2026-07-15_0570f3dd_korekta-zbiorcza-fa.md`

- SHA256: `89295f975bd4d6f43374cc720c46c961918985057953b8a96558ef3a144fdba9`
- L1-7: promoted snapshot; promotion 2026-07-22, bulk approval of 33 drafts.
- L11-25: low confidence, requires verification; module/API restrictions and per-invoice hypothesis.
- L27-49: asserted tables, identifiers and MCP absence.
- L51-71: provenance assertions, unresolved checks and unchecked validation tasks.

**B**: `/docker/openspg/docs/reference/knowledge_inbox/promoted/OWAOntology/draft_2026-07-17_941acb19_encja-korekta-zbiorcza-fa.md`

- SHA256: `a14baf179658cab68435b35d59e974461f535e8155895ad75677e2f74556cc5e`
- L1-7: promoted snapshot; promotion 2026-07-20, bulk approval of 50 drafts.
- L11-25: medium confidence/partially verified, collective document and speculative workflow.
- L27-57: proposed tables, API endpoint, N:M/1:N relations and provenance.
- L59-68: unresolved types, relations, endpoint and effects.

Promotion establishes editorial state, not truth of the snapshot's claimed SQL/API provenance. The two draft dates and promotion dates run in opposite order. Neither ordering resolves this conflict.

### Historical COM source (Windows-1250 / cp1250)

**C**: `/docker/openspg/downloads/google_drive/additional_functions/Przyklady użycia obiektów COM 2016 - NET - XPT - JS - VB60 - VC/JS/KorektaZbiorczaFA.js`

- SHA256: `11911b941a1c51f1da75e9ac7b49b794576d3ad40a50fc43db3b762e89d32305`
- L5,7,11,13 describe the correction example and COM interfaces.
- L58 creates **one** `CDN.DokumentyHaMag` object with `AddNew()`.
- L61-63 set COM properties `Korekta=6`, `Rodzaj=302010`, `TypDokumentu=302`.
- L66-67 select definition symbol `FKOR` and assign the numerator definition.
- L75 calls `UstawElemntyKorektyZbiorczejDokID("208,218")`: two source invoice IDs on that object. Preserve the method spelling as found in the sample.

Review used only the sanitized business excerpt and a byte/hash/selected-line comparison against C. No authentication/login section was copied or executed; no COM operation ran. This code demonstrates example construction, not a successful transaction or a supported current API contract.

### Database documentation (UTF-8)

**D**: `/docker/openspg/docs/reference/Struktura_Bazy_2026.4.1.md`

- SHA256: `c3adf9ff27267c1abcc235326672c03f06713dc74ba9cf8074adf2770e03112d`
- L83981-83990: `TrN_Korekta` is a multi-valued correction-type field: 1 denotes quantity correction; 6 is described as EU border correction. It is not a universal Boolean correction flag or an invoice-reference FK.
- L84037-84040: `TrN_Rodzaj` refers to the document-type/kind documentation.
- L169146-169156: type **302**, kind **302009**, “Faktura sprzedaży korekta zbiorcza”; adjacent kind **302010** means “Faktura sprzedaży korekta danych”.

The 2016 COM sample's `Rodzaj=302010` differs from the 2026.4.1 collective-correction entry. Its `Korekta=6` cannot inherit a current collective-correction meaning from this schema documentation. Do not translate historical COM properties into current SQL write instructions. This review neither resolves the discrepancy nor proves that the COM property and SQL column share a current contract.

### Official help archives

Archive root **S**: `/tmp/opencode/owa-source-evidence-20261023-eo3x_89j/`.

| Source | Public URL | GET time (UTC), status | Archive SHA256 |
|---|---|---|---|
| E: archive 2026 | <https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/korekta-zbiorcza/> | 2026-10-23T06:55:42.242951+00:00, 200 | HTML `9b09868f93c57c5c898c91cab4fe1639dc6873acfcf2514e45a25f2170f184dc`; UTF-8 text `9811a807121701d58f5fbf6093309162bb7a2b451d18111530e03932d14d2a9d` |
| F: current-linked 2026_5 | <https://pomoc.comarch.pl/optima/pl/2026_5/dokumentacja/korekta-zbiorcza/> | 2026-10-23T06:55:42.346835+00:00, 200 | HTML `f02eab6e95474cef2b3f38e3b90041ec3dcdde2b5d5bb1d0e831b04d31384750`; UTF-8 text `2446c348948615bfa6be3a08b7d91a8d58ce82123237574423f796292eb4b86f` |

Files: `S/korekta-zbiorcza-2026.{html,txt}` and `S/korekta-zbiorcza-2026_5.{html,txt}`. `S/manifest.json` records URLs, retrieval metadata and hashes. E's archived HTML links to F; E text L87-92 displays the archive notice. E/F text L20-21 displays the update date **20/09/2022**. Their pertinent article bodies at L23-41 are identical, although their full-page hashes differ.

Task 2 rechecked all archive/local-source hashes, strict local encodings, selected COM lines and article-body equality: `/tmp/opencode/owa-quality-task2-n8qdy5zk/source-validation.json`. The controller supplied these archives; Task 2 did not issue additional HTTP requests.

## Claim-by-claim assessment

| Question | Snapshot claims | Source finding and advice |
|---|---|---|
| Product/module and FS/FZ scope | A L18,24,49: Additional Functions only; A L61 leaves FZ open. B L18,22 describes sales. | F L23,30,32 describes the standard sales **and purchase** list feature. C's location in an AdditionalFunctions KB describes source classification, not a module restriction. For a sales-only ontology entity, state that deliberate entity scope while distinguishing the wider documented FS/FZ mechanism. Do not imply product-wide sales-only scope. |
| One correction or one per source? | A L21 hypothesizes one FSKOR per invoice; A L46 models generation of many correction documents. B L18,21 describes a collective document. | C L58,75 creates one object with two IDs. F L30,32,36 describes selected invoices on the collective correction and reciprocal UI links. Favor one collective correction referring to multiple invoices for this documented workflow; do not assert per-invoice generation. No runtime execution confirms the sample outcome. |
| Purpose and conditions | A L18 extends to VAT-rate/system-error corrections. B L18 extends to formal corrections. | F L23,27-35 documents collective discount, period/selected invoices, one contractor, approved invoices and common currency. Values group by VAT rate rather than copying invoice item lines (L35). Do not generalize to arbitrary formal/VAT-rate corrections. |
| Fields and numeric codes | A L31-40 labels TraNag/FSKOR mappings and `TrN_Korekta=1` “confirmed”; B L30-32 infers TraNag/TraElem/relations from a parent model. | C supplies historical COM properties and FKOR symbol, not a tested present SQL mapping. D contradicts treating `TrN_Korekta` as Boolean and documents the 302009/302010 distinction. Keep exact live PK/FK, table joins, type codes and COM-to-SQL mappings unconfirmed. Do not rename `FKOR` into an asserted FSKOR SQL contract. |
| Relations and cardinalities | A L45-46 proposes 1:N aggregation/generation. B L49-51 asserts N:M invoice links and 1:N settlement/VAT relations. | F L36 supports multiple linked invoices and reciprocal UI navigation, not a SQL join, a global N:M model or VAT/settlement cardinalities. A logical one-correction-to-many-invoices description does not prove all database or reverse-direction constraints. Exact deployed relationships remain unconfirmed. |
| COM versus current MCP/API | A L18,49 asserts API absence while L63 leaves it unknown. B L25,38,56 names `create_sales_correction` and `POST /api/v1/sales/correction`. | C demonstrates a historical COM surface only. None of C-F verifies that endpoint or a current MCP equivalent. No tool/API was called. A prior catalog-name search reported in S/HANDOFF.md bounds only that catalog and cannot prove global absence of an API. Mark present API support **UNKNOWN**, including both endpoint-existence and absence claims. |
| Business effects | B L23,50-51 speculates about VAT/settlements; B L63 leaves warehouse/VAT effects open. | F L37 says this collective discount does not change warehouse goods value or correct individual invoices/PZ. F L38 disallows a correcting document for the collective correction itself. Scope these as documented behavior, not a live test or a claim about all correction types. Current posting behavior, VAT/settlement writes and their cardinalities remain unconfirmed. |
| Verification level | A L12-13 says low/unverified despite “confirmed” rows; B L12-13 says partially verified/medium despite speculative provenance. | Retain documentary/static-source evidence labels per claim. Neither promotion, sample presence nor a parent ontology model establishes live SQL/API verification. Do not carry over either snapshot's broad confidence label. |

## Proposed review decision, with no corpus action

Ask the designated knowledge reviewer to approve a replacement/synthesis that:

- Describes the documented collective discount and FS/FZ availability, and decides whether “FA” names a sales specialization or the wider mechanism.
- Separates the 2016 COM example, 2026.4.1 schema entry and 2026_5 help archive with its 2022 displayed date. Cites each supported claim and preserves the code discrepancy without selecting universal numeric values.
- Removes unsupported module exclusivity, per-invoice generation, arbitrary formal/VAT-rate scope and the unverified endpoint/absence assertions. Keeps live SQL/API mappings, posting effects and precise cardinalities **UNKNOWN**.
- Records explicit supersession/withdrawal decisions for the conflicting approved revisions through a separately authorized workflow. A new advisory alone cannot resolve two still-promoted versions.

This task submitted no drafts, edited no corpus records and changed no promotion/withdrawal state. The four ambiguous groups (PS, FPF, WZ and collective correction) still fail the real-input gate. Only the collective-correction group's business claims received this source review; a content difference in the other groups does not establish that all their business assertions contradict each other.

See [the verification ledger](OWA_Quality_Coverage_Verification_2026-10-23.md) for commands, counts, test evidence and non-mutation checks. Merge, push, corpus correction, rebuild, restart, deployment or automation changes require a separate request.
