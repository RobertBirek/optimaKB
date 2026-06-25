# ERP Knowledge Assistant Runbook

Date: `2026-06-01`

## Purpose

This is the first operational runbook for the assistant layer above all active
Optima and Betterfly KBs.

It is intentionally simple:

- classify question
- route to one primary KB
- add support KBs only if needed

## Files

- blueprint:
  - `docs/reference/ERP_Knowledge_Assistant_Blueprint.md`
- routing spec:
  - `docs/reference/ERP_Knowledge_Assistant_Routing.json`
- local CLI router:
  - `scripts/erp_knowledge_assistant.mjs`
- local CLI answer builder:
  - `scripts/erp_knowledge_answer.mjs`
- OpenSPG app deploy helper:
  - `scripts/deploy_erp_knowledge_openspg_app.mjs`
- community full-thread regression:
  - `scripts/run_community_thread_test.mjs`

## Basic Usage

```bash
cd /docker/openspg
node scripts/erp_knowledge_assistant.mjs "jak połączyć TraNag z TraElem i Towary?"
```

JSON output:

```bash
cd /docker/openspg
node scripts/erp_knowledge_assistant.mjs --json "jak działa token Betterfly API?"
```

Starter answer from routed artifacts:

```bash
cd /docker/openspg
node scripts/erp_knowledge_answer.mjs "jak połączyć TraNag z TraElem i Towary?"
```

Full-thread public community regression:

```bash
cd /docker/openspg
node scripts/run_community_thread_test.mjs
```

OpenSPG app create/update/deploy:

```bash
cd /docker/openspg
OPENSPG_COOKIE='...' node scripts/deploy_erp_knowledge_openspg_app.mjs
```

Output artifacts:

- `docs/reference/ERP_Knowledge_Assistant_Community_FullThread_TestPack.json`
- `docs/reference/ERP_Knowledge_Assistant_Community_FullThread_TestPack.md`

## What the Router Returns

For each question it returns:

1. primary KB
2. support KBs
3. matched intent
4. matched keywords
5. recommended artifacts to inspect first

It does not answer the full domain question by itself.

It is the first-stage classifier and routing layer.

The local answer builder goes one step further:

- uses the same routing
- scans starter artifacts from the selected KBs
- returns evidence snippets for a first practical answer

## Expected Routes

### Structural SQL

Example:

- `jak połączyć TraNag z TraElem i Towary`

Expected primary KB:

- `ComarchOptimaSchema`

### Additional Functions

Example:

- `kiedy użyć funkcji dodatkowej zamiast kolumny użytkownika`

Expected primary KB:

- `ComarchOptimaAdditionalFunctions`

### Sprint / prints

Example:

- `jak zacząć wydruk sPrint z nagłówkiem i pozycjami`

Expected primary KB:

- `ComarchOptimaSprint`

### Betterfly

Example:

- `jak działa token w Betterfly API`

Expected primary KB:

- `ComarchBetterflyReference`

## Practical Use Pattern

The intended workflow is:

1. route question with the CLI
2. inspect recommended KB/artifacts
3. answer the question from the smallest sufficient KB set

## Current Limits

- it is rule-based, not learned
- it does not call OpenSPG directly
- it does not search graph content directly
- artifact evidence is line-based, not semantic retrieval

OpenSPG app-specific limit:

- the current OpenSPG build has no verified custom prompt field in confirmed
  app config
- the published live app therefore uses the selected OpenSPG template plus the
  attached KB set, not a separately persisted custom instruction block
- for this instance, keep the app on `think_pipeline`
- do not switch back to `kag_thinker_pipeline` unless the backend pipeline path
  is revalidated; it failed in live use with:
  `No configuration setting found for key rewrite_prompt`
- live benchmark of the published app is now automated by:
  - `scripts/run_openspg_app_live_benchmark.mjs`
- current live blocker:
  - app `2` deploys correctly, but end-to-end question execution is still
    broken in backend runtime
  - current saved report:
    - `docs/reference/ERP_Knowledge_Assistant_OpenSPG_Live_Benchmark.md`
  - observed failure mode:
    - public app-aware reasoner calls stay `RUNNING` from API perspective
    - `openspgapp/completions.log` shows base tasks are started with
      `projectId=2`, causing `IllegalArgumentException: 2 is not exists`
    - paired NL query tasks then throw `NullPointerException`

This is acceptable for phase 1, because the main project need is correct KB
selection, not another retrieval engine.

## Recommended Next Step

Use this router for real questions first.

Only after that:

1. refine KB selection or evidence if needed
2. or expose the same routing through MCP / local assistant flow
