# Semantic explicit evidence private PoC: Task 6

## Result and gate

**DONE for Task 6 implementation and verification. Independent Task 6 review and the coordinator's broad full-branch review remain pending.** The final source passed **412/412 raw checks**, including **9 new Task 6 checks**, plus **29/29 targeted legacy checks**. The full raw run took **825848.976 ms**. No failures, cancellations or skips occurred in either final run. The preceding nine-test GREEN overlaps the final 412.

Workspace: `/tmp/opencode/openspg-explicit-evidence-poc-20261021`. Base: `dfb1c8ec40f0639f291e216481277ee3cc7a791d`. The user authorized Task 6 in this isolated worktree. The source comparison found **303 pre-Task6 files byte-for-byte unchanged**. I added two scripts and these report files; I made no runtime source changes. The coordinator supplied approval for Tasks 1–5; this report claims no new reviewer approval.

The trusted controller compiled a new artifact from the final captured bytes. Its snapshot matches Task 5's repaired-source HTTP snapshot because Task 6 adds no imported runtime/compiler file. The controller did not relabel the retained pre-repair Task 5 artifact. The old 384-check run remains historical; the final 412-check run covers current source.

## Authority, code, and retained paths

| Normative absolute path | Bytes | SHA256 |
| --- | --- | --- |
| `/docker/openspg/docs/superpowers/specs/2026-10-21-semantic-evidence-contract-design.md` | 81104 | `eb3dca5e6864133c8982005b79c3269d3de5c7193a5b1a847cd830541505d380` |
| `/docker/openspg/docs/superpowers/specs/2026-10-21-semantic-evidence-contract-design-v3.md` | 32059 | `52d5a93c2a9ba4ab8ee331e653a02eeed3f787e6e2f3f2fe79034d5e00312b13` |

The approved plan's global constraints/shared interfaces, Task 6 brief, root/scripts AGENTS and module map govern execution. The domain input consists of three exact read-only EsJ4gr streams: E67/F109/C190, 406996 bytes. The original manifest seal remains `9f4275a2400e7853f7b8bcdcfe3f4463c3ad30384f1bdb49a0bbfbfc3626eede`; its other members never became compiler domain inputs. The runner does not follow raw sourcePath values.

| New source file | Bytes | SHA256 |
| --- | --- | --- |
| `scripts/run_semantic_raw_poc.mjs` | 30070 | `2cc53204b3350fb6269bc48c1566b6b4905369ddd48e8ac37c46c0543606130c` |
| `scripts/test_semantic_raw_poc.mjs` | 14599 | `b2eedc01a81ecd4571f2f826b2bdc37155d9939a8e9d8280e5332dda329f282e` |

Offline runner exports:

- `parsePocArgs(args) → {sourceRoot,output}`
- `assertOperatorExposure(candidates) → void or BLOCKED error (post-response witness assertion)`
- `runWorkflow(name, call) → DONE/BLOCKED; selectors read actual returned owner/descriptions/refs`
- `installControllerGuard({readFiles,writeFiles,output,directories}) → audit + allowPort + restore`
- `probeCpuHealth(port) → separate synthetic running-barrier/HTTP mechanism report`
- `runPoc({sourceRoot,output}) → controller measurements and retained report`

Both scripts, tests, reports and .superpowers/sdd helpers remain outside the 42-file runtime and seven-file compiler inventories. The runner's own source seal appears above and in its retained report. Parent startup modules constitute trusted controller code; captured workers execute the measured sources through the existing loader. The builtin guards do not provide an OS sandbox against a malicious controller/native code.

**Authoritative final retained run:** `/tmp/opencode/openspg-explicit-evidence-poc-20261021/.superpowers/sdd/task6-test-b7fd5b4f-0dd4-4c1f-85fc-6ca4d7748715`.

The final test executed this trusted child CLI with `shell:false`:

```sh
node scripts/run_semantic_raw_poc.mjs --source-root /tmp/opencode/semantic42-frozen-EsJ4gr --output /tmp/opencode/openspg-explicit-evidence-poc-20261021/.superpowers/sdd/task6-test-b7fd5b4f-0dd4-4c1f-85fc-6ca4d7748715
```

This path now exists; rerunning that exact command refuses reuse. A new measurement requires a new absolute private output path.

