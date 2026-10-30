# Daily ops remediation — 2026-10-30

## Completed

- Refreshed live `KB_Quality_Gate_Report.json` and `.md` using the existing CLI as `mcpbot`, without `--auto-fix`: overall **WARN**, no FAIL results. The prior October 26 OWA missing-chunk error was obsolete.
- Current OWA staging has 130 approved revisions, 67 entity groups, all 67 fully covered. It remains **not publication-ready**: 135 relation targets are unresolved. Live builder jobs are still from July, so this staging result is not proof of deployed graph parity.
- Refreshed live `ERP_KB_Quality_Weekly_Report.md` through the dashboard API. Its zero averages still coerce missing metrics to zero; do not interpret them as measured zero error/acceptance rates.
- Prepared a minimal Betterfly exporter fix in this isolated checkout: honor ROOT and match real `<p>` tags, never `<path>`, `<pre>` and other p-prefix tags. The prior pattern consumed SVG/navigation up to later paragraph closing tags.
- Verified 9 new guarded actual-CLI regressions, 202 existing OWA regressions, syntax check and independent review. No code-review findings.
- Scratch rehearsal over copies of current public inputs: 238→218 chunks; maximum content length 65743→9603 characters; all document/resource/pattern ID sets unchanged. Evidence: `/tmp/opencode/betterfly-rehearsal-1gl0ugvx/comparison.json`.
- On subsequent user authorization, stopped only scheduler instances 871 and 984 through the supported API. Builder jobs 869 and 982 now report TERMINATE; their vectorizer/writer tasks also report TERMINATE. No delete or setFinish operation was used.
- Confirmed the hidden provider failure with non-applying embedding probes on public KB text: old 65743-character chunk returns HTTP 400 with maximum context length 8192 tokens; repaired maximum 9603-character chunk returns HTTP 200, 3860 tokens, 1536 dimensions. Installed OpenAI vectorizer catches the original exception and returns None; batch vectorizer then calls `embeddings.extend(None)`, explaining the misleading TypeError.
- Ran exactly one controlled Chunk-only UPSERT from private scratch staging: **job 999 FINISH**, 218 rows, all four scheduler stages FINISH. No other CSV was imported. Duration: 07:13:16–07:14:09 UTC.
- Final graph readback at 07:18 UTC: all **218/218 desired IDs unique**, **218/218 contents exactly match** the JSON-encoded input representation stored by OpenSPG, **218/218 content and name vectors have 1536 dimensions**. There are 561 Chunk nodes total; 343 outside this repaired set were retained, including all 20 IDs absent from the repaired export. No stale-node cleanup was performed.
- Operation evidence: `/tmp/opencode/betterfly-stop-instances-2026-10-30.json`, `/tmp/opencode/betterfly-embedding-probes-2026-10-30.json`, `/tmp/opencode/betterfly-controlled-import-m32edxtm/operation.json`, `final-graph-verification.txt` and `final-status.json` in that import directory.

## Permanent rollout — subsequently authorized and completed

