# OWA empty promoted snapshot diagnosis — 2026-10-14

**Result: the promotion defect is reproduced; all 67 empty snapshots have recoverable raw Markdown. The current staged 67-entity / 190-chunk corpus is intact.**

Task ID: `OWA-Empty-Promoted-2026-10-14`. Branch `main`, base commit `79e376d241322b2debbffb900a68bcf67ae78004`. Existing uncommitted work was preserved. Diagnosis only; proposed changes require approved design.

## Evidence boundaries

- **POTWIERDZONE** means measured local files, actual connected-tool outputs or isolated execution of the current helper.
- **WNIOSEK** means a conclusion from that evidence. **NIEUSTALONE** means not established.
- The tool calls were live MCP invocations of local-artifact retrieval. They explicitly did not execute the KAG/OpenSPG graph. No current MSSQL or ERP business calls were made.
- Source declarations such as `CONFIRMED`, `częściowo-zweryfikowane`, unchecked validations and historical MSSQL evidence remain declarations from those source documents, not certification today.

## Exact counts and classification

| Measure | Count |
|---|---:|
| rawHelperCount | 134 |
| promotedHelperCount | 134 |
| registryCount | 134 |
| emptyPromotedJson | 67 |
| emptyRawJson | 67 |
| legacyRecoverable | 67 |
| genuineEmptyOrUnresolved | 0 |
| emptySelectedOverlap | 1 |
| emptyNotSelected | 66 |
| emptyWithSelectedNonemptySameTitleCounterpart | 66 |
| emptyWithOlderSelectedCounterpart | 0 |
| emptyWithNewerSelectedCounterpart | 66 |
| selectedDrafts | 67 |
| selectedNonemptyJson | 66 |
| selectedEmptyJsonUsingMarkdown | 1 |
| stagedEntityCount | 67 |
| stagedChunkCount | 190 |
| chunkEntityRefIds | 67 |
| chunkSourcePaths | 67 |
| unmappedChunks | 0 |
| emptyStagedChunks | 0 |

All 134 OWA registry entries are `promoted`. All 67 affected raw JSON and promoted JSON files omit `content`; this is not an explicit empty-string population. Every affected promoted MD has an empty `## Content` section.
The 67 sources are metadata-only/body-in-MD format records: 66 dated July 15 and one July 17 auto-generated test entity. Raw MD layouts are 50 business-description style and 17 classification/table/API style. All contain substantive ontology text. **Genuinely empty sources: 0; missing raw MD: 0.**

## Selection overlap and version evidence

- Exactly **1 of the empty 67** is selected: `draft_2026-07-17_494ddc8b_owa-auto-atrybuty-test-v2` (“Encja: Atrybuty test v2”). Its 493-character raw MD produces `OWA_CHUNK_ATRYBUTY_TEST_V2_1`, referring to `OWA_ENTITY_ENCJA_ATRYBUTY_TEST_V2`.
- The remaining **66** have newer July 17 nonempty-JSON counterparts selected by actual length-first/date-tiebreak logic. None has an older selected counterpart. They supply **189** staged chunks.
- 62 of those selected counterparts match the trimmed legacy raw-MD body hash; 4 differ. Do not treat semantic-title duplicates as content-identical.
- Differing legacy bodies: `draft_2026-07-15_06e9257b_potwierdzenie-salda`, `draft_2026-07-15_05bf7276_faktura-proforma`, `draft_2026-07-15_05af9e1c_wydanie-zewnetrzne`, `draft_2026-07-15_0570f3dd_korekta-zbiorcza-fa`.
- Title groups: 65 pairs, one singleton (Atrybuty test v2), one triple (Towar). The additional unselected nonempty draft is `draft_2026-07-17_3dd22ba4_encja-towar-kartoteka-towarow-i-us-ug`; its selected peer has the same 10818-character JSON length and a later creation timestamp.
- In-memory counterfactual using full raw-MD bodies in the shared raw loader would change **63 selected IDs** under the actual selector. This was not applied; it demonstrates why promotion fallback must not be globalized into `findRawDrafts()`.

## Staged CSV and chunk provenance

Parsed using the actual `parseCsvRecords()` helper, including quoted newlines and escaped quotes. The actual exporter selection/parser definitions were evaluated read-only without its write-side entrypoint. No staged CSV was rewritten.

