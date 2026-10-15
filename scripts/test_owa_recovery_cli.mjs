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
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sandbox = fs.mkdtempSync('/tmp/opencode/owa-recovery-cli-');
const root = path.join(sandbox, 'root');
process.env.ROOT = root;
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const body = '# CLI_PRIVATE_BODY_SENTINEL\r\n\r\nUnverified source claim.\n';
const cli = path.join(repo, 'scripts/manage_knowledge_inbox.mjs');
const guard = path.join(sandbox, 'guard.mjs');
let passed = 0, children = 0;

// Child processes may execute only this CLI. The preload blocks any descendants,
// network access and data reads/writes outside the disposable ROOT. ESM source
// reads are allowed only under scripts/; no .env or provider config is readable.
fs.writeFileSync(guard, `
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import { syncBuiltinESMExports } from 'node:module';
const root = process.env.ROOT, scripts = ${JSON.stringify(path.join(repo, 'scripts'))};
const inside = (base, file) => file === base || file.startsWith(base + path.sep);
let forbidden = 0;
const deny = () => { forbidden++; throw new Error('FIXTURE_FORBIDDEN_IO'); };
process.once('exit', () => { if (forbidden) process.stderr.write('FIXTURE_FORBIDDEN_IO attempts=' + forbidden); });
globalThis.fetch = deny;
for (const key of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) cp[key] = deny;
net.Socket.prototype.connect = deny;
for (const obj of [http, https]) for (const key of ['get', 'request']) obj[key] = deny;
const check = (file, write) => {
  if (write && process.env.FIXTURE_READ_ONLY === '1') deny();
  if (typeof file === 'number') return;
  const value = path.resolve(file instanceof URL ? fileURLToPath(file) : String(file));
  const allowed = (p) => inside(root, p) || (!write && inside(scripts, p) && p.endsWith('.mjs'));
  if (!allowed(value) || (fs.existsSync(value) && !allowed(fs.realpathSync(value)))) deny();
  if (!write && (process.env.FIXTURE_FORBID_READ === value || (fs.existsSync(value) && process.env.FIXTURE_FORBID_READ === fs.realpathSync(value)))) deny();
};
import { fileURLToPath } from 'node:url';
for (const key of ['readFileSync', 'readdirSync', 'statSync', 'lstatSync']) {
  const old = fs[key]; fs[key] = (file, ...args) => { if (key === 'readFileSync') check(file, false); return old(file, ...args); };
}
for (const key of ['writeSync', 'writevSync', 'writeFileSync', 'appendFileSync', 'mkdirSync', 'rmSync', 'unlinkSync', 'chmodSync', 'chownSync', 'fchmodSync', 'fsyncSync', 'fdatasyncSync', 'truncateSync', 'ftruncateSync', 'rmdirSync', 'copyFileSync', 'linkSync', 'symlinkSync']) {
  const old = fs[key]; fs[key] = (file, ...args) => { check(file, true); return old(file, ...args); };
}
const open = fs.openSync;
fs.openSync = (file, flags, ...args) => { check(file, flags !== 'r'); return open(file, flags, ...args); };
const rename = fs.renameSync;
fs.renameSync = (from, to) => { check(from, true); check(to, true); return rename(from, to); };
syncBuiltinESMExports();
`);

