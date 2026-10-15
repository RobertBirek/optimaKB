#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASELINE, BASELINE_SHA256, STATIC_FILES, MODULE_FILES, readStatic, sha256, validateBundle } from './lib/owa_offline_harness.mjs';

// Explicit static allowlist above is the only production read surface.
export function prepareFixtures({ corpusRoot, codeRoot, outputParent }) {
  for (const value of [corpusRoot, codeRoot, outputParent]) if (!value || !path.isAbsolute(value)) throw new Error('Explicit absolute roots required');
  if (!(outputParent === '/tmp/opencode' || outputParent.startsWith('/tmp/opencode/'))
      || fs.realpathSync(outputParent) !== outputParent) throw new Error('Private output parent required');
  const staged = [...STATIC_FILES, ...MODULE_FILES].map(relative => {
    const sourceRoot = MODULE_FILES.includes(relative) ? codeRoot : corpusRoot;
    const bytes = readStatic(sourceRoot, relative);
    if (relative === BASELINE && sha256(bytes) !== BASELINE_SHA256) throw new Error('Immutable baseline mismatch');
    return { relative, bytes, sourcePath: path.join(sourceRoot, relative) };
  });
  process.umask(0o077);
  const root = fs.mkdtempSync(path.join(outputParent, 'owa-frozen-'));
  const manifest = { schemaVersion: 1, createdAt: new Date().toISOString(), files: [] };
  for (const { relative, bytes, sourcePath } of staged) {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
    fs.writeFileSync(target, bytes, { mode: 0o400, flag: 'wx' });
    manifest.files.push({ path: relative, sourcePath, bytes: bytes.length, sha256: sha256(bytes) });
  }
  fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { mode: 0o400, flag: 'wx' });
  const checked = validateBundle(root);
  return { bundle: root, manifestHash: checked.manifestHash, questionsHash: BASELINE_SHA256, files: manifest.files.length };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2), value = name => args[args.indexOf(name) + 1];
    for (const name of ['--corpus-root', '--code-root', '--output-parent']) if (!args.includes(name)) throw new Error(`Missing ${name}`);
    console.log(JSON.stringify(prepareFixtures({ corpusRoot: value('--corpus-root'), codeRoot: value('--code-root'), outputParent: value('--output-parent') }), null, 2));
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
