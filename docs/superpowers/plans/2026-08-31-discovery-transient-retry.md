# Discovery Transient Retry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recover one transient Exa or OpenSPG LLM failure without repeating discovery writes, and expose persistent query errors in the coverage report.

**Architecture:** A focused retry helper classifies network and HTTP failures and executes at most two attempts. Exa and LLM callers wrap only their idempotent request functions. The daily runner records the active stage on failure, and the report copies those structured errors into `recentRuns`.

**Tech Stack:** Node.js ESM, built-in `fetch`, `AbortController`, local HTTP test servers, existing script-based test harness.

## Global Constraints

- Production retry count is exactly two attempts.
- Production delay before the second attempt is 500 milliseconds.
- Retry only abort/timeout errors, `fetch failed`, HTTP 408/429, and HTTP 5xx.
- Do not retry query workers, candidate writes, draft writes, malformed responses, configuration errors, authentication failures, or other HTTP 4xx responses.
- Keep current Exa and LLM timeout values and discovery concurrency unchanged.
- Do not add dependencies.
- Do not commit unless the user explicitly requests a commit.

---

### Task 1: Transient Retry Helper

**Files:**
- Create: `scripts/lib/transient_retry.mjs`
- Create: `scripts/test_transient_retry.mjs`
- Modify: `package.json:9`

**Interfaces:**
- Produces: `httpError(message: string, statusCode: number): Error`
- Produces: `isTransientNetworkError(error: unknown): boolean`
- Produces: `withTransientRetry(operation: (attempt: number) => Promise<T>, options?: { maxAttempts?: number, delayMs?: number }): Promise<T>`

- [ ] **Step 1: Write the failing helper test**

Create `scripts/test_transient_retry.mjs`:

```js
#!/usr/bin/env node

import assert from 'assert';
import {
  httpError,
  isTransientNetworkError,
  withTransientRetry,
} from './lib/transient_retry.mjs';

assert.strictEqual(isTransientNetworkError(new DOMException('timed out', 'AbortError')), true);
assert.strictEqual(isTransientNetworkError(new TypeError('fetch failed')), true);
assert.strictEqual(isTransientNetworkError(httpError('rate limited', 429)), true);
assert.strictEqual(isTransientNetworkError(httpError('upstream failed', 503)), true);
assert.strictEqual(isTransientNetworkError(httpError('bad request', 400)), false);
assert.strictEqual(isTransientNetworkError(new SyntaxError('invalid JSON')), false);

let recoveredAttempts = 0;
const recovered = await withTransientRetry(async () => {
  recoveredAttempts += 1;
  if (recoveredAttempts === 1) throw new TypeError('fetch failed');
  return 'ok';
}, { delayMs: 0 });
assert.strictEqual(recovered, 'ok');
assert.strictEqual(recoveredAttempts, 2);

let persistentAttempts = 0;
await assert.rejects(
  () => withTransientRetry(async () => {
    persistentAttempts += 1;
    throw httpError('upstream failed', 503);
  }, { delayMs: 0 }),
  /upstream failed/,
);
assert.strictEqual(persistentAttempts, 2);

let deterministicAttempts = 0;
await assert.rejects(
  () => withTransientRetry(async () => {
    deterministicAttempts += 1;
    throw httpError('bad request', 400);
  }, { delayMs: 0 }),
  /bad request/,
);
assert.strictEqual(deterministicAttempts, 1);

process.stdout.write(`${JSON.stringify({ ok: true }, null, 2)}\n`);
```

- [ ] **Step 2: Run the test and confirm the missing module failure**

Run: `node scripts/test_transient_retry.mjs`

Expected: nonzero exit with `ERR_MODULE_NOT_FOUND` for `scripts/lib/transient_retry.mjs`.

- [ ] **Step 3: Implement the helper**

Create `scripts/lib/transient_retry.mjs`:

```js
const DEFAULT_DELAY_MS = Number(process.env.ERP_KB_TRANSIENT_RETRY_DELAY_MS || 500);

function sleep(delayMs) {
  if (delayMs <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = Number(statusCode);
  return error;
}

export function isTransientNetworkError(error) {
  if (!error) return false;
  if (error.name === 'AbortError') return true;
  const message = String(error.message || error);
  if (/fetch failed|timed out|timeout/i.test(message)) return true;
  const statusCode = Number(error.statusCode || 0);
  return statusCode === 408 || statusCode === 429 || statusCode >= 500;
}

export async function withTransientRetry(operation, {
  maxAttempts = 2,
  delayMs = DEFAULT_DELAY_MS,
} = {}) {
  const attempts = Math.max(1, Number(maxAttempts) || 1);
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isTransientNetworkError(error)) throw error;
      await sleep(Math.max(0, Number(delayMs) || 0));
    }
  }
  throw lastError;
}
```

