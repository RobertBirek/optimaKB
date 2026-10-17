#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATIC_FILES, MODULE_FILES, readStatic, sha256 } from './lib/owa_offline_harness.mjs';
import { SEMANTIC_FILES, validateSemanticBundle, semanticCases, privateParent, parseArguments, HOLDOUT20 } from './lib/semantic_regression_harness.mjs';

export function prepareSemanticFixtures({ corpusRoot, codeRoot, outputParent, staticRoot = corpusRoot }) {
  for (const root of [corpusRoot, codeRoot, staticRoot]) if (!root || !path.isAbsolute(root) || path.resolve(root) !== root) throw Error('Explicit absolute roots required');
  privateParent(outputParent);
  // Read only this fixed inventory, never walk production or inspect ambient config.
  const staged = SEMANTIC_FILES.map(relative => {
    const root = MODULE_FILES.includes(relative) ? codeRoot : STATIC_FILES.includes(relative) ? staticRoot : corpusRoot;
    return { relative, bytes: readStatic(root, relative), sourcePath: path.join(root, relative) };
  });
  semanticCases(staged.find(f => f.relative === STATIC_FILES[0]).bytes, staged.find(f => f.relative === HOLDOUT20).bytes);
  process.umask(0o077);
  const root = fs.mkdtempSync(path.join(outputParent, 'semantic32-frozen-'));
  const manifest = { schemaVersion: 1, kind: 'semantic-regression-32q', files: [] };
  for (const f of staged) {
    const target = path.join(root, f.relative);
    fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
    fs.writeFileSync(target, f.bytes, { flag: 'wx', mode: 0o400 });
    manifest.files.push({ path: f.relative, sourcePath: f.sourcePath, bytes: f.bytes.length, sha256: sha256(f.bytes) });
  }
  fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx', mode: 0o400 });
  return { bundle: root, manifestHash: validateSemanticBundle(root).manifestHash };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const a = parseArguments(process.argv.slice(2), ['--corpus-root', '--code-root', '--output-parent'], ['--static-root']);
    console.log(JSON.stringify(prepareSemanticFixtures({ corpusRoot: a['--corpus-root'], codeRoot: a['--code-root'], outputParent: a['--output-parent'], staticRoot: a['--static-root'] }), null, 2));
  } catch (e) { console.error(e.stack); process.exitCode = 1; }
}
