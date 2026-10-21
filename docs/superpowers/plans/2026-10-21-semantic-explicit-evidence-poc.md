# Semantic explicit record evidence private PoC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. User has selected this mode and accepted execution; do not ask again. No commits are authorized: replace skill commit steps with a recorded, hashed uncommitted review package.

**Goal:** Implement and exercise a private OWA-only exact-record provider whose two MCP tools discover candidates and deliver selected complete physical source records for the existing caller model to interpret.

**Architecture:** Compile an immutable, query-independent index from three exact EsJ4gr CSV byte streams, with a separately pinned code/environment closure. Authorized execution workers validate the same controller-provisioned five-file data artifact and perform deterministic discovery/admission. A source-recomputing artifact/transcript verifier checks mechanics independently of answer semantics; the public profiles and four legacy methods retain their contracts.

**Tech Stack:** Node v18.19.1, existing ESM modules, node:test/assert, builtin crypto/fs/module/worker_threads/http only. No additional dependencies/providers/services.

## Global Constraints

- Worktree `/tmp/opencode/openspg-explicit-evidence-poc-20261021`, branch `poc/semantic-explicit-evidence-20261021`, base `dfb1c8ec40f0639f291e216481277ee3cc7a791d`. All code changes remain here. No commit, push, deployment, main implementation transfer, services, ERP, graph, configuration or corpus changes.
- Normative base: `/docker/openspg/docs/superpowers/specs/2026-10-21-semantic-evidence-contract-design.md`, SHA256 `eb3dca5e6864133c8982005b79c3269d3de5c7193a5b1a847cd830541505d380`, 81104 bytes. Normative amendment: same directory `2026-10-21-semantic-evidence-contract-design-v3.md`, SHA256 `52d5a93c2a9ba4ab8ee331e653a02eeed3f787e6e2f3f2fe79034d5e00312b13`, 32059 bytes. Read both; v3 changes only its enumerated clauses. Historical pending-acceptance text was superseded by user's explicit acceptance of plan plus PoC.
- Only domain inputs: frozen `/tmp/opencode/semantic42-frozen-EsJ4gr/exports/owa_ontology/v1/{ontology_entity,ontology_field,chunk}.csv`. E:74880bytes/67rows/SHA35af823973b1d0377365efbcc68f184a83cac787f12dfecf983fb31190239d16; F:25729/109/c0c17e8f0115f86b140e40a9e2cc02b1601bcca93f2d932e21736031d8aa6e17; C:306387/190/6c8bc167db9c0009e5cb21c259ac191b81e8e721897487110a6946276fb7aca8. Base manifest seal9f4275a2400e7853f7b8bcdcfe3f4463c3ad30384f1bdb49a0bbfbfc3626eede. No gold, question bank, evaluator/reviewer MD, expanded paths or old answers as index inputs. Never open a raw sourcePath.
- Budget: 8 unique whole physical records / 16000 UTF16 canonical-fields JSON / 2 owners. Reserve and charge full E context for all owners first. No truncation, header/table/chunk reconstruction, semantic sufficiency or SQL claims. `assessment:source_records_only`, `semantic_assessment:not_performed`, records `semantic_completeness:not_assessed`.
- New private profile `erp-semantic-evidence-poc`, scope `kb.semantic.read`, namespace `[OWAOntology]`, port null, exactly `[erp_subject.discover,erp_evidence.get,list_knowledge_bases]`. Do not add it to default profile enumeration/public path routes or expose private definitions in unprofiled tool lists.
- Per answer ≤2 discovery then ≤1 get; every explicit ref was exposed by an earlier discovery for that owner/snapshot; second discovery carries expected_snapshot_id. These are stateless transcript-verifier rules, not a server session. Answer outcome requires one evidence success; no claim about natural-language truth.
- Exact closed v2/v3 schemas, scalar/cardinality/control/surrogate/duplicate-key rules, canonical C/H/SHA, hash dependencies, source locators, diagnostics, accounting, rank/navigation and fixed RPC/error messages are binding. Runtime schema plus cross-invariants, not schemas alone. Structured/text parity is exactly C(structuredContent).
- Full E/F descriptions are metadata search values regardless of 240UTF16 display omission. F selector is exact raw 1..128UTF16/control-free string, primary then explicit fallback, preserving quotation/spacing/backticks. Metadata identity never uses body grammar. Body postings use only original frozen pure lexer bytes SHAed19d8afc0293ab62a0bc5f64a0dfb6966a9f39b546343c385df98153701e1d1 and v2 role/grammar/fence exclusions; no semantic source reader.
- Data artifact consists ONLY manifest.json, index.json and three original CSV byte files, ≤8388608 bytes aggregate including manifest. Runtime and compiler closures each ≤2097152 bytes separately. Generation.id retains SHA(UTF8(JSON.stringify(captured sources))) in existing capture order, separate canonical runtime closure and exact Node/Unicode/ICU binding. All nonbuiltin imports inventoried; variable imports only trusted captured core/profiles/worker URLs. Builtins checked by isBuiltin.
- Authenticate/profile/scope/effective OWA intersection/full strict input/all reference namespaces BEFORE any data load/read/index/body access. Missing/null allowlist does not authorize this profile. Foreign well-formed namespace denies whole batch. Query/ref/path/headers never select data/code capability. TrustedDataGeneration only controller→private pool→worker, no MCP selector, no preload, no per-query rebuild or legacy/provider fallback.
- Keep 2 workers / 8 queued. Same pinned code plus same trusted descriptor in both slots; first authorized load sends data-ready; every job rechecks fixed file fingerprints and owns its validated bytes. Closed RawWorkerJob/Ready/DataReady/Result/Failure per v2 §8.3. Auth/schema denials unavailable/null snapshot, no telemetry-triggered read. Strict identity/message checking, cancellation, stale-job isolation and sanitized failures; no synchronous raw fallback.
- Preserve old four-method ABI. Old A8 remains FAIL/BLOCKED1.25; known20 remains1PASS/12PARTIAL/7MISS. Compile/load/warm/full-transcript costs reported separately, no offload-as-old-PASS. Deterministic fixture success is not caller-model quality/generalization.
- Tests run only after side-effect review; synthetic or explicitly pinned source fixtures only. Output under new `.superpowers/sdd` or unique `/tmp/opencode` private dirs; no operational writes/network/provider/registry calls. Private loopback is permitted only for bounded synthetic-auth test process, never existing live services. Serial test concurrency1. Reports record RED/GREEN commands/output and independently reviewed source state.

