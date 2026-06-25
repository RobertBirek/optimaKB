#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const ROOT = '/docker/openspg';
const BRIDGE_URL = (process.env.ERP_KB_MCP_BASE_URL || 'http://10.10.254.42:3400').replace(/\/+$/, '') + '/mcp';
const BRIDGE_TOKEN = process.env.ERP_KB_HTTP_TOKEN || process.env.ERP_KB_HTTP_READ_TOKEN || '';

const SUBSET = [
  { id: 'Q001', category: 'schema', expectedPrimaryKb: 'ComarchOptimaSchema', question: 'Jak połączyć TraNag z TraElem i Towary?' },
  { id: 'Q008', category: 'schema', expectedPrimaryKb: 'ComarchOptimaSchema', question: 'Jakie procedury dotykają Kontrahenci?' },
  { id: 'Q015', category: 'schema', expectedPrimaryKb: 'ComarchOptimaSchema', question: 'Które tabele są słownikowe w obszarze konfiguracji?' },
  { id: 'Q025', category: 'schema', expectedPrimaryKb: 'ComarchOptimaSchema', question: 'Jakie procedury raportowe mają GetReportContent albo GetReportHeader?' },
  { id: 'Q026', category: 'additional_functions', expectedPrimaryKb: 'ComarchOptimaAdditionalFunctions', question: 'Kiedy użyć funkcji dodatkowej zamiast kolumny użytkownika?' },
  { id: 'Q035', category: 'additional_functions', expectedPrimaryKb: 'ComarchOptimaAdditionalFunctions', question: 'Które przykłady COM dotyczą księgowości i dekretów?' },
  { id: 'Q045', category: 'additional_functions', expectedPrimaryKb: 'ComarchOptimaAdditionalFunctions', question: 'Jak wybrać między FD, COM i kolumną użytkownika dla rozszerzenia listy?' },
  { id: 'Q040', category: 'additional_functions', expectedPrimaryKb: 'ComarchOptimaAdditionalFunctions', question: 'Jak znaleźć funkcję dodatkową do automatyzacji bufora?' },
  { id: 'Q046', category: 'sprint', expectedPrimaryKb: 'ComarchOptimaSprint', question: 'Jak zacząć wydruk sPrint z nagłówkiem i pozycjami?' },
  { id: 'Q048', category: 'sprint', expectedPrimaryKb: 'ComarchOptimaSprint', question: 'Jak użyć RO_GetReportHeader i RO_GetReportContent?' },
  { id: 'Q053', category: 'sprint', expectedPrimaryKb: 'ComarchOptimaSprint', question: 'Jak odróżnić sPrint od GenRap w naszych definicjach?' },
  { id: 'Q060', category: 'sprint', expectedPrimaryKb: 'ComarchOptimaSprint', question: 'Jakie artefakty Sprint mamy dziś jako najbardziej praktyczne?' },
  { id: 'Q061', category: 'reference', expectedPrimaryKb: 'ComarchOptimaReference', question: 'Gdzie w dokumentacji Optimy znajdę onboarding modułu Handel?' },
  { id: 'Q065', category: 'reference', expectedPrimaryKb: 'ComarchOptimaReference', question: 'Jak znaleźć oficjalne info o kolumnach użytkownika?' },
  { id: 'Q069', category: 'reference', expectedPrimaryKb: 'ComarchOptimaReference', question: 'Która KB powinna być pierwszym wejściem przy niejasnym pytaniu o Optimę?' },
  { id: 'Q071', category: 'partner', expectedPrimaryKb: 'ComarchOptimaPartnerTechnical', question: 'Jakie partnerowe procedury dotyczą funkcji dodatkowych?' },
  { id: 'Q077', category: 'partner', expectedPrimaryKb: 'ComarchOptimaPartnerTechnical', question: 'Jakie makra partnerowe mamy dla księgowości?' },
  { id: 'Q085', category: 'partner', expectedPrimaryKb: 'ComarchOptimaPartnerTechnical', question: 'Jakie partnerowe materiały dotyczą API KSeF?' },
  { id: 'Q086', category: 'betterfly', expectedPrimaryKb: 'ComarchBetterflyReference', question: 'Jak działa token Betterfly API?' },
  { id: 'Q093', category: 'betterfly', expectedPrimaryKb: 'ComarchBetterflyReference', question: 'Jak modelować create update confirm delete dla Betterfly?' },
  { id: 'Q100', category: 'betterfly', expectedPrimaryKb: 'ComarchBetterflyReference', question: 'Jakie artefakty Betterfly mam sprawdzić, jeśli chcę zrozumieć API bez danych biznesowych?' },
  { id: 'Q201', category: 'taxbell_accounting_vat', expectedPrimaryKb: 'TaxbellAccountingVATReference', question: 'Jakie są obowiązki księgowe związane z przesyłaniem JPK_V7M przy rozliczeniu VAT?' },
  { id: 'Q206', category: 'taxbell_accounting_vat', expectedPrimaryKb: 'TaxbellAccountingVATReference', question: 'Jak prawidłowo ująć fakturę zakupu w księgowości, aby była zgodna z przepisami JPK?' },
  { id: 'Q209', category: 'taxbell_accounting_vat', expectedPrimaryKb: 'TaxbellAccountingVATReference', question: 'Jakie sankcje grożą za nieterminowe rozliczenie VAT i błędne prowadzenie księgowości?' },
  { id: 'Q210', category: 'taxbell_legal', expectedPrimaryKb: 'TaxbellLegalReference', question: 'Czy zgodnie z ustawą o CIT mogę odliczyć straty z lat ubiegłych?' },
  { id: 'Q215', category: 'taxbell_legal', expectedPrimaryKb: 'TaxbellLegalReference', question: 'Gdzie znajdę interpretację podatkową dotyczącą ulgi badawczo-rozwojowej w CIT?' },
  { id: 'Q218', category: 'taxbell_legal', expectedPrimaryKb: 'TaxbellLegalReference', question: 'Czy istnieje interpretacja podatkowa wyjaśniająca zasady opodatkowania dywidend w PIT?' },
  { id: 'Q219', category: 'taxbell_payroll_hr', expectedPrimaryKb: 'TaxbellPayrollHRReference', question: 'Jakie są obowiązki pracodawcy wobec PIP w zakresie wynagrodzeń i składek ZUS?' },
  { id: 'Q223', category: 'taxbell_payroll_hr', expectedPrimaryKb: 'TaxbellPayrollHRReference', question: 'Jak prawidłowo obliczyć wynagrodzenie chorobowe i jakie składki ZUS od niego odprowadzić?' },
  { id: 'Q227', category: 'taxbell_payroll_hr', expectedPrimaryKb: 'TaxbellPayrollHRReference', question: 'Jaka jest różnica między składką emerytalną a rentową w kontekście wynagrodzenia pracownika?' },
];