- Five-file data root: `/tmp/opencode/openspg-explicit-evidence-poc-20261021/.superpowers/sdd/task6-test-b7fd5b4f-0dd4-4c1f-85fc-6ca4d7748715/artifact` (0700; files 0600).
- Complete bounded requests/responses, canonical text envelopes, raw records, costs and guard audits: `/tmp/opencode/openspg-explicit-evidence-poc-20261021/.superpowers/sdd/task6-test-b7fd5b4f-0dd4-4c1f-85fc-6ca4d7748715/poc.json` (0600), SHA256 `4be2f8ffb05c7d2ab20409cf54859564ab02df09e68bb5ba8279493b6e357cc0`.
- Code capture: `/tmp/opencode/openspg-explicit-evidence-poc-20261021/.superpowers/sdd/task6-test-b7fd5b4f-0dd4-4c1f-85fc-6ca4d7748715/code-capture.json`, 677458 bytes, SHA256 `dbc64a4ffea0bf391852aeb52a8e2606e12ce48868e71cea992fff1fbbfc2b2b`.
- Compiler capture: `/tmp/opencode/openspg-explicit-evidence-poc-20261021/.superpowers/sdd/task6-test-b7fd5b4f-0dd4-4c1f-85fc-6ca4d7748715/compiler-capture.json`, 120299 bytes, SHA256 `05310b3e146b0b8d084b7733c55f68fade2ef9708540c9cd4ea03f7d90816716`.
- Separate controller binding: `/tmp/opencode/openspg-explicit-evidence-poc-20261021/.superpowers/sdd/task6-test-b7fd5b4f-0dd4-4c1f-85fc-6ca4d7748715/binding.json`, 1303 bytes, SHA256 `d82d0e0d5371fdb81ad975fd52c05a9b6682dcaf29e2a551f06f627ea181754a`.
- Expanded final JSON report: `/tmp/opencode/openspg-explicit-evidence-poc-20261021/docs/reference/Semantic_Explicit_Evidence_PoC_2026-10-21.json`, 381339 bytes, SHA256 `38bac0032da17ffbf0f0c3ae21c89ea200813414d903621795e857647f1f0876`.

The controller uses exclusive new output paths. It verifies source modes 0400, rejects symlinks/traversal/existing output, writes private modes and checks the source seals again at completion. The test reruns the CLI against the existing output and verifies refusal without altering its report. Earlier unique Task6 attempt roots remain historical private artifacts; only the root above supplies final costs and transcripts.

| Binding | Final value |
| --- | --- |
| worker_generation_id | `ebea90186241da3e5c4a25a6b0f2f8cc32f5c9326efe622052a809dd6861b0f0` |
| runtime_code_sha256 | `adfd3220ebed30340f66b428a9850bb079da35e2813a292fb5972c888a82d9b5` |
| manifest_sha256 | `ca45d3b2aef8d0db9a54607799ffb3915d277ae35e23e9ab88273ebbe7745df1` |
| snapshot_id | `4767385d4ff213f519527daf0f173b7bcaf7b399b3b4daa0c3ef4941e7db1d69` |
| index_sha256 | `2a0616b733ad28df0e7df05f80379dda1bf796e8bd45b4c4cc4c7e58ae0c5fd0` |
| compiler_closure_sha256 | `2746b56d02aa8968eb00ad1119e1c63427e833ebd423dc6d76478e6ed3766c28` |

Environment: Node **v18.19.1**, Unicode **15.1**, ICU **74.2**. The final audit compared all captured source bytes to current source, checked both normative hashes, re-ran independent artifact verification and replayed the three transcripts. Verification preceded descriptor release to the production pool during the measured run.

| Five-file artifact member | Bytes | SHA256 |
| --- | --- | --- |
| `manifest.json` | 8777 | `ca45d3b2aef8d0db9a54607799ffb3915d277ae35e23e9ab88273ebbe7745df1` |
| `index.json` | 3376991 | `2a0616b733ad28df0e7df05f80379dda1bf796e8bd45b4c4cc4c7e58ae0c5fd0` |
| `exports/owa_ontology/v1/ontology_entity.csv` | 74880 | `35af823973b1d0377365efbcc68f184a83cac787f12dfecf983fb31190239d16` |
| `exports/owa_ontology/v1/ontology_field.csv` | 25729 | `c0c17e8f0115f86b140e40a9e2cc02b1601bcca93f2d932e21736031d8aa6e17` |
| `exports/owa_ontology/v1/chunk.csv` | 306387 | `6c8bc167db9c0009e5cb21c259ac191b81e8e721897487110a6946276fb7aca8` |