- [ ] **Step 4: Add syntax coverage**

Add these entries to the existing `npm run check` command in `package.json`:

```text
node --check scripts/lib/transient_retry.mjs
node --check scripts/test_transient_retry.mjs
```

- [ ] **Step 5: Run the helper test**

Run: `node scripts/test_transient_retry.mjs`

Expected: exit 0 and `{ "ok": true }`.

---

### Task 2: Exa Request Retry

**Files:**
- Modify: `scripts/lib/external_search.mjs:3-18,136-184,328-332`
- Modify: `scripts/test_external_search_layer.mjs:5-61,64-93`

**Interfaces:**
- Consumes: `httpError()` and `withTransientRetry()` from `scripts/lib/transient_retry.mjs`
- Preserves: `searchExternalSources(options): Promise<SearchResult>`

- [ ] **Step 1: Add a failing Exa timeout regression**

In `scripts/test_external_search_layer.mjs`, change `sendJson` to accept a status and add counters before the server:

```js
function sendJson(res, payload, status = 200) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body, 'utf8'),
  });
  res.end(body);
}

let timeoutRequestCount = 0;
let clientErrorRequestCount = 0;
```

After parsing the request payload, add deterministic branches before the existing success response:

```js
if (payload.query === 'retry timeout') {
  timeoutRequestCount += 1;
  if (timeoutRequestCount === 1) {
    setTimeout(() => {
      if (!res.destroyed) sendJson(res, { results: [] });
    }, 75);
    return;
  }
}
if (payload.query === 'no retry client error') {
  clientErrorRequestCount += 1;
  sendJson(res, { error: 'bad request' }, 400);
  return;
}
```

Set test-only timing before importing `external_search.mjs`:

```js
process.env.EXA_REQUEST_TIMEOUT_MS = '25';
process.env.ERP_KB_TRANSIENT_RETRY_DELAY_MS = '0';
```

After the import, add:

```js
const retriedSearch = await searchExternalSources({ query: 'retry timeout', numResults: 1 });
assert.strictEqual(retriedSearch.ok, true);
assert.strictEqual(timeoutRequestCount, 2);

await assert.rejects(
  () => searchExternalSources({ query: 'no retry client error', numResults: 1 }),
  /HTTP 400/,
);
assert.strictEqual(clientErrorRequestCount, 1);
```

Add `import assert from 'assert';` at the top.

- [ ] **Step 2: Run the external-search test and confirm one-attempt failure**

Run: `node scripts/test_external_search_layer.mjs`

Expected: nonzero exit from the first timed-out `retry timeout` request; the server receives one request for that query.

- [ ] **Step 3: Attach HTTP status and wrap only the provider request**

Add the import:

```js
import { httpError, withTransientRetry } from './transient_retry.mjs';
```

In `searchViaApi()`, preserve the status on both non-JSON and non-success responses:

```js
let json;
try {
  json = JSON.parse(textBody);
} catch {
  throw httpError(`Exa API returned non-JSON response: ${textBody.slice(0, 300)}`, response.status);
}
if (!response.ok) {
  throw httpError(
    `Exa API search failed with HTTP ${response.status}: ${textBody.slice(0, 300)}`,
    response.status,
  );
}
```

Replace the selected-provider call in `searchExternalSources()` with:

```js
const searchResult = await withTransientRetry(() => (
  provider === 'api'
    ? searchViaApi({ query, numResults, includeDomains: effectiveDomains, type, category, text })
    : searchViaMcp({ query, numResults, includeDomains: effectiveDomains })
));
```

Each attempt calls `searchViaApi()` or `searchViaMcp()` again, so it receives a fresh controller, timer, and MCP process.

- [ ] **Step 4: Run the Exa regression and existing assertions**

Run: `node scripts/test_external_search_layer.mjs`

Expected: exit 0; timeout request count is 2, HTTP 400 request count is 1, and the existing ranking/answer assertions pass.

---

### Task 3: LLM Retry and Query-Stage Reporting

**Files:**
- Modify: `scripts/run_dashboard_discovery.mjs:7-45,102-136,257-368`
- Modify: `scripts/lib/dashboard_discovery.mjs:1589-1598`
- Modify: `scripts/test_dashboard_discovery.mjs:19-79,94-172,284-296,425-430`

