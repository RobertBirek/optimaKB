# Correction QA evidence retention — 2026-10-13

## DONE — separately sealed 16-question supplement

Durable directory: `/docker/openspg/backups/manual-repairs/source-correction-20261013/qa-16q/`.

The exact **16 primary raw JSON-RPC responses**, `Q01-response.json` through `Q16-response.json`, have been copied from `/tmp/opencode/post-correction-16q-20261013/`. Every response's SHA-256 and byte count matches both its PUBLIC `Post_Correction_16Q_2026-10-13.json` result row and the original `results.json` primary evidence index. Exact question strings and requested tools also match the PUBLIC question definitions. No answers were regenerated and no new retrieval/runtime calls were made.

The supplement contains:

- 16 byte-exact primary responses;
- byte-exact `results.json` and `review-index.json`;
- byte-exact PUBLIC `Post_Correction_16Q_2026-10-13.md` and `.json`;
- `criteria.json`, an exact-value extraction of the completed PUBLIC report's criteria and question definitions, with explicit source hash/JSON-pointer provenance;
- independent `qa-evidence-manifest.json`.

Total: **22 files / 727,169 bytes**, including **21 payload files / 713,579 bytes**. Twenty source files are byte-exact copies; the criteria extraction is explicitly derived, not represented as an original file. Copy timestamp: **2026-10-13T17:54:04.652949+00:00**.

## Independent integrity seal

Supplement manifest: `qa-16q/qa-evidence-manifest.json`.

**SHA-256: `d83bd0e1b94db5b11f1ae3ca99953603da0e7338b4f57caf91b7d7b1f8719f0b`**.

The supplement manifest records source-to-durable paths, each final SHA-256 and byte count, roles, exact-copy/derived status, source modification times, namespace/status counts, retrieval-channel limits, and the unchanged historical-core proof. This public addendum records the supplemental manifest's own checksum.

The historical `durable-manifest.json` covers only its original **444 payload files** and references its original auxiliary seals. It **does not cover the QA supplement** and was not changed. All original **447 files including seals** were rehashed against their historical bindings before and after the copy, then checked again in a separate verification run.

- Historical manifest unchanged: `f5abcdcd9af2df521f45af7aadd250a0ce0d7b3b38711c1faaeced8fa46ec753`.
- Sanitized rollback archive unchanged: `9ba5adfbb4552e809f57575e97a82eac8741f2d42960dea9292b125e39a11421`.
- Ordered historical file-inventory SHA-256: `790ebf6acbaba99b8e6c7dfb098e0a5888226fe9dcc107cdfb1591aefa07ac29`.

## Preserved QA findings

Scores are retained reviewer findings, not new assertions of answer correctness:

| Corrected-source namespace | Questions | PASS | PARTIAL | MISS |
|---|---:|---:|---:|---:|
| ComarchCommunityNews | 3 | 0 | 1 | 2 |
| TaxbellAccountingVATReference | 3 | 0 | 3 | 0 |
| TaxbellLegalReference | 2 | 0 | 1 | 1 |
| TaxbellPayrollHRReference | 8 | 0 | 8 | 0 |
| **Total** | **16** | **0** | **13** | **3** |

Namespace grouping uses each question's corrected-source key mapped through the already sealed approved correction pack. It is not a claim that every returned hit belongs to that namespace.

The actual retrieval channel was **`local_actual_MCP_handler_isolated_ROOT_production_exports`**, using **local artifacts**, with **no graph retrieval**. Live transport was not certified; the isolated ROOT omitted production downloads/source-registry inputs, so this does not prove exact running-service corpus/config parity. The existing PUBLIC report preserves the failed live-transport attempts separately from the scored primary responses.

The reported pre-execution frozen criteria checksum remains a historical reference. `criteria.json` preserves the completed report's exact criterion/question field values; it is **not** claimed to reproduce the original frozen file's bytes or checksum. The complete completed PUBLIC report is preserved byte-exact alongside it.

## Access, scope and durability

All supplement entries are regular files. Ownership is **root:mcpbot**, directory mode **0750**, file mode **0640**. Credential screening passed before copying and on the durable supplement, with no credential values printed. Effective mcpbot readability passed for all **22 files** and directory traversal.

Only explicit whitelisted source files were read/copied. The isolated ROOT's `exports` and `docs/reference` input symlinks were not traversed; no environment, cookie/login, runtime or unrelated backup folders were copied. Existing destination files must compare byte-identically before being accepted; the utility never silently overwrites divergent evidence.

The supplement is Git-ignored and outside configured `backups/automated` retention. No backup file is Git-tracked. It inherits the local-only, unencrypted, not-offsite durability limits of the manual-repairs backup. Retain until explicit operator disposition.

No historical backup payload/seal rewrite, source deletion, production/corpus/config mutation, answer regeneration, runtime calls, service changes or commit occurred. Utility: `/tmp/opencode/persist-qa-16q-supplement.py`; its SHA-256 is recorded in the supplemental manifest.
