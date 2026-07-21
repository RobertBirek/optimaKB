#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  assertUniqueIds,
  deduplicateIdenticalRowsById,
  nextSectionOccurrence,
  upsertManifestFile,
} from './lib/schema_export_integrity.mjs';

const files = [{ fileName: 'table.csv', rowCount: 1 }];
upsertManifestFile(files, { fileName: 'object_dependency.csv', rowCount: 10 });
upsertManifestFile(files, { fileName: 'object_dependency.csv', rowCount: 12 });
assert.deepEqual(files, [
  { fileName: 'table.csv', rowCount: 1 },
  { fileName: 'object_dependency.csv', rowCount: 12 },
]);

const occurrences = new Map();
assert.equal(nextSectionOccurrence(occurrences, 'schema.md', 'Tabela CDN.Test'), 1);
assert.equal(nextSectionOccurrence(occurrences, 'schema.md', 'Tabela CDN.Test'), 2);
assert.equal(nextSectionOccurrence(occurrences, 'other.md', 'Tabela CDN.Test'), 1);

assert.doesNotThrow(() => assertUniqueIds([{ id: 'a' }, { id: 'b' }], 'chunk.csv'));
assert.throws(
  () => assertUniqueIds([{ id: 'a' }, { id: 'a' }], 'chunk.csv'),
  /chunk\.csv contains 1 duplicate IDs: a/,
);

assert.deepEqual(
  deduplicateIdenticalRowsById([{ id: 'a', content: 'same' }, { id: 'a', content: 'same' }], 'chunk.csv'),
  [{ id: 'a', content: 'same' }],
);
assert.throws(
  () => deduplicateIdenticalRowsById([{ id: 'a', content: 'first' }, { id: 'a', content: 'second' }], 'chunk.csv'),
  /chunk\.csv contains conflicting rows for ID: a/,
);

process.stdout.write('Schema export integrity tests passed.\n');