## File responsibility and shared interfaces

All paths below relative to the new worktree unless absolute. New modules are focused, do not refactor legacy retrieval.

| File | Responsibility |
|---|---|
| `scripts/lib/semantic_raw_contract.mjs` | C/H/SHA, strict JSON and all closed wire/data/message schemas, input/output and cross validators, errors/envelopes |
| `scripts/lib/semantic_raw_csv.mjs` | strict original-byte CSV decoding with exact byte/line locators |
| `scripts/lib/semantic_raw_code.mjs` | measured closure descriptors, safe paths, exact environment, bounded immutable captured code binding |
| `scripts/lib/semantic_lexical_context.mjs` | exact unchanged frozen pure lexer, not copied from failed cache candidate |
| `scripts/lib/semantic_raw_index.mjs` | pure source-derived records/ownership/postings/diagnostics, full fixed-input compiler and manifest hashes |
| `scripts/compile_semantic_raw_index.mjs` | offline compiler controller/writer, no runtime import of CLI |
| `scripts/lib/semantic_raw_lookup.mjs` | immutable handle and deterministic discovery/evidence plus invariant validation |
| `scripts/lib/semantic_raw_generation.mjs` | authorized trusted descriptor loading, safe file reads/bounds/error precedence, fingerprint reuse |
| `scripts/lib/semantic_raw_verifier.mjs` | independent source recomputation and transcript mechanics |
| `scripts/lib/semantic_raw_mcp.mjs` | two private typed tool definitions/guards/dispatch, no generic answerer |
| `scripts/lib/semantic_worker_{generation,pool,entry}.mjs` | pinned runtime closure, closed out-of-band private data job branch preserving old jobs |
| `scripts/lib/erp_knowledge_mcp_{profiles,core}.mjs` | private profile and pre-generic dispatch/list filtering |
| `scripts/erp_knowledge_mcp_http_bridge.mjs` | private auth/context/strict JSON/worker dispatch seams, fixed errors, no public path registration |
| `scripts/lib/owa_offline_harness.mjs` | frozen legacy inventory plus explicit separate raw fixture kind/full current runtime MODULE_FILES |
| `scripts/test_semantic_raw_*.mjs`, `scripts/lib/semantic_raw_test_fixture.mjs` | meaningful synthetic mutation/adversarial and pinned runtime corpus tests; helper never in domain/runtime index |
| `scripts/run_semantic_raw_poc.mjs` | explicit trusted offline controller, private measured worker transcripts, report only selected source records |

Additional pure helpers may be split if concrete complexity warrants it, with explicit signatures/report and inventories updated together; do not duplicate core rules or invent wire extensions. No runtime imports of test helpers/CLI/reports. Names and signatures below are shared contracts; never silently rename a consumed export.