| Artifact | Rows | Multiline records | All staged cells equal reconstruction |
|---|---:|---:|---|
| ontology_entity.csv | 67 | 18 | true |
| ontology_field.csv | 109 | 0 | true |
| ontology_relation.csv | 147 | 0 | true |
| workflow_pattern.csv | 132 | 0 | true |
| chunk.csv | 190 | 189 | true |

All 190 chunks are nonempty and map to exactly 67 source paths and 67 entity ref IDs, with 0 unmapped chunks. The JSON report retains each chunk ID, sourcePath, sourceDocumentRefId, selected draft ID and content SHA-256; it also retains full file hashes and reconstructed canonical hashes. The manifest is dated 2026-08-31; current static parity is established, live graph parity is not.

Static target presence: Konto bankowe 3 chunks; Konto księgowe 3; Dokument księgowy (PK/BO/WB) 5; Kontrahent (kartoteka kontrahentów) 6.

## Actual SemanticKB probes

| Target | Observed routing / result |
|---|---|
| konto | Target account content surfaced, mixed ranking; not namespace-exclusive. |
| dokument księgowy | Weak target ranking despite exact target entity and five chunks being present statically; snapshot loss is not established as cause. |
| kontrahent | Routing/coverage miss for requested namespace; exact OWA contractor entity and six chunks exist statically. |

The first two calls used OWA as primary with BusinessSemantics auxiliary; Kontrahent routed only to BusinessSemantics. Exact query strings and observed excerpt locations are retained in JSON. The current tool profile does not make a natural-language “OWA only” request namespace-exclusive. These outcomes establish mixed ranking/routing, not disappearance of the staged source corpus or a causal connection to empty snapshots.
No external-search or draft output appeared in these responses. Server-internal logging/learning side effects were not audited because runtime state is out of scope; absence of returned write output is not proof about internal logging. Since connected read tools were available, an isolated handler fallback was unnecessary.

## Root cause and actual-helper reproduction

- `scripts/lib/promoted_knowledge.mjs:197–209`: raw loader reads JSON and attaches raw paths, without MD body fallback.
- `:296–375`: `promoteDraft()` spreads raw JSON, writes JSON directly, then interpolates `promoted.content` into MD; undefined content is removed by `.filter(Boolean)`. Adjacent MD is never used.
- `scripts/export_owa_ontology.mjs:124–145`: exporter selects from all raw OWA drafts, preferring JSON-content length, then creation date; its parser independently falls back to raw MD.
- Actual reproduction used the unchanged helper, isolated `ROOT` under `/tmp/opencode`, minimal metadata-only OWA JSON and a 163-character adjacent ontology MD. JSON content remained absent; promoted MD ended at `## Content`; raw MD stayed byte-identical.
- Parent-root/secret reads and network/process execution were guarded; parent-root, secret, fetch and net guard self-tests passed. Actual audit writes (two promotions including force) were confined to fixture ROOT. The fixture was removed in `finally`, verified absent.
- Normal repeat promotion correctly rejects already-promoted records; supported `force: true` succeeds but repeats the empty-content snapshot defect.
- Inspected existing tests cover reopen compensation and content-bearing BusinessSemantics/Sprint snapshots, not this metadata-only OWA promotion case. No production-affecting export/build test was run.

## Separate raw-based, status-blind exporter risk

**POTWIERDZONE code path:** OWA export uses `findRawDrafts()` filtered only by namespace; it does not consult registry publication statuses or promoted snapshots. All current 134 OWA entries are promoted, so this diagnosis does not identify a pending/withdrawn record currently being selected. A future pending/rejected/withdrawn raw draft can still win selection by content length/date. This is a separate policy/design concern; no pending/withdrawn ingestion changes are recommended as part of this snapshot repair.

## Minimum proposed repair — awaiting approved design

