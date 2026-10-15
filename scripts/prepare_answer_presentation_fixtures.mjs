// Portable, read-only frozen-input preparation; no production defaults or runtime edits.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

export const WORKTREE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export const FOUR = ['scripts/lib/knowledge_retrieval.mjs', 'scripts/erp_knowledge_answer.mjs',
  'scripts/erp_knowledge_assistant.mjs', 'scripts/lib/erp_knowledge_mcp_core.mjs'];
export function regular(base, relative) {
  assert(!path.isAbsolute(relative) && !relative.split('/').some(p => p === '..' || p === '.'));
  assert(!/(^|\/)(data|\.env(?:\..*)?|cookies?|secrets?)(\/|$)/i.test(relative));
  let file = fs.realpathSync(base);
  for (const part of relative.split('/')) {
    file = path.join(file, part);
    assert(!fs.lstatSync(file).isSymbolicLink(), `Symlink input rejected: ${relative}`);
  }
  assert(fs.statSync(file).isFile(), `Not a regular file: ${relative}`);
  return file;
}
export function save(root, relative, value) {
  assert(!path.isAbsolute(relative) && !relative.split('/').includes('..'));
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  fs.writeFileSync(target, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
export function prepareFixtures(args = process.argv.slice(2)) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    assert(['--bundle', '--source-root', '--output-parent'].includes(args[i]) && args[i + 1], 'Usage: --bundle FROZEN_BUNDLE [--source-root READ_ONLY_ROOT] [--output-parent EXISTING_DIR]');
    assert(!options[args[i]], `Duplicate option: ${args[i]}`);
    options[args[i]] = fs.realpathSync(args[i + 1]);
  }
  assert(options['--bundle'], 'An explicit frozen --bundle is required; there is no production fallback');
  const bundle = options['--bundle'];
  const sealBytes = fs.readFileSync(regular(bundle, '.completion-seal.json'));
  const seal = JSON.parse(sealBytes);
  const reviewed = fs.readFileSync(regular(bundle, 'task4review-report.md'), 'utf8');
  assert(reviewed.includes('**SpecAPPROVED**') && reviewed.includes('**QualityAPPROVED**'), 'Private review must approve before reconciliation');
  const observed = [];
  function observe(base, relative, expected) {
    const file = regular(base, relative), bytes = fs.readFileSync(file);
    assert.equal(sha256(bytes), expected, `Input drift: ${relative}`);
    observed.push({ base, relative, sha256: expected });
    return bytes;
  }
  for (const a of seal.artifacts) observe(bundle, a.path, a.sha256);
  const executorInputs = ['scripts/test_answer_presentation_16q.mjs', 'scripts/prepare_answer_presentation_fixtures.mjs'].map(relative => {
    const bytes = fs.readFileSync(regular(WORKTREE, relative));
    const sha = sha256(bytes);
    observe(WORKTREE, relative, sha);
    return { relative, sha256: sha, bytes: bytes.length };
  });
  observed.push({ base: bundle, relative: '.completion-seal.json', sha256: sha256(sealBytes) },
    { base: bundle, relative: 'task4review-report.md', sha256: sha256(reviewed) });
  const prior = JSON.parse(fs.readFileSync(regular(bundle, 'snapshot-manifest.json')));
  assert.equal(prior.files.filter(r => r.kind === 'artifact').length, 24);
  assert.equal(prior.files.filter(r => r.kind === 'promoted-metadata').length, 121);
  const parent = options['--output-parent'] || os.tmpdir();
  assert(fs.statSync(parent).isDirectory());
  assert(parent !== bundle && !parent.startsWith(bundle + path.sep), 'Never write inside the immutable bundle');
  const output = fs.mkdtempSync(path.join(parent, 'answer-presentation-16q-'));
  fs.chmodSync(output, 0o700);
  const files = [];
  for (const row of prior.files) {
    const runtime = ['code', 'reviewed-test'].includes(row.kind);
    const corpus = ['artifact', 'promoted-metadata', 'routing'].includes(row.kind);
    const sourceRoot = corpus && options['--source-root'];
    const base = runtime ? WORKTREE : sourceRoot || bundle;
    const relative = runtime || sourceRoot ? row.relative : row.fixture;
    // The source-root option changes only the listed corpus/authority read origin,
    // not the frozen hashes, probes, criteria or current reviewed runtime.
    const expected = runtime ? sha256(fs.readFileSync(regular(base, relative))) : row.sha256;
    const bytes = observe(base, relative, expected);
    save(output, row.fixture, bytes);
    assert.equal(sha256(fs.readFileSync(regular(output, row.fixture))), expected);
    files.push({ ...row, sha256: expected, base, inputRelative: relative });
  }
  for (const name of ['frozen-criteria.json', 'semantic-review.json']) {
    const entry = seal.artifacts.find(a => a.path === name);
    assert(entry, `Unsealed scoring input: ${name}`);
    save(output, name, observe(bundle, name, entry.sha256));
  }
  const manifest = { ...prior, files, sourceWorktree: WORKTREE, frozenBundle: bundle,
    completionSealSha256: sha256(sealBytes), sourceRoot: options['--source-root'] || null,
    output, executorInputs, nodeVersion: process.version, createdAt: new Date().toISOString(), scoring: 'provisional automated; authoritative human-reviewed evidence remains separate' };
  save(output, 'snapshot-manifest.json', manifest);
  const checkSourceHashes = () => {
    for (const row of observed) assert.equal(sha256(fs.readFileSync(regular(row.base, row.relative))), row.sha256, `Concurrent input drift: ${row.relative}`);
    for (const row of files) assert.equal(sha256(fs.readFileSync(regular(output, row.fixture))), row.sha256, `Private fixture drift: ${row.fixture}`);
    for (const name of FOUR) assert.equal(sha256(fs.readFileSync(regular(WORKTREE, name))),
      files.find(row => row.kind === 'code' && row.relative === name).sha256, `Current runtime snapshot drift: ${name}`);
  };
  checkSourceHashes();
  return { output, manifest, checkSourceHashes };
}