function parseCanonicalQuestions() {
  const filePath = path.join(ROOT, 'scripts/run_erp_knowledge_testpack.mjs');
  const source = fs.readFileSync(filePath, 'utf8');
  const match = source.match(/const\s+ALL_QUESTIONS\s*=\s*\[([\s\S]*?)\];/);
  if (!match) return SUBSET;
  try {
    return Function(`"use strict"; return ([${match[1]}]);`)();
  } catch {
    return SUBSET;
  }
}

function selectBalancedQuestions(questions, size) {
  const byCategory = new Map();
  for (const question of questions) {
    const bucket = byCategory.get(question.category) || [];
    bucket.push(question);
    byCategory.set(question.category, bucket);
  }
  const selected = [];
  while (selected.length < size) {
    let addedThisRound = false;
    for (const bucket of byCategory.values()) {
      if (!bucket.length) continue;
      selected.push(bucket.shift());
      addedThisRound = true;
      if (selected.length >= size) break;
    }
    if (!addedThisRound) break;
  }
  return selected;
}

async function callBridge(question, signal) {
  const payload = {
    jsonrpc: '2.0',
    id: 'acc-test-1',
    method: 'tools/call',
    params: {
      name: 'answer_question',
      arguments: { question },
    },
  };
  const response = await fetch(BRIDGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(BRIDGE_TOKEN ? { Authorization: `Bearer ${BRIDGE_TOKEN}` } : {}),
    },
    body: JSON.stringify(payload),
    signal,
  });
  if (!response.ok) {
    throw new Error(`bridge returned ${response.status}`);
  }
  const json = await response.json();
  if (json?.error) {
    const message = json.error.message || JSON.stringify(json.error);
    throw new Error(`bridge JSON-RPC error: ${message}`);
  }
  const content = json?.result?.content?.[0]?.text;
  const structured = json?.result?.structuredContent;
  if (!structured && !content) {
    throw new Error('bridge response missing answer content');
  }
  return structured || { question, note: content || '', primaryKb: '', supportKbs: [], evidence: [], recommendedArtifacts: [] };
}

