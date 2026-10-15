# Promoted correction — preservation and BUILD readback, 2026-10-13

**DONE.** All36 new successor IDs and all3 canonical references have exact projected-field readback. Preserve33 full-property hashes, including vectors, match their original baseline. Old40 remain present and fully unchanged. Automation remains `paused=true`.

## Required jobs

| Namespace | File | Job ID | Fresh API status |
|---|---|---:|---|
| ComarchCommunityNews | `reference_document.csv` | 881 | FINISH |
| ComarchCommunityNews | `chunk.csv` | 882 | FINISH |
| TaxbellLegalReference | `reference_document.csv` | 883 | FINISH |
| TaxbellLegalReference | `source_topic.csv` | 884 | FINISH |
| TaxbellLegalReference | `chunk.csv` | 885 | FINISH |
| TaxbellPayrollHRReference | `reference_document.csv` | 886 | FINISH |
| TaxbellPayrollHRReference | `source_topic.csv` | 887 | FINISH |
| TaxbellPayrollHRReference | `knowledge_route.csv` | 888 | FINISH |
| TaxbellPayrollHRReference | `chunk.csv` | 889 | FINISH |
| TaxbellAccountingVATReference | `reference_document.csv` | 890 | FINISH |
| TaxbellAccountingVATReference | `source_topic.csv` | 891 | FINISH |
| TaxbellAccountingVATReference | `chunk.csv` | 892 | FINISH |

Existing jobs881–885 were not repeated. Payroll jobs886–889 and Accounting jobs890–892 all finished. Jobs886/887 were reconciled after a shell timeout using exact API evidence and were not resubmitted. The interrupted SourceTopic build-manifest entry was reconciled to job887 as mcpbot using the supported manifest writer.

## Strict final graph gates

- **36/36 new successors:** projected fields exact; Community7, Legal6, Payroll17, Accounting6.
- **3/3 canonical references:** projected fields exact.
- **33/33 preserve nodes:** original full hashes restored, including vectors, labels and property types; internal IDs unchanged.
- **40/40 old nodes:** present and original full hashes unchanged.
- **11/11 historical preserve nodes:** full parity.
- **23 metadata identities:** read back; omitted Payroll Taxbell topic remains present and fully unchanged.
- **Unexpected nonvector/vector drift:** none remains.

## Exact vector restoration

The seven initial Legal objects were restored in one guarded database transaction after complete offline rehearsal and read-only Cypher compilation. Further reembedding-only drift was restored after the pending Payroll/Accounting imports. All writes used only differing `_name_vector`, `_summary_vector`, `_content_vector` fields from the complete original protected snapshot for the relevant object. Guards checked exact database/semantic ID/internal ID, labels, complete expected-current properties and types. Every repaired object recovered its exact baseline full hash.

| Phase | Restored objects |
|---|---:|
| `initial` | 7 |
| `resume-initial` | 1 |
| `TaxbellPayrollHRReference-knowledge_route.csv` | 0 |
| `TaxbellPayrollHRReference-chunk.csv` | 0 |
| `TaxbellAccountingVATReference-reference_document.csv` | 2 |
| `TaxbellAccountingVATReference-source_topic.csv` | 1 |
| `TaxbellAccountingVATReference-chunk.csv` | 6 |

Total: 17 restoration events across 17 exact identities. JSON evidence records source-snapshot hashes, current/rehearsed/recovered/final full hashes, and per-field vector hashes without publishing vector arrays.

All relevant index metadata stayed unchanged and ONLINE before/after standard property updates. No index was dropped.

## Authorized aggregate metadata

Intended topic counts, aggregate summaries and route metadata were retained. When aggregate text changed, its recomputed vectors were retained; old semantic/fullhash expectations are explicitly compared in JSON. Only full nonvector-unchanged, vector-only nodes were restored.

## Hold and protected evidence

Fresh checks confirm paused=true, no active automation/actions/relevant processes/target builder jobs, registry unchanged, all21 staged CSV hashes unchanged. No re-export was run. Supported registry/four-KB locks protected bounded mutation windows and were released. The next automated run remains outside those windows.

Protected directory: `/tmp/opencode/protected-source-correction-20261013/corrective-v2`. Includes durable mutation journals/idempotency keys, exact statements, backups, offline rehearsals, index metadata and before/after full snapshots.

## Protected stage-manifest hashes

| Namespace | Source and protected-copy SHA-256 |
|---|---|
| ComarchCommunityNews | `12bf45c3ba3a4e440ca03940a40739d33561f5b21f35892fa1fba0ff0a1efe8a` |
| TaxbellLegalReference | `a9e5bbc460d649ab1dbd41e9067c0a66a98c64ae6fb205803d94b735ebad588e` |
| TaxbellPayrollHRReference | `93f40de6f3d91b37e31aa708623fa686acd7b644cfce368b811503b33f6d578c` |
| TaxbellAccountingVATReference | `96ab7379468ff8452103c5d707943422efc496e82fe2be5d03209799fc2e8d9f` |

**No graph deletion, old40 deletion, automation resume, service change or commit was performed.**
