# Answer presentation live QA retention — 2026-10-14

DONE. Durable supplement: `/docker/openspg/backups/manual-repairs/answer-presentation-20261014/qa-live16/`.

Retained **16 full visible responses (138,601 bytes)**, both evidence/provenance indices, and byte-exact Markdown/JSON copies of the deployed 16Q and deployment reports: **22 payload files; 23 including the independent manifest**. Copy UTC: `2026-10-14T14:00:15.969576+00:00`.

Manifest: `qa-live-evidence-manifest.json`; SHA-256 `561969c5a5eb9fc7422aaa58b8b108fd82ba466648d9cbc257f235e423b015e2`. It records every source→durable mapping, byte count and SHA-256. Evidence index: `c2b006cb330c879ffa4a935308cf8664bcfc6f9495f1e3901cc70c84e7dbc2e5`. Provenance index: `33d4166ac8c4665b99b4c978079acce754231635c2a3f000cb0001acb1fb4213`.

All 16 response hashes/bytes match the fixed index and public report; all 22 copies match their sources. Credential-shaped-value screening passed before and after copying without printing values. Root:mcpbot ownership, 0750 directory, 0640 files and effective mcpbot full reads passed for all 23 supplement files.

Git-ignored manual storage, outside documented `backups/automated` immediate-child retention; retain until explicit operator disposition. Local disk only, no offsite copy claimed. Original deployment backup and existing reports retain their bytes; writes exclusively created this child and these two retention reports. No runtime/corpus/service changes or commits.

Evidence preserves harness-visible Markdown rather than an unavailable HTTP envelope. Existing QA conclusions are retained, not regraded; graph/vector execution is not claimed. Utility: `/tmp/opencode/persist-answer-live-qa-20261014.py` (hash in manifest and JSON report).
