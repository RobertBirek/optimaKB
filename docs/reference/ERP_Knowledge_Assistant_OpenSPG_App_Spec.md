# ERP Knowledge Assistant OpenSPG App Spec

Date: `2026-06-01`

## Purpose

This is the deployment-ready application spec for an OpenSPG app layered above
the current local ERP KB portfolio.

## Scope

The app should provide one entry point for:

- Optima SQL / schema questions
- Additional Functions and COM questions
- Sprint / print questions
- business meaning / code label / rule questions
- official Optima documentation questions
- partner-only technical Optima questions
- Betterfly documentation and API questions

## Primary KB set

- `ComarchOptimaSchema` (`project 4`)
- `ComarchOptimaBusinessSemantics` (`project 15`)
- `ComarchOptimaAdditionalFunctions` (`project 6`)
- `ComarchOptimaSprint` (`project 7`)
- `ComarchOptimaReference` (`project 8`)
- `ComarchOptimaPartnerTechnical` (`project 9`)
- `ComarchBetterflyReference` (`project 10`)
- `OWAOntology` (`project 16`)

## App name

- `ERP Knowledge Assistant`

## App objective

Accept one user question and:

1. classify it into the correct primary KB
2. add support KBs only if needed
3. answer directly from the smallest sufficient KB set
4. cite the most relevant artifacts
5. state the next investigative step when needed

## Source artifacts

Core routing assets already exist locally:

- `docs/reference/ERP_Knowledge_Assistant_Blueprint.md`
- `docs/reference/ERP_Knowledge_Assistant_Routing.json`
- `docs/reference/ERP_Knowledge_Assistant_OpenSPG_App_Prompt.md`
- `scripts/erp_knowledge_assistant.mjs`
- `scripts/erp_knowledge_answer.mjs`

## Deployment model

### Minimum viable OpenSPG app

- one app prompt / instruction layer
- one curated KB set
- one answer contract

### Preferred response contract

- direct answer
- primary KB
- support KBs
- relevant artifacts
- next step / gap

## Routing policy

### Broad operational Optima question

Primary:
- `ComarchOptimaReference`

Support:
- `ComarchOptimaSchema`
- `ComarchOptimaAdditionalFunctions`
- `ComarchOptimaSprint`

### Schema / SQL / join / procedure question

Primary:
- `ComarchOptimaSchema`

Support:
- `ComarchOptimaSprint` when the question is print-related

### Business meaning / code label / rule question

Primary:
- `ComarchOptimaBusinessSemantics`

Support:
- `ComarchOptimaSchema`

### Additional Function / COM / user-column question

Primary:
- `ComarchOptimaAdditionalFunctions`

Support:
- `ComarchOptimaPartnerTechnical`
- `ComarchOptimaSchema`

### Sprint / print / GenRap question

Primary:
- `ComarchOptimaSprint`

Support:
- `ComarchOptimaSchema`
- `ComarchOptimaAdditionalFunctions`

### Partner-only technical Optima question

Primary:
- `ComarchOptimaPartnerTechnical`

Support:
- `ComarchOptimaAdditionalFunctions`
- `ComarchOptimaSchema`
- `ComarchOptimaSprint`

### Betterfly question

Primary:
- `ComarchBetterflyReference`

Support:
- none by default

## Verified behavior that should be preserved

From current local benchmarks:

- synthetic `200Q`: `200 PASS / 0 PARTIAL / 0 MISS`
- real public full-thread sample: `8 PASS / 0 PARTIAL / 0 MISS`

Important learned constraint:

- short keywords like `com` must be treated as bounded tokens
- otherwise `Comarch` pollutes routing and falsely pushes generic questions
  into `ComarchOptimaAdditionalFunctions`

## Current live state

The app is already published in the current OpenSPG instance:

- app id: `2`
- name: `ERP Knowledge Assistant`
- alias: `erpknowledgeassistant`
- attached KBs:
  - `4` `Comarch Optima ERP MSSQL Schema`
  - `15` `Comarch Optima Business Semantics`
  - `6` `Comarch Optima Additional Functions`
  - `7` `Comarch Optima Sprint and Prints`
  - `8` `Comarch Optima Reference`
  - `9` `Comarch Optima Partner Technical`
  - `10` `Comarch Betterfly Reference`

The confirmed API contract for this build is:

- `POST /v1/app`
- `PUT /v1/app/{appid}`
- `POST /v1/app/deploy`
- `GET /v1/app/{appid}`
- `GET /v1/app/list`

Operational quirks:

- `/v3/api-docs` requires authentication and returns a JSON array of byte
  values; decode it before JSON parsing
- app UI routing is hash-based:
  - `/#/application`
  - `/#/application/detail/arrange?appid=2`
- the stable live template for this app is currently `think_pipeline`
  (not `kag_thinker_pipeline`)

## Current prompt limitation

This OpenSPG build has no verified custom app-prompt or system-instruction
field exposed through the confirmed app UI/API path.

What is verified:

- KB attachment through `config.kb`
- template selection through `config.chat`
- language through `config.language`
- LLM selection through `config.llm`

What is not verified:

- a persisted custom prompt field in app config
- an API endpoint dedicated to prompt/instruction editing

The live app therefore runs as a template-backed OpenSPG app with the curated
ERP KB set attached. The local files
`ERP_Knowledge_Assistant_OpenSPG_App_Prompt.md` and
`ERP_Knowledge_Assistant_OpenSPG_App_Bundle.json` remain the source of truth
for a future prompt-capable build.

Known template constraint:

- `kag_thinker_pipeline` is not stable for this app in the current build
- a real runtime test produced:
  `No configuration setting found for key rewrite_prompt`
- keep the live app and local deployment bundle on `think_pipeline`

## Current live runtime blocker

After the template correction, a live benchmark was executed through the
published app-aware public reasoner flow and saved in:

- `docs/reference/ERP_Knowledge_Assistant_OpenSPG_Live_Benchmark.md`

### First attempt (baseline, 2026-06-02)

Result: `12 RUNNING_TIMEOUT`, `0 FINISH`

Diagnosed backend cause from `openspgapp/completions.log`:

- base reasoner tasks are started with `projectId=2`
- `2` is the app id, not a real KB project id
- backend throws `IllegalArgumentException: 2 is not exists`
- paired NL query tasks then throw `NullPointerException`

### Second attempt (2026-06-11) — removed `projectId` from dialog submit

Fix applied: removed `projectId: APP_ID` from `submitDialogExecution` in
`scripts/run_openspg_app_live_benchmark.mjs`. The payload no longer passes
`projectId` explicitly to the dialog submit endpoint.

Result: `12 RUNNING_TIMEOUT`, `0 FINISH`

Progress: tasks now reach `RUNNING` status instead of `IllegalArgumentException`.
No `IllegalArgumentException` or `NullPointerException` in server logs.

Remaining blocker:

- base reasoner tasks still get `projectId=2` from the **session context**
  (the session was created with `{ appId: 2, type: 'app' }`), so the backend
  hardcodes `projectId=2` even without our payload
- the reasoner scheduler (`SchedulerExecuteServiceImpl`) reports 0 unfinished
  instances — it does not pick up tasks with `projectId=2` because no real
  KB project has that ID
- tasks sit in `RUNNING` indefinitely with empty `resultMessage`

This is a **backend bug in OpenSPG's reasoner** — it cannot resolve
app-aware sessions to underlying KB projects. The `think_pipeline` template
expects tasks to be associated with a real KB project, not the app ID.

No client-side workaround was found:
- passing `projectId: 4` explicitly to task/submit is ignored (backend still
  uses app ID from session context)
- passing `projectId: 4` to dialog/submit is also ignored
- project-based session creation (without `appId`) is rejected
  (`"appId is null"`)

### Needed backend fix

The reasoner should resolve `appId → attached project IDs` when creating
base tasks from an app-aware session, allowing the `think_pipeline` template
to run against the correct KB projects.

This means the app is currently:

- published
- deployable
- template-corrected
- dialog tasks no longer crash with `IllegalArgumentException`
- but still not end-to-end usable for live Q&A until app-to-project resolution
  is fixed in backend runtime

## Recommended deployment sequence

1. use `scripts/deploy_erp_knowledge_openspg_app.mjs` for idempotent app
   create/update/deploy
2. validate with:
   - `docs/reference/ERP_Knowledge_Assistant_200Q_Report.md`
   - `docs/reference/ERP_Knowledge_Assistant_Community_FullThread_Report.md`
3. only then expose the same logic through MCP

## Follow-up

The MCP layer should not invent a second routing model. It should reuse the
same prompt, KB order, and answer contract.