async function callDirect(question) {
  const { answerQuestion } = await import('./erp_knowledge_answer.mjs');
  const { answer } = await answerQuestion(question);
  return answer;
}

async function fetchAnswer(question, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const answer = await callBridge(question, controller.signal);
    return { ...answer, _transport: 'bridge' };
  } catch (bridgeError) {
    const bridgeMsg = bridgeError?.message || String(bridgeError);
    if (!options.allowDirectFallback) {
      return {
        question,
        primaryKb: 'ENDPOINT_UNAVAILABLE',
        supportKbs: [],
        evidence: [],
        recommendedArtifacts: [],
        note: `Bridge unavailable (${bridgeMsg})`,
        _transport: 'bridge',
        _bridgeError: bridgeMsg,
      };
    }
    try {
      const direct = await callDirect(question);
      return { ...direct, _transport: 'direct', _fallback: 'direct', _bridgeError: bridgeMsg };
    } catch (directError) {
      return {
        question,
        primaryKb: 'ENDPOINT_UNAVAILABLE',
        supportKbs: [],
        evidence: [],
        recommendedArtifacts: [],
        note: `Bridge unreachable (${bridgeMsg}); direct import failed (${directError?.message || String(directError)})`,
        _transport: 'unavailable',
        _bridgeError: bridgeMsg,
        _directError: directError?.message || String(directError),
      };
    }
  } finally {
    clearTimeout(timeout);
  }
}

function evaluateQuality(item, answer) {
  if (answer.primaryKb === 'ENDPOINT_UNAVAILABLE') {
    return { status: 'ENDPOINT_UNAVAILABLE', checks: {} };
  }

  const hasPrimary = Boolean(answer.primaryKb);
  const correctPrimary = hasPrimary && answer.primaryKb === item.expectedPrimaryKb;
  const hasEvidence = Array.isArray(answer.evidence) && answer.evidence.length > 0;
  const hasNote = Boolean(answer.note) && answer.note.length > 20;
  const hasArtifacts = Array.isArray(answer.recommendedArtifacts) && answer.recommendedArtifacts.length > 0;
  const noError = !answer.note?.toLowerCase().includes('nie znaleziono') && !answer.note?.toLowerCase().includes('przepraszam');
  const supportContainsExpected = Array.isArray(answer.supportKbs) && answer.supportKbs.includes(item.expectedPrimaryKb);

  const checks = { hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError, supportContainsExpected };
  const score = Object.values(checks).filter(Boolean).length;

  let status;
  if (correctPrimary && hasEvidence && score >= 5) {
    status = 'PASS';
  } else if (hasPrimary && score >= 3) {
    status = 'PARTIAL';
  } else {
    status = 'MISS';
  }

  return { status, checks, score };
}

function summarize(results) {
  const counts = { PASS: 0, PARTIAL: 0, MISS: 0, ENDPOINT_UNAVAILABLE: 0 };
  const byCategory = new Map();

  for (const row of results) {
    counts[row.status] = (counts[row.status] || 0) + 1;
    const bucket = byCategory.get(row.category) || { total: 0, PASS: 0, PARTIAL: 0, MISS: 0, ENDPOINT_UNAVAILABLE: 0 };
    bucket.total += 1;
    bucket[row.status] += 1;
    byCategory.set(row.category, bucket);
  }

  return { counts, byCategory: Object.fromEntries(byCategory) };
}

