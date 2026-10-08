#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  buildResponse,
  classifyQuestion,
  loadRouting,
  normalizeText,
} from './erp_knowledge_assistant.mjs';
import {
  buildExternalCitationBlock,
  createExternalKnowledgeDraft,
  recordExternalFallback,
  searchExternalSources,
} from './lib/external_search.mjs';
import { shouldUseExternalFallback } from './lib/external_search_policy.mjs';
import {
  DOCUMENT_CODES, MAX_SNIPPET_LENGTH, containsTerm, findTermIndex, parseCsvRecords, selectEvidence,
} from './lib/knowledge_retrieval.mjs';
import {
  computeConfidenceScore,
  CONFIDENCE_LOW_THRESHOLD,
  recordLearningGap,
} from './lib/learning.mjs';

const ROOT = process.env.ROOT || '/docker/openspg';
const STOPWORDS = new Set([
  'a', 'aby', 'albo', 'ale', 'api', 'bez', 'co', 'czy', 'dla', 'do', 'gdzie',
  'i', 'ich', 'jak', 'jakie', 'jaki', 'jest', 'kiedy', 'ktore', 'ktory', 'lub',
  'na', 'nad', 'nie', 'od', 'oraz', 'po', 'pod', 'przy', 'sie', 'sql', 'to',
  'u', 'w', 'we', 'z', 'za', 'ze',
  'pokaz', 'ontologia', 'ontologii', 'encja', 'encji', 'mapowanie', 'mapuje',
  'mcp', 'mssql', 'owa',
]);

export function extractTerms(question) {
  const tokens = normalizeText(question)
    .split(/[^a-z0-9_]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token.length >= 3 || DOCUMENT_CODES.has(token))
    .filter((token) => !STOPWORDS.has(token));
  return [...new Set(tokens)];
}

export function extractFocusHints(question) {
  const normalizedQuestion = normalizeText(question);
  const hints = [...normalizedQuestion.matchAll(/\b(?:cdn|dbo)\.[a-z0-9_]+\b/g)].map((match) => match[0]);
  const patterns = [
    /encj[aiy]?\s+(.+?)\s+i\s+mapowan/,
    /dla\s+encj[aiy]?\s+(.+?)\s+i\s+mapowan/,
    /ontologi[ai]\s+owa\s+dla\s+encj[aiy]?\s+(.+?)\s+i\s+mapowan/,
  ];
  for (const pattern of patterns) {
    const match = normalizedQuestion.match(pattern);
    if (!match) continue;
    const value = String(match[1] || '').trim();
    if (value) hints.push(value);
  }
  return [...new Set(hints)];
}

function resolveArtifactPath(relativePath) {
  return path.isAbsolute(relativePath) ? relativePath : path.join(ROOT, relativePath);
}

function scoreLine(lineNormalized, terms, focusHints = []) {
  let score = 0;
  for (const term of terms) {
    if (containsTerm(lineNormalized, term)) {
      score += DOCUMENT_CODES.has(term) ? 8 : term.length > 6 ? 2 : 1;
      continue;
    }
    if (term.length >= 8) {
      const stem = term.slice(0, 5);
      if (stem && lineNormalized.includes(stem)) {
        score += 1;
      }
    }
  }
  for (const hint of focusHints) {
    if (!hint) continue;
    if (containsTerm(lineNormalized, hint)) {
      score += 8;
      continue;
    }
    const hintTokens = hint.split(/[^a-z0-9_]+/).filter(Boolean);
    if (hintTokens.length && hintTokens.every((token) => lineNormalized.includes(token))) {
      score += 4;
    }
  }
  return score;
}