```js
// semantic_raw_contract.mjs
canonicalJson(value); // C: string, throws on non-JSON/invalid scalars
sha256(bytes); // Hex
hashRaw(tag, value); // H, exact owa-raw/0.1/ prefix
parseStrictJson(bytesOrString); // duplicate/UTF8/scalar safe JSON, throws
validateDiscoverInput(value); // boolean, shape including all own keys, foreign namespaces handled separately
validateEvidenceInput(value); // boolean
validateRawRequest(value); // boolean for closed v2 §7 RPC call/name coupling
validateRawOutput(operation, value, context); // boolean, context={index?,manifest?,input?}; closed shape + cross-invariants
rawToolError(operation, code, correlation = null, expected = null, active = null);
rawRpcError(id, code); // fixed message only
rawCallResult(structured); // exact canonical text parity + isError
// semantic_raw_csv.mjs
parseRawCsv(artifact, bytes); // {columns:string[],records:{fields,physical,raw_record_sha256}[]}, throws CSV_INVALID
// semantic_raw_code.mjs
rawEnvironment(); // Environment
measureRawClosure(files, environment, kind); // files:{[safeRelativePath]:Uint8Array|string}, returns {files:FileEntry[],sha256:Hex}, validates imports/env/bound
installRawCodeCapture(generation); // trusted controller/bootstrap only: pin one immutable current code sources capture per process, no data IO; reject replacement by different generation
// semantic_raw_index.mjs (pure primitive for synthetic tests, not an alternative MCP admission path)
deriveRawIndex({sources,inputs,base_manifest_sha256,compiler_closure_sha256,runtime_code_sha256,worker_generation_id,environment}); // source-derived internal payload shape; synthetic counts only in internal test representation, NOT normative production IndexPayload validation
compileRawIndex({compiler,runtime_files,runtime_code_sha256,worker_generation_id,environment,base_manifest_sha256,inputs}); // exact norm ABI, production fingerprint/count gate; compiler closure captured by trusted CLI, validated against own code
// semantic_raw_lookup.mjs
createRawHandle({manifest,index,sourceBytes}); // internal opaque immutable handle, no filesystem/session/serializable capability
discoverRaw(handle,input); getRawRecords(handle,input); // exact v2 interfaces, no parse/build/provider
// semantic_raw_generation.mjs
loadRawGeneration(trusted,code,authorized); // norm result; closed authorized scope required before fs
createRawGenerationLoader(trusted,code); // perworker lifecycle, .load(authorized) fingerprint checks, opaque reuse; rejected calls do not invoke it
// semantic_raw_verifier.mjs
verifyRawArtifact(trusted,code,authorized); verifyRawTranscript(trusted,code,authorized,transcript); // exact v2 interfaces
// semantic_raw_mcp.mjs
RAW_TOOL_NAMES; rawToolDefinitions();
preflightRawRpc(request,context); // null or fixed RPCError, no data IO; context trusted profile/authorization/allowedNamespaces
handleRawRpc(request,context); // only worker-supplied authorized loader, validated output, exact RPC result/error
```

Compiler controller owns measured capture inputs, absolute safe stage path and manifest trust root. A plain descriptor is not accepted from a client. Compiler closure is measured from explicit own transitive source files and the compiler entrypoint; runtime_files from the complete captured runtime generation. Loading/verifying independently recomputes source-derived index content, not just checks self-reported hashes. Shared pure decoding/hash/derivation is acceptable; verifier MUST reconstruct all CSV cells/locators/ownership/postings/diagnostics and compare the entire canonical expected payload, detecting rehashed omissions and wrong descriptions. It cannot simply call a checksum-only acceptor.

## Task 1: Canonical contract, byte CSV, and bounded code primitives

**Files:** Create `scripts/lib/semantic_raw_contract.mjs`, `semantic_raw_csv.mjs`, `semantic_raw_code.mjs`; tests `scripts/test_semantic_raw_contract.mjs`, `scripts/test_semantic_raw_csv.mjs`, `scripts/test_semantic_raw_code.mjs`. No transport or source artifacts changed.

**Interfaces:** Produces the first three interface blocks above; contract exports all closed schemas needed for tool definitions/manifest/index/internal messages. Consumers may import additional named constants (`RAW_ARTIFACTS`, header descriptors, source seals, limits, diagnostic enums) only if defined/documented here. Helpers are pure except explicitly trusted code capture helper. Do not import main's non-strict parser.

- [ ] Write RED tests using optional module import to make missing exports fail an assertion, not an incidental import error:
```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
const api = await import('./lib/semantic_raw_contract.mjs').catch(e => {
  if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; return {};
});
test('canonical object order uses unsigned UTF16 and preserves literal Unicode', () => {
  assert.equal(typeof api.canonicalJson, 'function');
  assert.equal(api.canonicalJson({z:'ł',a:'\n', '\u{10000}':0,'\uE000':1}),
    '{"a":"\\n","z":"ł","𐀀":0,"":1}');
});
```
- [ ] Run `node .superpowers/sdd/run-check.mjs task1-red node --test --test-concurrency=1 scripts/test_semantic_raw_contract.mjs scripts/test_semantic_raw_csv.mjs scripts/test_semantic_raw_code.mjs`; expect explicit missing-feature assertions.
- [ ] Implement exact v2 §§3–8/10 structures and runtime validation, including all required/optional/null/closed nested arrays and output/request/result couplings, using focused reusable object/union/scalar validators. Canonical code must recursively validate before serializing; no native stringify silent coercion. Define constants literally:
```js
export const RAW_LIMITS = Object.freeze({ max_records:8, max_fields_utf16:16000,
  max_entity_refs:2, max_data_bytes:8388608, max_code_bytes:2097152 });
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const hashRaw = (tag,value) => sha256(Buffer.from('owa-raw/0.1/' + tag + '\n' + canonicalJson(value),'utf8'));
```
  Strict JSON decoder catches duplicate keys before loss, invalid UTF8/BOM/lone surrogates/negative zero. Schema validates UTF16 explicitly, dense arrays and unique IDs/refs. Closed RPC supports signed safe integer/string IDs with fixed errors. CSV byte-state machine preserves CRLF/LF in cells, validates exact ordered headers, EOF/no-final-newline, quote closure/doubling, no blank/ragged/BOM recovery, exact source slices and physical lines. Closure validation resolves all literal static/dynamic imports, rejects variable application imports except exact generation bootstrap roles; builtins isBuiltin. Environment exact ASCII spellings; safe POSIX paths and separate2MiB cap.
