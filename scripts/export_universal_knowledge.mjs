#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import process from 'process';
import { loadPromotedKnowledge } from './lib/promoted_knowledge.mjs';
import { ensureDir, writeCsv } from './lib/export_utils.mjs';

const ROOT = process.env.ROOT || '/docker/openspg';
const KB_NAMESPACE = 'ComarchUniversalKnowledge';
const EXPORT_DIR = path.join(ROOT, `exports/universal_knowledge/v1`);

ensureDir(EXPORT_DIR);

const referenceDocuments = [];
const chunks = [];

for (const draft of loadPromotedKnowledge(KB_NAMESPACE)) {
  const docId = `UD_${draft.id.split('_').slice(0, 3).join('_')}`;
  referenceDocuments.push({
    id: docId,
    name: draft.title,
    description: `Catch-all knowledge draft: ${draft.title}`,
    semanticType: 'reference_document',
    sourceUrl: draft.sourceUrl || '',
    sourceType: 'promoted_knowledge_draft',
    documentCategory: 'universal_knowledge',
    summary: draft.title,
  });

  const content = draft.content || '';
  const sectionCount = Math.max(1, Math.ceil(content.length / 3800));
  for (let i = 0; i < sectionCount; i++) {
    const chunkContent = content.slice(i * 3800, (i + 1) * 3800);
    chunks.push({
      id: `${docId}_CHUNK_${i + 1}`,
      name: sectionCount > 1 ? `${draft.title} [${i + 1}/${sectionCount}]` : draft.title,
      description: `Chunk from universal knowledge draft ${draft.title}.`,
      semanticType: 'chunk',
      sourceDocumentRefId: docId,
      sourceUrl: draft.sourceUrl || '',
      sourcePath: draft.promotedMarkdownPath || '',
      sectionHeading: sectionCount > 1 ? `Part ${i + 1}/${sectionCount}` : '',
      sectionOrder: i + 1,
      content: chunkContent,
    });
  }
}

writeCsv(EXPORT_DIR, 'reference_document.csv', [
  'id', 'name', 'description', 'semanticType', 'sourceUrl',
  'sourceType', 'documentCategory', 'summary',
], referenceDocuments);

writeCsv(EXPORT_DIR, 'chunk.csv', [
  'id', 'name', 'description', 'semanticType', 'sourceDocumentRefId',
  'sourceUrl', 'sourcePath', 'sectionHeading', 'sectionOrder', 'content',
], chunks);

const manifest = {
  generatedAt: new Date().toISOString(),
  namespace: KB_NAMESPACE,
  files: [
    { fileName: 'reference_document.csv', rowCount: referenceDocuments.length },
    { fileName: 'chunk.csv', rowCount: chunks.length },
  ],
};
fs.writeFileSync(path.join(EXPORT_DIR, '_manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

console.log(JSON.stringify({ ok: true, namespace: KB_NAMESPACE, exportDir: EXPORT_DIR, files: manifest.files }));
