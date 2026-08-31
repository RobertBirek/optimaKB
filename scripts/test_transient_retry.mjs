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
assert.strictEqual(isTransientNetworkError(httpError('authentication timed out', 401)), false);
assert.strictEqual(isTransientNetworkError(httpError('invalid timeout configuration', 400)), false);
assert.strictEqual(isTransientNetworkError(httpError('invalid HTTP status', 600)), false);
assert.strictEqual(isTransientNetworkError(new SyntaxError('invalid JSON')), false);
const nonRetryableServerError = httpError('malformed upstream response', 503);
nonRetryableServerError.nonRetryable = true;
assert.strictEqual(isTransientNetworkError(nonRetryableServerError), false);

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