1. Add a narrowly scoped OWA promotion-time fallback for missing/blank JSON content. Use only that exact adjacent raw MD, preserve existing nonempty JSON preference, raw bytes and source declarations. Record body-source path/hash provenance. Leave the shared raw loader and version selector unchanged.
2. Before rehydration, back up all exact 67 promoted JSON/MD pairs, complete registry state and hashes. Use only the existing supported promotion force path for these exact IDs after the fallback is implemented and verified; retain status, original dates, metadata, review/operator details and full registry fields. Record repair time separately.
3. **Real execution blocker:** existing bare `--force` resets `promotedAt`, replaces operator/review fields and reconstructs the registry entry, dropping additional fields. The current helper has no complete state/date preservation option. An approved preservation extension within that supported path is required; backup alone does not make bare force state-preserving.
4. Verify missing/empty-MD blocking, JSON preference, namespace isolation, original state/date preservation and failure compensation in isolated fixtures. Read back all 67 repaired bodies and compare exact current 67 selected IDs and all five staged hashes. Snapshot-only repair does not call for build/graph work.
No body-availability blocker was found among these 67. Live graph/embedding parity remains unknown. Routing/ranking observations should be investigated independently if the user approves that work.

## Exact 67-ID inventory

Full SHA-256, title, raw-MD availability/body/hash, raw/promoted metadata, source dates, registry state, selected counterparts, chunk paths/ref IDs are retained per record in the companion JSON. All rows below are recoverable metadata-only format records with empty promoted Content.

