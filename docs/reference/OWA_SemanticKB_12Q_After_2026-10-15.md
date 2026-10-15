# OWA SemanticKB connected live12 — PASS

**12 PASS / 0 PARTIAL / 0 MISS.** All twelve actual connected calls used the immutable questions/tools, `as_of=2026-10-15`, `limit=5`; only correlation prefix changed to `owa-12q-central-20261015-`. Manual review completed 2026-10-15T20:13:53.639Z.

## Attempt history

1. Original baseline: **0/4/8**.
2. Dedicated Semantic-only reload: public connected attempt **0/4/8**, preserved intact under `/docker/openspg/backups/manual-repairs/owa-answer-quality-20261015/qa-live12` and `/docker/openspg/backups/manual-repairs/owa-answer-quality-20261015/qa-live12-central-reload/20261015T200922081Z/failed-public-reports`.
3. Read-only diagnosis proved the public semantic path is a dynamic profile in the central dispatcher on 3400, whose process still held old imports.
4. Separately approved **erp-kb-mcp.service-only** restart: PID **2880869 → 3762440**, new start **2026-10-15 22:09:49 CEST**. New connected live12: **12/0/0**. Dedicated Semantic remains PID **3750833**.

## Full-answer manual grading

| ID | Grade | Reason |
|---|---|---|
| Q01 | PASS | The complete Kontrahent extracts define the contractor card, Knt_KntId and independent Knt_Rodzaj_Dostawca / Knt_Rodzaj_Odbiorca flags. The historical status is explicitly częściowo-zweryfikowane and current verification is not claimed. |
| Q02 | PASS | The shown identifier table contains Twr_TwrId as the internal identity and Twr_Kod as the business code. Business rules and the source table explicitly place variant prices in CDN.TwrCeny with TwC_TwCNumer. A broader UNKNOWN notice concerns detailed price-validation/discount/availability rules; it does not erase these visible requested facts. |
| Q03 | PASS | The shown Magazyn text names CDN.Magazyny, Mag_MagId as PK, Mag_Symbol as UNIQUE and Mag_NieAktywny as the deactivation flag. The Mag_Typ enum remains explicitly UNKNOWN, and no fresh MSSQL check is claimed. |
| Q04 | PASS | The shown PZ source defines external receipt from a supplier, possible linkage to FZ (faktura zakupu), the directed ZO→PZ→FZ purchase workflow and the PZ stock increase in the destination warehouse. The answer explicitly separates workflow documentation from performed operations/endpoints/current ERP effects. |
| Q05 | PASS | Complete WZ business/rule/relation units explain physical issue and stock decrease, possible linkage to the sales invoice FS, and WZ→FS. The answer explicitly says documentation is not execution proof; remaining correction/return details are attributed UNKNOWN rather than fabricated. |
| Q06 | PASS | The complete contractor relation table shows TraNag→Kontrahent N:1 with TraNag.TrN_PodID=Kontrahenci.Knt_KntId and Kontrahent→KntOsoba 1:N with KntOsoby.KntO_KntId=Kontrahenci.Knt_KntId. The historical source provenance and unverified-source boundary remain visible. |
| Q07 | PASS | Complete workflow units show DokNagEtapy, DokNagEtapyHistoria and DokNagProcesEtapy, mandatory DnE_Obowiazkowy=1, history links and per-document-type DefEtapy/transitions. The generic lifecycle is qualified by each type having its own definition; DoR_Flaga values remain do potwierdzenia and no execution is claimed. |
| Q08 | PASS | The full relation table distinguishes Towar→Grupa N:1 LOGICAL_JOIN via Towary.Twr_TwGGIDNumer=Grupy.Gru_GruID from Towar→CenaTowaru 1:N FK via TwrCeny.TwC_TwrID=Towary.Twr_TwrId (CASCADE). Differing historical group-source validation statements remain attributable, not silently repaired or promoted into current verification. |
| Q09 | PASS | The exact Atrybutytestv2 extracts describe attribute definitions, identify CDN.DefAtrybuty and historical częściowo-zweryfikowane status. The answer explicitly states that the displayed material does not provide a full field map and limits that conclusion to the shown content. |
| Q10 | PASS | The answer itself asks to clarify document type and status axis and states that general stan dokumentu does not fix the scope. This is substantive clarification beyond the echoed question and does not invent one universal status value. |
| Q11 | PASS | The answer explicitly attributes Knt_Rodzaj UNKNOWN/do potwierdzenia to a named source record and quotes the precise open issue about possible code values. No numeric enum is invented; an existing field mapping is not treated as a complete enum. |
| Q12 | PASS | The answer explicitly reports no evidence for the complete requested fictional process ID in searched local sources, refuses substitution with another entity/process, and distinguishes this from ERP-wide nonexistence. No unrelated source extracts are substituted. |

Grades assess substantive visible facts, attribution and appropriate uncertainty—not the query echo, keyword/confidence/coverage flags or automatic equality. Broader UNKNOWN notices do not make fully shown requested facts wrong. Complete current bodies also equal the reviewed offline bodies byte-for-byte; this is secondary evidence.

## Readback and evidence

- Public TLS verification **0**; all **7** central public read-only profiles passed initialize and exact tool-list checks. Diagnostic public Q01 matched the complete reviewed body; it was unscored.
- Complete connected `Q01.md/json` through `Q12.md/json`, exact requests, full-body hashes, manual rationale and source manifest: `/docker/openspg/backups/manual-repairs/owa-answer-quality-20261015/qa-live12-central-reload/20261015T200922081Z`. JSON retains the exact harness-visible text, not a raw HTTP envelope.
- Immutable baseline SHA-256: `4124f75b330142b6894637380e90589c78dec24362af721eedc45f57276221d2`.
- QA evidence-manifest SHA-256: `207e87ac980e38389f0728d02fc128a3069252af111fe309b9bac725b7cad205`.
- Revalidated **41** physical cited CSV record locators and whole-artifact hashes; source budgets remain 2 sources / 3 units per source / 4000 characters, actual maximum **3929**.
- Corpus, raw/promoted material, registry, CSV, policy/configuration, unrelated bytes and indexes preserved; ordinary request telemetry allowed. No fresh ERP/MSSQL/graph verification or historical-date filtering is claimed.

## Documentation revision 20261015T202836648Z-I1-M2

Connected live12 interval: **2026-10-15T20:10:06.911Z–2026-10-15T20:10:51.225Z**. Start is the minimum and completion is the maximum over all 12 actual calls; **Q11** finished last, 599 ms after Q12. Original per-call timestamps, responses, grades and the failed attempt remain unchanged.

I1 recovery instructions and M2 aggregate timing are corrected without operational action. The earlier sealed report versions remain historical under `/docker/openspg/backups/manual-repairs/owa-answer-quality-20261015/qa-live12-central-reload/20261015T200922081Z/final-public-reports`; this revision's before/after copies and new bindings are under `/docker/openspg/backups/manual-repairs/owa-answer-quality-20261015/report-revisions/20261015T202836648Z-I1-M2`. Independent review remains preserved, not rewritten. Live answer score stays **12 PASS / 0 PARTIAL / 0 MISS**.
