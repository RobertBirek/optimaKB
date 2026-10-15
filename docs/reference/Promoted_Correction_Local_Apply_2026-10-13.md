# Promoted correction — local apply, 2026-10-13

**DONE — 14 successors submitted and promoted; 14 predecessors withdrawn and archived locally. Actual hold remains `paused=true`. No export, build or graph mutation was performed.**

Companion: [full-ID mapping and machine-readable evidence](Promoted_Correction_Local_Apply_2026-10-13.json).

## Authority and exact serialization

The operator authorized the corrected14 pack and archival, then explicitly resolved the ingestion metadata contract. The approved proposal and deployed validator remain unchanged. Serialization applied to every payload:

1. `namespace` → `kbNamespace`; `kbName` comes from `TARGET_KBS[namespace].kbName`.
2. Move the exact `metadata.discoveredVia="source_correction_review"` value to **`metadata.correctionOrigin="source_correction_review"`**, and **omit `discoveredVia` entirely**.
3. Preserve all other metadata, `supersedesDraftId`, evidence hashes, source dates, title, content, source URL and tags exactly.

This is the authorized semantic-preserving execution adaptation, not Exa/source-list discovery. Normalized payload hashes bind the serialized inputs, not the unchanged abstract proposal. The protected ledger records normalized payload, body, raw JSON/Markdown, promoted JSON/Markdown and predecessor archive byte hashes for every pair.

The prior attempt stopped before mutation because the validator rejected `discoveredVia=source_correction_review`. That blocked evidence and journal remain protected; this DONE report supersedes the previous report's current-state claims.

## Isolated real-submit test

All **14 mapped payloads passed the actual `submitKnowledgeDraft(...,{silent:true})` function** under an isolated temporary ROOT, with a saved temporary automation config `enabled=false`, `paused=true`, and nonempty allowlist `[ComarchOptimaSchema]`. Exact generated raw JSON and complete Markdown bytes were verified. All 14 trigger results were `{started:false,reason:"automation_paused"}`; isolated job count was zero. No live config or corpus was used for this test.

## Bounded correction window and fresh gates

- Live window began **11:50:54.532 UTC**; deadline **12:10:54.532 UTC**. Completion/readback: **11:56:57.041 UTC**, before deadline and more than four hours before autodraft.
- Fresh input bindings match preflight: pack `34091066998a7849249d15ade359656b83d0accbc46c315bed9a12d7f869c36a`, scope `84814cd82c67a76f3b0192b2f402c701ed2b8531f65947915b3ce4b697d89d7f`, live-boundary `df2d92f9c4461240b3753c36983e656edb3fa18ef87ba81168ae35a8f730b33b`.
- Protected `rollback.tar.gz` remains unchanged and verifies SHA-256 `ac3add0f87d36f7b684bcd5d3441f446bbe07b40a7407d249913af910f09cbc0`.
- Registry exactly matched protected preparation backup before mutation. All 14 original statuses/raw/promoted body hashes matched pack; all112 source/backup pairs matched; all42 scoped archive destinations were absent.
- Supported **registry** lock and **four KB** locks acquired using `acquireAutomationLock()`. Controller-managed sole executor, bounded deadline, scheduler exclusion and repeated expected-state checks were used. Manual entrypoints are not universally lock-aware: no universal mutex or multi-file transaction is claimed.
- API and supported loader confirmed `paused=true`; actual child allowlist `[ComarchOptimaSchema]` excluded all four namespaces. This process-local guard did not change stored configuration. Exact API config fingerprint stayed constant.
- Before/after-operation checks found **0 active automation jobs, 0 active dashboard actions, 0 relevant automation/discovery/scan/refresh/export/build/pipeline processes**. Historical job set stayed exactly equal, 56 records; ID/status hash `06954784b1db73b6ec54c9dd4439cf6a3d2f6067d5f291de7f07a4e24b49e139`. Every live submit returned `automation_paused`.
- Autodraft remained scheduled at **16:02:38 UTC**; daily/weekly next runs remained 14 October 02:45:30 UTC / 18 October 03:30:32 UTC. Relevant services were inactive. Root and mcpbot cron scans/refreshes were inspected and outside this window. Timers/services were not stopped or restarted.

## Lifecycle, interruption and readback

All live mutations ran as **mcpbot** through supported functions: submit14 → exact raw verification14 → promote14 → withdraw14. No wrapper with an export/build side effect was used. Review notes link full predecessor/successor IDs, and metadata stores the full predecessor.

Ledger updates use fsync, atomic rename and directory fsync. Lifecycle intent and committed-result events are fsynced to a separate journal. These durable evidence writes do not make corpus lifecycle operations atomic.

The shell's 120-second timeout interrupted the first executor after **14 submissions, 14 promotions and 9 archives**. The process had exited. Before continuing, the controller reconciled the ledger against current raw/promoted/archive files, exact statuses, unrelated registry entries, unchanged original raw/staged files, hold, jobs, processes, config and schedules. Supported locks were reacquired using their stale-process handling within the original bounded deadline. Only the five remaining supported withdrawals ran. **No submit or promotion was retried, no new retry IDs were generated, and no rollback was attempted.** The interrupted ledger is preserved separately.

Final verification confirms:

- Exactly14 unique successors with normalized payload/metadata/date/URL/namespace/content equality and matching raw/promoted artifact hashes; successor files owned by mcpbot.
- Exactly14 predecessor registry entries `withdrawn`, all28 promoted snapshot files moved to approved flat archives, byte hashes equal protected originals, no old promoted-loader visibility.
- **All896 pre-existing raw files unchanged**, including every original raw pair.
- **323 unrelated registry entries unchanged**; top-level registry fields preserved except supported `generatedAt`. Only intended14 status replacements and14 successor additions occurred.
- All112 baseline source/backup artifacts verified at their current or authorized archive paths; staged CSVs/manifests unchanged. The original sealed rollback archive remains intact.
- All supported locks released at completion; registry remains writable by mcpbot.

## Actual fourteen mappings

Display keys below are for navigation. Full predecessor and successor IDs are in the JSON companion and protected ledger; all successor IDs share `draft_2026-10-13_`.

| Old key | Actual successor suffix | Old → new status |
|---|---|---|
| de720ffd | `08fb53ae_jpk-z-deklaracja-i-ksef-omowienie-infor-z-9-kwietnia-2026` | withdrawn → promoted |
| bf920a10 | `5f3036a1_zmiany-w-podatkach-2026-bibliografia-i-tematy-poradnika-mddp-infor` | withdrawn → promoted |
| d1c8371c | `cc557dad_przejrzystosc-wynagrodzen-komunikat-mrpips-z-24-czerwca-2025` | withdrawn → promoted |
| 08cfe029 | `b5a45b4e_prawo-pracy-2025-2026-przeglad-tomasza-kowalskiego-z-lutego-2025` | withdrawn → promoted |
| 6b5ac5ed | `ef1a7107_mf-katalog-pobran-jpk-vat-odczyt-wersji-z-16-wrzesnia-2026` | withdrawn → promoted |
| dcfc95c2 | `4073314c_mf-og-oszenie-struktur-jpk-v7m-3-i-jpk-v7k-3-z-grudnia-2025` | withdrawn → promoted |
| 93f75109 | `bb00ce3f_cit-klasyczny-streszczenie-informacji-mf-aktualizacja-24-czerwca-2026` | withdrawn → promoted |
| 0bdb5e10 | `b34e9c55_zus-historyczna-zapowiedz-ograniczen-us-ug-w-nocy-5-6-czerwca-2026` | withdrawn → promoted |
| fb53cb2b | `c5ccc404_betterfly-i-ksef-zg-oszenie-autoryzacji-oraz-sugestia-z-marca-2026` | withdrawn → promoted |
| f0ede681 | `b5501577_optima-2026-2-1-og-oszenie-wydania-ze-stycznia-2026-i-datowane-komentarze` | withdrawn → promoted |
| 7c66353e | `2bd27eef_zus-zapowiedz-dokumentowania-nowych-okresow-stazu-z-21-pazdziernika-2025` | withdrawn → promoted |
| a939510d | `fc9e298f_uc127-karta-projektu-rownosci-wynagrodzen-wersja-2-0-z-maja-2026` | withdrawn → promoted |
| 9c43b46e | `2e834ec5_zus-roczna-waloryzacja-kont-opisana-7-czerwca-2023-wiadomosc-archiwalna` | withdrawn → promoted |
| 4ce9f131 | `24c70de1_zus-wnioski-o-zasi-ki-w-komunikacie-z-1-lipca-2026` | withdrawn → promoted |

Totals: submitted **14**, promoted successors **14**, withdrawn/archived predecessors **14**, jobs created **0**. Global supported inbox: promoted **303**, pending **111**, rejected **21**, withdrawn **27** (withdrawn13 +14; promoted total unchanged after replacement).

## Protected evidence and next-phase boundary

Protected root: `/tmp/opencode/protected-source-correction-20261013/`.

| Sealed evidence | SHA-256 |
|---|---|
| `local-completed-ledger.json` | `7b8d0861d5b3293c678edc646f52cece6088f081177910a4cf2d366ae1c1853d` |
| `local-completed-before.json` | `148f33254786762ac891df7e76c86ca0b242dcf2c873dbd8e304b45b3c8d5291` |
| `local-completed-registry-after.json` | `1d8dbcd907e1f55cd7618f4532244db1f31b03ea25ccc773c65b8e165687025d` |
| `local-completed-live-journal.jsonl` | `1c4824b0ce319542dd3f7ed529a0cef8a0b242964666f9b93a28f229df072717` |
| `local-completed-isolated-result.json` | `177d68b5941dbf5730950992f919ef99a044e3bbf5a5a4f2976dab9ef7b07d53` |
| `local-completed-interrupted-ledger.json` | `5134c3dff3b780313979c4e879d5a2319a2c29df45032e1331bad49494b4eacb` |

Sealed copies are root:mcpbot 0640 and preserve the mcpbot execution journal/atomic ledger. Root operational journal: `local-apply-journal.jsonl`; working lifecycle journal: `execution/live-journal.jsonl`. Temporary executors live outside deployed code.

Validation: `npm run check` PASS; module-map PASS; real isolated submit14 PASS; final full local reconciliation PASS; mcpbot ownership/access PASS. Status API calls may write normal incidental audit/canary artifacts. Credentials/CSRF tokens were not persisted or exposed.

**LOCAL phase only.** No export/build, graph write/delete/readback, restore, proposal/validator edit, persisted config change/resume, service/timer change or commit. Preserve33 graph baselines remain from preflight; no new graph claim is made. Export/build/successor graph readback and renewed conditional exact40/preserve33 gates belong to the next separately controlled phase. Leave actual pause on.