**Interfaces:**
- Consumes: `httpError()` and `withTransientRetry()` from `scripts/lib/transient_retry.mjs`
- Preserves: CLI output and exit-code behavior for `run_dashboard_discovery.mjs`
- Extends: daily run errors to `{ queryId: string, stage: 'search' | 'llm' | 'query', message: string }`
- Extends: discovery report `recentRuns[]` with `errors: Array<RunError>`

- [ ] **Step 1: Add a flaky LLM server fixture**

Add this helper to `scripts/test_dashboard_discovery.mjs` after `startSlowLlmServer()`:

```js
function startAssessmentServer({ url, failuresBeforeSuccess }) {
  let requestCount = 0;
  const server = http.createServer((req, res) => {
    if (req.method !== 'POST') {
      res.writeHead(404);
      res.end();
      return;
    }
    requestCount += 1;
    if (requestCount <= failuresBeforeSuccess) {
      req.socket.destroy();
      return;
    }
    const answer = JSON.stringify([{
      url,
      action: 'CANDIDATE_ONLY',
      targetKb: 'ComarchOptimaSprint',
      confidence: 0.99,
      novelty: 'high',
      duplicateRisk: 'low',
      contentRisk: 'low',
      reasons: ['Transient retry fixture.'],
    }]);
    const body = `data: ${JSON.stringify({ success: true, answer })}\n\n`;
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8' });
    res.end(body);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({
      server,
      requestCount: () => requestCount,
    }));
  });
}
```

- [ ] **Step 2: Add failing recovery and persistent-error scenarios**

Create two temporary roots inside the existing `try` block. For each root, write an empty inbox registry and a search mock where every namespace maps to `[]` except `ComarchOptimaSprint`, which maps to one unseen Sprint result.

Use this environment for the recovery process:

```js
const retryEnv = {
  ...process.env,
  ROOT: retryRoot,
  OPENSPG_API_BASE: `http://127.0.0.1:${retryPort}`,
  OPENSPG_LLM_ENDPOINT: '/v1/chat/completions',
  OPENSPG_LLM_APP_ID: '4',
  OPENSPG_LLM_SESSION_ID: '4',
  OPENSPG_COOKIE: 'test-cookie=1',
  ERP_KB_DISCOVERY_LLM_TIMEOUT_MS: '500',
  ERP_KB_TRANSIENT_RETRY_DELAY_MS: '0',
  ERP_KB_DISCOVERY_SEARCH_MOCK_FILE: retrySearchMock,
};
```

Run `--daily --dry-run --limit 1` against a server with `failuresBeforeSuccess: 1` and assert:

```js
assert.strictEqual(retryRun.status, 0, retryRun.stderr || retryRun.stdout);
const retryResult = JSON.parse(retryRun.stdout).result;
assert.strictEqual(retryResult.ok, true);
assert.strictEqual(retryResult.candidateCount, 1);
assert.deepStrictEqual(retryResult.errors, []);
assert.strictEqual(retryServer.requestCount(), 2);
```

Run the same command with a separate root and `failuresBeforeSuccess: 2`. Assert:

```js
assert.strictEqual(failedRun.status, 1);
const failedResult = JSON.parse(failedRun.stdout).result;
assert.strictEqual(failedResult.ok, false);
assert.strictEqual(failedResult.errors.length, 1);
assert.strictEqual(failedResult.errors[0].queryId, 'seed_ComarchOptimaSprint');
assert.strictEqual(failedResult.errors[0].stage, 'llm');
assert.strictEqual(failedServer.requestCount(), 2);

const failedReport = JSON.parse(fs.readFileSync(
  path.join(failedRoot, 'docs/reference/ERP_KB_Discovery_Coverage_Report.json'),
  'utf8',
));
assert.deepStrictEqual(failedReport.recentRuns[0].errors, failedResult.errors);
```

Track both servers and roots for cleanup in `finally`.

- [ ] **Step 3: Run the discovery test and confirm both missing behaviors**

Run: `npm run test:discovery`

Expected: nonzero exit because the recovery scenario stops after one `fetch failed`, and persistent report output lacks `errors` and `stage`.

- [ ] **Step 4: Wrap the LLM request only**

Add the helper import to `run_dashboard_discovery.mjs`:

```js
import { httpError, withTransientRetry } from './lib/transient_retry.mjs';
```

Keep cookie/config validation outside retry. Replace the controller-through-parser block in `callLlm()` with:

```js
return withTransientRetry(async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE}${ENDPOINT}`, {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(MODEL ? { model: MODEL } : {}),
        app_id: /^\d+$/.test(APP_ID) ? Number(APP_ID) : APP_ID,
        session_id: /^\d+$/.test(SESSION_ID) ? Number(SESSION_ID) : SESSION_ID,
        prompt: [{ type: 'text', content: prompt }],
        thinking_enabled: false,
        search_enabled: false,
      }),
      signal: controller.signal,
    });
    const body = await response.text();
    if (!response.ok) {
      throw httpError(`Discovery LLM HTTP ${response.status}: ${body.slice(0, 300)}`, response.status);
    }
    return parseJson(parseSseAnswer(body));
  } finally {
    clearTimeout(timer);
  }
});
```