## Measured accounting and byte bounds

| Component | Files / records | Serialized bytes |
| --- | --- | --- |
| Runtime closure | 42 | 657369 |
| Compiler closure | 7 | 118265 |
| Domain sources | 67 E + 109 F + 190 C | 406996 |
| Index | 1 | 3376991 |
| Manifest | 1 | 8777 |
| Five-file aggregate | 5 | 3792764 |

Runtime and compiler each satisfy their separate 2097152-byte bound. The five-file aggregate satisfies 8388608 bytes. These counts do not establish heap-memory limits. Recomputed accounting: **366 owned / 0 ambiguous / 0 unresolved**, **5243 postings**, **1347 diagnostics**. Diagnostic counts overlap owned records: C893, E234, F220. The JSON report contains full accounting, inventories and source seals.

## Actual three workflows

| Workflow | Calls | Expected records / owners / UTF16 | Observed | Verifier |
| --- | --- | --- | --- | --- |
| konto | 2 | 8 / 2 / 13175 | 8 / 2 / 13175 | contract_only valid |
| operator | 3 | 4 / 1 / 2600 | 4 / 1 / 2600 | contract_only valid |
| iban | 3 | 4 / 1 / 6579 | 4 / 1 / 6579 | contract_only valid |

For konto comparison, the selector chooses the two actual returned labels and their exposed chunk-related refs. The operator selector starts with the literal descriptive query, asserts exposure of four metadata declarations and both owners, then chooses the contractor owner from returned entity refs and selects records by displayed descriptions. Scoped data must expose both date declarations before selection. The IBAN selector starts with the bank entity, then uses the specified BRa_IBAN query under that returned owner; it selects only exposed content-origin/related refs. Technical witness vectors appear only in post-response assertions. Each workflow uses one get; no third discovery, second get, rank change or fixture tuning occurs.

The final output contains complete 8/4/4 physical records, mandatory E context charged once and returned_all partitions. The contractor 2600 units comprise E1312 + created_by431 + modified_by433 + modified_at424. Related K3/K4 refs can appear in hints, but the workflow does not deliver, reconstruct or judge those fragments. Independent transcript replay checks membership, ownership, whole records, budgets, parity and deterministic rank/cap truth. It does not grade semantic quality. The deterministic runner calls no existing caller model; final_answer=null, and outcome=answer denotes evidence-delivery mechanics only.

### konto: konto

Input: `{"query":"konto","kind":"entity","limit":5}`. `has_more=false`.

| Rank | Kind | Owner | Literal name | Emitted / total refs | Origins | Related emitted / total |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | entity | `OWA_ENTITY_ENCJA_KONTO_BANKOWE` | <code>OWA_ENTITY_ENCJA_KONTO_BANKOWE</code> | 1 / 1 | 1 / 1 | 3 / 3 |
| 2 | entity | `OWA_ENTITY_ENCJA_KONTO_KSIEGOWE` | <code>OWA_ENTITY_ENCJA_KONTO_KSIEGOWE</code> | 1 / 1 | 1 / 1 | 3 / 3 |

- Rank 1 `record_refs`: `f0995fa082b0e7dc31f39a29b932ef3a9831390ce11db9d8cd3f418dc862817c`
- Rank 2 `record_refs`: `5ad0cb476fa560cd7e270ad3eb554f6182f78d6ea0eb959d5452a29571d5bb45`

### operator: operator

Input: `{"query":"operator","kind":"field","limit":5}`. `has_more=false`.

