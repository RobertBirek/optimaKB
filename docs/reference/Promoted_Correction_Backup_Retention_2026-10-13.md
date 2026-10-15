# Correction rollback retention — 2026-10-13

## Status: DONE — SANITIZED DERIVATIVE

Under the controller's explicit authorization, a credential-free sanitized derivative was built in restrictive temporary storage, checked offline, and copied into durable local storage. Only exact signed JWT values confirmed in Bearer authorization context were replaced in captured HTML, including the same HTML payloads embedded in the rollback archive. No token value, signature, decoded claim value, or surrounding credential-bearing HTML was printed, written into a script, or included in a public report/log.

The original protected folder and pack-referenced source files remain byte-for-byte unchanged. This derivative is **not** the original checksum-preserving archive. Historical inventory/sealed reports remain original evidence; their original file hashes/signatures refer to the unsanitized origin. The new provenance and manifest explicitly record derivative overrides.

## Locations and retention

- Immutable protected origin: `/tmp/opencode/protected-source-correction-20261013`.
- Sanitized temporary stage: `/tmp/opencode/sanitized-source-correction-20261013`.
- Durable root: `/docker/openspg/backups/manual-repairs/source-correction-20261013`.
- New seals: `durable-manifest.json`, `derivative-provenance.json`, `path-mapping.json` under that durable root.
- Utility: `/tmp/opencode/sanitize-persist-correction-backup.py`; its SHA-256 is recorded in the durable manifest.
- Ownership throughout durable storage: **root:mcpbot**; directories **0750**, files **0640**. Effective mcpbot readability verified across all **447 files** and traversal across all **59 directories**, including the root.

`.gitignore` ignores `backups/`; the durable archive path passes `git check-ignore`. No files under `backups/` are Git-tracked. The configured automatic retention root is `/docker/openspg/backups/automated`; its immediate-child pruning loop does not reach this manual-repairs root. Retain the derivative until explicit operator disposition. Future retention-root reconfiguration or manual deletion is outside this protection.

## Counts and integrity

| Inventory | Result |
|---|---:|
| Protected origin files / child directories | 400 / 54 |
| Original protected bytes | 418,887,774 |
| Protected files retained byte-exact | 397 |
| Protected files changed | 3: two HTML files and `rollback.tar.gz` |
| Additional PUBLIC proposal/pack/execution/comparison/report files | 25, all byte-exact |
| Approved pack-referenced source-evidence files | 19; no missing references or re-fetches |
| Payload files / bytes | 444 / 427,139,710 |
| Durable files including three new seals / bytes | **447 / 427,850,134** |
| Loose HTML copies sanitized / token occurrences replaced | 4 / 4 |
| Archive HTML members sanitized / token occurrences replaced | 2 / 2 |
| Archive members retained / unchanged payloads | **153 / 151** |

The two affected originals are `priority-08cfe029-original.html` and `priority-de720ffd-original.html`: each occurs once under protected `evidence/`, once in separate `source-evidence/tmp/opencode/`, and once inside the archive. All other protected files and all other archive payloads remain byte-exact. Tar member names, order, timestamps, ownership/role metadata and member count are preserved; only the two HTML payloads/sizes change. Filesystem modification times of all copied payloads and original protected directories are preserved. Durable access permissions intentionally use the approved restrictive policy.

| Artifact | SHA-256 |
|---|---|
| Original rollback, 6,911,776 bytes | `ac3add0f87d36f7b684bcd5d3441f446bbe07b40a7407d249913af910f09cbc0` |
| Sanitized rollback, 6,911,359 bytes | **`9ba5adfbb4552e809f57575e97a82eac8741f2d42960dea9292b125e39a11421`** |
| Durable manifest | `f5abcdcd9af2df521f45af7aadd250a0ce0d7b3b38711c1faaeced8fa46ec753` |
| Derivative provenance | `466ba8d80765c9a97c71927bafa8087cbff770361fab4730aa5266499edffc2e` |
| Old-to-durable path mapping | `ecbd2435a8ffd5127674fef70272240422f5bdf7d00700e731f184f95ce87052` |