Malformed SSE/JSON errors remain non-transient and receive no retry.

- [ ] **Step 5: Record the failing query stage**

At the start of each daily worker, initialize `let stage = 'search';`. Set `stage = 'query'` after search, `stage = 'llm'` immediately before `assessResults()`, and `stage = 'query'` immediately after it returns. Replace the catch payload with:

```js
run.errors.push({ queryId: query.id, stage, message: error.message });
```

- [ ] **Step 6: Preserve structured errors in the report**

Add this field to each mapped `recentRuns` item in `refreshDiscoveryReport()`:

```js
errors: Array.isArray(run.errors)
  ? run.errors.map((error) => ({
    queryId: String(error.queryId || ''),
    stage: ['search', 'llm', 'query'].includes(error.stage) ? error.stage : 'query',
    message: String(error.message || ''),
  }))
  : [],
```

Keep `overall` unchanged because it reports query coverage, not run health.

- [ ] **Step 7: Run the full discovery regression**

Run: `npm run test:discovery`

Expected: exit 0. The flaky LLM succeeds on attempt 2, the persistent failure stops at 2 attempts, and the report contains the `llm` error.

---

### Task 4: Verification and Controlled Runtime Check

**Files:**
- Verify: `scripts/lib/transient_retry.mjs`
- Verify: `scripts/lib/external_search.mjs`
- Verify: `scripts/run_dashboard_discovery.mjs`
- Verify: `scripts/lib/dashboard_discovery.mjs`
- Verify: `docs/reference/ERP_KB_Discovery_Coverage_Report.json`

**Interfaces:**
- Consumes: all changes from Tasks 1-3
- Produces: test evidence and one production dry-run result

- [ ] **Step 1: Run focused tests**

Run:

```bash
node scripts/test_transient_retry.mjs
node scripts/test_external_search_layer.mjs
npm run test:discovery
```

Expected: all three commands exit 0.

- [ ] **Step 2: Run repository syntax checks**

Run: `npm run check`

Expected: exit 0 with no syntax errors.

- [ ] **Step 3: Validate runtime service configuration before a live dry-run**

Run:

```bash
systemctl is-active erp-kb-dashboard-discovery-daily.timer
systemctl show erp-kb-dashboard-discovery-daily.service --property=Result,ExecMainStatus
```

Expected: timer is `active`. Record the prior service result; do not proceed if the timer or dashboard service is unhealthy.

- [ ] **Step 4: Trigger one controlled production dry-run**

Run: `sudo systemctl start erp-kb-dashboard-discovery-daily.service`

The unit already invokes `--daily --dry-run --limit 3`, so it cannot create drafts. It will update discovery run history, query statistics, reports, and audit/trend state.

- [ ] **Step 5: Verify the resulting run**

Run:

```bash
systemctl show erp-kb-dashboard-discovery-daily.service --property=Result,ExecMainStatus,ExecMainStartTimestamp,ExecMainExitTimestamp
journalctl -u erp-kb-dashboard-discovery-daily.service -n 80 --no-pager
curl -sS http://10.10.254.42:3410/panel/api/discovery
curl -sS http://10.10.254.42:3410/panel/api/automation/alerts
```

Expected: service result `success`, exit status 0, latest discovery run `ok: true`, no duplicate draft side effects, and no new active automation alert. If an upstream failure persists through both attempts, accept exit status 1 only when the latest report includes its `queryId`, `stage`, and final message.

- [ ] **Step 6: Review the final diff**

Run:

```bash
git status --short
git diff -- scripts/lib/transient_retry.mjs scripts/test_transient_retry.mjs scripts/lib/external_search.mjs scripts/test_external_search_layer.mjs scripts/run_dashboard_discovery.mjs scripts/lib/dashboard_discovery.mjs scripts/test_dashboard_discovery.mjs package.json docs/superpowers/specs/2026-08-31-discovery-transient-retry-design.md docs/superpowers/plans/2026-08-31-discovery-transient-retry.md
```

Expected: only the planned source, test, package, spec, plan, and runtime-generated report changes are present. Do not revert unrelated existing worktree changes.