- [ ] Add GREEN adversaries: emoji UTF16 bounds; JSON controls/key order/duplicate keys/negative0/nonfinite/surrogates; input extras/null/empty/ref duplicates/>2owners/foreign-shaped namespace; full synthetic §11 hash vector (fields277/source220/ref23a414...); CSV multilineCRLF/doubledquote/trailingnewline/EOF/ragged/duplicateheader/UTF8; closure unknown package/unlisted/variable/pathtraversal/builtin prefixedness/overbound/envmismatch.
- [ ] Run same three files as `task1-green` and syntax check new files; record results/provenance in task1-report. Coordinator writes unique full uncommitted diff/snapshots and dispatches independent spec+quality gate before Task2.

## Task 2: Complete query-independent raw compiler and index

**Files:** Create `scripts/lib/semantic_raw_index.mjs`, `scripts/compile_semantic_raw_index.mjs`, exact `scripts/lib/semantic_lexical_context.mjs`, tests `scripts/test_semantic_raw_index.mjs`, test fixture helper `scripts/lib/semantic_raw_test_fixture.mjs`.

**Interfaces:** Consumes Task1 exactly; produces deriveRawIndex/compileRawIndex. CLI syntax `node scripts/compile_semantic_raw_index.mjs --source-root ABS --output ABS`; source-root must equal a controller-explicit immutable source root and its three files match fixed seals. Output exclusive creation to private temp root (five files only), never original exports. CLI captures own compiler closure and runtime_files from captured generation; final full-code fixture is built after Task5. Synthetic tests exercise pure derive returning an internal source-derived representation with variable counts, never an admitted normative IndexPayload: production compiler/schema/load/verifier retain exactly366, E67/F109/C190. Test helper exports `syntheticRawFixture(options={})` → `{inputs,sources,bindings}` where inputs use exact headers and bindings keys match derive; helper has no provider/data discovery.

- [ ] Write RED assertions that E canonical duplicate roots and ontologyId collisions yield exact partitioning with no first-match ownership and retained physical rows:
```js
test('duplicate canonical IDs quarantine both E occurrences and dependent rows', () => {
  assert.equal(typeof api.deriveRawIndex,'function');
  const f = syntheticRawFixture({ duplicateCanonicalOwner:true });
  const idx = api.deriveRawIndex({...f.bindings,sources:f.sources,inputs:f.inputs});
  assert.equal(idx.accounting.total, idx.records.length);
  assert.equal(idx.postings.length,0);
  assert(idx.records.every(r => r.disposition === 'quarantined_ambiguous'));
});
```
- [ ] Run `node .superpowers/sdd/run-check.mjs task2-red node --test --test-concurrency=1 scripts/test_semantic_raw_index.mjs`; explicit feature failure.
- [ ] Copy frozen pure lexer using apply_patch with exact bytes/hash verification, no modifications/dependencies. Implement compiler derivation §8: parse everyrow, compute raw physical refs and fields costs; exact valid canonical root/union lookup binding; all diagnostics with null/span rules, duplicateID retained; everyrow owned/quarantine and semantic_not_assessed; nohint actual postings. Rawselector v3 and complete descriptions enumerated for all E/F, source lexer only allowed tokens/cells, tildefence wholecell exclusion. Finite sorted deduplication, no posting cutoff. Strict canonical index+manifest/snapshot acyclic hash chain:
```js
const index_bytes = Buffer.from(canonicalJson(index),'utf8');
const index_sha256 = sha256(index_bytes);
const snapshot_id = hashRaw('snapshot',{format:'owa-record-index/1',contract_version:'0.1',
  canonicalization:'cjson-utf16-v1',base_manifest_sha256,compiler_closure_sha256,
  runtime_code_sha256,worker_generation_id,environment,sources,index_sha256});
```
  Compiler input closed norm shape and exact production seals/counts, self closure/environment checked. Any invalid stage returns exact BuildError, no path/exception text. Manifest sum excludes own length only in data_bytes counter, aggregate includes it; >8MiB errors, no sampling. CLI staging is separate offline controller action, not a query operation.
- [ ] GREEN tests mutate literal ownership/canonical/ontologyId/emptyinvalidids/duplicateid; all diagnostics/partition ordering/dedupe; E description>240fullsearch, all41quotedF rawadmission, badprimary+goodfallback diagnostic, opaque/RHS/fence/malformed exclusion, metadata vs mention independent. Use synthetic fixtures for format failures; exact three EsJ streams for production seals and source ref vectors. Runtime closure final file completeness is verified in Task5/6, not replaced with fake production success here.
- [ ] Run task2-green index+Task1 suites, syntax checks, record exact copiedlexer SHA and RED/GREEN in report; independent spec+quality review.

## Task 3: Deterministic discovery, whole-record delivery, and cross-invariants

**Files:** Create `scripts/lib/semantic_raw_lookup.mjs`, `scripts/test_semantic_raw_lookup.mjs`; extend contract validators only where existing schema cross-check context needs index/manifest/input. Test helper additions only for real boundary fixtures.