function fixture() {
  fs.rmSync(root, { recursive: true, force: true });
  const id = 'DRAFT_Exact_UPPER';
  const rawJson = path.join(root, 'downloads/knowledge_inbox/day/lower-name.json');
  const rawMarkdown = rawJson.replace(/\.json$/, '.md');
  const promotedJson = path.join(root, 'docs/reference/knowledge_inbox/promoted/OWAOntology/lower-name.json');
  const promotedMarkdown = promotedJson.replace(/\.json$/, '.md');
  const registry = path.join(root, 'docs/reference/knowledge_inbox/registry.json');
  for (const file of [rawJson, promotedJson]) fs.mkdirSync(path.dirname(file), { recursive: true });
  const relative = (file) => path.relative(root, file);
  const raw = { id, kbNamespace: 'OWAOntology', title: 'CLI fixture', metadata: { verification: 'partial' } };
  const before = { ...raw, content: '', status: 'promoted', sourceDraftPath: relative(rawJson), promotedAt: '2020-01-01T00:00:00Z', promotedBy: 'old', reviewNote: 'old note', extra: ['keep'] };
  const prefix = '# Original title\n- Original metadata\n\n## Content\n\n';
  fs.writeFileSync(rawJson, JSON.stringify(raw)); fs.writeFileSync(rawMarkdown, body);
  fs.writeFileSync(promotedJson, JSON.stringify(before)); fs.writeFileSync(promotedMarkdown, prefix);
  const record = { id };
  for (const [key, file] of Object.entries({ rawJson, rawMarkdown, promotedJson, promotedMarkdown })) {
    record[`${key}Path`] = relative(file); record[`${key}Sha256`] = hash(fs.readFileSync(file));
  }
  const entry = { draftId: id, kbNamespace: 'OWAOntology', status: 'promoted', rawJsonPath: record.rawJsonPath, promotedJsonPath: record.promotedJsonPath, promotedMarkdownPath: record.promotedMarkdownPath, oldReview: { at: 'old' } };
  fs.writeFileSync(registry, JSON.stringify({ generatedAt: 'old', entries: [entry] }));
  const manifest = { schemaVersion: 1, namespace: 'OWAOntology', registrySha256: hash(fs.readFileSync(registry)), records: [record] };
  const manifestPath = path.join(root, 'manifest.json');
  const backupDir = path.join(root, 'recovery-backups');
  const options = { manifest, operationId: 'cli-fixture', backupDir, actor: 'fixture-operator', note: 'snapshot only' };
  const f = { id, rawJson, rawMarkdown, promotedJson, promotedMarkdown, registry, record, entry, before, prefix, manifest, manifestPath, backupDir, options };
  f.saveManifest = () => fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  f.saveManifest();
  f.args = ['recover-owa-content', id, '--manifest', manifestPath, '--backup-dir', backupDir, '--operation-id', options.operationId, '--by', options.actor, '--note', options.note];
  return f;
}
function tree(directory = root) {
  const result = {};
  if (!fs.existsSync(directory)) return result;
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) Object.assign(result, tree(file));
    else result[file] = item.isSymbolicLink() ? `link:${fs.readlinkSync(file)}` : hash(fs.readFileSync(file));
  }
  return result;
}
function events() {
  const dir = path.join(root, 'data/dashboard/audit');
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => name.endsWith('.jsonl')).flatMap((name) => fs.readFileSync(path.join(dir, name), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)) : [];
}
function invoke(args, extraEnv = {}) {
  children++;
  const result = childProcess.spawnSync(process.execPath, ['--import', guard, cli, ...args], {
    cwd: root, encoding: 'utf8', timeout: 15000,
    env: { PATH: path.dirname(process.execPath), HOME: root, ROOT: root, OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '', ...extraEnv },
  });
  assert.equal(result.error, undefined);
  assert(!`${result.stdout}${result.stderr}`.includes('FIXTURE_FORBIDDEN_IO'), 'child attempted forbidden I/O');
  assert(!`${result.stdout}${result.stderr}`.includes('CLI_PRIVATE_BODY_SENTINEL'), 'source body leaked');
  assert(`${result.stdout}${result.stderr}`.length < 12000, 'unbounded CLI output');
  return result;
}
function success(result, status) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const value = JSON.parse(result.stdout);
  assert.equal(value.ok, true); assert.equal(value.action, 'recover_owa_content'); assert.equal(value.status, status);
  return value;
}
async function run(name, fn) {
  if (process.env.OWA_CLI_CASE_FILTER && !name.includes(process.env.OWA_CLI_CASE_FILTER)) return;
  await fn(fixture()); passed++; console.log(`PASS ${name}`);
}
async function readOnly(action) {
  const undo = [];
  let forbidden = 0;
  const patch = (obj, key, fn) => { const old = obj[key]; obj[key] = fn; undo.push(() => { obj[key] = old; }); };
  const deny = () => { forbidden++; throw new Error('LIBRARY_DRY_RUN_ATTEMPTED_MUTATION_OR_NETWORK'); };
  for (const key of ['writeSync', 'writevSync', 'writeFileSync', 'appendFileSync', 'mkdirSync', 'renameSync', 'unlinkSync', 'rmSync', 'chmodSync', 'chownSync', 'fchmodSync', 'fsyncSync', 'fdatasyncSync', 'truncateSync', 'ftruncateSync', 'rmdirSync', 'copyFileSync', 'linkSync', 'symlinkSync']) patch(fs, key, deny);
  const open = fs.openSync;
  patch(fs, 'openSync', (file, flags, ...args) => { if (flags !== 'r') deny(); return open(file, flags, ...args); });
  patch(globalThis, 'fetch', deny); patch(net.Socket.prototype, 'connect', deny);
  for (const key of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) patch(childProcess, key, deny);
  for (const obj of [http, https]) for (const key of ['get', 'request']) patch(obj, key, deny);
  syncBuiltinESMExports();
  try { return await action(); } finally {
    for (const restore of undo.reverse()) restore(); syncBuiltinESMExports();
    assert.equal(forbidden, 0, 'library attempted forbidden I/O, even if caught');
  }
}