| Rank | Kind | Owner | Literal name | Emitted / total refs | Origins | Related emitted / total |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | field | `OWA_ENTITY_ENCJA_KONTRAHENT_KARTOTEKA_KONTRAHENTOW` | <code>Knt_OpeModID</code> | 1 / 1 | 1 / 1 | 8 / 38 |
| 2 | field | `OWA_ENTITY_ENCJA_KONTRAHENT_KARTOTEKA_KONTRAHENTOW` | <code>Knt_OpeZalID</code> | 1 / 1 | 1 / 1 | 8 / 38 |
| 3 | field | `OWA_ENTITY_ENCJA_TOWAR_KARTOTEKA_TOWAROW_I_USUG` | <code>`Twr_OpeModID`</code> | 1 / 1 | 1 / 1 | 8 / 49 |
| 4 | field | `OWA_ENTITY_ENCJA_TOWAR_KARTOTEKA_TOWAROW_I_USUG` | <code>`Twr_OpeZalID`</code> | 1 / 1 | 1 / 1 | 8 / 49 |

- Rank 1 `record_refs`: `f6beb61d8e6c50fce6cfd52f8cb940c9178fa16f3f9acdc6a4a6df02458ff25f`
- Rank 2 `record_refs`: `5ae14cee96f0d70c4e8522f7d47f5863f31584b128a21329b8c7f726d4b85285`
- Rank 3 `record_refs`: `39c84543a3ff2c8be481b99d11cf9bd05659f9ff54605711fec0e78489a2e873`
- Rank 4 `record_refs`: `f5f5f9d825a18f88a4b34501108b25635c4ca967d4e4044240ddbdd02af1c526`

### operator: data

Input: `{"query":"data","kind":"field","entity_ref":{"id":"OWA_ENTITY_ENCJA_KONTRAHENT_KARTOTEKA_KONTRAHENTOW","namespace":"OWAOntology"},"expected_snapshot_id":"4767385d4ff213f519527daf0f173b7bcaf7b399b3b4daa0c3ef4941e7db1d69","limit":5}`. `has_more=false`.

| Rank | Kind | Owner | Literal name | Emitted / total refs | Origins | Related emitted / total |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | field | `OWA_ENTITY_ENCJA_KONTRAHENT_KARTOTEKA_KONTRAHENTOW` | <code>Knt_TS_Mod</code> | 1 / 1 | 1 / 1 | 8 / 38 |
| 2 | field | `OWA_ENTITY_ENCJA_KONTRAHENT_KARTOTEKA_KONTRAHENTOW` | <code>Knt_TS_Zal</code> | 1 / 1 | 1 / 1 | 8 / 38 |

- Rank 1 `record_refs`: `6ac2f9f1b7684e9b4b31f585916006422bc879dd752080079e87b8de09daff74`
- Rank 2 `record_refs`: `7b9cd6cecb53cade3b23ff88806364f0781c972aebf3f529cd329d3e4defdab0`

### iban: Konto bankowe

Input: `{"query":"Konto bankowe","kind":"entity","limit":5}`. `has_more=false`.

| Rank | Kind | Owner | Literal name | Emitted / total refs | Origins | Related emitted / total |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | entity | `OWA_ENTITY_ENCJA_KONTO_BANKOWE` | <code>OWA_ENTITY_ENCJA_KONTO_BANKOWE</code> | 1 / 1 | 1 / 1 | 3 / 3 |

- Rank 1 `record_refs`: `f0995fa082b0e7dc31f39a29b932ef3a9831390ce11db9d8cd3f418dc862817c`

### iban: BRa_IBAN

Input: `{"query":"BRa_IBAN","kind":"field","entity_ref":{"id":"OWA_ENTITY_ENCJA_KONTO_BANKOWE","namespace":"OWAOntology"},"expected_snapshot_id":"4767385d4ff213f519527daf0f173b7bcaf7b399b3b4daa0c3ef4941e7db1d69","limit":5}`. `has_more=false`.

| Rank | Kind | Owner | Literal name | Emitted / total refs | Origins | Related emitted / total |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | identifier_mention | `OWA_ENTITY_ENCJA_KONTO_BANKOWE` | <code>BRa_IBAN</code> | 2 / 2 | 3 / 3 | 2 / 2 |

- Rank 1 `record_refs`: `d5b2bcdcf60791f0b8be65bd1a2a1209a95a28daf28f8a56341525e81def30c5`, `5e1c4d27284c6079401e3db86b04dacd8c5d135a2935e22253247d89fce1c245`