**Interfaces:** Consumes exact IndexPayload/manifest/hash/validators; produces createRawHandle/discoverRaw/getRawRecords. Handle internals not exposed as mutable Maps/buffers, no ambient IO/caches/query-owned sessions. Discovery/Get take only the norm inputs, no callerbudget/aspect/queryplan parameters.

The test-local `fixture.twoOwnerRepeatedBatch()` used below must be defined in `test_semantic_raw_lookup.mjs`: it constructs two synthetic owner E records and selected F/C records through `syntheticRawFixture`, derives their actual refs with deriveRawIndex, creates the handle with createRawHandle and returns `{handle,input,ownerRefs,selectedRefs}`. It is not a runtime export or an undefined dependency on a later task.

- [ ] RED test owner-E reservation happens before either owner's selected payload and complete dedup cost once:
```js
test('owners reserve complete E first and repeated refs have one global charge', () => {
  assert.equal(typeof api.getRawRecords,'function');
  const {handle,input,ownerRefs,selectedRefs} = fixture.twoOwnerRepeatedBatch();
  const r=api.getRawRecords(handle,input);
  assert.deepEqual(r.records.slice(0,2).map(x=>x.record_ref),ownerRefs);
  assert.equal(r.budget.used_records,new Set([...ownerRefs,...selectedRefs]).size);
  assert.equal(r.budget.used_fields_utf16,r.records.reduce((n,x)=>n+canonicalJson(x.fields).length,0));
});
```
- [ ] Run `node .superpowers/sdd/run-check.mjs task3-red node --test --test-concurrency=1 scripts/test_semantic_raw_lookup.mjs`.
- [ ] Implement discovery: original/folded whole query; finite exact technical-set tier2..8distinct; AND tokens; firsttier rank; kind/scope filters; canonicalowner absent/ambiguous statuses; independent metadata/mention identities; exact origin ordering/record caps/counts with originrefsubset; firstorigin metadata complete-value240displaycap and label omissions; full related eligible counts and owner/path/order navigation. Keep omitted descriptions searchable. No query-derived facts.
- [ ] Implement evidence §6 in its exact five phases, using one unique ordered records array/set and mandatorycontextphase; request order/ref order, membership/quarantine/mismatch without leaks, contexts still charged forunknownrefs, bigearlierrecordskipallowslatersmall, repeatedoutcomes deterministic. Status precedence and orderedmissing complement, source list onlyemitted artifacts, all literalfields unchanged.
```js
const used_fields_utf16 = records.reduce((n,r)=>n + canonicalJson(r.fields).length,0);
const status = missing.some(m=>budgetReasons.has(m.reason)) ? 'budget_limited'
  : !missing.length ? 'returned_all' : !returned_refs.length ? 'returned_none' : 'returned_some';
```
- [ ] GREEN tests cover8records/16000exactbounds+1over (keys/escapes/emojiincluded), >2ownersInvalidParams upstream; unavailable/oversized contexts; unknown/mismatch/quarantine; bothsnapshoterrors; field noF→mention only; caps>8origins/refs/related truthfulcounts; numeric/literal sectionOrder, nullhints; allschemas/parity and tamperedoutputcrossinvariant refusal. Actual ranked v3 operator/data fixture is tested in finalfullartifactrun, not assumed from metadata census.
- [ ] Run task3-green contract/csv/code/index/lookup serial, inspect no IO inlookup, report and independent spec+quality review.

## Task 4: Trusted artifact lifecycle and source/transcript verifier

**Files:** Create `scripts/lib/semantic_raw_generation.mjs`, `semantic_raw_verifier.mjs`, tests `scripts/test_semantic_raw_generation.mjs`, `scripts/test_semantic_raw_verifier.mjs`.

**Interfaces:** Consumes pure modules/canonicalnorm ABI, creates norm loadRawGeneration/createRawGenerationLoader/verifyRawArtifact/verifyRawTranscript. Separate lifecycle instance per worker bound to a single descriptor. No runtime compilerCLI import. Descriptor/code/scope closed exactly §8.2/8.3. Verifier independent execution reads pinned files and recomputes expected source-derived payload, not self-reported sums. Synthetic tests for mechanics cannot make an alternate production loader acceptance path.

**Executable pre-integration fixture prerequisite:** Extend test helper with `stageProductionRawFixture({sourceRoot,outputRoot})` returning `{trusted,code,generation,manifest,index,cleanup}`. It reads ONLY the sealed three sources, explicitly captures the CURRENT complete nonbuiltin runtime closure (existing26 plus bridge/registry/pool/generation and every currently present raw module reachable by the test loader), and derives generation.id using the unchanged capture algorithm. It does not assume future Task5 source files/imports exist. Compiler closure includes its actual CLI; all captured bytes/descriptors are measured now, bounded and passed to the exact production compiler. Trusted controller calls installRawCodeCapture(generation) once; worker bootstrap later installs its received capture. Runtime manifest-file entries are checked against that retained immutable capture, not ambient host code reads or caller-declared hashes. This helper is test infrastructure only, no alternate runtime data/schema admission. Each distinct code generation gets an isolated process/worker or loader module instance; no retained code-generation history. Task4 positive tests use this production fixture, not the miniature synthetic index. After any code changes, build anew; Task5 updates central inventories and replaces the provisional test capture with its exact final capture. No old snapshot is relabeled.

