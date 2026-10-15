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

const sandbox = fs.mkdtempSync('/tmp/opencode/owa-snapshot-recovery-');
const root = path.join(sandbox, 'root');
process.env.ROOT = root;
const undo = [];
function patch(obj, key, fn) { const old = obj[key]; obj[key] = fn; undo.push(() => { obj[key] = old; }); }
let forbiddenCalls = 0, outsideIo = 0, guardedIo = 0;
const deny = () => { forbiddenCalls++; throw new Error('Network/process forbidden in fixture'); };
patch(globalThis, 'fetch', deny);
for (const key of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) patch(childProcess, key, deny);
patch(net.Socket.prototype, 'connect', deny);
for (const obj of [http, https]) for (const key of ['get', 'request']) patch(obj, key, deny);
syncBuiltinESMExports();
const inside = (base, file) => { const rel = path.relative(base, file); return rel !== '..' && !rel.startsWith('../') && !path.isAbsolute(rel); };
for (const key of ['readFileSync', 'writeFileSync', 'appendFileSync', 'openSync', 'mkdirSync', 'rmSync', 'unlinkSync', 'chmodSync', 'chownSync']) {
  const old = fs[key];
  patch(fs, key, (file, ...args) => {
    if (typeof file !== 'number') {
      guardedIo++;
      if (!inside(sandbox, path.resolve(file)) || (fs.existsSync(file) && !inside(sandbox, fs.realpathSync(file)))) outsideIo++;
      assert(inside(sandbox, path.resolve(file)), `Outside fixture: ${file}`);
      if (fs.existsSync(file)) assert(inside(sandbox, fs.realpathSync(file)), `Escaped fixture: ${file}`);
    }
    return old(file, ...args);
  });
}
const rename = fs.renameSync;
patch(fs, 'renameSync', (from, to) => { assert(inside(sandbox, path.resolve(from)) && inside(sandbox, path.resolve(to))); return rename(from, to); });
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const relative = (file) => path.relative(root, file);
const registry = path.join(root, 'docs/reference/knowledge_inbox/registry.json');
const auditRoot = path.join(root, 'data/dashboard/audit');
const body = '# Częściowo zweryfikowane\r\n\r\nTwierdzenie MSSQL niepotwierdzone.\n';
let passed = 0;
let api, audit, automation;
function fixture() {
  fs.rmSync(root, { recursive: true, force: true });
  const id = 'DRAFT_Exact_UPPER';
  const rawJsonPath = path.join(root, 'downloads/knowledge_inbox/day/lower-name.json');
  const rawMarkdownPath = rawJsonPath.replace('.json', '.md');
  const promotedJsonPath = path.join(root, 'docs/reference/knowledge_inbox/promoted/OWAOntology/lower-name.json');
  const promotedMarkdownPath = promotedJsonPath.replace('.json', '.md');
  fs.mkdirSync(path.dirname(rawJsonPath), { recursive: true });
  fs.mkdirSync(path.dirname(promotedJsonPath), { recursive: true });
  const raw = { id, kbNamespace: 'OWAOntology', title: 'Test', metadata: { verification: 'partial' } };
  const before = { ...raw, content: '', status: 'promoted', promotedAt: '2020-01-01T00:00:00Z', promotedBy: 'old', reviewNote: 'old approval', sourceDraftPath: relative(rawJsonPath), extra: { tags: ['keep'] } };
  const prefix = '# Original title\n- old metadata: keep\n\n## Content\n\n';
  fs.writeFileSync(rawJsonPath, JSON.stringify(raw)); fs.writeFileSync(rawMarkdownPath, body);
  fs.writeFileSync(promotedJsonPath, JSON.stringify(before)); fs.chmodSync(promotedJsonPath, 0o640);
  fs.writeFileSync(promotedMarkdownPath, prefix); fs.chmodSync(promotedMarkdownPath, 0o644);
  const record = { id };
  for (const [key, file] of Object.entries({ rawJsonPath, rawMarkdownPath, promotedJsonPath, promotedMarkdownPath })) { record[key] = relative(file); record[key.replace('Path', 'Sha256')] = hash(fs.readFileSync(file)); }
  fs.writeFileSync(registry, JSON.stringify({ generatedAt: 'old', extra: [1], entries: [{ draftId: id, kbNamespace: 'OWAOntology', status: 'promoted', rawJsonPath: record.rawJsonPath, promotedJsonPath: record.promotedJsonPath, promotedMarkdownPath: record.promotedMarkdownPath, oldReview: { at: 'old' } }] }));
  const manifest = { schemaVersion: 1, namespace: 'OWAOntology', registrySha256: hash(fs.readFileSync(registry)), records: [record] };
  const options = { manifest, operationId: 'fixture-operation', backupDir: path.join(root, 'recovery-backups'), actor: 'fixture-operator', note: 'snapshot only' };
  const immutable = [registry, rawJsonPath, rawMarkdownPath].map((file) => [file, fs.readFileSync(file)]);
  const originals = [promotedJsonPath, promotedMarkdownPath].map((file) => [file, fs.readFileSync(file)]);
  return { id, options, record, before, prefix, rawJsonPath, rawMarkdownPath, promotedJsonPath, promotedMarkdownPath, immutable, originals };
}
function unchanged(pairs) { for (const [file, bytes] of pairs) assert.deepEqual(fs.readFileSync(file), bytes); }
function events() { return audit.listDashboardAudit({ action: 'knowledge_draft.recover_content', limit: 1000 }); }
function journal(f) { return path.join(f.options.backupDir, f.options.operationId, hash(f.id), 'journal.json'); }
async function run(name, fn) { if (process.env.OWA_RECOVERY_CASE_FILTER && !name.includes(process.env.OWA_RECOVERY_CASE_FILTER)) return; const f = fixture(); await fn(f); unchanged(f.immutable); if (fs.existsSync(automation.AUTOMATION_LOCKS_ROOT)) assert.deepEqual(fs.readdirSync(automation.AUTOMATION_LOCKS_ROOT), []); passed++; console.log(`PASS ${name}`); }
async function refuse(f) { await assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options)); unchanged(f.originals); assert.equal(events().length, 0); }
async function inject(key, fn, action) { const old = fs[key]; fs[key] = (...args) => fn(old, ...args); try { return await action(); } finally { fs[key] = old; } }
async function traceRecoveryBarrier(f) {
  const opened = new Map(), trace = []; let targets = 0;
  const dir = path.dirname(journal(f));
  const required = [path.join(dir, 'before.json'), path.join(dir, 'before.md'), journal(f)];
  let parent = root;
  for (const component of path.relative(root, dir).split(path.sep)) { required.push(parent); parent = path.join(parent, component); }
  required.push(dir);
  await inject('openSync', (old, file, ...args) => { const fd = old(file, ...args); opened.set(fd, String(file)); return fd; }, () =>
    inject('fsyncSync', (old, fd) => { const result = old(fd); trace.push(opened.get(fd)); return result; }, () =>
      inject('renameSync', (old, from, to) => {
        if ([f.promotedJsonPath, f.promotedMarkdownPath].includes(to)) {
          let cursor = -1;
          for (const file of required) { cursor = trace.indexOf(file, cursor + 1); assert(cursor !== -1, `F4 missing ordered fsync ${file} before ${to}: ${JSON.stringify(trace)}`); }
          targets++; trace.length = 0;
        }
        return old(from, to);
      }, () => api.recoverOwaPromotedContent(f.id, f.options))));
  assert(targets > 0, 'fixture must exercise target rename');
}
async function clock(at, action) {
  const OriginalDate = globalThis.Date;
  globalThis.Date = class extends OriginalDate {
    constructor(...args) { super(...(args.length ? args : [typeof at === 'function' ? at() : at])); }
    static now() { return OriginalDate.parse(typeof at === 'function' ? at() : at); }
  };
  try { return await action(); } finally { globalThis.Date = OriginalDate; }
}
try {
  api = await import('./lib/promoted_knowledge.mjs');
  audit = await import('./lib/dashboard_audit.mjs');
  automation = await import('./lib/dashboard_automation.mjs');
  async function retainedCheckpoint(f) {
    await clock('2026-10-14T12:00:00Z', async () => {
      audit.appendDashboardAudit({ id: 'expired-ancestor', at: '2026-07-01T12:00:00Z' });
      audit.appendDashboardAudit({ id: 'retained-anchor', at: '2026-10-14T12:00:00Z' });
      const fresh = await import(`./lib/dashboard_audit.mjs?checkpoint-recovery=${passed}`);
      fresh.appendDashboardAudit({ id: 'retained-terminal', at: '2026-10-14T12:00:01Z' });
    });
    assert.equal(audit.verifyDashboardAudit(10000).ok, false);
    fs.mkdirSync(f.options.backupDir, { mode: 0o700 });
    assert.equal(typeof api.captureOwaRecoveryAuditCheckpoint, 'function', 'missing operator checkpoint writer');
    const ref = api.captureOwaRecoveryAuditCheckpoint(f.options.backupDir);
    f.options.manifest.auditCheckpoint = ref;
    return path.join(root, ref.path);
  }
  await run('checkpoint operator utility exists (RED)', () => assert.equal(typeof api.captureOwaRecoveryAuditCheckpoint, 'function'));
  await run('retained checkpoint recovery, provenance, journal, result and idempotency', async (f) => {
    const file = await retainedCheckpoint(f); const bytes = fs.readFileSync(file);
    const preview = await api.recoverOwaPromotedContent(f.id, { ...f.options, dryRun: true });
    assert.equal(preview.auditCheckpoint.scope, 'checkpointed_retained_suffix');
    assert.equal(preview.auditCheckpoint.ancestryVerified, false); assert(!fs.existsSync(journal(f)));
    const result = await api.recoverOwaPromotedContent(f.id, f.options);
    assert.equal(result.status, 'recovered');
    for (const obj of [result, JSON.parse(fs.readFileSync(journal(f))), JSON.parse(fs.readFileSync(f.promotedJsonPath)).contentRecovery, events()[0].metadata]) {
      assert.deepEqual(obj.auditCheckpoint, preview.auditCheckpoint);
    }
    assert.equal((await api.recoverOwaPromotedContent(f.id, f.options)).status, 'noop');
    assert.equal(events().length, 1); assert.deepEqual(fs.readFileSync(file), bytes);
    assert.equal(audit.verifyDashboardAudit(10000).ok, false);
  });
  await run('checkpoint reference omission stays strict', async (f) => { await retainedCheckpoint(f); delete f.options.manifest.auditCheckpoint; await refuse(f); });
  for (const [name, change] of [
    ['wrong SHA', (f) => { f.options.manifest.auditCheckpoint.sha256 = '0'.repeat(64); }],
    ['traversal', (f) => { f.options.manifest.auditCheckpoint.path = '../sentinel'; }],
    ['absolute path', (f, file) => { f.options.manifest.auditCheckpoint.path = file; }],
    ['outside backup', (f, file) => { const dest = path.join(root, 'checkpoint.json'); fs.renameSync(file, dest); f.options.manifest.auditCheckpoint.path = relative(dest); }],
    ['symlink', (f, file) => { const dest = path.join(root, 'sentinel'); fs.renameSync(file, dest); fs.symlinkSync(dest, file); }],
    ['missing', (f, file) => fs.rmSync(file)],
    ['directory', (f, file) => { fs.rmSync(file); fs.mkdirSync(file); }],
    ['oversized', (f, file) => { fs.writeFileSync(file, Buffer.alloc(8 * 1024 * 1024 + 1)); }],
    ['unprotected file', (f, file) => fs.chmodSync(file, 0o644)],
    ['unprotected backup', (f) => fs.chmodSync(f.options.backupDir, 0o755)],
    ['checkpoint content tamper', (f, file) => fs.appendFileSync(file, ' ')],
    ['checkpoint truncated fresh SHA', (f, file) => { fs.writeFileSync(file, '{'); f.options.manifest.auditCheckpoint.sha256 = hash(fs.readFileSync(file)); }],
    ['null reference', (f) => { f.options.manifest.auditCheckpoint = null; }],
  ]) await run(`checkpoint ${name} refuses before targets`, async (f) => { const file = await retainedCheckpoint(f); change(f, file); await refuse(f); assert(!fs.existsSync(journal(f))); });
  await run('checkpoint durability barrier refuses target writes and compensation', async (f) => {
    const file = await retainedCheckpoint(f); const opened = new Map(); let attempted = false;
    await inject('openSync', (old, p, ...args) => { const fd = old(p, ...args); opened.set(fd, String(p)); return fd; }, () =>
      inject('fsyncSync', (old, fd) => { if (opened.get(fd) === file) { attempted = true; throw new Error('checkpoint fsync failed'); } return old(fd); }, () =>
        assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), { code: 'RECOVERY_STATE_UNCERTAIN' })));
    assert(attempted); unchanged(f.originals); assert.equal(events().length, 0);
    assert.equal((await api.recoverOwaPromotedContent(f.id, f.options)).status, 'recovered');
  });
  await run('checkpoint revalidated at each target boundary', async (f) => {
    const file = await retainedCheckpoint(f); let changed = false;
    await inject('renameSync', (old, from, to) => { const result = old(from, to); if (to === f.promotedJsonPath && !changed) { changed = true; fs.appendFileSync(file, ' '); } return result; }, () =>
      assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), { code: 'RECOVERY_STATE_UNCERTAIN' }));
    assert(changed); assert.deepEqual(fs.readFileSync(f.promotedMarkdownPath), f.originals[1][1]); assert.equal(events().length, 0);
  });
  await run('checkpoint writer refuses overwrite and corrupted audit', async (f) => {
    const file = await retainedCheckpoint(f); const before = fs.readFileSync(file);
    assert.throws(() => api.captureOwaRecoveryAuditCheckpoint(f.options.backupDir)); assert.deepEqual(fs.readFileSync(file), before);
    fs.rmSync(file); fs.appendFileSync(path.join(auditRoot, '2026-10-14.jsonl'), '{bad\n');
    assert.throws(() => api.captureOwaRecoveryAuditCheckpoint(f.options.backupDir)); assert(!fs.existsSync(file));
  });
  await run('checkpoint and ancestor fsyncs precede every target rename', async (f) => {
    const file = await retainedCheckpoint(f); const opened = new Map(); const trace = []; let targets = 0;
    await inject('openSync', (old, p, ...args) => { const fd = old(p, ...args); opened.set(fd, String(p)); return fd; }, () =>
      inject('fsyncSync', (old, fd) => { const result = old(fd); trace.push(opened.get(fd)); return result; }, () =>
        inject('renameSync', (old, from, to) => {
          if ([f.promotedJsonPath, f.promotedMarkdownPath].includes(to)) {
            assert(trace.includes(file)); assert(trace.includes(f.options.backupDir)); assert(trace.includes(root));
            trace.length = 0; targets++;
          }
          return old(from, to);
        }, () => api.recoverOwaPromotedContent(f.id, f.options))));
    assert.equal(targets, 2);
  });
  await run('checkpoint ancestor durability failure before targets', async (f) => {
    await retainedCheckpoint(f); const opened = new Map(); let checkpointSynced = false;
    await inject('openSync', (old, p, ...args) => { const fd = old(p, ...args); opened.set(fd, String(p)); return fd; }, () =>
      inject('fsyncSync', (old, fd) => {
        const file = opened.get(fd);
        if (file === path.join(f.options.backupDir, 'audit-checkpoint.json')) checkpointSynced = true;
        if (checkpointSynced && file === f.options.backupDir) throw new Error('checkpoint directory sync failure');
        return old(fd);
      }, () => assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), { code: 'RECOVERY_STATE_UNCERTAIN' })));
    assert(checkpointSynced); unchanged(f.originals); assert.equal(events().length, 0);
  });
  for (const field of ['auditCheckpoint', 'recovery', 'auditInput']) await run(`checkpoint journal ${field} binding drift refuses`, async (f) => {
    await retainedCheckpoint(f); await api.recoverOwaPromotedContent(f.id, f.options);
    const j = JSON.parse(fs.readFileSync(journal(f)));
    const binding = field === 'auditCheckpoint' ? j.auditCheckpoint : field === 'recovery' ? j.recovery.auditCheckpoint : j.auditInput.metadata.auditCheckpoint;
    binding.ancestryVerified = true; fs.writeFileSync(journal(f), JSON.stringify(j));
    const bytes = [[f.promotedJsonPath, fs.readFileSync(f.promotedJsonPath)], [f.promotedMarkdownPath, fs.readFileSync(f.promotedMarkdownPath)]];
    await assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), { code: 'RECOVERY_STATE_UNCERTAIN' }); unchanged(bytes);
  });
  await run('checkpoint prefix removal refuses recovery before targets', async (f) => {
    await retainedCheckpoint(f); const file = path.join(auditRoot, '2026-10-14.jsonl');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').split('\n').slice(1).join('\n')); await refuse(f);
  });
  await run('checkpoint recovery chooses append timestamp under lock across midnight', async (f) => {
    await retainedCheckpoint(f); let now = '2026-10-15T23:59:59.999Z', crossed = false, intervening;
    await clock(() => now, () => inject('openSync', (old, p, ...args) => {
      if (p === path.join(auditRoot, '.append.lock') && !crossed) {
        crossed = true; now = '2026-10-16T00:00:00.001Z'; intervening = audit.appendDashboardAudit({ id: 'midnight-intervening' });
      }
      return old(p, ...args);
    }, () => api.recoverOwaPromotedContent(f.id, f.options)));
    const event = events()[0]; assert(crossed); assert.equal(event.at, now); assert.equal(event.previousHash, intervening.hash);
    const j = JSON.parse(fs.readFileSync(journal(f))); assert.equal(j.recovery.recoveredAt, '2026-10-15T23:59:59.999Z');
    assert.equal(j.auditAt, now); assert(!Object.hasOwn(j.auditInput, 'at'));
    assert.equal(audit.verifyDashboardAuditCheckpoint(fs.readFileSync(path.join(root, f.options.manifest.auditCheckpoint.path)), f.options.manifest.auditCheckpoint.sha256).ok, true);
  });
  await run('history preserved, exact bytes, separate provenance and modes', async (f) => {
    assert.equal(typeof api.recoverOwaPromotedContent, 'function', 'missing recovery API');
    const result = await api.recoverOwaPromotedContent(f.id, f.options);
    assert.equal(result.status, 'recovered');
    const after = JSON.parse(fs.readFileSync(f.promotedJsonPath));
    for (const key of Object.keys(f.before).filter((k) => k !== 'content')) assert.deepEqual(after[key], f.before[key]);
    assert.equal(after.content, body); assert.equal(after.contentRecovery.rawMarkdownSha256, hash(Buffer.from(body)));
    assert.equal(after.contentRecovery.method, 'legacy_owa_adjacent_markdown');
    assert.equal(after.contentRecovery.actor, f.options.actor); assert.match(after.contentRecovery.recoveredAt, /Z$/);
    assert.equal(fs.readFileSync(f.promotedMarkdownPath, 'utf8'), f.prefix + body);
    assert.equal(fs.statSync(f.promotedJsonPath).mode & 0o777, 0o640);
    assert.equal(events().length, 1); assert.equal(JSON.parse(fs.readFileSync(journal(f))).state, 'COMMITTED');
  });
  await run('same operation no-op and one audit', async (f) => { await api.recoverOwaPromotedContent(f.id, f.options); const bytes = fs.readFileSync(f.promotedJsonPath); assert.equal((await api.recoverOwaPromotedContent(f.id, f.options)).status, 'noop'); assert.deepEqual(fs.readFileSync(f.promotedJsonPath), bytes); assert.equal(events().length, 1); });
  for (const field of ['rawJsonPath', 'rawMarkdownPath', 'promotedJsonPath', 'promotedMarkdownPath']) {
    await run(`${field} drift`, async (f) => { fs.appendFileSync(f[field], '\n'); f.immutable = f.immutable.filter(([p]) => p !== f[field]); f.originals = f.originals.map(([p, b]) => [p, p === f[field] ? fs.readFileSync(p) : b]); await refuse(f); });
    await run(`${field} traversal`, async (f) => { f.record[field] = '../sentinel'; await refuse(f); });
    await run(`${field} symlink escape`, async (f) => { const sentinel = path.join(sandbox, 'sentinel'); fs.writeFileSync(sentinel, fs.readFileSync(f[field])); fs.unlinkSync(f[field]); fs.symlinkSync(sentinel, f[field]); await refuse(f); });
  }
  for (const [name, change] of [
    ['namespace', (f) => { f.options.manifest.namespace = 'Other'; }],
    ['duplicate IDs', (f) => { f.options.manifest.records.push({ ...f.record }); }],
    ['wrong exact ID', (f) => { f.id = f.id.toLowerCase(); }],
    ['invalid operation', (f) => { f.options.operationId = '..'; }],
    ['backup overlap', (f) => { f.options.backupDir = path.dirname(f.rawJsonPath); }],
    ['wrong registry hash', (f) => { f.options.manifest.registrySha256 = '0'.repeat(64); }],
    ['nonempty content', (f) => { const obj = { ...f.before, content: 'other' }; fs.writeFileSync(f.promotedJsonPath, JSON.stringify(obj)); f.record.promotedJsonSha256 = hash(fs.readFileSync(f.promotedJsonPath)); f.originals[0][1] = fs.readFileSync(f.promotedJsonPath); }],
    ['foreign recovery marker', (f) => { fs.writeFileSync(f.promotedJsonPath, JSON.stringify({ ...f.before, contentRecovery: { operationId: 'foreign' } })); f.record.promotedJsonSha256 = hash(fs.readFileSync(f.promotedJsonPath)); f.originals[0][1] = fs.readFileSync(f.promotedJsonPath); }],
    ['nonempty MD body', (f) => { fs.appendFileSync(f.promotedMarkdownPath, 'other'); f.record.promotedMarkdownSha256 = hash(fs.readFileSync(f.promotedMarkdownPath)); f.originals[1][1] = fs.readFileSync(f.promotedMarkdownPath); }],
  ]) await run(name, async (f) => { change(f); await refuse(f); });
  for (const target of ['promotedJsonPath', 'promotedMarkdownPath']) await run(`${target} rename failure compensated`, async (f) => { let fail = true; await inject('renameSync', (old, from, to) => { if (to === f[target] && fail) { fail = false; throw new Error('injected rename'); } return old(from, to); }, () => assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), /injected rename/)); unchanged(f.originals); assert.equal(events().length, 0); assert.equal(JSON.parse(fs.readFileSync(journal(f))).state, 'COMPENSATED'); });
  await run('audit preappend failure compensates and retries', async (f) => { await inject('appendFileSync', (old, file, ...args) => { if (String(file).startsWith(auditRoot)) throw new Error('injected audit'); return old(file, ...args); }, () => assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), /injected audit/)); unchanged(f.originals); await api.recoverOwaPromotedContent(f.id, f.options); assert.equal(events().length, 1); });
  await run('audit append then throw reconciles without duplicate', async (f) => { await inject('appendFileSync', (old, file, ...args) => { const value = old(file, ...args); if (String(file).startsWith(auditRoot)) throw new Error('after append'); return value; }, () => api.recoverOwaPromotedContent(f.id, f.options)); await api.recoverOwaPromotedContent(f.id, f.options); assert.equal(events().length, 1); });
  await run('journal failure after files compensates', async (f) => { let fail = true; await inject('renameSync', (old, from, to) => { if (to === journal(f) && fail && JSON.parse(fs.readFileSync(from)).state === 'FILES_WRITTEN') { fail = false; throw new Error('injected journal'); } return old(from, to); }, () => assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), /injected journal/)); unchanged(f.originals); assert.equal(events().length, 0); });
  await run('matching JSON partial resumes from journal', async (f) => { await api.recoverOwaPromotedContent(f.id, f.options); const j = JSON.parse(fs.readFileSync(journal(f))); fs.writeFileSync(f.promotedMarkdownPath, f.originals[1][1]); j.state = 'JSON_WRITTEN'; fs.writeFileSync(journal(f), JSON.stringify(j)); await api.recoverOwaPromotedContent(f.id, f.options); assert.equal(fs.readFileSync(f.promotedMarkdownPath, 'utf8'), f.prefix + body); assert.equal(events().length, 1); });
  await run('full manifest record drift on retry refuses', async (f) => { await api.recoverOwaPromotedContent(f.id, f.options); f.record.extra = 'drift'; await assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options)); assert.equal(events().length, 1); });
  for (const lockName of ['registry', 'kb_OWAOntology']) await run(`lock conflict ${lockName}`, async (f) => { const lock = automation.acquireAutomationLock(lockName); try { await assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), { code: 'AUTOMATION_LOCKED' }); unchanged(f.originals); } finally { lock.release(); } });
  for (const subject of ['registry', 'raw', 'promoted']) await run(`wrong ${subject} namespace/status with fresh hashes`, async (f) => {
    const file = subject === 'registry' ? registry : subject === 'raw' ? f.rawJsonPath : f.promotedJsonPath;
    const obj = JSON.parse(fs.readFileSync(file));
    if (subject === 'registry') obj.entries[0].status = 'withdrawn';
    else if (subject === 'raw') obj.kbNamespace = 'Other';
    else obj.status = 'pending';
    fs.writeFileSync(file, JSON.stringify(obj));
    if (subject === 'registry') f.options.manifest.registrySha256 = hash(fs.readFileSync(file));
    else f.record[subject === 'raw' ? 'rawJsonSha256' : 'promotedJsonSha256'] = hash(fs.readFileSync(file));
    f.immutable = f.immutable.map(([p, b]) => [p, p === file ? fs.readFileSync(p) : b]);
    f.originals = f.originals.map(([p, b]) => [p, p === file ? fs.readFileSync(p) : b]);
    await refuse(f);
  });
  await run('registry bytes drift', async (f) => { fs.appendFileSync(registry, '\n'); f.immutable[0][1] = fs.readFileSync(registry); await refuse(f); });
  await run('manifest malformed', async (f) => { f.options.manifest.records = null; await refuse(f); });
  await run('explicit empty raw content is ineligible', async (f) => { const obj = JSON.parse(fs.readFileSync(f.rawJsonPath)); obj.content = ''; fs.writeFileSync(f.rawJsonPath, JSON.stringify(obj)); f.record.rawJsonSha256 = hash(fs.readFileSync(f.rawJsonPath)); f.immutable[1][1] = fs.readFileSync(f.rawJsonPath); await refuse(f); });
  await run('backup parent symlink escape', async (f) => { const outside = path.join(sandbox, 'backup-sentinel'); fs.mkdirSync(outside); fs.symlinkSync(outside, f.options.backupDir); await refuse(f); assert.deepEqual(fs.readdirSync(outside), []); });
  await run('registry symlink refused without reading target', async (f) => { const outside = path.join(sandbox, 'registry-sentinel'); fs.writeFileSync(outside, fs.readFileSync(registry)); fs.unlinkSync(registry); fs.symlinkSync(outside, registry); await refuse(f); });
  await run('journal path symlink refused', async (f) => { await api.recoverOwaPromotedContent(f.id, f.options); const file = journal(f); const sentinel = path.join(sandbox, 'journal-sentinel'); fs.writeFileSync(sentinel, fs.readFileSync(file)); fs.unlinkSync(file); fs.symlinkSync(sentinel, file); await assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options)); assert.equal(events().length, 1); });
  await run('backup file symlink refused', async (f) => { await api.recoverOwaPromotedContent(f.id, f.options); const file = path.join(path.dirname(journal(f)), 'before.json'); const sentinel = path.join(sandbox, 'before-sentinel'); fs.writeFileSync(sentinel, fs.readFileSync(file)); fs.unlinkSync(file); fs.symlinkSync(sentinel, file); await assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options)); });
  await run('failed compensation preserves original cause and retry proves pair', async (f) => {
    await inject('renameSync', (old, from, to) => { if (to === f.promotedMarkdownPath) throw new Error('injected MD failure'); return old(from, to); }, async () => {
      await assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), (e) => e.code === 'RECOVERY_STATE_UNCERTAIN' && /injected MD failure/.test(e.cause?.message) && e.errors.length > 0);
    });
    assert.equal(events().length, 0); await api.recoverOwaPromotedContent(f.id, f.options); assert.equal(events().length, 1);
  });
  await run('journal failure after audit remains uncertain then safely finalizes', async (f) => {
    await inject('renameSync', (old, from, to) => { if (to === journal(f) && JSON.parse(fs.readFileSync(from)).state === 'AUDITED') throw new Error('post audit journal failure'); return old(from, to); }, () => assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), { code: 'RECOVERY_STATE_UNCERTAIN' }));
    assert.equal(events().length, 1); assert.equal(JSON.parse(fs.readFileSync(f.promotedJsonPath)).content, body);
    await api.recoverOwaPromotedContent(f.id, f.options); assert.equal(events().length, 1);
  });
  await run('ambiguous partial append refuses compensation and retry', async (f) => {
    await inject('appendFileSync', (old, file, ...args) => { if (String(file).startsWith(auditRoot)) { old(file, '{incomplete'); throw new Error('partial append'); } return old(file, ...args); }, () => assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), { code: 'RECOVERY_STATE_UNCERTAIN' }));
    assert.equal(JSON.parse(fs.readFileSync(f.promotedJsonPath)).content, body);
    await assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), { code: 'RECOVERY_STATE_UNCERTAIN' });
  });
  await run('unknown partial pair refuses without overwrite', async (f) => { await api.recoverOwaPromotedContent(f.id, f.options); fs.appendFileSync(f.promotedMarkdownPath, 'foreign'); const bytes = fs.readFileSync(f.promotedMarkdownPath); await assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), { code: 'RECOVERY_STATE_UNCERTAIN' }); assert.deepEqual(fs.readFileSync(f.promotedMarkdownPath), bytes); });
  await run('missing initial journal refuses reuse after exclusive backup failure', async (f) => {
    await inject('openSync', (old, file, ...args) => { if (String(file).endsWith('/before.md')) throw new Error('backup failure'); return old(file, ...args); }, () => assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), /backup failure/));
    unchanged(f.originals); await assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), { code: 'RECOVERY_STATE_UNCERTAIN' });
  });
  await run('audit collision refuses', async (f) => { const eventId = `owa_recovery_${hash(JSON.stringify([f.options.operationId, f.id]))}`; audit.appendDashboardAudit({ id: eventId, resourceId: f.id, action: 'knowledge_draft.recover_content', metadata: { binding: 'foreign' } }); await assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), { code: 'RECOVERY_STATE_UNCERTAIN' }); unchanged(f.originals); });
  await run('prepared journal and backups durable before target rename', async (f) => {
    let syncs = 0; const fdSync = fs.fsyncSync;
    await inject('fsyncSync', (old, fd) => { syncs++; return old(fd); }, () => inject('renameSync', (old, from, to) => {
      if (to === f.promotedJsonPath) {
        assert(syncs >= 7); const j = JSON.parse(fs.readFileSync(journal(f))); assert.equal(j.state, 'PREPARED');
        assert.equal(fs.statSync(path.dirname(journal(f))).mode & 0o777, 0o700);
        assert.equal(fs.statSync(journal(f)).mode & 0o777, 0o600);
        for (const [index, name] of ['before.json', 'before.md'].entries()) assert.deepEqual(fs.readFileSync(path.join(path.dirname(journal(f)), name)), f.originals[index][1]);
      }
      return old(from, to);
    }, () => api.recoverOwaPromotedContent(f.id, f.options)));
    assert.equal(fs.fsyncSync, fdSync);
  });
  await run('unrelated namespaces and populated OWA snapshots untouched', async (f) => {
    const pairs = [];
    for (const namespace of ['Other', 'OWAOntology']) {
      const file = path.join(root, 'docs/reference/knowledge_inbox/promoted', namespace, 'unrelated.json'); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, '{"content":"existing"}'); pairs.push([file, fs.readFileSync(file)]);
    }
    await api.recoverOwaPromotedContent(f.id, f.options); unchanged(pairs);
  });
  await run('journal full manifest record tampering refused', async (f) => { await api.recoverOwaPromotedContent(f.id, f.options); const j = JSON.parse(fs.readFileSync(journal(f))); j.record.extra = 'unbound'; fs.writeFileSync(journal(f), JSON.stringify(j)); await assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), { code: 'RECOVERY_STATE_UNCERTAIN' }); });
  await run('journal permission tampering refused', async (f) => { await api.recoverOwaPromotedContent(f.id, f.options); const j = JSON.parse(fs.readFileSync(journal(f))); j.modes.json = 0o777; fs.writeFileSync(journal(f), JSON.stringify(j)); await assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), { code: 'RECOVERY_STATE_UNCERTAIN' }); });
  for (const directory of ['raw', 'target', 'root']) await run(`${directory} parent symlink refused`, async (f) => {
    const original = directory === 'raw' ? path.join(root, 'downloads/knowledge_inbox') : directory === 'target' ? path.dirname(f.promotedJsonPath) : root;
    const target = path.join(sandbox, `moved-${directory}`); fs.renameSync(original, target); fs.symlinkSync(target, original);
    try { await refuse(f); } finally { fs.unlinkSync(original); fs.renameSync(target, original); }
  });
  await run('nested promoted target refused', async (f) => { f.record.promotedJsonPath = f.record.promotedJsonPath.replace('/lower-name.json', '/nested/lower-name.json'); f.record.promotedMarkdownPath = f.record.promotedJsonPath.replace('.json', '.md'); await refuse(f); });
  await run('registry current status rechecked after first write', async (f) => {
    let changed = false;
    await inject('renameSync', (old, from, to) => {
      const result = old(from, to);
      if (!changed && to === f.promotedJsonPath) { changed = true; const obj = JSON.parse(fs.readFileSync(registry)); obj.entries[0].status = 'withdrawn'; fs.writeFileSync(registry, JSON.stringify(obj)); }
      return result;
    }, () => assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), /Registry hash drift/));
    unchanged(f.originals); assert.equal(events().length, 0); f.immutable[0][1] = fs.readFileSync(registry);
  });
  await run('postappend pair drift cannot report success', async (f) => { await inject('appendFileSync', (old, file, ...args) => { const result = old(file, ...args); if (String(file).startsWith(auditRoot)) fs.appendFileSync(f.promotedMarkdownPath, 'foreign postappend drift'); return result; }, () => assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), { code: 'RECOVERY_STATE_UNCERTAIN' })); assert.equal(events().length, 1); });
  for (const phase of ['PREPARED', 'FILES_WRITTEN']) await run(`F1 crossday ${phase} interrupted retry`, async (f) => {
    const dayD = '2026-10-14T10:00:00.000Z', nextDay = '2026-10-15T11:00:00.000Z';
    await clock(dayD, async () => {
      audit.appendDashboardAudit({ id: 'ordinary-A', action: 'ordinary', resourceId: 'other' });
      await inject('renameSync', (old, from, to) => {
        if (phase === 'PREPARED' && to === f.promotedJsonPath) throw Object.assign(new Error('interrupted PREPARED'), { code: 'RECOVERY_STATE_UNCERTAIN' });
        const result = old(from, to);
        if (phase === 'FILES_WRITTEN' && to === journal(f) && JSON.parse(fs.readFileSync(to)).state === phase) throw Object.assign(new Error('interrupted FILES_WRITTEN'), { code: 'RECOVERY_STATE_UNCERTAIN' });
        return result;
      }, () => assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), { code: 'RECOVERY_STATE_UNCERTAIN' }));
    });
    const before = JSON.parse(fs.readFileSync(journal(f)));
    assert.equal(before.state, phase); assert.equal(before.recovery.recoveredAt, dayD);
    await clock(nextDay, async () => {
      const b = audit.appendDashboardAudit({ id: 'ordinary-B', action: 'ordinary', resourceId: 'other' });
      assert.equal(audit.verifyDashboardAudit().ok, true, 'valid chain before retry');
      const result = await api.recoverOwaPromotedContent(f.id, f.options);
      assert.equal(result.status, 'recovered'); assert.equal(result.contentRecovery.recoveredAt, dayD);
      assert.equal(audit.verifyDashboardAudit().ok, true, 'valid chain after retry');
      const event = events()[0], j = JSON.parse(fs.readFileSync(journal(f)));
      assert.equal(event.at, nextDay); assert.equal(event.previousHash, b.hash);
      assert.equal(event.metadata.recoveredAt, dayD); assert.equal(j.auditAt, event.at); assert.equal(j.auditHash, event.hash);
      assert.equal(event.id, result.eventId); assert.equal(j.eventId, result.eventId);
      assert.equal((await api.recoverOwaPromotedContent(f.id, f.options)).status, 'noop');
      assert.equal(events().length, 1);
    });
    await clock('2026-10-16T12:00:00.000Z', async () => {
      audit.appendDashboardAudit({ id: 'ordinary-C', action: 'ordinary', resourceId: 'other' });
      assert.equal((await api.recoverOwaPromotedContent(f.id, f.options)).status, 'noop');
      assert.equal(audit.verifyDashboardAudit().ok, true); assert.equal(events().length, 1);
    });
  });
  await run('F1 crossday persisted audit reconciles after intervening event', async (f) => {
    await clock('2026-10-14T10:00:00.000Z', () => inject('renameSync', (old, from, to) => {
      if (to === journal(f) && JSON.parse(fs.readFileSync(from)).state === 'AUDITED') throw new Error('interrupted finalization');
      return old(from, to);
    }, () => assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), { code: 'RECOVERY_STATE_UNCERTAIN' })));
    const originalEvent = events()[0]; assert.equal(JSON.parse(fs.readFileSync(journal(f))).state, 'AUDIT_PENDING');
    await clock('2026-10-15T11:00:00.000Z', async () => {
      audit.appendDashboardAudit({ id: 'ordinary-B', action: 'ordinary', resourceId: 'other' });
      assert.equal(audit.verifyDashboardAudit().ok, true);
      await api.recoverOwaPromotedContent(f.id, f.options);
      assert.deepEqual(events(), [originalEvent]); assert.equal(audit.verifyDashboardAudit().ok, true);
      const j = JSON.parse(fs.readFileSync(journal(f))); assert.equal(j.auditAt, originalEvent.at); assert.equal(j.auditHash, originalEvent.hash);
    });
  });
  for (const crash of [false, true]) await run(`F1-R1 midnight after pending fsync before audit lock crash=${crash}`, async (f) => {
    const dayD = '2026-10-15T23:59:59.999Z', dayD1 = '2026-10-16T00:00:00.001Z';
    let now = dayD, crossed = false, pendingFileSynced = false, pendingDurable = false, b, pending, omittedAt = 0;
    const opened = new Map();
    // Observe the actual input read by the unmodified helper. An own `at`
    // (even undefined) shadows this getter and fails the omitted-input assertion.
    const previousAt = Object.getOwnPropertyDescriptor(Object.prototype, 'at');
    Object.defineProperty(Object.prototype, 'at', { configurable: true, get() {
      if (this.action === 'knowledge_draft.recover_content') { assert.equal(Object.hasOwn(this, 'at'), false); omittedAt++; }
      return undefined;
    } });
    try {
      await clock(() => now, async () => {
        audit.appendDashboardAudit({ id: 'ordinary-A', action: 'ordinary', resourceId: 'other' });
        await inject('openSync', (old, file, ...args) => {
          if (!crossed && file === path.join(auditRoot, '.append.lock')) {
            crossed = true;
            assert.equal(pendingDurable, true, 'pending journal and directory fsynced before lock acquisition');
            pending = JSON.parse(fs.readFileSync(journal(f)));
            assert.equal(pending.state, 'AUDIT_PENDING');
            now = dayD1;
            b = audit.appendDashboardAudit({ id: 'ordinary-B', action: 'ordinary', resourceId: 'other' });
            assert.equal(audit.verifyDashboardAudit().ok, true, 'valid intervening B chain');
          }
          const fd = old(file, ...args); opened.set(fd, String(file)); return fd;
        }, () => inject('fsyncSync', (old, fd) => {
          const result = old(fd);
          if (opened.get(fd) === journal(f)
              && JSON.parse(fs.readFileSync(journal(f))).state === 'AUDIT_PENDING') pendingFileSynced = true;
          if (opened.get(fd) === path.dirname(journal(f)) && fs.existsSync(journal(f))
              && JSON.parse(fs.readFileSync(journal(f))).state === 'AUDIT_PENDING') {
            assert.equal(pendingFileSynced, true, 'pending file fsynced before its directory');
            pendingDurable = true;
          }
          return result;
        }, () => inject('renameSync', (old, from, to) => {
          if (crash && to === journal(f) && JSON.parse(fs.readFileSync(from)).state === 'AUDITED') throw new Error('crash before actual receipt finalized');
          return old(from, to);
        }, async () => {
          if (crash) await assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), { code: 'RECOVERY_STATE_UNCERTAIN' });
          else assert.equal((await api.recoverOwaPromotedContent(f.id, f.options)).status, 'recovered');
        })));
        assert.equal(crossed, true);
        assert.equal(audit.verifyDashboardAudit().ok, true, 'midnight append must preserve chain');
        assert.equal(omittedAt, 1, 'recovery caller must omit at entirely');
        assert.equal(pending.schemaVersion, 2); assert.equal(pending.auditAt, null); assert.equal(pending.auditHash, null);
        const event = events()[0];
        assert.equal(event.at, dayD1); assert.equal(event.previousHash, b.hash);
        assert.equal(event.metadata.recoveredAt, dayD);
        assert.deepEqual(fs.readFileSync(path.join(auditRoot, '2026-10-16.jsonl'), 'utf8')
          .trim().split('\n').map((line) => JSON.parse(line).id), [b.id, event.id]);
        assert.equal(Object.hasOwn(pending.auditInput, 'at'), false);
        for (const [key, value] of Object.entries(pending.auditInput)) assert.deepEqual(event[key], value);
        if (crash) {
          const j = JSON.parse(fs.readFileSync(journal(f)));
          assert.equal(j.state, 'AUDIT_PENDING'); assert.equal(j.auditAt, null); assert.equal(j.auditHash, null);
        }
        const auditBytes = fs.readdirSync(auditRoot).filter((name) => name.endsWith('.jsonl')).map((name) => {
          const file = path.join(auditRoot, name); return [file, fs.readFileSync(file)];
        });
        now = '2026-10-17T12:00:00.000Z';
        assert.equal((await api.recoverOwaPromotedContent(f.id, f.options)).status, crash ? 'recovered' : 'noop');
        unchanged(auditBytes);
        const j = JSON.parse(fs.readFileSync(journal(f)));
        assert.equal(j.auditAt, dayD1); assert.equal(j.auditHash, event.hash); assert.equal(j.state, 'COMMITTED');
        assert.equal(j.recovery.recoveredAt, dayD);
        assert.equal(JSON.parse(fs.readFileSync(f.promotedJsonPath)).contentRecovery.recoveredAt, dayD);
        audit.appendDashboardAudit({ id: 'ordinary-C', action: 'ordinary', resourceId: 'other' });
        assert.equal((await api.recoverOwaPromotedContent(f.id, f.options)).status, 'noop');
        assert.deepEqual(events(), [event]); assert.equal(audit.verifyDashboardAudit().ok, true);
        assert.equal(omittedAt, 1, 'retry must not append again');
      });
    } finally {
      if (previousAt) Object.defineProperty(Object.prototype, 'at', previousAt);
      else delete Object.prototype.at;
    }
  });
  for (const state of ['FILES_WRITTEN', 'AUDIT_PENDING']) await run(`F1-R1 old journal format refused ${state}`, async (f) => {
    await inject('renameSync', (old, from, to) => {
      const result = old(from, to);
      if (to === journal(f) && JSON.parse(fs.readFileSync(to)).state === 'FILES_WRITTEN') throw Object.assign(new Error('stop before append'), { code: 'RECOVERY_STATE_UNCERTAIN' });
      return result;
    }, () => assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), { code: 'RECOVERY_STATE_UNCERTAIN' }));
    const j = JSON.parse(fs.readFileSync(journal(f)));
    j.schemaVersion = 1; j.state = state; j.auditAt = '2026-10-14T23:59:59.999Z'; delete j.auditInput; delete j.auditHash;
    fs.writeFileSync(journal(f), JSON.stringify(j));
    const bytes = [journal(f), f.promotedJsonPath, f.promotedMarkdownPath].map((file) => [file, fs.readFileSync(file)]);
    await assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), { code: 'RECOVERY_STATE_UNCERTAIN' });
    unchanged(bytes); assert.equal(events().length, 0);
  });
  for (const field of ['auditInput', 'missing auditInput', 'auditAt', 'auditHash']) await run(`F1-R1 journal ${field} mismatch refused`, async (f) => {
    await api.recoverOwaPromotedContent(f.id, f.options);
    const j = JSON.parse(fs.readFileSync(journal(f)));
    if (field === 'missing auditInput') delete j.auditInput;
    else if (field === 'auditInput') j.auditInput = { ...j.auditInput, actor: 'foreign' };
    else j[field] = field === 'auditAt' ? '2000-01-01T00:00:00.000Z' : '0'.repeat(64);
    fs.writeFileSync(journal(f), JSON.stringify(j));
    const bytes = [journal(f), f.promotedJsonPath, f.promotedMarkdownPath].map((file) => [file, fs.readFileSync(file)]);
    await assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), { code: 'RECOVERY_STATE_UNCERTAIN' });
    unchanged(bytes); assert.equal(events().length, 1); assert.equal(audit.verifyDashboardAudit().ok, true);
  });
  await run('F1-R1 pending null receipt without event remains ambiguous on retry', async (f) => {
    await inject('renameSync', (old, from, to) => {
      const result = old(from, to);
      if (to === journal(f) && JSON.parse(fs.readFileSync(to)).state === 'AUDIT_PENDING') throw Object.assign(new Error('stop at audit boundary'), { code: 'RECOVERY_STATE_UNCERTAIN' });
      return result;
    }, () => assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), { code: 'RECOVERY_STATE_UNCERTAIN' }));
    const j = JSON.parse(fs.readFileSync(journal(f)));
    assert.equal(j.state, 'AUDIT_PENDING'); assert.equal(j.auditAt, null); assert.equal(j.auditHash, null);
    await assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), { code: 'RECOVERY_STATE_UNCERTAIN' });
    assert.equal(events().length, 0);
  });
  await run('F2 exact nested ancestor fsync paths before targets', async (f) => {
    f.options.backupDir = path.join(root, 'recovery/a/b');
    const opened = new Map(), synced = []; let targetWrites = 0;
    await inject('openSync', (old, file, ...args) => { const fd = old(file, ...args); opened.set(fd, String(file)); return fd; }, () =>
      inject('fsyncSync', (old, fd) => { synced.push(opened.get(fd)); return old(fd); }, () =>
        inject('renameSync', (old, from, to) => {
          if ([f.promotedJsonPath, f.promotedMarkdownPath].includes(to)) {
            targetWrites++;
            const expected = [root, path.join(root, 'recovery'), path.join(root, 'recovery/a'), f.options.backupDir, path.dirname(path.dirname(journal(f))), path.dirname(journal(f))];
            for (const directory of expected) assert(synced.includes(directory), `missing directory fsync: ${directory}; observed ${JSON.stringify(synced)}`);
            assert.equal(JSON.parse(fs.readFileSync(journal(f))).state, targetWrites === 1 ? 'PREPARED' : 'JSON_WRITTEN');
          }
          return old(from, to);
        }, () => api.recoverOwaPromotedContent(f.id, f.options))));
    assert.equal(targetWrites, 2);
  });
  await run('F2 ancestor fsync failure leaves targets untouched', async (f) => {
    f.options.backupDir = path.join(root, 'recovery/a/b'); const opened = new Map(); let injected = false;
    await inject('openSync', (old, file, ...args) => { const fd = old(file, ...args); opened.set(fd, String(file)); return fd; }, () =>
      inject('fsyncSync', (old, fd) => { if (opened.get(fd) === root) { injected = true; throw new Error('ancestor fsync failure'); } return old(fd); }, () =>
        assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), /ancestor fsync failure/)));
    assert.equal(injected, true); unchanged(f.originals); assert.equal(events().length, 0);
  });
  for (const restoreFails of [false, true]) await run(`F3 primary restore=${restoreFails} plus both release faults`, async (f) => {
    const primary = Object.assign(new Error('primary MD write'), { code: 'PRIMARY_WRITE' });
    const restores = [new Error('restore JSON'), new Error('restore MD')], releases = [], attempts = []; let failed = false, caught;
    await inject('unlinkSync', (old, file) => {
      if (String(file).startsWith(automation.AUTOMATION_LOCKS_ROOT)) { attempts.push(path.basename(file)); old(file); const error = new Error(`release ${path.basename(file)}`); releases.push(error); throw error; }
      return old(file);
    }, () => inject('renameSync', (old, from, to) => {
      if (to === f.promotedMarkdownPath && !failed) { failed = true; throw primary; }
      if (failed && restoreFails && [f.promotedJsonPath, f.promotedMarkdownPath].includes(to)) throw restores[to === f.promotedJsonPath ? 0 : 1];
      return old(from, to);
    }, async () => { try { await api.recoverOwaPromotedContent(f.id, f.options); } catch (error) { caught = error; } }));
    assert(caught instanceof AggregateError); assert.deepEqual(attempts, ['kb_OWAOntology.lock', 'registry.lock']);
    assert.equal(caught.code, restoreFails ? 'RECOVERY_STATE_UNCERTAIN' : primary.code);
    assert.equal(caught.stateUncertain, restoreFails);
    const all = []; const visit = (e) => { if (!e || all.includes(e)) return; all.push(e); visit(e.cause); for (const child of e.errors || []) visit(child); }; visit(caught);
    assert(all.includes(primary)); for (const error of releases) assert(all.includes(error));
    if (restoreFails) { assert.equal(caught.cause.cause, primary); for (const error of restores) assert(all.includes(error)); }
    else { assert.equal(caught.cause, primary); unchanged(f.originals); assert.equal(JSON.parse(fs.readFileSync(journal(f))).state, 'COMPENSATED'); }
    assert.equal(events().length, 0);
  });
  await run('F3 success plus release faults retains committed outcome', async (f) => {
    const releases = []; let caught;
    await inject('unlinkSync', (old, file) => {
      const result = old(file);
      if (String(file).startsWith(automation.AUTOMATION_LOCKS_ROOT)) { const error = new Error('release after commit'); releases.push(error); throw error; }
      return result;
    }, async () => { try { await api.recoverOwaPromotedContent(f.id, f.options); } catch (error) { caught = error; } });
    assert.equal(caught.code, 'RECOVERY_LOCK_RELEASE_FAILED'); assert.equal(caught.stateUncertain, false);
    assert.equal(caught.outcome.status, 'recovered'); assert.equal(caught.outcome.eventId, events()[0].id);
    assert.deepEqual(caught.errors, releases); assert.equal(releases.length, 2);
    assert.equal(JSON.parse(fs.readFileSync(journal(f))).state, 'COMMITTED'); assert.equal(audit.verifyDashboardAudit().ok, true);
    assert.equal((await api.recoverOwaPromotedContent(f.id, f.options)).status, 'noop'); assert.equal(events().length, 1);
  });
  for (const initialFault of ['file', 'parent']) await run(`F4 initial journal ${initialFault} fsync fails then retry barrier fails`, async (f) => {
    const opened = new Map(); let failed = false, targetRenames = 0;
    await inject('openSync', (old, file, ...args) => { const fd = old(file, ...args); opened.set(fd, String(file)); return fd; }, () =>
      inject('fsyncSync', (old, fd) => {
        const file = opened.get(fd);
        if (!failed && fs.existsSync(journal(f)) && file === (initialFault === 'file' ? journal(f) : path.dirname(journal(f)))) {
          failed = true; throw new Error('initial journal flush failure');
        }
        return old(fd);
      }, () => assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), /initial journal flush failure/)));
    assert(failed); assert.equal(JSON.parse(fs.readFileSync(journal(f))).state, 'PREPARED'); unchanged(f.originals);
    await inject('openSync', (old, file, ...args) => { const fd = old(file, ...args); opened.set(fd, String(file)); return fd; }, () =>
      inject('fsyncSync', (old, fd) => {
        if (opened.get(fd) === (initialFault === 'file' ? journal(f) : path.dirname(journal(f)))) throw new Error('retry barrier flush failure');
        return old(fd);
      }, () => inject('renameSync', (old, from, to) => {
        if ([f.promotedJsonPath, f.promotedMarkdownPath].includes(to)) targetRenames++;
        return old(from, to);
      }, () => assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options)))));
    assert.equal(targetRenames, 0, 'failed retry barrier must prevent even compensation target renames');
    unchanged(f.originals); assert.equal(events().length, 0);
    await traceRecoveryBarrier(f);
    assert.equal(events().length, 1);
  });
  for (const state of ['new', 'PREPARED', 'JSON_WRITTEN', 'COMPENSATED', 'reconciled', 'renamed-journal']) await run(`F4 every target barrier ${state}`, async (f) => {
    if (state !== 'new') {
      if (state === 'COMPENSATED') {
        let failed = false;
        await inject('renameSync', (old, from, to) => { if (!failed && to === f.promotedMarkdownPath) { failed = true; throw new Error('prepare compensation'); } return old(from, to); }, () => assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options)));
        assert.equal(JSON.parse(fs.readFileSync(journal(f))).state, 'COMPENSATED');
      } else if (state === 'renamed-journal') {
        const opened = new Map(); let renamed = false, failed = false;
        await inject('openSync', (old, file, ...args) => { const fd = old(file, ...args); opened.set(fd, String(file)); return fd; }, () =>
          inject('renameSync', (old, from, to) => { const result = old(from, to); if (to === journal(f)) renamed = true; return result; }, () =>
            inject('fsyncSync', (old, fd) => {
              if (renamed && opened.get(fd) === journal(f)) { failed = true; throw new Error('journal rename succeeded but fsync failed'); }
              return old(fd);
            }, () => assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options)))));
        assert(renamed && failed); assert.equal(JSON.parse(fs.readFileSync(journal(f))).state, 'JSON_WRITTEN');
        assert.equal(JSON.parse(fs.readFileSync(f.promotedJsonPath)).content, body); unchanged([f.originals[1]]);
      } else {
        await inject('renameSync', (old, from, to) => {
          if (state === 'PREPARED' && to === f.promotedJsonPath) throw Object.assign(new Error('interrupt'), { code: 'RECOVERY_STATE_UNCERTAIN' });
          const result = old(from, to);
          if (to === journal(f) && JSON.parse(fs.readFileSync(to)).state === (state === 'reconciled' ? 'AUDITED' : 'JSON_WRITTEN')) throw Object.assign(new Error('interrupt after journal rename'), { code: 'RECOVERY_STATE_UNCERTAIN' });
          return result;
        }, () => assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options)));
        if (state === 'reconciled') fs.writeFileSync(f.promotedMarkdownPath, f.originals[1][1]);
      }
    }
    const pair = [f.promotedJsonPath, f.promotedMarkdownPath].map((file) => [file, fs.readFileSync(file)]);
    const opened = new Map(); let targetRenames = 0;
    await inject('openSync', (old, file, ...args) => { const fd = old(file, ...args); opened.set(fd, String(file)); return fd; }, () =>
      inject('fsyncSync', (old, fd) => {
        if (opened.get(fd) === journal(f)) throw new Error('mandatory barrier unavailable');
        return old(fd);
      }, () => inject('renameSync', (old, from, to) => {
        if ([f.promotedJsonPath, f.promotedMarkdownPath].includes(to)) targetRenames++;
        return old(from, to);
      }, () => assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options)))));
    assert.equal(targetRenames, 0); unchanged(pair);
    await traceRecoveryBarrier(f);
  });
  for (const phase of ['markdown', 'restore-json', 'restore-markdown']) await run(`F4 flush failure at ${phase} stops target mutation`, async (f) => {
    const opened = new Map(); let forwardJson = false, compensating = false, restoredJson = false, blocked = false, blockedPair, laterRenames = 0, originalsFlushed = false;
    await inject('openSync', (old, file, ...args) => { const fd = old(file, ...args); opened.set(fd, String(file)); return fd; }, () =>
      inject('fsyncSync', (old, fd) => {
        if (opened.get(fd) === path.join(path.dirname(journal(f)), 'before.md')) originalsFlushed = true;
        const atBarrier = originalsFlushed && opened.get(fd) === path.dirname(journal(f));
        if (atBarrier) originalsFlushed = false;
        if (!blocked && atBarrier && (phase === 'markdown' ? forwardJson : compensating && (phase === 'restore-json' || restoredJson))) {
          blocked = true; blockedPair = [f.promotedJsonPath, f.promotedMarkdownPath].map((file) => [file, fs.readFileSync(file)]);
          throw new Error('per-target barrier flush failure');
        }
        return old(fd);
      }, () => inject('renameSync', (old, from, to) => {
        if (blocked && [f.promotedJsonPath, f.promotedMarkdownPath].includes(to)) laterRenames++;
        if (phase !== 'markdown' && !compensating && to === f.promotedMarkdownPath) { compensating = true; throw new Error('start compensation'); }
        const result = old(from, to);
        if (to === f.promotedJsonPath) { forwardJson = true; if (compensating) restoredJson = true; }
        return result;
      }, () => assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), { code: 'RECOVERY_STATE_UNCERTAIN' }))));
    assert(blocked); assert.equal(laterRenames, 0); unchanged(blockedPair); assert.equal(events().length, 0);
  });
  await run('F4 compensation target renames each require ordered barrier', async (f) => {
    const opened = new Map(), trace = []; let failed = false, restores = 0;
    await inject('openSync', (old, file, ...args) => { const fd = old(file, ...args); opened.set(fd, String(file)); return fd; }, () =>
      inject('fsyncSync', (old, fd) => { const result = old(fd); trace.push(opened.get(fd)); return result; }, () =>
        inject('renameSync', (old, from, to) => {
          if (!failed && to === f.promotedMarkdownPath) { failed = true; trace.length = 0; throw new Error('force guarded compensation'); }
          if (failed && [f.promotedJsonPath, f.promotedMarkdownPath].includes(to)) {
            const dir = path.dirname(journal(f));
            const required = [path.join(dir, 'before.json'), path.join(dir, 'before.md'), journal(f), root, f.options.backupDir, path.dirname(dir), dir];
            let cursor = -1;
            for (const file of required) { cursor = trace.indexOf(file, cursor + 1); assert(cursor !== -1, `missing compensation fsync ${file}`); }
            restores++; trace.length = 0;
          }
          return old(from, to);
        }, () => assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), /force guarded compensation/))));
    assert.equal(restores, 2); unchanged(f.originals); assert.equal(JSON.parse(fs.readFileSync(journal(f))).state, 'COMPENSATED');
  });
  for (const changed of ['before.json', 'before.md', 'journal.json']) await run(`F4 revalidate actual ${changed} before MD and compensation`, async (f) => {
    let jsonRenames = 0, mdRenames = 0;
    await inject('renameSync', (old, from, to) => {
      const result = old(from, to);
      if (to === f.promotedJsonPath) jsonRenames++;
      if (to === f.promotedMarkdownPath) mdRenames++;
      if (to === journal(f) && JSON.parse(fs.readFileSync(to)).state === 'JSON_WRITTEN') {
        const file = path.join(path.dirname(journal(f)), changed);
        if (changed === 'journal.json') { const j = JSON.parse(fs.readFileSync(file)); j.binding = 'foreign'; fs.writeFileSync(file, JSON.stringify(j)); }
        else fs.appendFileSync(file, 'tampered');
      }
      return result;
    }, () => assert.rejects(() => api.recoverOwaPromotedContent(f.id, f.options), { code: 'RECOVERY_STATE_UNCERTAIN' }));
    assert.equal(jsonRenames, 1); assert.equal(mdRenames, 0); unchanged([f.originals[1]]); assert.equal(events().length, 0);
  });
  assert.equal(forbiddenCalls, 0); assert.equal(outsideIo, 0);
  console.log(`Safety counters: guarded filesystem calls=${guardedIo}, outside-fixture attempts=${outsideIo}, network/process attempts=${forbiddenCalls}`);
  console.log(`OWA snapshot recovery: ${passed} PASS`);
} finally { for (const restore of undo.reverse()) restore(); syncBuiltinESMExports(); fs.rmSync(sandbox, { recursive: true, force: true }); }