function buildMarkdownReport(results, summary, size) {
  const lines = [
    `# ERP Knowledge Assistant ${size}Q Accuracy Test Report`,
    '',
    `Date: \`${new Date().toISOString().slice(0, 10)}\``,
    '',
    '## Summary',
    '',
  ];
  for (const [status, count] of Object.entries(summary.counts)) {
    if (count > 0) lines.push(`- ${status}: \`${count}\``);
  }
  lines.push('', '## By Category', '');
  for (const [category, bucket] of Object.entries(summary.byCategory)) {
    const parts = [`total \`${bucket.total}\``];
    for (const s of ['PASS', 'PARTIAL', 'MISS', 'ENDPOINT_UNAVAILABLE']) {
      if (bucket[s] > 0) parts.push(`${s} \`${bucket[s]}\``);
    }
    lines.push(`- \`${category}\`: ${parts.join(', ')}`);
  }
  lines.push('', '## Results', '');
  for (const row of results) {
    lines.push(`### ${row.id} ${row.status}`);
    lines.push('');
    lines.push(`- Category: \`${row.category}\``);
    lines.push(`- Expected primary KB: \`${row.expectedPrimaryKb}\``);
    if (row.answerPrimaryKb) lines.push(`- Answer primary KB: \`${row.answerPrimaryKb}\``);
    if (row.supportKbs?.length) lines.push(`- KBs used: \`${row.supportKbs.join('`, `')}\``);
    if (row.transport) lines.push(`- Transport: \`${row.transport}\``);
    if (row.fallback) lines.push(`- Fallback: \`${row.fallback}\``);
    if (row.bridgeError) lines.push(`- Bridge error: ${row.bridgeError}`);
    lines.push(`- Question: ${row.question}`);
    if (row.checks && Object.keys(row.checks).length) {
      const passChecks = Object.entries(row.checks).filter(([, v]) => v).map(([k]) => k);
      lines.push(`- Checks passing: ${passChecks.join(', ')}`);
    }
    if (row.evidenceCount !== undefined) lines.push(`- Evidence hits: \`${row.evidenceCount}\``);
    if (row.notePreview) lines.push(`- Note preview: ${row.notePreview}`);
    if (row.notes?.length) lines.push(`- Notes: ${row.notes.join('; ')}`);
    lines.push('');
  }
  return lines.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const isSample = args.includes('--sample');
  const allowDirectFallback = args.includes('--allow-direct-fallback');
  const sizeIndex = args.indexOf('--size');
  const sizeArg = sizeIndex >= 0 ? Number(args[sizeIndex + 1]) : NaN;
  const size = Number.isFinite(sizeArg) && sizeArg > 0 ? sizeArg : 30;

  const corpus = parseCanonicalQuestions();
  const questions = isSample ? corpus.slice(0, 5) : selectBalancedQuestions(corpus, size);
  const effectiveSize = questions.length;
  const outJson = path.join(ROOT, `docs/reference/ERP_Knowledge_Assistant_${effectiveSize}Q_AccuracyTestPack.json`);
  const outMd = path.join(ROOT, `docs/reference/ERP_Knowledge_Assistant_${effectiveSize}Q_AccuracyTestPack.md`);

  process.stderr.write(`Testing ${effectiveSize} questions${isSample ? ' (sample mode)' : ''}${allowDirectFallback ? ' (direct fallback allowed)' : ''}...\n`);

  const results = [];
  for (const item of questions) {
    process.stderr.write(`  ${item.id}... `);
    const answer = await fetchAnswer(item.question, { allowDirectFallback });
    const { status, checks } = evaluateQuality(item, answer);
    const notes = [];
    if (answer.primaryKb !== item.expectedPrimaryKb && answer.primaryKb !== 'ENDPOINT_UNAVAILABLE') {
      notes.push(`primary mismatch: expected ${item.expectedPrimaryKb}, got ${answer.primaryKb}`);
    }
    if (Array.isArray(answer.evidence) && !answer.evidence.length && answer.primaryKb !== 'ENDPOINT_UNAVAILABLE') {
      notes.push('no evidence');
    }
    results.push({
      id: item.id,
      category: item.category,
      expectedPrimaryKb: item.expectedPrimaryKb,
      question: item.question,
      status,
      answerPrimaryKb: answer.primaryKb,
      supportKbs: answer.supportKbs || [],
      evidenceCount: (answer.evidence || []).length,
      notePreview: answer.note ? answer.note.slice(0, 120) : '',
      transport: answer._transport || 'unknown',
      fallback: answer._fallback || '',
      bridgeError: answer._bridgeError || '',
      checks: checks || {},
      notes,
    });
    process.stderr.write(`${status}\n`);
  }

  const summary = summarize(results);
  const fallbackCount = results.filter((row) => row.fallback).length;
  const payload = {
    generatedAt: new Date().toISOString(),
    size: effectiveSize,
    sample: isSample,
    bridgeUrl: BRIDGE_URL,
    authMode: BRIDGE_TOKEN ? 'bearer' : 'none',
    allowDirectFallback,
    fallbackCount,
    summary,
    results,
  };
  fs.writeFileSync(outJson, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  fs.writeFileSync(outMd, buildMarkdownReport(results, summary, effectiveSize) + '\n', 'utf8');

  console.log(JSON.stringify(summary, null, 2));
  console.log(`Wrote: ${outJson}`);
  console.log(`Wrote: ${outMd}`);

  const failed = summary.counts.PARTIAL + summary.counts.MISS + summary.counts.ENDPOINT_UNAVAILABLE;
  if (failed > 0 || (!allowDirectFallback && fallbackCount > 0)) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