export function scanArtifact(relativePath, terms, focusHints = [], limit = 4) {
  const filePath = resolveArtifactPath(relativePath);
  if (!fs.existsSync(filePath)) {
    return { artifact: relativePath, type: 'missing', hits: [] };
  }

  const stats = fs.statSync(filePath);
  if (stats.isDirectory()) {
    return { artifact: relativePath, type: 'directory', hits: [] };
  }

  const bytes = fs.readFileSync(filePath);
  const raw = bytes.toString('utf8');
  const contentHash = `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;
  const observedAt = new Date().toISOString();
  const isCsv = path.extname(relativePath).toLowerCase() === '.csv';
  const parsed = isCsv ? parseCsvRecords(raw) : null;
  const records = parsed ? parsed.records : raw.split('\n').map((text, index) => ({ text, line: index + 1, endLine: index + 1 }));
  const hits = [];

  for (const record of records) {
    const text = (record.cells ? record.cells.join(' | ') : record.text).replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const normalized = normalizeText(text);
    const score = scoreLine(normalized, terms, focusHints);
    if (score <= 0 || limit <= 0 || (hits.length >= limit && score <= hits.at(-1).score)) continue;
    const matchedTerms = terms.filter(term => containsTerm(normalized, term));
    const anchors = [...focusHints, ...terms.filter(term => DOCUMENT_CODES.has(term))];
    const focus = [...anchors, ...matchedTerms].find(term => containsTerm(normalized, term));
    const offset = focus ? Math.max(0, findTermIndex(normalized, focus) - 60) : 0;
    const prefix = offset ? '...' : '';
    const remainingLength = MAX_SNIPPET_LENGTH - prefix.length;
    const fragment = text.slice(offset, offset + remainingLength);
    const snippet = prefix + (text.length > offset + remainingLength ? `${fragment.slice(0, -3)}...` : fragment);
    hits.push({
      line: record.line,
      endLine: record.endLine,
      score,
      snippet,
      matchedTerms,
    });
    hits.sort((a, b) => b.score - a.score || a.line - b.line);
    if (hits.length > limit) hits.pop();
  }

  return {
    artifact: relativePath,
    type: path.extname(relativePath).slice(1) || 'text',
    hits: hits.slice(0, limit),
    contentHash,
    observedAt,
    warnings: parsed?.warnings || [],
  };
}

function encodeArtifactPath(relativePath) {
  return String(relativePath)
    .replaceAll('\\', '/')
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
}

export function gatherEvidence(response, terms, focusHints = [], allowedNamespaces = null, diagnostics = []) {
  const evidence = [];
  const groups = [
    { kb: response.primaryKb.name, artifacts: response.primaryKb.artifacts || [] },
    ...response.supportKbs.map((kb) => ({ kb: kb.name, artifacts: kb.artifacts || [] })),
  ];

  for (const group of groups) {
    if (allowedNamespaces && !allowedNamespaces.has(group.kb)) continue;
    for (const artifact of group.artifacts) {
      const result = scanArtifact(artifact, terms, focusHints, Math.max(3, focusHints.length));
      for (const code of result.warnings || []) diagnostics.push({ artifact, code });
      if (result.hits.length) {
        const locator = result.hits.map(hit => hit.endLine > hit.line ? `L${hit.line}-L${hit.endLine}` : `L${hit.line}`).join(',');
        const sourceId = `sha256:${crypto.createHash('sha256')
          .update(`${group.kb}\0${result.artifact}\0${result.contentHash}`)
          .digest('hex')}`;
        evidence.push({
          kb: group.kb,
          artifact: result.artifact,
          type: result.type,
          hits: result.hits,
          sourceId,
          uri: `knowledge://legacy/${encodeURIComponent(group.kb)}/${encodeArtifactPath(result.artifact)}`,
          locator,
          contentHash: result.contentHash,
          observedAt: result.observedAt,
          excerpt: result.hits[0].snippet,
        });
      }
    }
  }

  return evidence;
}

export function buildPragmaticAnswer(question, response, evidence, diagnostics = []) {
  const topEvidence = selectEvidence(evidence);
  const requiredTerms = [...new Set([
    ...extractTerms(question).filter(term => DOCUMENT_CODES.has(term)),
    ...extractFocusHints(question),
  ])];
  const visibleText = normalizeText(topEvidence.flatMap(item => item.hits.map(hit => hit.snippet)).join('\n'));
  const missingTerms = requiredTerms.filter(term => !containsTerm(visibleText, term));
  const insufficient = !topEvidence.length || missingTerms.length > 0 || diagnostics.length > 0;
  const answer = {
    question,
    primaryKb: response.primaryKb.name,
    supportKbs: response.supportKbs.map((kb) => kb.name),
    recommendedArtifacts: [...new Set([
      ...topEvidence.map(item => item.artifact),
      ...response.primaryKb.artifacts,
      ...response.supportKbs.flatMap((kb) => kb.artifacts || []),
    ])].slice(0, 8),
    retrieval: { backend: 'local_artifacts', graphUsed: false, confidenceMeaning: 'heuristic_retrieval_score' },
    evidenceAssessment: {
      scope: 'local_artifacts',
      status: insufficient ? 'insufficient_evidence' : 'unverified_evidence',
      missingTerms,
      reasons: [...new Set([
        ...(!topEvidence.length ? ['no_local_evidence'] : []),
        ...(missingTerms.length ? ['missing_requested_terms'] : []),
        ...diagnostics.map(item => item.code),
        'text_matches_do_not_verify_claims',
      ])],
    },
    evidence: topEvidence,
    externalEvidence: [],
    evidenceSource: topEvidence.length ? 'local' : 'none',
    freshnessNote: '',
    externalSearch: {
      used: false,
      provider: '',
      reason: '',
      query: '',
      resultCount: 0,
    },
    note: topEvidence.length
      ? 'To jest wstępna odpowiedź z lokalnych artefaktów KB.'
      : 'Routing zadziałał, ale w wybranych artefaktach startowych nie znaleziono mocnych lokalnych trafień tekstowych.',
  };
  return answer;
}

