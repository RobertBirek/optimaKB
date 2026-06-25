#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { loadPromotedKnowledge, splitDraftContent } from './lib/promoted_knowledge.mjs';
import { taxbellConfigsFor } from './lib/taxbell_reference_config.mjs';
import { ensureDir, writeCsv, slug, makeId } from './lib/export_utils.mjs';
import { loadJsonIfExists } from './lib/build_runner_core.mjs';

const ROOT = process.env.ROOT || '/docker/openspg';
const CHUNK_SIZE = Number(process.env.TAXBELL_CHUNK_SIZE || 1800);

function valueFor(args, name, fallback = '') {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function truncate(value, limit = 1200) {
  const text = normalizeWhitespace(value);
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 3)}...`;
}

function topicArea(config, text) {
  const lower = normalizeWhitespace(text).toLowerCase();
  for (const keyword of config.routeKeywords || []) {
    if (lower.includes(String(keyword).toLowerCase())) return keyword;
  }
  return config.category;
}

function riskLevel(sourceTier) {
  if (sourceTier === 'official_law') return 'high_legal_authority';
  if (sourceTier === 'official_authority') return 'official_guidance';
  if (sourceTier === 'professional_commentary') return 'commentary_review_required';
  return 'low_trust_review_required';
}

function chunksFor(content) {
  return splitDraftContent(content, CHUNK_SIZE).filter((item) => item.length > 80);
}

function loadRegistryEntries(config) {
  const registryPath = path.join(ROOT, config.sourceRoot, 'meta/source_registry.json');
  const registry = loadJsonIfExists(registryPath, { entries: [] });
  return (registry.entries || []).flatMap((entry) => {
    const snapshotPath = path.join(ROOT, entry.localSnapshotPath || '');
    const snapshot = loadJsonIfExists(snapshotPath, null);
    if (!snapshot?.content) return [];
    return [{ ...entry, content: snapshot.content }];
  });
}

function entryGuides(config, documentRows) {
  return [
    {
      id: makeId('TBGUIDE', `${config.namespace} ekspert`),
      name: `${config.kbName} - tryb ekspercki`,
      semanticType: 'taxbell_entry_guide',
      guideGroup: 'expert',
      priorityRank: '1',
      userIntent: `Pytania zespołu Taxbell dotyczące domeny: ${config.kbName}`,
      primaryDocumentRefId: documentRows[0]?.id || '',
      targetKbName: config.kbName,
      targetNamespace: config.namespace,
      nextStep: 'Podawaj źródło, tier źródła i ostrzeżenie, jeśli odpowiedź opiera się na komentarzu zamiast źródle urzędowym.',
      caution: 'Nie przedstawiaj komentarzy branżowych jako podstawy prawnej.',
      summary: `Użyj ${config.kbName} do odpowiedzi eksperckich z cytowaniem źródeł i rozróżnieniem przepisu, objaśnień urzędowych oraz komentarza.`,
    },
    {
      id: makeId('TBGUIDE', `${config.namespace} klient`),
      name: `${config.kbName} - tryb klienta`,
      semanticType: 'taxbell_entry_guide',
      guideGroup: 'client',
      priorityRank: '2',
      userIntent: `Proste wyjaśnienie dla klienta biura Taxbell w domenie: ${config.kbName}`,
      primaryDocumentRefId: documentRows[0]?.id || '',
      targetKbName: config.kbName,
      targetNamespace: config.namespace,
      nextStep: 'Odpowiadaj prosto, ale dodaj informację, że szczegóły wymagają weryfikacji indywidualnej sytuacji klienta.',
      caution: 'Nie udzielaj definitywnej porady prawnej bez kontekstu sprawy.',
      summary: `Użyj ${config.kbName} do klient-facing odpowiedzi z prostym językiem i ostrożnym zakresem.`,
    },
  ];
}

function exportConfig(config) {
  const exportDir = path.join(ROOT, config.exportDir);
  ensureDir(exportDir);
  const registryEntries = loadRegistryEntries(config);
  const promoted = loadPromotedKnowledge(config.namespace);
  const referenceRows = [];
  const chunkRows = [];
  const topicCounts = new Map();
  const referenceIdBySourceUrl = new Map();

  for (const entry of registryEntries) {
    const id = makeId('TBDOC', entry.url);
    const area = topicArea(config, `${entry.title} ${entry.summary} ${entry.content}`);
    topicCounts.set(area, (topicCounts.get(area) || 0) + 1);
    referenceRows.push({
      id,
      name: entry.title || entry.url,
      description: truncate(entry.summary || entry.content, 600),
      semanticType: 'taxbell_external_reference',
      sourceUrl: entry.url,
      sourceDomain: entry.domain,
      sourceTier: entry.sourceTier,
      documentCategory: entry.sourceTier === 'professional_commentary' ? 'professional_commentary' : 'reference',
      topicArea: area,
      audienceMode: 'expert_and_client',
      riskLevel: riskLevel(entry.sourceTier),
      publishedAt: entry.publishedAt || '',
      lastModified: entry.lastModified || '',
      retrievedAt: entry.retrievedAt || '',
      localSnapshotPath: entry.localSnapshotPath,
      contentHash: entry.contentHash,
      summary: truncate(entry.summary || entry.content, 1400),
    });
    referenceIdBySourceUrl.set(entry.url, id);
    chunksFor(entry.content).forEach((content, index) => {
      chunkRows.push({
        id: makeId('TBCHUNK', `${id}_${index + 1}`),
        name: `${entry.title || entry.url} #${index + 1}`,
        description: truncate(content, 240),
        semanticType: 'taxbell_external_chunk',
        sourceDocumentRefId: id,
        sourceUrl: entry.url,
        sourcePath: entry.localSnapshotPath,
        sectionHeading: entry.title || '',
        sectionOrder: String(index + 1),
        content,
      });
    });
  }

  for (const draft of promoted) {
    const existingReferenceId = draft.sourceUrl
      ? referenceIdBySourceUrl.get(draft.sourceUrl)
      : '';
    const id = existingReferenceId || makeId('TBDOC_PROMOTED', draft.id);
    const area = topicArea(config, `${draft.title} ${draft.content}`);
    if (!existingReferenceId) {
      topicCounts.set(area, (topicCounts.get(area) || 0) + 1);
      referenceRows.push({
        id,
        name: draft.title,
        description: truncate(draft.content, 600),
        semanticType: 'taxbell_promoted_draft',
        sourceUrl: draft.sourceUrl || '',
        sourceDomain: draft.sourceUrl ? new URL(draft.sourceUrl).hostname.toLowerCase() : '',
        sourceTier: draft.metadata?.sourceTier || 'operator_draft',
        documentCategory: 'operator_draft',
        topicArea: area,
        audienceMode: 'expert_and_client',
        riskLevel: 'operator_reviewed',
        publishedAt: '',
        lastModified: '',
        retrievedAt: draft.promotedAt || draft.createdAt || '',
        localSnapshotPath: draft.promotedMarkdownPath || draft.sourceDraftPath || '',
        contentHash: '',
        summary: truncate(draft.content, 1400),
      });
    }
    chunksFor(draft.content).forEach((content, index) => {
      chunkRows.push({
        id: makeId('TBCHUNK_PROMOTED', `${draft.id}_${index + 1}`),
        name: `${draft.title} #${index + 1}`,
        description: truncate(content, 240),
        semanticType: 'taxbell_promoted_chunk',
        sourceDocumentRefId: id,
        sourceUrl: draft.sourceUrl || '',
        sourcePath: draft.promotedMarkdownPath || draft.sourceDraftPath || '',
        sectionHeading: draft.title,
        sectionOrder: String(index + 1),
        content,
      });
    });
  }

  const topicRows = [...topicCounts.entries()].map(([name, count]) => ({
    id: makeId('TBTOPIC', `${config.namespace}_${name}`),
    name,
    description: `Taxbell topic ${name}`,
    semanticType: 'taxbell_topic',
    topicSlug: slug(name).toLowerCase(),
    topicGroup: config.category,
    sourceTier: 'mixed',
    usageCount: String(count),
    summary: `Temat ${name} w ${config.kbName}. Liczba dokumentów: ${count}.`,
  }));

  const routeRows = [{
    id: makeId('TBROUTE', config.namespace),
    name: `${config.kbName} route`,
    description: `Route questions to ${config.kbName}`,
    semanticType: 'taxbell_route',
    routeType: 'primary_domain',
    targetKbName: config.kbName,
    targetNamespace: config.namespace,
    recommendedWhen: (config.routeKeywords || []).join(', '),
    anchorObjects: topicRows.map((row) => row.id).join(';'),
    summary: `Route to ${config.kbName} when the question contains: ${(config.routeKeywords || []).join(', ')}.`,
  }];

  const files = [
    writeCsv(exportDir, 'reference_document.csv', ['id', 'name', 'description', 'semanticType', 'sourceUrl', 'sourceDomain', 'sourceTier', 'documentCategory', 'topicArea', 'audienceMode', 'riskLevel', 'publishedAt', 'lastModified', 'retrievedAt', 'localSnapshotPath', 'contentHash', 'summary'], referenceRows),
    writeCsv(exportDir, 'source_topic.csv', ['id', 'name', 'description', 'semanticType', 'topicSlug', 'topicGroup', 'sourceTier', 'usageCount', 'summary'], topicRows),
    writeCsv(exportDir, 'knowledge_route.csv', ['id', 'name', 'description', 'semanticType', 'routeType', 'targetKbName', 'targetNamespace', 'recommendedWhen', 'anchorObjects', 'summary'], routeRows),
    writeCsv(exportDir, 'entry_guide.csv', ['id', 'name', 'description', 'semanticType', 'guideGroup', 'priorityRank', 'userIntent', 'primaryDocumentRefId', 'targetKbName', 'targetNamespace', 'nextStep', 'caution', 'summary'], entryGuides(config, referenceRows)),
    writeCsv(exportDir, 'chunk.csv', ['id', 'name', 'description', 'semanticType', 'sourceDocumentRefId', 'sourceUrl', 'sourcePath', 'sectionHeading', 'sectionOrder', 'content'], chunkRows),
  ];
  const manifest = {
    generatedAt: new Date().toISOString(),
    namespace: config.namespace,
    kbName: config.kbName,
    sourceRoot: config.sourceRoot,
    source: 'taxbell_wide_exa_ranked_plus_promoted_drafts',
    files,
  };
  fs.writeFileSync(path.join(exportDir, '_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(exportDir, 'README.md'), [
    `# ${config.kbName}`,
    '',
    `Generated at: ${manifest.generatedAt}`,
    '',
    ...files.map((file) => `- \`${file.fileName}\`: \`${file.rowCount}\``),
    '',
  ].join('\n'), 'utf8');
  return { namespace: config.namespace, exportDir: config.exportDir, files };
}

const configs = taxbellConfigsFor(process.env.TAXBELL_EXPORT_NAMESPACE || valueFor(process.argv.slice(2), '--kb', 'all'));
const results = configs.map(exportConfig);
process.stdout.write(`${JSON.stringify({ ok: true, results }, null, 2)}\n`);