The actual operator response contains **four field candidates and zero competing mention candidates**, with has_more=false. Scoped data contains **two distinct field candidates**, has_more=false. All five discovery responses are below the candidate cap. Contractor related navigation exposes 8 of 38 eligible records; Towar exposes 8 of 49. Those full counts remain visible. BRa_IBAN appears as one identifier_mention candidate with two source refs, three origins and two related refs; the runner creates no F declaration.

## Costs

All CPU values below come from **process.cpuUsage**. They include the measured process and its worker threads. Rows labelled by slot measure the process-wide interval while that slot's job runs; they are **not per-worker CPU attribution**. The two default-pool requests run together. Health timings overlap cold work and must not be added to it. The controller decomposition runs separately from worker jobs. Initial Node/module startup, preflight metadata, report writing and final audit replay lie outside the phase rows. These observations are single-run measurements, not latency distributions or service-level thresholds.

| Phase | Wall ms | CPU user ms | CPU system ms | CPU total ms |
| --- | --- | --- | --- | --- |
| Code/compiler/environment capture | 954.812 | 1556.141 | 191.147 | 1747.288 |
| Three source input reads + seals | 4.838 | 3.796 | 0.975 | 4.771 |
| Compilation | 4399.652 | 5307.939 | 131.590 | 5439.529 |
| Exclusive five-file staging | 3432.211 | 3726.185 | 102.767 | 3828.952 |
| Independent pre-release artifact verification | 5465.985 | 6326.009 | 175.511 | 6501.520 |
| Default pool two cold requests together (startup included) | 9226.649 | 22581.666 | 878.462 | 23460.128 |
| Default pool two warm requests together | 129.415 | 276.448 | 22.299 | 298.747 |
| Audited slot 0 cold_first_authorized_job | 8943.005 | 11344.739 | 422.473 | 11767.212 |
| Audited slot 0 warm_fingerprint_plus_lookup | 148.867 | 196.520 | 8.957 | 205.477 |
| Audited slot 1 cold_first_authorized_job | 9201.085 | 11826.126 | 430.194 | 12256.320 |
| Audited slot 1 warm_fingerprint_plus_lookup | 118.238 | 120.281 | 2.153 | 122.434 |
| Separate serial controller cold load | 7145.509 | 7607.277 | 273.279 | 7880.556 |
| Separate serial controller five-file warm fingerprint | 30.001 | 29.971 | 0.000 | 29.971 |
| Separate serial controller lookup | 76.116 | 132.925 | 0.000 | 132.925 |
| konto full bounded transcript | 260.133 | 338.474 | 8.832 | 347.306 |
| konto separate transcript verification | 7524.133 | 9017.951 | 267.669 | 9285.620 |
| operator full bounded transcript | 1179.159 | 1571.505 | 30.072 | 1601.577 |
| operator separate transcript verification | 8504.873 | 9264.635 | 254.931 | 9519.566 |
| iban full bounded transcript | 409.490 | 413.679 | 8.982 | 422.661 |
| iban separate transcript verification | 7328.306 | 8415.733 | 253.674 | 8669.407 |

The three transcript execution costs exclude their separately measured verifier runs. Each starts with warmed production slots; audited slot rows expose first-authorized-load costs, and default-pool cold rows include startup. Warm authorized jobs still re-open/hash all five fixed files. The separate serial controller measurement isolates five-file fingerprint cost from lookup without attributing that decomposition to workers. **Old A8 remains FAIL/BLOCKED 1.25.** No old-latency PASS follows from offloading or warm measurements.

## Worker, controller and loopback boundaries

The runner uses the existing private HTTP adapter and **default production two-worker pool** on an ephemeral 127.0.0.1 listener with an inert synthetic bearer. It closes the listener and workers. No live bridge or real authentication registry participates. The parent guard limits reads to explicit captured code, three sealed source files and its own declared output files, plus ancestor metadata. It permits private exclusive writes only. It blocks ambient filesystem/network/subprocess calls. Node18 requests literal-address lookup during listen; an in-memory resolver returns only 127.0.0.1 without invoking OS DNS. Client connections must use the registered ephemeral port.

Health responded in **25.500 ms** while two cold jobs remained active. A separate bounded synthetic CPU thread uses a shared running barrier and a 5000 ms ceiling; health responded in **9.169 ms** before that thread stopped. That CPU probe is a labelled mechanism, not a raw-worker generation or a live-service benchmark.