| Exact draft ID | Title | Raw MD lines | Selected |
|---|---|---:|---|
| draft_2026-07-17_494ddc8b_owa-auto-atrybuty-test-v2 | Encja: Atrybuty test v2 | 18 | yes |
| draft_2026-07-15_f76fb8bf_dokument-ksiegowy | Encja: Dokument księgowy (PK/BO/WB) | 115 | no |
| draft_2026-07-15_f2c81a79_kod-ean | Encja: Kod EAN / Barcode | 61 | no |
| draft_2026-07-15_ebec5558_przyjecie-wewnetrzne | Encja: Przyjęcie Wewnętrzne (PW) | 25 | no |
| draft_2026-07-15_e9e16ab9_plan-kont | Encja: Plan kont | 62 | no |
| draft_2026-07-15_e9b320c3_workflow-dokumentu | Encja: Workflow dokumentu | 135 | no |
| draft_2026-07-15_e8e5db6a_faktura-sprzedazy | Encja: Faktura Sprzedaży FS | 42 | no |
| draft_2026-07-15_df5cd593_kontakt-crm | Encja: Kontakt CRM | 109 | no |
| draft_2026-07-15_dd30b870_ponaglenie-zaplaty | Encja: Ponaglenie Zapłaty PON | 59 | no |
| draft_2026-07-15_d2d8d519_raport-kasowy-bankowy | Encja: Raport Kasowy/Bankowy (RKB) | 75 | no |
| draft_2026-07-15_d163edaa_platnosc | Encja: Płatność | 82 | no |
| draft_2026-07-15_d0a94846_konto-ksiegowe | Encja: Konto księgowe | 82 | no |
| draft_2026-07-15_cf92b7fb_rozchod-wewnetrzny | Encja: Rozchód Wewnętrzny (RW) | 25 | no |
| draft_2026-07-15_cf0239c3_waluta | Encja: Waluta | 64 | no |
| DRAFT_2026-07-15_cbefb9ce | Encja: Dokument magazynowy (PZ, WZ, magazyny) | 96 | no |
| draft_2026-07-15_bad881ad_paragon | Encja: Paragon (PA) | 29 | no |
| draft_2026-07-15_b9e869d8_producent | Encja: Producent | 70 | no |
| draft_2026-07-15_b545ff26_dokument-handlowy | Encja: Dokument handlowy | 41 | no |
| draft_2026-07-15_b53d38b5_analityka-kpi | Encja: Analityka / KPI | 85 | no |
| draft_2026-07-15_b26d4aff_kategoria | Encja: Kategoria | 94 | no |
| draft_2026-07-15_ae0fd92b_definicja-dokumentu | Encja: Definicja dokumentu | 82 | no |
| draft_2026-07-15_a844846f_jednostka-miary | Encja: Jednostka miary | 76 | no |
| draft_2026-07-15_a05caae5_okres-obrachunkowy | Encja: Okres obrachunkowy | 75 | no |
| draft_2026-07-15_9b1e3f67_korekta-pz | Encja: Korekta PZ (PZKOR) | 29 | no |
| draft_2026-07-15_9468a772_towar | Encja: Towar (kartoteka towarów i usług) | 173 | no |
| draft_2026-07-15_93bcde99_dokument-wewnetrzny-sprzedazy | Encja: Dokument wewnętrzny sprzedaży (FAW) | 71 | no |
| draft_2026-07-15_91f269a5_deklaracja-zus | Encja: Deklaracja ZUS | 121 | no |
| draft_2026-07-15_8ea93bec_srodek-trwaly | Encja: Środek trwały (kartoteka, grupy, amortyzacja) | 110 | no |
| draft_2026-07-15_84ae86e2_grupa-towarowa | Encja: Grupa towarowa | 69 | no |
| draft_2026-07-15_8349cf58_etat-zatrudnienie | Encja: Etat / Zatrudnienie | 94 | no |
| draft_2026-07-15_82eb3d47_przesuniecie-mm | Encja: Przesunięcie Międzymagazynowe (MM) | 26 | no |
| draft_2026-07-15_8088ba93_relacje-dokumentow | Encja: Relacje dokumentów | 53 | no |
| draft_2026-07-15_7f7b2757_pracownik | Encja: Pracownik (kartoteka pracownicza) | 115 | no |
| draft_2026-07-15_7e2ad8d7_roznica-kursowa | Encja: Różnica kursowa RKUR | 61 | no |
| draft_2026-07-15_77c55b2c_rozrachunek | Encja: Rozrachunek | 80 | no |
| draft_2026-07-15_705d448d_kasa-przyjmie | Encja: Kasa Przyjmie (KP) | 73 | no |
| DRAFT_2026-07-15_6a2a0f1c | Encja: Kontrahent (kartoteka kontrahentów) | 117 | no |
| draft_2026-07-15_68c2b86b_korekta-fz | Encja: Korekta FZ (FZKOR) | 30 | no |
| draft_2026-07-15_6745c4d4_kompensata | Encja: Kompensata | 75 | no |
| draft_2026-07-15_65115824_zamowienie-dostawcy | Encja: Zamówienie u Dostawcy (ZO) | 29 | no |
| draft_2026-07-15_648cd875_podmiot-firma | Encja: Podmiot / Firma własna | 71 | no |
| draft_2026-07-15_60d92e04_faktura-zaliczkowa | Encja: Faktura Zaliczkowa (FA) | 26 | no |
| draft_2026-07-15_5e91caf7_faktura-zakupu | Encja: Faktura Zakupu FZ | 34 | no |
| draft_2026-07-15_5abae795_dokument-wewnetrzny-zakupu | Encja: Dokument wewnętrzny zakupu (FZWFZ) | 71 | no |
| draft_2026-07-15_59ca9b9c_deklaracja-pit | Encja: Deklaracja PIT | 126 | no |
| draft_2026-07-15_55b70155_korekta-fs | Encja: Korekta FS (FSKOR) | 32 | no |
| draft_2026-07-15_52e06c5d_przyjecie-zewnetrzne | Encja: Przyjęcie Zewnętrzne (PZ) | 32 | no |
| draft_2026-07-15_4df4b8b8_lista-plac | Encja: Lista płac | 104 | no |
| draft_2026-07-15_4db07f6c_umowa-zlecenie | Encja: Umowa cywilnoprawna / Umowa zlecenie | 101 | no |
| draft_2026-07-15_4a35e7b3_kasa-wyda | Encja: Kasa Wyda (KW) | 74 | no |
| draft_2026-07-15_46de2dd1_rezerwacja-odbiorcy | Encja: Rezerwacja Odbiorcy (RO) | 31 | no |
| draft_2026-07-15_3efaf291_personel | Encja: Personel / Współpracownik | 64 | no |
| draft_2026-07-15_3ecb677d_dziennik | Encja: Dziennik | 63 | no |
| draft_2026-07-15_3b4e77a7_konto-bankowe | Encja: Konto bankowe | 93 | no |
| draft_2026-07-15_33510493_nieobecnosc | Encja: Nieobecność | 114 | no |
| draft_2026-07-15_2a4feda5_forma-platnosci | Encja: Forma płatności | 77 | no |
| draft_2026-07-15_25a866ee_oferta-handlowa | Encja: Oferta Handlowa (OFER) | 26 | no |
| draft_2026-07-15_24de4e92_rejestr-vat | Encja: Rejestr VAT | 102 | no |
| draft_2026-07-15_1d3616ff_nota-odsetkowa | Encja: Nota Odsetkowa NO | 82 | no |
| draft_2026-07-15_1b307d21_zadanie-crm | Encja: Zadanie CRM | 82 | no |
| draft_2026-07-15_0a84a26d_cena-towaru | Encja: Cena towaru | 70 | no |
| draft_2026-07-15_09ac6ba4_magazyn | Encja: Magazyn | 85 | no |
| draft_2026-07-15_0900ce67_dekret-ksiegowy | Encja: Dekret księgowy | 80 | no |
| draft_2026-07-15_06e9257b_potwierdzenie-salda | Encja: Potwierdzenie Salda PS | 56 | no |
| draft_2026-07-15_05bf7276_faktura-proforma | Encja: Faktura Proforma (FPF) | 26 | no |
| draft_2026-07-15_05af9e1c_wydanie-zewnetrzne | Encja: Wydanie Zewnętrzne (WZ) | 30 | no |
| draft_2026-07-15_0570f3dd_korekta-zbiorcza-fa | Encja: Korekta zbiorcza FA | 63 | no |