- [ ] RED test authorization precedes any fs access even if descriptor root is an instrumented throwing getter; source/index modifications fail closed on subsequent job rather than reuse stale validated handle:
```js
test('unauthorized loader never reads a descriptor or source',()=>{
  assert.equal(typeof api.loadRawGeneration,'function');
  const trusted = new Proxy({}, {get(){throw Error('descriptor touched');}});
  assert.throws(()=>api.loadRawGeneration(trusted,{},null), /Access denied/);
});
```
- [ ] Run task4-red generation/verifier files. Fixtures written only to unique/tmp/opencode directories, always cleanup after tests; inspect helper/source before running.
- [ ] Implement descriptor→manifest→index→source→payload→code/environment/snapshot stages with exact firstfailure codes. Walk fixed fivepaths only, lstat everycomponent/no symlink/noregular/dot/traversal, bounds before read; do notwalk directories orfollowrawpath. Parsecanonical JSON via strict parser and exactbyteparity, validate fullschema+count/refs/rawdecodedcells/owner/posting/diagnostic relationships, exact closure capturedcode/env/generation binding and manifesttrusthash. Rehash fivefixed files each subsequentauthorizedload before handle reuse; no perqueryCSVparse/recompile, and capture each job's bytes once. Changed data invalidates lifecycle until operator action. No handle obtainable via untrusted request.
- [ ] Implement transcript verifier §10: closed calls/id/envelope schemas+canonicaltext, two-discover-oneget order/max, snapshot coupling and no continuationaftermismatch, exposedrefmembership byowner/snapshot includingrelatedrefs, automaticE exemption, deterministicreplayedlookup/outputfullparity, rawrefs/sourcehash/owner/results/context/budget crosschecks. Declaredanswer requires exactlyoneevidence success, but finalanswer string never parsed/graded. Return exact closed violations or valid assessmentcontractonly.
- [ ] GREEN tests: inaccessible/oversized/corrupt/version/noncanonical/rehashedindexomission/wrongpostingdescription/mismatchedcode/env/trustdescriptor/sourcechanged/pathsymlink; firstfailureprecedence; authorizedwarmload doesnotparse/build again; rehashedmaliciousmanifestcannotreplaceprovisionedroot. Transcript mutations: fakepriorref, otherowner, third discovery, secondget, missingexpectedsnapshot, mixedS, alteredcell/span/hash/resultpartition/count/parity, idmismatch, answersfromhints, toolerror-as-evidencesuccess. Positive exact deterministic transcript passes without semanticsclaim.
- [ ] Run task4-green prior+generation/verifier tests; report IOguardcounts/bindings and reviewgate. Compilerindex built for current exactcode will change after Task5; do not relabel oldartifact ormixbindings.

## Task 5: Private MCP, pinned runtime and two-worker data branch

**Files:** Create `scripts/lib/semantic_raw_mcp.mjs`, tests `scripts/test_semantic_raw_mcp.mjs`, `scripts/test_semantic_raw_workers.mjs`, `scripts/test_semantic_raw_http.mjs`; modify core/profiles/worker_generation/pool/entry/bridge/offlineharness. Any private launcher module is explicitly named/reviewed and included in both inventories. Do not add a service/configuration/public route.

**Interfaces:** Produces rawMCPexports definedabove; preserve getMcpProfile(id), listMcpProfiles() default7public, handleJsonRpcRequest(request,context={}), createSemanticWorkerPool(generation,options={}), .run(request,context,{signal}), old stats/close semantics. New pool option `{trustedDataGeneration,codeBinding}` is controller-only, absent means unavailable for raw methods, never inferred from request context. Raw jobcontext is exactly `{authorization,trustedDataGeneration,code}` and reconstructed pinned profile; old jobcontext unchanged. New `.run` outcome may have internal validated binding alongside response/timing, never leakdescriptor/paths towire. Any added binding must obey norm resultmessage identity.

- [ ] RED tests require private typed definitions with exact outputSchema+annotations and no legacy/unprofiledlist exposure; invalid/empty scope/foreignbatch denies before lazyloadergetter. Preserve public7 and legacy4 worker methods. Add syntheticworkerframes datashash/dataready/result identity refusal beforeimplementation:
```js
test('private tools do not leak through default profile enumeration',()=>{
  assert.deepEqual(getMcpProfile('erp-semantic-evidence-poc').tools,
    ['erp_subject.discover','erp_evidence.get','list_knowledge_bases']);
  assert.equal(listMcpProfiles().filter(p=>p.mode==='read-only').length,7);
  assert(!listToolsForProfile().some(t=>t.name==='erp_evidence.get'));
});
```
  Catch a missing-profile exception and turn it into an explicit assertion describing the missing private profile if needed; the same behavioral expectation remains throughout RED/GREEN. Run task5-red beforechanges.