The actual production pool reached **2 active / 8 queued**, refused overflow with SEMANTIC_BUSY and returned cheap Access denied under saturation. Active and queued cancellation both returned SEMANTIC_CANCELLED. The active cancelled job retained slot ownership until completion; queued cancellation reduced the queue to seven. The final suite also exercises stale-frame isolation, unavailable roots, code mismatch, strict schemas, wrong ownership, unknown refs, budgets, snapshot mismatch, both-worker file mutation and startup-guard attacks. Those negative cases remain separate from successful workflow counts.

Both independent audited real slots received the same code/manifest/snapshot descriptor. They passed closed ready/data-ready/result validation. Each emitted one data-ready. Their normal-path cumulative counters match:

| Phase per slot | Opens | readSync calls | Bytes | Data-phase TextDecoder calls |
| --- | --- | --- | --- | --- |
| Bootstrap + code-ready + unauthorized + invalid argument | 0 | 0 | 0 | 0 |
| First authorized job | 5 | 10 | 3792764 | 4106 |
| Warm authorized job | 10 | 20 | 7585528 | 4106 |

The warm job adds one complete five-file read/hash and zero data-phase decodes. The 4106 cold count includes validation-internal TextDecoder work; it is not a five-top-level-JSON count. Worker audit ports carry telemetry outside the closed production frames. All normal-run worker violation arrays and the final controller violation array are empty. Separate deliberate denial tests and historical command failures are not covered by that zero-violation statement. The controller report samples its audit before its final allowed exclusive poc.json write.

## TDD, commands and failed-check history

I wrote five missing-feature assertions before creating the runner: **0 pass / 5 assertion failures** in task6-red. I added focused RED regressions for literal-loopback resolution, write-open flag safety and the missing CPU-overlap proof. The write-open RED used one new synthetic probe and exposed a truncation of that probe only. The repair denies string/numeric write, truncate and append flags before opening a read capability. The final tests retain unchanged synthetic bytes after each attempted flag.

| Unique log | Exit | Pass / fail / cancelled / skipped | Duration ms |
| --- | --- | --- | --- |
| task6-red | 1 | 0 / 5 / 0 / 0 | 647.683 |
| task6-green-01 | 1 | 4 / 1 / 0 / 0 | 16520.264 |
| task6-red-literal-loopback | 1 | 0 / 1 / 0 / 5 | 814.689 |
| task6-green-02 | 1 | 5 / 1 / 0 / 0 | 81389.104 |
| task6-green-03 | 0 | 6 / 0 / 0 / 0 | 84363.352 |
| task6-red-write-flags | 1 | 0 / 1 / 0 / 7 | 908.898 |
| task6-red-cpu-proof | 1 | 1 / 1 / 0 / 7 | 755.378 |
| task6-green-04 | 1 | 8 / 1 / 0 / 0 | 12168.384 |
| task6-green-05 | 0 | 9 / 0 / 0 / 0 | 80629.861 |
| task6-final-all-raw | 0 | 412 / 0 / 0 / 0 | 825848.976 |
| task6-final-legacy | 0 | 29 / 0 / 0 / 0 | 11619.717 |

Excluded development failures: green-01 denied Node18's internal literal lookup before listening; green-02 completed private execution but refused to serialize fractional report measurements with the normative integer serializer; green-04 refused independent verification because the tightened parent read-mask omitted the existing artifact reader's O_NONBLOCK. The fixes remain in the offline runner. Normative runtime code, ranking, compiler/manifest serialization and the source fixture stayed unchanged. Earlier roots are not relabeled final results.

The inherited **Task5 command-selection incident** remains excluded from GREEN. An unquoted alternation became a shell pipeline; Node auto-discovered the community script and failed Playwright's Node>=20 check under Node18 before browser launch, navigation, answer calls or report writes. Startup ensurePlaywrightHome could touch /tmp/erp-kb-playwright. Its retained task5-fix-green-focused.log is a failed check, not evidence of zero historical side effects. Task6 commands name explicit test files and quote alternation patterns.

The exclusive logger records complete command output and exit status. Its first line joins argv without shell escaping; the JSON command fields preserve that display. The commands below restore shell quoting for alternation and `bash -c`. Full commands and log hashes:

### task6-initial-check

```sh
node .superpowers/sdd/run-check.mjs task6-initial-check npm run check
```

EXIT 0; log SHA256 `71c42b3ff2d98d11b622f004f59114ac84ccd046fad9b54f100085699e7a5421`.

### task6-red

```sh
node .superpowers/sdd/run-check.mjs task6-red node --test --test-concurrency=1 scripts/test_semantic_raw_poc.mjs
```

EXIT 1; log SHA256 `d51ec188cdfb0ecd1288a5ee5524fe9d9cecd5b1ced5ef0735652d4809345cb1`.

### task6-green-01

```sh
node .superpowers/sdd/run-check.mjs task6-green-01 timeout 300s node --test --test-concurrency=1 scripts/test_semantic_raw_poc.mjs
```

EXIT 1; log SHA256 `33f30242bbdec3b31209669bd52866f2c644dce5b7f79c37a49561093ebd0407`.

### task6-red-literal-loopback

```sh
node .superpowers/sdd/run-check.mjs task6-red-literal-loopback node --test --test-concurrency=1 --test-name-pattern=guarded.ephemeral.literal scripts/test_semantic_raw_poc.mjs
```

EXIT 1; log SHA256 `6272ce1ff1fdaa09fac33bec14eae123bea6cad46e87dbfedc56fc1631a0bd98`.

### task6-green-02

```sh
node .superpowers/sdd/run-check.mjs task6-green-02 timeout 300s node --test --test-concurrency=1 scripts/test_semantic_raw_poc.mjs
```

EXIT 1; log SHA256 `91fd526c41b3c2069927613752bd275c1ba78ffa933c7b26212cf2b14fe1d406`.

### task6-green-03

```sh
node .superpowers/sdd/run-check.mjs task6-green-03 timeout 300s node --test --test-concurrency=1 scripts/test_semantic_raw_poc.mjs
```

EXIT 0; log SHA256 `a4f07df3402a7d1551068503bbc47f324ec25c19ceb4b5d8796aeb2e7db1aaa5`.

### task6-inspect-03

```sh
node .superpowers/sdd/run-check.mjs task6-inspect-03 node .superpowers/sdd/task6-inspect.mjs .superpowers/sdd/task6-test-fb8c4234-62d4-4b50-8104-978fd7bb6a6e/poc.json
```

EXIT 0; log SHA256 `e6f6476505afdb584eb352a28beb76df15ff5594e91301318b155c65babb1f6f`.

### task6-red-write-flags

```sh
node .superpowers/sdd/run-check.mjs task6-red-write-flags node --test --test-concurrency=1 --test-name-pattern=read.capability.cannot scripts/test_semantic_raw_poc.mjs
```

EXIT 1; log SHA256 `7f5a301fb46e009068c1aec93abfd331953f3c5d8b5198ad70d0321d29b37537`.

### task6-red-cpu-proof

```sh
node .superpowers/sdd/run-check.mjs task6-red-cpu-proof node --test --test-concurrency=1 '--test-name-pattern=CPU-burst.health|read.capability.cannot' scripts/test_semantic_raw_poc.mjs
```

EXIT 1; log SHA256 `038fe6c5428f07ce5b7f525536cd3df913bfe15b37ceae2e83e1fb4a199d8572`.

### task6-green-04

```sh
node .superpowers/sdd/run-check.mjs task6-green-04 timeout 300s node --test --test-concurrency=1 scripts/test_semantic_raw_poc.mjs
```

EXIT 1; log SHA256 `274d10a8f8fc574985dcfca2b5ab49a91db14cf176df81f5c793029d55e4524b`.

### task6-green-05

```sh
node .superpowers/sdd/run-check.mjs task6-green-05 timeout 300s node --test --test-concurrency=1 scripts/test_semantic_raw_poc.mjs
```

EXIT 0; log SHA256 `9233ba52810b3bcb5ab361469228059a8684f99a9c3d1ed3bc06634e282a6383`.

### task6-final-all-raw