## Validation

- PASS: npm run check (syntax-only, exit 0)
- PASS: python3 scripts/validate-module-map.py (4 modules, exit 0)
- PASS: actual-helper isolated promotion and force reproduction assertions
- PASS: 67 exact unique-ID inventories with source-state/hash retention
- PASS: actual CSV multiline parser: no warnings, all row counts match manifest
- PASS: actual exporter selection/parser reconstruction matches every staged cell in all five CSVs
- PASS: protected fingerprint readback: 550 files unchanged
- PASS: fixture finally cleanup verified
- PASS: independent Python `csv.DictReader` validation confirmed all five row counts, all 190 chunk mappings/hashes, exact raw/promoted source-state retention for all 67, and unchanged fingerprints for 550 protected files. Authored analysis/reproduction/report scripts passed `node --check`.
- Live graph, services, builds, production promotion, source changes and live MSSQL/ERP checks were not run.
- Repository writes: this Markdown and its companion JSON only. Authored analysis/reproduction scripts and derived scratch evidence are under `/tmp/opencode`.

## Handoff

```yaml
task_id: OWA-Empty-Promoted-2026-10-14
agent: OpenCode
host: current assigned OpenSPG host
repository: /docker/openspg
base_branch: main
base_commit: 79e376d241322b2debbffb900a68bcf67ae78004
result_commit: uncommitted
changed_files:
  - docs/reference/OWA_Empty_Promoted_Diagnosis_2026-10-14.md
  - docs/reference/OWA_Empty_Promoted_Diagnosis_2026-10-14.json
skills_used: [codex-delegation, systematic-debugging, verification-before-completion]
commands_run:
  - "git status --short"
  - "git branch --show-current"
  - "git rev-parse HEAD"
  - "npm run check"
  - "python3 scripts/validate-module-map.py"
  - "node /tmp/opencode/owa-promotion-repro.mjs"
  - "node /tmp/opencode/owa-empty-analysis.mjs"
  - "node /tmp/opencode/owa-inspect-classification.mjs"
  - "node /tmp/opencode/owa-summary.mjs"
  - "node /tmp/opencode/owa-write-diagnosis.mjs"
  - "python3 /tmp/opencode/owa-verify-diagnosis.py"
validation:
  passed: [syntax-check, module-map, isolated-repro, exact-inventory, csv-parity, independent-python-csv, fingerprint-readback, cleanup]
  failed: []
  not_run: [build, graph, services, production-promotion, live-ERP-MSSQL]
confirmed_findings: [67 recoverable empty snapshots, 1 selected overlap, 190 nonempty mapped chunks, actual promotion bug reproduced]
inferences: [staged corpus protected by JSON counterparts and exporter fallback]
hypotheses: []
risks: [status-blind raw export, bare force loses state and dates, live graph parity unknown]
approval_required: [namespace-scoped fallback and state-preserving force design, exact-67 snapshot rehydration]
recommended_next_action: Approve the scoped repair design before implementation or rehydration.
```