try {
  const api = await import('./lib/promoted_knowledge.mjs');
  await run('CLI forwards checkpoint reference and reports its explicit scope', async (f) => {
    const audit = await import('./lib/dashboard_audit.mjs');
    audit.appendDashboardAudit({ id: 'expired', at: '2000-01-01T00:00:00Z' });
    audit.appendDashboardAudit({ id: 'retained' });
    const fresh = await import('./lib/dashboard_audit.mjs?cli-checkpoint'); fresh.appendDashboardAudit({ id: 'terminal' });
    fs.mkdirSync(f.backupDir, { mode: 0o700 });
    f.manifest.auditCheckpoint = api.captureOwaRecoveryAuditCheckpoint(f.backupDir); f.saveManifest();
    const initial = tree();
    const planned = success(invoke([...f.args, '--dry-run'], { FIXTURE_READ_ONLY: '1' }), 'planned');
    assert(planned.auditCheckpoint, 'CLI must report checkpoint binding and scope');
    assert.equal(planned.auditCheckpoint.scope, 'checkpointed_retained_suffix');
    assert.equal(planned.auditCheckpoint.ancestryVerified, false); assert.deepEqual(tree(), initial);
    const applied = success(invoke(f.args), 'recovered'); assert.deepEqual(applied.auditCheckpoint, planned.auditCheckpoint);
    assert.equal(success(invoke(f.args), 'noop').auditCheckpoint.sha256, f.manifest.auditCheckpoint.sha256);
    delete f.manifest.auditCheckpoint; f.saveManifest(); assert.equal(invoke([...f.args, '--dry-run']).status, 1);
  });
  await run('library dry-run denies every write and plans exact content', async (f) => {
    const before = tree();
    const result = await readOnly(() => api.recoverOwaPromotedContent(f.id, { ...f.options, dryRun: true }));
    assert.equal(result.status, 'planned'); assert.equal(result.contentSha256, hash(body));
    assert.equal(result.afterHashes.markdown, hash(f.prefix + body)); assert.equal(result.wouldChange, true);
    assert.deepEqual(tree(), before); assert.equal(events().length, 0);
    assert(!fs.existsSync(f.backupDir)); assert(!fs.existsSync(path.join(root, 'data')));
  });
  await run('CLI dry-run then awaited apply then byte-idempotent noop', async (f) => {
    const initial = tree();
    const planned = success(invoke([...f.args, '--dry-run'], { FIXTURE_READ_ONLY: '1' }), 'planned');
    assert.equal(planned.contentSha256, hash(body)); assert.equal(planned.wouldChange, true);
    assert.deepEqual(tree(), initial); assert.equal(events().length, 0);
    const applied = success(invoke(f.args), 'recovered');
    const recovered = JSON.parse(fs.readFileSync(f.promotedJson));
    assert.equal(recovered.content, body); assert.equal(fs.readFileSync(f.promotedMarkdown, 'utf8'), f.prefix + body);
    for (const key of Object.keys(f.before).filter((key) => key !== 'content')) assert.deepEqual(recovered[key], f.before[key]);
    assert.equal(recovered.contentRecovery.actor, f.options.actor); assert.equal(recovered.contentRecovery.note, f.options.note);
    assert.equal(applied.afterHashes.json, hash(fs.readFileSync(f.promotedJson)));
    for (const file of [f.registry, f.rawJson, f.rawMarkdown]) assert.equal(tree()[file], initial[file]);
    assert.equal(events().length, 1);
    const after = tree();
    const preview = success(invoke([...f.args, '--dry-run'], { FIXTURE_READ_ONLY: '1' }), 'planned');
    assert.equal(preview.wouldChange, false); assert.deepEqual(tree(), after);
    const noop = success(invoke(f.args), 'noop'); assert.deepEqual(noop.afterHashes, applied.afterHashes);
    assert.deepEqual(tree(), after); assert.equal(events().length, 1);
  });
  const cases = [
    ['missing exact ID', (f) => { f.args.splice(1, 1); }],
    ['unknown exact ID', (f) => { f.args[1] += '-unknown'; }],
    ['case-sensitive ID', (f) => { f.args[1] = f.id.toLowerCase(); }],
    ['extra ID', (f) => { f.args.push('another-id'); }],
    ['force refused', (f) => { f.args.push('--force'); }],
    ['unknown flag', (f) => { f.args.push('--build'); }],
    ['dry-run value refused', (f) => { f.args.push('--dry-run', 'false'); }],
    ['duplicate flag', (f) => { f.args.push('--operation-id', 'other'); }],
    ['wrong manifest namespace', (f) => { f.manifest.namespace = 'ComarchOptimaSchema'; }],
    ['wrong manifest ID', (f) => { f.record.id = 'other'; }],
    ['wrong manifest hash', (f) => { f.record.rawMarkdownSha256 = '0'.repeat(64); }],
    ['wrong manifest shape', (f) => { f.manifest.schemaVersion = 2; }],
    ['duplicate manifest IDs', (f) => { f.manifest.records.push({ ...f.record }); }],
    ['operation traversal', (f) => { f.args[f.args.indexOf('--operation-id') + 1] = '../operation'; }],
    ['backup overlap', (f) => { f.args[f.args.indexOf('--backup-dir') + 1] = path.dirname(f.promotedJson); }],
    ['raw drift', (f) => { fs.appendFileSync(f.rawMarkdown, 'changed'); }],
    ['target drift', (f) => { fs.appendFileSync(f.promotedMarkdown, 'changed'); }],
    ['registry status', (f) => { f.entry.status = 'withdrawn'; fs.writeFileSync(f.registry, JSON.stringify({ entries: [f.entry] })); f.manifest.registrySha256 = hash(fs.readFileSync(f.registry)); }],
    ['registry namespace', (f) => { f.entry.kbNamespace = 'ComarchOptimaSchema'; fs.writeFileSync(f.registry, JSON.stringify({ entries: [f.entry] })); f.manifest.registrySha256 = hash(fs.readFileSync(f.registry)); }],
    ['manifest traversal', (f) => { f.record.rawMarkdownPath = '../sentinel.md'; }],
    ['backup outside ROOT', (f) => { f.args[f.args.indexOf('--backup-dir') + 1] = sandbox; }],
  ];
  for (const flag of ['--manifest', '--backup-dir', '--operation-id', '--by', '--note']) {
    cases.push([`missing ${flag}`, (f) => { f.args.splice(f.args.indexOf(flag), 2); }]);
    cases.push([`valueless ${flag}`, (f) => { f.args.splice(f.args.indexOf(flag) + 1, 1); }]);
  }
  for (const [name, mutate] of cases) await run(`CLI refuses ${name} without modification`, async (f) => {
    mutate(f); f.saveManifest(); const before = tree();
    for (const suffix of [[], ['--dry-run']]) {
      const result = invoke([...f.args, ...suffix]); assert.notEqual(result.status, 0); assert.equal(result.stdout, '');
      assert.deepEqual(tree(), before); assert.equal(events().length, 0);
    }
  });
  await run('CLI rejects outside manifest before reading sentinel', async (f) => {
    const sentinel = path.join(sandbox, 'manifest-sentinel.json'); fs.writeFileSync(sentinel, body);
    f.args[f.args.indexOf('--manifest') + 1] = sentinel;
    assert.notEqual(invoke(f.args, { FIXTURE_FORBID_READ: sentinel }).status, 0);
  });
  await run('CLI rejects symlink manifest before reading sentinel', async (f) => {
    const sentinel = path.join(root, 'manifest-sentinel.json'); fs.writeFileSync(sentinel, body);
    fs.unlinkSync(f.manifestPath); fs.symlinkSync(sentinel, f.manifestPath);
    assert.notEqual(invoke(f.args, { FIXTURE_FORBID_READ: sentinel }).status, 0);
  });
  await run('CLI malformed JSON never prints source body', async (f) => {
    fs.writeFileSync(f.manifestPath, body); const before = tree();
    assert.notEqual(invoke(f.args).status, 0); assert.deepEqual(tree(), before);
  });
  await run('CLI rejects missing flags before reading manifest', async (f) => {
    f.args.splice(f.args.indexOf('--by'), 2);
    assert.notEqual(invoke(f.args, { FIXTURE_FORBID_READ: f.manifestPath }).status, 0);
  });
  for (const key of ['rawJson', 'rawMarkdown', 'promotedJson', 'promotedMarkdown']) {
    await run(`CLI refuses ${key} symlink before sentinel read`, async (f) => {
      const sentinel = path.join(root, 'sentinel'); fs.writeFileSync(sentinel, body);
      fs.unlinkSync(f[key]); fs.symlinkSync(sentinel, f[key]); const before = tree();
      for (const suffix of [[], ['--dry-run']]) assert.notEqual(invoke([...f.args, ...suffix], { FIXTURE_FORBID_READ: sentinel }).status, 0);
      assert.deepEqual(tree(), before);
    });
  }
  for (const [name, mutate] of [
    ['raw namespace', (f) => { const value = JSON.parse(fs.readFileSync(f.rawJson)); value.kbNamespace = 'ComarchOptimaSchema'; fs.writeFileSync(f.rawJson, JSON.stringify(value)); f.record.rawJsonSha256 = hash(fs.readFileSync(f.rawJson)); }],
    ['target namespace', (f) => { f.before.kbNamespace = 'ComarchOptimaSchema'; fs.writeFileSync(f.promotedJson, JSON.stringify(f.before)); f.record.promotedJsonSha256 = hash(fs.readFileSync(f.promotedJson)); }],
    ['target status', (f) => { f.before.status = 'withdrawn'; fs.writeFileSync(f.promotedJson, JSON.stringify(f.before)); f.record.promotedJsonSha256 = hash(fs.readFileSync(f.promotedJson)); }],
  ]) await run(`CLI refuses ${name} with fresh manifest hashes`, async (f) => {
    mutate(f); f.saveManifest(); const before = tree();
    for (const suffix of [[], ['--dry-run']]) assert.notEqual(invoke([...f.args, ...suffix]).status, 0);
    assert.deepEqual(tree(), before); assert.equal(events().length, 0);
  });
  await run('CLI preview detects drift after successful preview before apply', async (f) => {
    success(invoke([...f.args, '--dry-run'], { FIXTURE_READ_ONLY: '1' }), 'planned');
    fs.appendFileSync(f.rawMarkdown, 'drift'); const before = tree();
    assert.notEqual(invoke(f.args).status, 0); assert.deepEqual(tree(), before); assert.equal(events().length, 0);
  });
  await run('library preview reconciles committed state read-only and rejects tampered journal', async (f) => {
    const applied = success(invoke(f.args), 'recovered'); const before = tree();
    const result = await readOnly(() => api.recoverOwaPromotedContent(f.id, { ...f.options, dryRun: true }));
    assert.equal(result.status, 'planned'); assert.equal(result.wouldChange, false); assert.deepEqual(result.afterHashes, applied.afterHashes);
    assert.deepEqual(tree(), before); assert.equal(events().length, 1);
    const file = path.join(f.backupDir, f.options.operationId, hash(f.id), 'journal.json');
    const j = JSON.parse(fs.readFileSync(file)); j.binding = 'foreign'; fs.writeFileSync(file, JSON.stringify(j));
    const tampered = tree();
    await readOnly(() => assert.rejects(() => api.recoverOwaPromotedContent(f.id, { ...f.options, dryRun: true }), { code: 'RECOVERY_STATE_UNCERTAIN' }));
    assert.deepEqual(tree(), tampered);
  });
  await run('library preview refuses fresh drift rather than stale planned success', async (f) => {
    await readOnly(() => api.recoverOwaPromotedContent(f.id, { ...f.options, dryRun: true }));
    fs.appendFileSync(f.promotedMarkdown, 'drift'); const before = tree();
    await readOnly(() => assert.rejects(() => api.recoverOwaPromotedContent(f.id, { ...f.options, dryRun: true })));
    assert.deepEqual(tree(), before);
  });
  console.log(`OWA recovery CLI: ${passed} PASS; CLI subprocesses=${children}`);
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
}
