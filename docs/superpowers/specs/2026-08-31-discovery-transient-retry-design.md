# Discovery Transient Retry Design

**Date:** 2026-08-31
**Status:** Approved for implementation planning

## Problem

Daily discovery runs fail after one transient network error. The 2026-08-31
run exposed two independent failure points:

- `seed_TaxbellPayrollHRReference` exceeded the 15-second Exa API timeout.
- `seed_ComarchOptimaSprint` completed Exa search, then lost the OpenSPG LLM
  transport during assessment.

Both calls are idempotent, but neither retries. A failed query sets the daily
run to `ok: false`. The coverage report then omits the per-query `errors` array,
which leaves operators without the failing stage and message.

## Scope

The change will:

- retry transient Exa and OpenSPG LLM failures once;
- keep retry boundaries around idempotent network calls;
- preserve per-query errors in discovery report `recentRuns`;
- add deterministic regression coverage.

The change will not retry a complete query worker, candidate writes, draft
writes, malformed responses, configuration errors, or deterministic client
errors.

## Retry Behavior

`scripts/lib/transient_retry.mjs` will provide a small helper that executes at
most two attempts. It will create a new request and timeout signal for each
attempt and wait 500 milliseconds before the second attempt.

The helper will retry only:

- abort or timeout errors;
- transport errors reported as `fetch failed`;
- HTTP 408 and 429 responses;
- HTTP 5xx responses.

The helper will return or throw the final attempt result without changing the
existing caller contract. It will not retry malformed JSON, unsupported
provider configuration, authentication failures, or other HTTP 4xx responses.

## Integration Boundaries

`searchExternalSources()` will retry only the selected provider request. The
provider selection and result normalization rules will remain unchanged.

The discovery runner will retry only `callLlm()`. Deduplication, candidate
classification, candidate persistence, and draft persistence will run once.
This boundary prevents duplicate side effects.

## Reporting

`refreshDiscoveryReport()` will retain each recent run's per-query `errors`
array. Each item will identify `queryId`, `stage`, and `message`. The stage will
be `search`, `llm`, or `query` for errors outside either network boundary.

Coverage status will continue to describe configured query coverage. The
latest run's `ok` value and errors will remain separate operational signals.

## Tests

Tests will use local HTTP servers and temporary roots. They will cover:

1. An Exa request that times out once and succeeds on the second attempt.
2. An OpenSPG LLM connection that fails once and succeeds on the second attempt.
3. A deterministic HTTP 4xx or malformed response that receives no retry.
4. A persistent transient failure that stops after two attempts.
5. Discovery report serialization that retains per-query errors.
6. Existing discovery concurrency and successful-run behavior.

## Acceptance Criteria

- A transient Exa or LLM failure can recover on the second attempt.
- Each network stage makes no more than two attempts.
- Retry does not repeat candidate or draft writes.
- Deterministic failures do not retry.
- Persistent failures still produce a failed run with the query-level error in
  the coverage report.
- `npm run check` and the relevant dashboard/discovery scripts pass.
- A controlled discovery verification confirms that the dashboard records the
  resulting run without duplicate side effects.

## Operational Notes

The implementation will keep current timeout values and concurrency during the
first change. Operators can raise the Exa or LLM timeout later if retry metrics
show sustained latency rather than isolated failures. This isolates retry
behavior from configuration tuning.