- Source fix and regression test committed as `b01be6b` (`fix(betterfly): match exact paragraph tags during export`) on `fix/betterfly-paragraph-boundary-20261030`, then deployed to `/docker/openspg` with a local fast-forward. No pull, stash, reset, remote push or service restart was used. Existing dirty source/inbox work was preserved.
- Deployed exporter ran through its normal CLI as `mcpbot`. Local `chunk.csv` has 218 rows and SHA-256 `7a9e600b9dfd97a79bdbc9534263a6de8dd2bae1d44f6496919ebccd1ac8d4d4`, exactly the bytes imported by job 999. No second Chunk import was submitted.
- Regeneration also repaired the description of **one** of 40 ReferenceDocuments. The user explicitly approved a metadata-only import: **job 1000 FINISH**, 40 existing IDs, no Chunk file. Graph verification confirms 40/40 exact descriptions and all nonempty CSV properties for all 40 records. Empty-property omission and one retained `versionHint` are distinguished below rather than hidden by an all-properties-parity claim.
- Local upload/build manifests now reference verified FINISH jobs **999 / chunk.csv / 218 rows** and **1000 / reference_document.csv / 40 rows**. Their upload URLs and current CSV byte hashes were checked against the recovery jobs before reconciliation. The other seven manifest entries were preserved; writes were atomic as `mcpbot`.
- Resume verification ran the deployed build runner with a fail-closed network guard: exactly two allowed GETs (schema and builder job list), zero upload/submission attempts, exit 0. Evidence: `/tmp/opencode/betterfly-resume-verification-2026-10-30.json`.
- Installed root crontab entry `35 5 * * 1` calls `/docker/openspg/scripts/refresh_official_reference_delta.mjs --kb all --build ...`; its Betterfly target uses the newly deployed exporter path. The actual scheduled refresh was not forced. Regression tests also pass against the deployed exporter.
- Betterfly quality gate refreshed using the supported CLI as `mcpbot`: **PASS**, no errors or warnings, jobs 999/1000 visible. Global gate remains WARN for other known KB conditions.
- Backup: `/tmp/opencode/betterfly-rollout-backup-a6x9z2uc` (previous Betterfly export directory, public source registry, reconciliation and verification evidence). Five output/manifest/registry write checks passed for `mcpbot`; no permissions were weakened. The existing registry file was writable even though creating new files in its parent directory is restricted.
- Validation: 211 scoped tests before deployment; deployed `npm run check`, 9 guarded exporter tests, and graph readback passed. Final Chunk readback remains 218/218 exact contents and complete 1536-dimensional vector pairs.

## Remaining blockers / next write-enabled maintenance

1. The next real scheduled refresh has not yet executed; permanent source rollout and a guarded resume test are verified, not a future network fetch against potentially changed upstream HTML.
2. Resolved after separate approval: the unsupported `versionHint` property was removed from the OSS ReferenceDocument without deleting or otherwise changing that document. UPSERT's empty-value behavior itself was not changed.
3. Resolved for the approved subset: audit found 19 removal candidates and one held historical technical example. After explicit user confirmation, exactly those 19 nodes were removed; the held example remains unchanged. Other historical nodes outside this allowlist still require their own review and approval.
4. Resolve OWA relation targets against approved identity evidence; never invent FKs to turn WARN green. Its current export must not be published as ready.
5. Final status: automation paused and shadow-only, publication not approved; LLM PASS and MCP health OK. No safety override or resume was performed. The historical Official Delta report stays FAIL because that run really failed; successful recovery is documented separately rather than rewriting history.

Live changes: generated quality/weekly reports, two scoped scheduler stops, job 999's Chunk UPSERT, explicitly approved job 1000's ReferenceDocument UPSERT, scoped source/test fast-forward deployment, supported Betterfly export/manifest regeneration, and subsequently approved deletion of exactly 19 audited nodes plus one property. Other preexisting source edits, inbox decisions, public source snapshots, secrets and service files were preserved. No automation override or service restart occurred. No changes were pushed remotely.

## Approved cleanup closure

At 2026-10-30 12:11 UTC, following explicit user confirmation, one guarded transaction deleted the 19 approved Chunk IDs and removed only `versionHint` from the selected OSS document. Plain DELETE was used; zero relationships were removed. A protected, checksum-verified snapshot contains all selected pre-operation properties/vectors.

Post-check: Chunk count 561→542, approved IDs remaining zero, held historical example unchanged, 218/218 current chunks exact with complete 1536-dimensional vectors, and 40/40 ReferenceDocuments now match every CSV field under the storage normalization rules. Local exports unchanged; MCP healthy, LLM PASS and automation still paused/shadow-only/not publication-approved.

Audit/allowlist and full closure: `Betterfly_Historical_Chunks_Audit_2026-10-30.md`, its immutable `.json`, and `Betterfly_Historical_Chunks_Cleanup_2026-10-30.json`. The held `DocumentException` / ErrorCode 5 example is not verified by current source HTML; preserve it pending a separate provenance/archival decision. This cleanup did not touch the 135 unresolved OWA targets or other out-of-export nodes.
