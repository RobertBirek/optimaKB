#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import childProcess from 'node:child_process';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import { syncBuiltinESMExports } from 'node:module';

const root = fs.mkdtempSync('/tmp/opencode/audit-checkpoint-');
process.env.ROOT = root;
const undo = [];
let forbidden = 0;
const patch = (obj, key, fn) => { const old = obj[key]; obj[key] = fn; undo.push(() => { obj[key] = old; }); };
const deny = () => { forbidden++; throw new Error('Forbidden fixture I/O'); };
patch(globalThis, 'fetch', deny); patch(net.Socket.prototype, 'connect', deny);
for (const key of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) patch(childProcess, key, deny);
for (const obj of [http, https]) for (const key of ['get', 'request']) patch(obj, key, deny);
for (const key of ['readFileSync', 'writeFileSync', 'appendFileSync', 'openSync', 'mkdirSync', 'rmSync', 'unlinkSync', 'chmodSync']) {
  const old = fs[key]; patch(fs, key, (file, ...args) => {
    if (typeof file !== 'number' && file !== root && !path.resolve(file).startsWith(root + path.sep)) deny();
    return old(file, ...args);
  });
}
syncBuiltinESMExports();
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const audit = await import('./lib/dashboard_audit.mjs');
const dir = audit.DASHBOARD_AUDIT_ROOT;
let passed = 0;
const realDate = globalThis.Date;
function clock(at) {
  globalThis.Date = class extends realDate {
    constructor(...args) { super(...(args.length ? args : [at])); }
    static now() { return realDate.parse(at); }
  };
}
function reset() { fs.rmSync(dir, { recursive: true, force: true }); }
function append(id, at = '2026-10-14T23:59:59Z') { return audit.appendDashboardAudit({ id, at, action: 'fixture' }); }
function suffix() {
  reset(); clock('2026-10-14T12:00:00Z');
  append('ancestor', '2026-07-01T12:00:00Z');
  append('first'); append('anchor');
  // Real pruning in a fresh helper instance, at the configured 90-day boundary.
}
async function retained() {
  suffix();
  const fresh = await import(`./lib/dashboard_audit.mjs?retention=${passed}`);
  fresh.appendDashboardAudit({ id: 'terminal', at: '2026-10-15T00:00:01Z' });
  assert(!fs.existsSync(path.join(dir, '2026-07-01.jsonl')));
  assert.equal(audit.verifyDashboardAudit(10000).ok, false);
}
const bytes = (value) => Buffer.from(JSON.stringify(value));
function captured() { const checkpoint = audit.captureDashboardAuditCheckpoint(); const data = bytes(checkpoint); return { checkpoint, data, sha: hash(data) }; }
function check(data, sha = hash(data)) { return audit.verifyDashboardAuditCheckpoint(data, sha); }
async function run(name, fn) { await retained(); await fn(); passed++; console.log(`PASS ${name}`); }
try {
  await run('capture API exists (RED)', () => assert.equal(typeof audit.captureDashboardAuditCheckpoint, 'function'));
  await run('read-only capture, suffix scope, strict default still fails', () => {
    const before = fs.readdirSync(dir).map((f) => [f, fs.readFileSync(path.join(dir, f))]);
    const { checkpoint, data, sha } = captured();
    assert.equal(checkpoint.scope, 'checkpointed_retained_suffix'); assert.equal(checkpoint.ancestryVerified, false);
    assert.equal(checkpoint.events.length, 3); assert.equal(checkpoint.days.length, 2);
    assert.equal(check(data, sha).ok, true); assert.equal(audit.verifyDashboardAudit(10000).ok, false);
    assert.deepEqual(fs.readdirSync(dir).map((f) => [f, fs.readFileSync(path.join(dir, f))]), before);
  });
  await run('matching extension across midnight', () => { const c = captured(); append('next', '2026-10-15T00:00:02Z'); const v = check(c.data, c.sha); assert.equal(v.ok, true); assert.equal(v.checked, 4); });
  for (const [name, mutate] of [
    ['hash tamper', (rows) => { rows[0].actor = 'tampered'; }],
    ['internal gap', (rows) => { rows.splice(1, 1); }],
    ['duplicate ID', (rows) => { rows.push(rows[0]); }],
    ['removed tail', (rows) => { rows.pop(); }],
    ['changed anchor', (rows) => { rows.at(-1).hash = '0'.repeat(64); }],
    ['arbitrary removed prefix', (rows) => { rows.shift(); }],
  ]) await run(name, () => {
    const c = captured();
    const rows = fs.readdirSync(dir).sort().flatMap((f) => fs.readFileSync(path.join(dir, f), 'utf8').trim().split('\n').map(JSON.parse));
    mutate(rows); fs.rmSync(dir, { recursive: true }); fs.mkdirSync(dir);
    for (const row of rows) fs.appendFileSync(path.join(dir, `${row.at.slice(0, 10)}.jsonl`), `${JSON.stringify(row)}\n`);
    assert.equal(check(c.data, c.sha).ok, false);
    if (['hash tamper', 'internal gap', 'duplicate ID', 'changed anchor'].includes(name)) assert.throws(() => captured());
  });
  await run('wrong SHA', () => { const c = captured(); assert.equal(check(c.data, '0'.repeat(64)).ok, false); });
  await run('checkpoint digest and anchor invalid even with fresh outer SHA', () => { const c = captured(); c.checkpoint.terminalAnchor.hash = '0'.repeat(64); assert.equal(check(bytes(c.checkpoint)).ok, false); });
  await run('malformed JSON capture and verify refused', () => { const c = captured(); fs.appendFileSync(path.join(dir, '2026-10-15.jsonl'), '{bad\n'); assert.throws(() => captured()); assert.equal(check(c.data).ok, false); });
  await run('partial final line refused', () => { const c = captured(); const file = path.join(dir, '2026-10-15.jsonl'); fs.writeFileSync(file, fs.readFileSync(file).subarray(0, -1)); assert.throws(() => captured()); assert.equal(check(c.data).ok, false); });
  await run('checkpoint truncation refused', () => { const c = captured(); assert.equal(check(c.data.subarray(0, -5)).ok, false); });
  await run('oversized supported window refused, no suffix slicing', () => { const file = path.join(dir, '2026-10-15.jsonl'); fs.appendFileSync(file, fs.readFileSync(file, 'utf8').repeat(9998)); assert.throws(() => captured(), /window/); });
  await run('audit symlink refused', () => { const file = path.join(dir, '2026-10-15.jsonl'); const dest = path.join(root, 'sentinel'); fs.renameSync(file, dest); fs.symlinkSync(dest, file); assert.throws(() => captured(), /[Ss]ymlink/); });
  await run('nonregular audit file refused', () => { const file = path.join(dir, '2026-10-15.jsonl'); fs.rmSync(file); fs.mkdirSync(file); assert.throws(() => captured()); });
  await run('internally valid rewritten baseline refused', () => {
    const c = captured(); const file = path.join(dir, '2026-10-14.jsonl');
    // A fresh valid chain is still not the operator-trusted observation.
    reset(); append('new-root'); append('first'); append('anchor'); append('terminal', '2026-10-15T00:00:01Z');
    assert(fs.existsSync(file)); assert.equal(check(c.data).ok, false);
  });
  await run('full genesis default behavior unchanged', () => { reset(); append('genesis'); assert.equal(audit.verifyDashboardAudit(10000).ok, true); assert.equal(check(captured().data).ancestryVerified, false); });
  await run('real pruning boundary unchanged and postcapture pruning fails closed', async () => {
    reset(); clock('2026-10-15T00:00:00Z');
    append('old', '2026-07-16T23:59:59Z'); append('boundary', '2026-07-17T00:00:00Z'); append('head', '2026-10-15T00:00:00Z');
    const c = captured();
    const fresh = await import('./lib/dashboard_audit.mjs?boundary');
    fresh.appendDashboardAudit({ id: 'at-boundary' });
    assert(!fs.existsSync(path.join(dir, '2026-07-16.jsonl')));
    assert(fs.existsSync(path.join(dir, '2026-07-17.jsonl')));
    assert.equal(check(c.data).ok, false);
    const c2 = captured(); clock('2026-10-15T00:00:00.001Z');
    const next = await import('./lib/dashboard_audit.mjs?after-boundary'); next.appendDashboardAudit({ id: 'after-boundary' });
    assert(!fs.existsSync(path.join(dir, '2026-07-17.jsonl'))); assert.equal(check(c2.data).ok, false);
  });
  console.log(`${passed} checkpoint cases PASS`);
} finally { globalThis.Date = realDate; fs.rmSync(root, { recursive: true, force: true }); for (const restore of undo.reverse()) restore(); syncBuiltinESMExports(); assert.equal(forbidden, 0); }