```sh
node .superpowers/sdd/run-check.mjs task6-final-all-raw timeout 1200s node --test --test-concurrency=1 scripts/test_semantic_raw_contract.mjs scripts/test_semantic_raw_csv.mjs scripts/test_semantic_raw_code.mjs scripts/test_semantic_raw_index.mjs scripts/test_semantic_raw_lookup.mjs scripts/test_semantic_raw_generation.mjs scripts/test_semantic_raw_verifier.mjs scripts/test_semantic_raw_mcp.mjs scripts/test_semantic_raw_workers.mjs scripts/test_semantic_raw_http.mjs scripts/test_semantic_raw_poc.mjs
```

EXIT 0; log SHA256 `b3197502ecd01db94b29c376d4fedef98c71ae338568642a7ac40013f67532af`.

### task6-final-legacy

```sh
node .superpowers/sdd/run-check.mjs task6-final-legacy timeout 120s node --test --test-concurrency=1 scripts/test_semantic_worker_pool.mjs scripts/test_semantic_worker_generation.mjs scripts/test_semantic_worker_request_errors.mjs scripts/test_erp_knowledge_mcp_profiles.mjs scripts/test_erp_knowledge_mcp_protocol.mjs
```

EXIT 0; log SHA256 `a2a5235fad458bfe34da6c383f478ac7ca004a2cd82bfa6ea3ceb7d413aa13c8`.

### task6-final-check

```sh
node .superpowers/sdd/run-check.mjs task6-final-check npm run check
```

EXIT 0; log SHA256 `71c42b3ff2d98d11b622f004f59114ac84ccd046fad9b54f100085699e7a5421`.

### task6-module-map

```sh
node .superpowers/sdd/run-check.mjs task6-module-map python3 scripts/validate-module-map.py
```

EXIT 0; log SHA256 `fd0f736bf8235800f5aa35767fe7657f0823d224a622021561173570cf58b3be`.

### task6-final-syntax

```sh
node .superpowers/sdd/run-check.mjs task6-final-syntax bash -c 'node --check scripts/run_semantic_raw_poc.mjs && node --check scripts/test_semantic_raw_poc.mjs && git diff --check'
```

EXIT 0; log SHA256 `f51409940984a7f9bdcd13acff409fb87b40f6506a191e35e2aeee4f77fa984a`.

### task6-final-inspect

```sh
node .superpowers/sdd/run-check.mjs task6-final-inspect node .superpowers/sdd/task6-inspect.mjs .superpowers/sdd/task6-test-b7fd5b4f-0dd4-4c1f-85fc-6ca4d7748715/poc.json
```

EXIT 0; log SHA256 `0f8f4a51ecda0598d8d79d885b5bc527810565ad4baed4b7e072903c3c71d4aa`.

The final legacy selection uses synthetic generation/exception fixtures and metadata/list/profile checks. The final raw selection uses synthetic mutations and the pinned E/F/C fixture. I inspected the tests before execution. The tests write only their private fixture/log paths and close their local workers/listeners. No provider/model/question-bank, ERP, graph, service lifecycle, external endpoint, corpus/configuration edit, commit or subagent formed part of Task6 execution.

## Remaining limits and coordinator handoff

- [x] RED before runner implementation and focused guard/mechanism repairs; current Task6 9/9.
- [x] Fresh capture, exact three inputs, exclusive five-file artifact and pre-release independent verification.
- [x] Full actual ranked responses, all four operator declarations, both dates, whole-record budgets 13175/2600/6579.
- [x] Both-worker code/data identity and guards, cold/warm costs, default-pool 2/8/cancel, bounded local health mechanisms.
- [x] Single final complete raw run 412/412; targeted legacy 29/29; npm check, syntax and module map.
- [x] Final source seals, source/snapshot/environment binding, independent artifact/transcript replays and private reports.
- [ ] Independent Task6 spec/quality gate and coordinator broad full-branch review, including untracked new files.

No known normative blocker remains in these checks. Caller-model selection/interpretation, natural-language quality, generalization and preservation of all semantic qualifications remain unmeasured. Whole source records may contain headerless fragments, historical dates, UNKNOWN/questions or incomplete validation. The provider preserves those cells with semantic_completeness:not_assessed. It certifies no current SQL mapping, flag/ID interpretation, absent qualification or release readiness. Historical known20 remains **1 PASS / 12 PARTIAL / 7 MISS**. The final independent reviewer, not this report, supplies approval.