export function renderAnswerMarkdown(answer) {
  const lines = [
    `Pytanie: ${answer.question}`,
    '',
    `Główna KB: ${answer.primaryKb}`,
  ];
  if (answer.supportKbs.length) {
    lines.push(`KB pomocnicze: ${answer.supportKbs.join(', ')}`);
  }
  lines.push('');
  lines.push(answer.note);
  if (answer.retrieval) {
    const backendLabel = answer.retrieval.backend === 'external_search'
      ? 'zewnętrzne wyszukiwanie'
      : answer.retrieval.backend === 'local_artifacts_with_external_search'
        ? 'lokalne artefakty KB i zewnętrzne wyszukiwanie'
        : 'lokalne artefakty KB';
    lines.push(`Źródło: ${backendLabel}; bez wykonania grafu KAG/OpenSPG.`);
    lines.push('Confidence oznacza punktację wyszukiwania, nie prawdopodobieństwo poprawności.');
  }
  if (answer.evidenceAssessment) {
    lines.push(answer.evidenceAssessment.status === 'insufficient_evidence'
      ? 'Brak wystarczających lokalnych dowodów dla pytania. Nie traktuj fragmentów jako potwierdzonej procedury.'
      : 'Lokalne fragmenty wymagają weryfikacji; dopasowanie tekstu nie potwierdza prawdziwości twierdzeń.');
    if (answer.evidenceAssessment.missingTerms.length) lines.push(`Brakujące terminy: ${answer.evidenceAssessment.missingTerms.join(', ')}.`);
    if (answer.evidenceAssessment.reasons.includes('invalid_csv')) lines.push('Część źródeł CSV ma nieprawidłowy format i została pominięta.');
  }
  lines.push('');
  if (answer.freshnessNote) {
    lines.push(`Uwaga o świeżości: ${answer.freshnessNote}`);
    lines.push('');
  }
  if (answer.evidence.length) {
    lines.push('Dowody z lokalnej KB:');
    for (const item of answer.evidence) {
      lines.push(`- ${item.kb} -> ${item.artifact}`);
      for (const hit of item.hits) {
        const location = hit.endLine > hit.line ? `linie ${hit.line}–${hit.endLine}` : `linia ${hit.line}`;
        lines.push(`  - ${location}: ${hit.snippet}`);
      }
    }
    lines.push('');
  }
  if (answer.externalEvidence.length) {
    lines.push('Zewnętrzne dowody live:');
    for (const item of answer.externalEvidence) {
      lines.push(`- ${item.title} [${item.sourceType}] -> ${item.url}`);
      if (item.publishedDate) lines.push(`  - opublikowano: ${item.publishedDate}`);
      if (item.snippet) lines.push(`  - fragment: ${item.snippet}`);
    }
    lines.push('');
  }
  lines.push('Polecane artefakty:');
  for (const artifact of answer.recommendedArtifacts) {
    lines.push(`- ${artifact}`);
  }
  return lines.join('\n');
}

function printHelp() {
  console.log(`Użycie:
  node scripts/erp_knowledge_answer.mjs "twoje pytanie"
  node scripts/erp_knowledge_answer.mjs --json "twoje pytanie"

Działanie:
  - kieruje pytanie do właściwej KB
  - skanuje artefakty startowe z głównej i pomocniczych KB
  - zwraca praktyczną pierwszą odpowiedź z fragmentami dowodów
`);
}