Copy timestamp: **2026-10-13T17:23:28.321107+00:00**. Each payload's original/final hash, size, source modification time, role, path mapping and byte-exact/redacted status is sealed. Archive member-level original/final hashes and unchanged restoration-member hashes are recorded in `derivative-provenance.json`. Auxiliary seals are hashed by the durable manifest; its own checksum is recorded above and in the companion public JSON.

### HTML provenance (no credential values)

| HTML | Original SHA-256 | Sanitized SHA-256 |
|---|---|---|
| `priority-08cfe029-original.html` | `e339d3b1805c07f7cbb1aecc09c34972433103d34433511bbd90e93f445cf311` | `2fd8035b750be7445203c6238d0176d425607b440cc1025580c29757487f5b47` |
| `priority-de720ffd-original.html` | `a390dce7af23552e1c532afbd43bc193759277f65cbbbe07868c5ed530653acd` | `c3e11c5f5a5692c06f5cb94e21cd4d4e627cf95af6b7e19bb18ec7a53eee984a` |

Redaction marker: `[REDACTED_AUTHORIZATION_TOKEN_SANITIZED_DERIVATIVE]`. Only confirmed exact token bytes were replaced; no speculative regex deletion was applied to corpus content. The initial key-pattern draft-slug false positive was distinguished using shape/path metadata. The known remaining-source JSON navigation `jsessionid` parameters occur exclusively in public extracted `links[].url`, with no captured Cookie/Set-Cookie/Authorization header; those navigation identifiers remain byte-exact. The PUBLIC `vectorRestoration.authorization` field is an operator-approval narrative, not an HTTP credential. These context classifications are recorded in the provenance seal; neither classification changes bytes.

## Offline restore proof and fresh verification

The original 153-member archive inventory was checked against original member hashes before derivation. Every derivative member underwent safety checks: no absolute paths, traversal, duplicate names, symlinks, hardlinks, devices or other special entries. All 153 members were extracted into an isolated temporary directory, and all final member hashes were verified against derivative provenance.

- **73 full graph nodes**, all **73 vector-bearing**, equal to the complete original graph snapshot.
- Every property, vector, label and property type passes full-state/individual-property hashes and offline serialization round-trip, using the unchanged validated `restore-plan-OFFLINE-ONLY.json`.
- **112 historical local-inventory files** verified: **110 byte-exact** and **2 explicitly sanitized source-HTML evidence files**. Original inventory bytes/hashes are retained as historical evidence; derivative overrides are not fabricated as original matches.
- Original registry checksum and all **14 draft pairs** verified. Graph/vector/registry/raw/promoted/staged restoration snapshots are unchanged.
- Every copied payload rehashed against its expected derivative hash, and all original files rehashed against sealed original provenance. Full credential screening was completed on protected/public/approved source evidence and all archive members before durable copy, then repeated on the durable tree.
- All durable file/directory permissions and effective mcpbot access passed. Git-ignore/no-tracked-backup checks passed. No live restore or runtime calls occurred.

The first rehearsal's local-inventory mismatch was traced to the two intentionally sanitized HTML entries, not a restore-critical snapshot. The verifier was corrected to check their original hashes against historical inventory and their final hashes against explicit derivative provenance, while continuing to require original byte equality for all restoration snapshots. The completed rehearsal and a separate verification run passed.

## Durability and compatibility limits

This is a **local-disk-only**, unencrypted backup, not offsite protection or proof of live Neo4j/index restoration. Existing original scripts/seals that demand original HTML/archive hashes will correctly reject derivative evidence unless the explicit derivative overrides are applied; original signatures were not regenerated or misrepresented. Historical source HTML has authorization values removed and is not byte-identical at those locations; restoration snapshots retain full semantic compatibility and exact bytes.

No original/source deletion, corpus/registry/export/runtime mutation, stack backup rerun, service restart, or commit was performed. The protected original remains in `/tmp`; the independently verified sanitized derivative now supplies durable local rollback storage.
