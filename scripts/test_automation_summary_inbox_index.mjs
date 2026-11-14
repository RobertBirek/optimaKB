// Real parser + synthetic filesystem only. No runtime, providers or HTTP calls.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import test from 'node:test';

const root = fs.mkdtempSync('/tmp/opencode/automation-inbox-index-');
const rawRoot = path.join(root, 'downloads/knowledge_inbox');
process.env.ROOT = root;
const { automationSummary } = await import('./lib/dashboard_automation.mjs');

function write(relative, value) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value));
}

function draft(id) {
  write(`downloads/knowledge_inbox/2026-11-14/${id}.json`, {
    id, title: id, kbNamespace: 'ComarchOptimaReference',
    createdAt: '2026-11-14T00:00:00Z', content: 'Synthetic source paragraph. '.repeat(150),
  });
}

function job(id, draftId, fields = {}) {
  write(`data/dashboard/automation/jobs/${id}.json`, {
    id, draftId, title: id, kbNamespace: 'ComarchOptimaReference',
    createdAt: '2026-11-14T00:00:00Z', status: 'EXCEPTION',
    mode: 'publish', origin: 'live', ...fields,
  });
}

function seed() {
  for (const name of fs.readdirSync(root)) fs.rmSync(path.join(root, name), { recursive: true, force: true });
  write('docs/reference/knowledge_inbox/registry.json', { entries: [] });
  write('data/dashboard/automation/config.json', { paused: true, shadowOnly: true, publicationApproved: false });
}

// Observation only: every counted call still executes the real filesystem read.
function measureSummary() {
  const realRead = fs.readFileSync;
  let rawReads = 0;
  let bytes = 0;
  fs.readFileSync = function (file, ...args) {
    if (typeof file === 'string' && file.startsWith(rawRoot + path.sep)) rawReads += 1;
    const result = realRead.call(this, file, ...args);
    if (typeof file === 'string' && file.startsWith(rawRoot + path.sep)) bytes += Buffer.byteLength(result);
    return result;
  };
  const started = performance.now();
  const cpu = process.cpuUsage();
  try {
    const result = automationSummary();
    const used = process.cpuUsage(cpu);
    return { result, rawReads, bytes, wallMs: performance.now() - started, cpuMs: (used.user + used.system) / 1000 };
  } finally {
    fs.readFileSync = realRead;
  }
}

const ids = (items) => items.map((item) => item.id).sort();

try {
  await test('100 exceptions parse each of 600 raw drafts once per summary, not once per job', () => {
    seed();
    for (let i = 0; i < 600; i += 1) draft(`d${String(i).padStart(3, '0')}`);
    for (let i = 0; i < 100; i += 1) job(`j${String(i).padStart(3, '0')}`, `d${String(i).padStart(3, '0')}`);
    const registry = fs.readFileSync(path.join(root, 'docs/reference/knowledge_inbox/registry.json'));
    const measured = measureSummary();
    console.log(JSON.stringify({ scenario: '600 drafts / 100 exceptions', rawReads: measured.rawReads,
      bytes: measured.bytes, wallMs: Math.round(measured.wallMs), cpuMs: Math.round(measured.cpuMs) }));
    assert.equal(measured.result.exceptions.length, 100);
    assert.equal(measured.result.jobs.length, 100);
    assert.equal(measured.rawReads, 600, 'A summary must perform at most one full inbox scan');
    assert.equal(measured.result.config.paused, true);
    assert.equal(measured.result.config.publicationApproved, false);
    assert.deepEqual(fs.readFileSync(path.join(root, 'docs/reference/knowledge_inbox/registry.json')), registry);
    assert.equal(fs.existsSync(path.join(root, 'data/dashboard/learning')), false);
    assert.equal(fs.existsSync(path.join(root, 'docs/reference/ERP_KB_Dashboard_Canary_Readiness_Report.json')), false);
  });

  await test('one shared scan preserves exception/reroute membership and registry exclusions', () => {
    seed();
    for (const id of ['pending', 'promoted', 'withdrawn', 'unregistered']) draft(id);
    write('docs/reference/knowledge_inbox/registry.json', { entries: [
      { draftId: 'pending', status: 'pending' }, { draftId: 'promoted', status: 'promoted' },
      { draftId: 'withdrawn', status: 'withdrawn' },
    ] });
    job('ex-pending', 'pending');
    job('ex-promoted', 'promoted');
    job('ex-withdrawn', 'withdrawn');
    job('ex-unregistered', 'unregistered', { status: 'ROLLBACK_FAILED' });
    job('ex-missing', 'absent');
    job('route-pending', 'pending', { status: 'REROUTE_PROPOSED' });
    job('route-promoted', 'promoted', { status: 'REROUTE_PROPOSED' });
    job('route-applied', 'pending', { status: 'REROUTE_PROPOSED', reroute: { appliedAt: '2026-11-14T01:00:00Z' } });
    job('route-nonlive', 'pending', { status: 'REROUTE_PROPOSED', origin: 'history' });
    const measured = measureSummary();
    assert.deepEqual(ids(measured.result.exceptions), ['ex-pending', 'ex-unregistered']);
    assert.deepEqual(ids(measured.result.reroutes), ['route-pending']);
    assert.equal(measured.rawReads, 4);
  });

  await test('the scan is lazy when registry/status filters eliminate all actionable jobs', () => {
    seed();
    draft('promoted');
    write('docs/reference/knowledge_inbox/registry.json', { entries: [{ draftId: 'promoted', status: 'promoted' }] });
    job('old-exception', 'promoted');
    job('completed', 'promoted', { status: 'PUBLISHED' });
    job('old-reroute', 'promoted', { status: 'REROUTE_PROPOSED', origin: 'history' });
    const measured = measureSummary();
    assert.deepEqual(measured.result.exceptions, []);
    assert.deepEqual(measured.result.reroutes, []);
    assert.equal(measured.rawReads, 0);
  });

  await test('a new request sees draft additions/removals and registry decisions, without a global cache', () => {
    seed();
    draft('a');
    job('ex-a', 'a');
    job('ex-b', 'b');
    assert.deepEqual(ids(measureSummary().result.exceptions), ['ex-a']);
    fs.unlinkSync(path.join(rawRoot, '2026-11-14/a.json'));
    draft('b');
    assert.deepEqual(ids(measureSummary().result.exceptions), ['ex-b']);
    write('docs/reference/knowledge_inbox/registry.json', { entries: [{ draftId: 'b', status: 'rejected' }] });
    assert.deepEqual(measureSummary().result.exceptions, []);
    write('docs/reference/knowledge_inbox/registry.json', { entries: [{ draftId: 'b', status: 'pending' }] });
    assert.deepEqual(ids(measureSummary().result.exceptions), ['ex-b']);
  });

  await test('malformed inbox stays fail-closed and is scanned only once before the next request retries', () => {
    seed();
    draft('valid');
    write('downloads/knowledge_inbox/2026-11-14/zzz-corrupt.json', '{broken\n');
    for (const id of ['a', 'b', 'c']) job(`ex-${id}`, 'valid');
    const measured = measureSummary();
    assert.deepEqual(measured.result.exceptions, []);
    assert.equal(measured.rawReads, 2, 'A failed scan must not be repeated per job');
    fs.unlinkSync(path.join(rawRoot, '2026-11-14/zzz-corrupt.json'));
    assert.deepEqual(ids(measureSummary().result.exceptions), ['ex-a', 'ex-b', 'ex-c']);
  });
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