export async function answerQuestion(question, allowedNamespaces = null) {
  const routing = loadRouting();
  const classified = classifyQuestion(question, routing, allowedNamespaces);
  const response = buildResponse(classified, routing, allowedNamespaces);
  const terms = extractTerms(question);
  const focusHints = extractFocusHints(question);
  const diagnostics = [];
  const evidence = gatherEvidence(response, terms, focusHints, allowedNamespaces, diagnostics);
  const answer = buildPragmaticAnswer(question, response, evidence, diagnostics);
  const fallbackDecision = shouldUseExternalFallback({
    questionNormalized: classified.normalizedQuestion,
    evidence,
    primaryKb: response.primaryKb.name,
  });
  if (fallbackDecision.shouldFallback) {
    try {
      const external = await searchExternalSources({
        query: question,
        kbName: response.primaryKb.name,
        numResults: 5,
        allowedSourceTiers: ['official', 'community'],
        logContext: 'answer_fallback',
      });
      if (external.ok && external.results.length) {
        answer.externalEvidence = external.results.slice(0, 5);
        answer.externalSearch = {
          used: true,
          provider: external.provider,
          reason: fallbackDecision.reason,
          query: question,
          resultCount: external.resultCount,
          citations: buildExternalCitationBlock(external.results, 5),
        };
        answer.evidenceSource = answer.evidence.length ? 'blended' : 'external';
        answer.retrieval.backend = answer.evidence.length ? 'local_artifacts_with_external_search' : 'external_search';
        answer.freshnessNote = 'Użyto zewnętrznego wyszukiwania live, ponieważ lokalne dowody KB były słabe albo pytanie wyglądało na czasowo wrażliwe.';
        answer.note = answer.evidence.length
          ? 'Ta odpowiedź łączy lokalne artefakty KB z zewnętrznie cytowanymi wynikami wyszukiwania live.'
          : 'Ta odpowiedź opiera się na zewnętrznie cytowanych wynikach wyszukiwania live, ponieważ lokalna KB nie dostarczyła wystarczająco mocnych dowodów.';
        if (String(process.env.EXA_AUTO_DRAFT || '0') === '1') {
          const autoDraft = await createExternalKnowledgeDraft({
            kbName: response.primaryKb.name,
            kbNamespace: response.primaryKb.name,
            query: question,
            result: external.results[0],
            notes: 'Automatyczny draft utworzony z odpowiedzi fallback KB-first. Sprawdź przed promocją.',
            tags: ['exa', 'auto-draft', fallbackDecision.reason || 'fallback'],
            auto: true,
          });
          answer.externalSearch.autoDraft = {
            enabled: true,
            created: Boolean(autoDraft.created),
            skipped: autoDraft.skipped || '',
            draftId: autoDraft.draft?.draft?.id || '',
            jsonPath: autoDraft.draft?.jsonPath || '',
            mdPath: autoDraft.draft?.mdPath || '',
            sourceUrl: autoDraft.result?.url || '',
            sourceType: autoDraft.result?.sourceType || '',
          };
        }
        recordExternalFallback({
          question,
          primaryKb: response.primaryKb.name,
          reason: fallbackDecision.reason,
          localEvidenceCount: answer.evidence.length,
          localMaxScore: fallbackDecision.localMaxScore,
          provider: external.provider,
          resultCount: external.resultCount,
          topUrls: external.results.slice(0, 5).map((item) => item.url),
          autoDraft: answer.externalSearch.autoDraft || null,
        });
      }
    } catch (error) {
      answer.externalSearch = {
        used: false,
        provider: '',
        reason: fallbackDecision.reason,
        query: question,
        resultCount: 0,
        error: error.message,
      };
    }
  }
  answer.confidence = computeConfidenceScore({
    evidenceCount: answer.evidence.length,
    maxScore: Math.max(...answer.evidence.flatMap((e) => e.hits.map((h) => h.score)), 0),
    externalResultCount: answer.externalSearch?.resultCount || 0,
  });
  if (answer.confidence < CONFIDENCE_LOW_THRESHOLD) {
    recordLearningGap(question, {
      source: process.env.ENABLE_LIVE_LEARNING === '1' ? 'live_query' : 'testpack',
      routedKb: response.primaryKb.name,
      evidenceCount: answer.evidence.length,
      confidence: answer.confidence,
      externalFallbackUsed: answer.externalSearch?.used || false,
      externalResultCount: answer.externalSearch?.resultCount || 0,
    });
  }
  return { routing, classified, response, answer };
}

async function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const filtered = args.filter((arg) => arg !== '--json');
  const question = filtered.join(' ').trim();

  if (!question || filtered.includes('--help') || filtered.includes('-h')) {
    printHelp();
    process.exit(question ? 0 : 1);
  }

  const { answer } = await answerQuestion(question);

  if (asJson) {
    process.stdout.write(JSON.stringify(answer, null, 2) + '\n');
    return;
  }

  process.stdout.write(renderAnswerMarkdown(answer) + '\n');
}

const ENTRY_FILE = process.argv[1] ? path.resolve(process.argv[1]) : '';
const MODULE_FILE = fileURLToPath(import.meta.url);

if (ENTRY_FILE === MODULE_FILE) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}