- [ ] Implement privateprofile getter outside default enumeration, private-specific typed listing, early core dispatch before generic/argscoercion, fixed strict envelope/arguments/namespaces/authorization guards andcanonicalwire. Auth/schema rejection returnsfixedRPCerror no loaderaccess. listKB private scopedOWAonly. Common metadata remains existingprotocol, not extraevidence.
- [ ] Keep private worker startup data-free: remove the worker entry's eager core import and use a literal dynamic core import only for legacy jobs; use a literal dynamic raw handler import for private jobs. Static profiles/constants are pure. Raw handler initialization does not import legacy core/answerer/routing/registry. Private initialize/list/common OWA metadata use pinned code metadata, not ambient runtime routing/registry reads or source bodies. Existing legacy jobs still import their existing core path when invoked. If shared core is imported by a private metadata transport, defer its routing/KB-name reads to legacy/common-old use rather than at import time. Install worker-local fs/network/subprocess guards BEFORE any application bootstrap/import; code comes from captured sources, and only subsequent authorized artifact IO allows the five fixed data files. Test-observe bootstrap→ready (zero domain/config reads), rejected calls (zero reads), first authorized and warm reads, in BOTH real worker slots. Parent-only monkeypatch guards are insufficient.
- [ ] Extend code inventory by oldfour missingruntimefiles: bridge, registry, pool, generation, plus allnewrawmodules+frozenlexer; compilerCLI/testhelper excludedruntime. Include exactsame sourceclosure inoffline MODULE_FILES (also workerentry). Capture ownfile/transportbootstrapbytes with unchanged generationidexpression and2MiB cap. Compiler/runtime closure validation rejects unbound imports; optionalrawmodules must not eagerly break oldsyntheticgenerationfixtures filledwithdummyexports. Use literal dynamicimports only or staticcompatible modules, no new computedvariableimports. InitialcodeReady doesnotload data. Parentcapture/bootstrap root oftrust and capturedexecution boundaries documented/tested; never claim staticalreadyloadedparent is repinned just byinventory.
- [ ] Poolrawpreflight no data, constructorprovisioneddescriptoronly; queue/capacity reserved beforeload. RawWorkerJob and replies exact§8.3. Worker firstauthorizedload→dataready thenresult withcode/manifest/snapshot identities; unavailableRPC/loaderror snapshotsnull. Bothslots descriptorsequal, no warm preload. Poolchecksjobid/code/trustroot/snapshot/datastate/datareadyorder and rejects wrong/late frames withoutcrossjobleak; cancels/disconnects sanitizeandnofallback; legacyjobbranchsame.
- [ ] Bridgeprivatepreflight authenticatebeforestrictJSONbody; scopeexplicitkb.semantic.read andeffectiveintersection not assignmentorstaticnoscope; wholeinputnamespacevalidationbeforeworker. Include allrawmethodnames in classifier eveninvalidrawcontexts so they cannot fallthrough synchronouscore, while preflightdenial staysdatafree. Fixedparse/request/workererrors. No private publicroute; explicittrustedtestselection only. Any test HTTPregistryuses syntheticinertauth orstubneveractualverifyApiKey state writes. Source-onlymodulefactory may be extracted for importable loopbacktests with inventoryupdates.
- [ ] Extendofflineharness with separate exact `owa-raw-record-poc` fixture validation, not an alteredsealed79manifest. Freeze the pre-change legacy file inventory as LEGACY_MODULE_FILES and use STATIC_FILES+LEGACY_MODULE_FILES in the existing legacy validator; expand current MODULE_FILES for the new complete runtime closure and use it ONLY in the new raw fixture validator. Add explicit regression accepting original immutable legacy inventory without regeneration. Runtimecode captured separately fromfive datafiles; no gold. Closedbuiltinset followsisBuiltin predicate, closurevalidation handles exacttrustedbootstrapURLvariables only. Guard fs/network/subprocess in EACH raw worker beforebootstrap, authorizeonlyexplicitdatafixture reads. Do not interpretnewrawparity usingoldcompact4000responseinspector.
- [ ] GREEN tests realworker+fakeframes: twoauthorizedworkerssameartifact; no preauth/readonreject; source/codechange; missingcorruptroot; datacode/manifest/snapshot mismatch; noresultbeforedataready; requesterrorisolation; stalejobs;cancel+busy2/8; strictJSONdups/rawUTF8 errors; privateprofiletools unavailablepublic; nofallbackprovider/learning/writes. Run existing inspectedpool/generation/requesterrors/profile/protocoltests serial alongsidenewtests. Report tests/code/data bytes and independentgate beforefinalfullartifactrun.

## Task 6: Frozen PoC mechanics, bounded private loopback and measured report

**Files:** Create `scripts/run_semantic_raw_poc.mjs`, `scripts/test_semantic_raw_poc.mjs`; report `docs/reference/Semantic_Explicit_Evidence_PoC_2026-10-21.{md,json}` in isolatedworktree. `.superpowers/sdd` logs/strictlyunique immutable fixture artifacts. No heldoutquestionbank execution or model/provider calls.

**Interfaces:** Trusted offline controller captures allfinalcodebytes/compilerclosure/env, compiles exact3runtimeinputs, stagesfivefiles, verifies independently, then releasesdescriptor to2workerpool. Runner CLI `node scripts/run_semantic_raw_poc.mjs --source-root /tmp/opencode/semantic42-frozen-EsJ4gr --output ABS` accepts only operatorpaths, no MCP argument selectors. Report separate compilerCPU/wall/serializedbytes; independentverify; firstauthorizedload/job; warmfingerprint+lookup; fulltranscript≤3calls. Use process.cpuUsage perprocess with attribution clearlylabeled; worker-thread CPU accounting notfalselyclaimed process-localperjob; no legacy1.25comparisonPASS.

