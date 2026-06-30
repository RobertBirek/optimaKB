#!/usr/bin/env node

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-kb-provider-secrets-'));
process.env.ROOT = root;
delete process.env.TAVILY_API_KEY;
delete process.env.FIRECRAWL_API_KEY;
delete process.env.EXA_API_KEY;

const secrets = await import(`./lib/provider_secrets.mjs?test=${Date.now()}`);

const initial = secrets.loadProviderSecrets();
assert.strictEqual(initial.tavilyApiKey, '');
assert.strictEqual(initial.firecrawlApiKey, '');
assert.strictEqual(initial.exaApiKey, '');

const saved = secrets.saveProviderSecrets({
  tavilyApiKey: 'tvly-secret-123456',
  firecrawlApiKey: 'fc-secret-abcdef',
  exaApiKey: 'exa-secret-xyz',
}, 'test');

assert.strictEqual(saved.tavilyApiKey, 'tvly-secret-123456');
assert.strictEqual(saved.firecrawlApiKey, 'fc-secret-abcdef');
assert.strictEqual(saved.exaApiKey, 'exa-secret-xyz');

const masked = secrets.maskProviderSecrets(saved);
assert.strictEqual(masked.tavilyApiKey.configured, true);
assert.strictEqual(masked.firecrawlApiKey.configured, true);
assert.strictEqual(masked.exaApiKey.configured, true);
assert(masked.tavilyApiKey.preview.startsWith('tvly'));
assert(masked.exaApiKey.preview.endsWith('xyz'));

const onDisk = JSON.parse(fs.readFileSync(secrets.PROVIDER_SECRETS_PATH, 'utf8'));
assert.strictEqual(onDisk.updatedBy, 'test');
assert.strictEqual(onDisk.tavilyApiKey, 'tvly-secret-123456');

fs.rmSync(secrets.PROVIDER_SECRETS_PATH, { force: true });
fs.mkdirSync(secrets.PROVIDER_SECRETS_PATH, { recursive: true });
const fallback = secrets.loadProviderSecrets();
assert.strictEqual(fallback.tavilyApiKey, '');
assert.strictEqual(fallback.firecrawlApiKey, '');
assert.strictEqual(fallback.exaApiKey, '');

process.stdout.write(`${JSON.stringify({ ok: true, masked }, null, 2)}\n`);