- [ ] RED assertions cover finalmanifest/snapshot/codeenvfixedbindings and transcriptrealrank, rawfullrecords+exactbudgets. Verify readonlyinputs and outputsprivate beforefirst actualrun.
- [ ] Implement guardedcontroller using precedinginterfaces, builtinexclusivewrites to uniqueprivateoutput only, no source expansion. Freezefinalcode/artifactidentities beforemeasurements. Run three deterministictoolsequences: `konto` ambiguity/comparison; v3 `operator` global→contractor-scoped `data`→oneget; bankentity→BRa_IBANfield→oneget. For secondworkflow, initialqueries/promptno technicalids/refsgold; deriveowner andselectedrefs onlyfrom returned candidates/descriptions. All actualcompetingmentions/ranks/has_more recorded; ifneededrefsabsent, reportBLOCKEDfixture, do notalterrankingtofit.
```js
const first = await call('erp_subject.discover',{query:'operator',kind:'field',limit:5});
const S = first.result.structuredContent.snapshot_id;
// Selection is performed from actual candidate entity refs and literal descriptions, never CSV row numbers.
const owners = first.result.structuredContent.candidates.filter(c=>
  c.candidate_kind==='field' && c.entity_ref.id.toLowerCase().includes('kontrahent'));
if (!owners.length) throw Error('Required descriptive owner not exposed');
const selectedOwner = owners[0].entity_ref;
const second = await call('erp_subject.discover',{query:'data',kind:'field',entity_ref:selectedOwner,expected_snapshot_id:S,limit:5});
```
  Sourcewitness expected arithmetic: bank+ledger8/2/13175; contractor3fields+E4/1/2600; IBAN3chunks+E4/1/6579. Relatedrefs mustactuallybeexposed. ExplicitlyretainK3/K4 semanticnotassessed no repair, unknown/mismatch/budgetcases separate. This deterministic selector testsmechanics, not LLMability.
  The actual bounded first `operator` response MUST expose all four metadata field candidates (both contractor declarations and both Towar declarations), both owners, exact literal backtick-wrapped Towar names, independently of competing mentions. The second scoped `data` response MUST expose both distinct contractor date metadata declarations before selecting last-modified. Assert the full returned candidate-kind/owner/name/ref set and has_more truth, not just presence of the final three chosen refs. Missing any required exposure blocks this fixture, even if the final 2600-unit delivery could succeed; do not tune normative ranking to force passage. Exact source witness IDs are permissible only as post-response assertions, never injected into queries or selections.
- [ ] Run newPoCsuite/priorrawsuites/targetedlegacytests/npmruncheck/modulemap with unique logs. Boundedloopback uses ephemeral127.0.0.1 port/syntheticbearer, closedlocalclient only, privateprocessshutdown andfileguardreport; bothworkerbindings, 2/8/cancel/cheaphealthresponsive underCPU demonstrated by mechanisms, no publicendpointrequests. Ifloopbackblockedbyenvironment recordblock notfabricate.
- [ ] Coordinator generates broadfullbranchreviewpackage includingallnewuntrackedfiles, sourceinventories/hashmanifest, exactreports/tests, and remainingminorfindings. Fresh finalreviewer getsnormspec+plan+package; resolveallImportant/Critical findings withtestfirstfix+re-review. No unsolicitedmerge/commitoptions; userauthorizedprivatePoC retention only.
- [ ] Finalreport separates verifiedmechanicsfromunmeasuredclientsemanticquality, actualdata/index/posting/diag/accounting/codecounts, expectedvsobservedworkflowbudgets, cold/load/warmcosts, errors/guards/sideeffects, anyfailures. PreserveoldA8and1/12/7. Recordcompletion+remainingblockers inledger. No finalPASSifanynormblocker remains; reportpartialaccurately.

## Coverage / plan self-review record

- v2 §§3/4/7 types/hash/CSV/wire/errors: Task1, caller enforcement Task5; §§8.1/8.2 compiler/accounting/closures:Tasks1/2/5; §5 and v3§§2–4:Tasks2/3; §6 budgets/invariants:Task3; §8.3 lifecycle/independentverification:Task4 and workerintegrationTask5; §9 actualseams:Task5; §10 protocol:Task4/6; §11vectors:Task1; §12+v3§6fullrankworkflows:Task6; §13mechanics/costs/limitations:Task6. No semanticreader/modeljudge/provideradditions.
- Sharedexports and datafieldnames above are exact norm or explicitlyinternal helpers; no deferred sharedreservation/session API. Testfixturehelper neverweakensproduction3CSVgate. Finalcodechanges alwaysforce freshlycompiledsnapshot beforemeasurements.
- Userno-commit/no-deploy overrides generic skillcommit/merge steps. Taskreviewpackage mustsnapshot fulluntrackednewfiles, not just gitdiffHEAD(emptynewfiles). Everyreview binds actualsourcehashes and RED/GREENlogs. Finalbroadreview getswholebranchfromrecordedbase.
