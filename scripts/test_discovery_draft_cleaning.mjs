#!/usr/bin/env node

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-kb-discovery-cleaning-'));
const originalFetch = globalThis.fetch;
const originalEnv = Object.fromEntries(['ROOT', 'CONTENT_AI_CLEAN', 'ERP_KB_AUTOMATION_ENABLED']
  .map((key) => [key, process.env[key]]));
let fetchCalls = 0;

try {
  process.env.ROOT = root;
  process.env.CONTENT_AI_CLEAN = '1';
  process.env.ERP_KB_AUTOMATION_ENABLED = '0';
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error('External fetch is forbidden in discovery submission fixtures');
  };
  fs.mkdirSync(path.join(root, 'docs/reference/knowledge_inbox'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/reference/knowledge_inbox/registry.json'), JSON.stringify({ generatedAt: new Date().toISOString(), entries: [] }, null, 2));

  const discovery = await import(`./lib/dashboard_discovery.mjs?test=${Date.now()}`);
  const { AUTOMATION_JOBS_ROOT, saveAutomationConfig, loadAutomationConfig } = await import('./lib/dashboard_automation.mjs');
  saveAutomationConfig({ enabled: false }, 'test');
  assert.strictEqual(loadAutomationConfig().enabled, false);
  assert.strictEqual(AUTOMATION_JOBS_ROOT, path.join(root, 'data/dashboard/automation/jobs'));
  const jobs = () => fs.existsSync(AUTOMATION_JOBS_ROOT) ? fs.readdirSync(AUTOMATION_JOBS_ROOT).sort() : [];
  const created = new Date().toISOString();
  function candidate(id, title, content) {
    return {
      id,
      kbNamespace: 'ComarchOptimaReference',
      title,
      canonicalUrl: `https://pomoc.comarch.pl/test/${id}`,
      query: 'fixture query',
      sourceTier: 'official',
      retrievedAt: created,
      contentHash: `hash-${id}`,
      content,
      snippet: content,
      status: 'CANDIDATE_ONLY',
      action: 'CREATE_DRAFT',
      tags: [],
      createdAt: created,
      assessment: { confidence: 0.99, duplicateRisk: 'low', contentRisk: 'low', promptVersion: 'test', model: 'test' },
    };
  }
  const refusal = 'W dostarczonych materiałach nie ma surowej treści strony WWW ani artykułu do oczyszczenia. W związku z tym nie można na ich podstawie wykonać oczyszczania.';
  const shellTitle = 'Problemy z odbiorem faktur z KSEF - Społeczność ERP';
  const removableTitle = 'Udostępnij fakturę w KSeF - Społeczność ERP';
  const invalid = [
    [candidate('candidate_empty', 'Empty source fixture', ''), 'EMPTY_SOURCE_BODY'],
    [candidate('candidate_shell_77295', shellTitle, `loader\n![logo](assets/logo.svg)\n${shellTitle}`), 'SOURCE_SHELL_ONLY'],
    [candidate('candidate_cleaned_title', removableTitle, removableTitle), 'SOURCE_SHELL_ONLY'],
    [candidate('candidate_cleaned_title_logo_loader', removableTitle, `${removableTitle}\nloader\n![logo](assets/logo.svg)`), 'SOURCE_SHELL_ONLY'],
    [candidate('candidate_repeated_title_inline', shellTitle, `${shellTitle} ${shellTitle}\nloader`), 'SOURCE_SHELL_ONLY'],
    [candidate('candidate_refusal_77145', 'Refusal fixture 77145', refusal), 'SOURCE_CONTENT_UNAVAILABLE'],
    [candidate('candidate_summary_77145', 'Speculative fixture 77145', 'User query: problemy z KSeF Optima 2026\n- The page title suggests a discussion about receiving invoices.\n- No detailed content snippets are provided, so the summary focuses on the likely scope.'), 'SOURCE_CONTENT_UNAVAILABLE'],
  ];
  for (const [fixture] of invalid) discovery.saveDiscoveryCandidate(fixture);
  for (const [fixture, expectedCode] of invalid) {
    const before = discovery.readDiscoveryCandidate(fixture.id);
    const jobsBefore = jobs();
    await assert.rejects(discovery.createDraftFromDiscoveryCandidate(fixture.id, 'test'),
      error => error.code === expectedCode && error.message.includes(expectedCode));
    assert.deepStrictEqual(discovery.readDiscoveryCandidate(fixture.id), before);
    assert.strictEqual(fs.existsSync(path.join(root, 'downloads/knowledge_inbox')), false);
    assert.deepStrictEqual(jobs(), jobsBefore);
    assert.strictEqual(fetchCalls, 0);
  }

  const positive = [
    [candidate('candidate_cleaning', removableTitle, `REKLAMA\nZapisz się na newsletter\n${removableTitle}\nTreść merytoryczna o KSeF.`), 'fakturę w KSeF - Społeczność ERP\nTreść merytoryczna o KSeF.'],
    [candidate('candidate_short', 'Short instruction fixture', 'Wybierz Importuj, następnie zatwierdź.'), 'Wybierz Importuj, następnie zatwierdź.'],
    [candidate('candidate_quoted_refusal', shellTitle, `${shellTitle} ${shellTitle} Komunikat „${refusal}” oznacza błąd ekstrakcji. Pobierz treść strony w przeglądarce.`), `${shellTitle} ${shellTitle} Komunikat „${refusal}” oznacza błąd ekstrakcji. Pobierz treść strony w przeglądarce.`],
  ];
  const dayDir = path.join(root, 'downloads/knowledge_inbox', created.slice(0, 10));
  const jobsBeforePositives = jobs();
  for (const [index, [fixture, expectedBody]] of positive.entries()) {
    discovery.saveDiscoveryCandidate(fixture);
    const drafted = await discovery.createDraftFromDiscoveryCandidate(fixture.id, 'test');
    assert.strictEqual(drafted.status, 'DRAFTED');
    const draftFiles = fs.readdirSync(dayDir).filter((name) => name.endsWith('.json'));
    assert.strictEqual(draftFiles.length, index + 1);
    const draftJson = JSON.parse(fs.readFileSync(path.join(dayDir, `${drafted.draftId}.json`), 'utf8'));
    assert.strictEqual(draftJson.content, [
      'Automated source-discovery draft.', '', `Query: ${fixture.query}`,
      `Source: ${fixture.canonicalUrl}`, `Tier: ${fixture.sourceTier}`,
      `Discovery confidence: ${fixture.assessment.confidence}`, '', expectedBody,
      '', 'Review this draft before promotion.',
    ].join('\n'));
    assert(!draftJson.content.includes('REKLAMA'));
    assert(!draftJson.content.includes('newsletter'));
    assert.deepStrictEqual(jobs(), jobsBeforePositives);
    assert.strictEqual(fetchCalls, 0);
  }
  assert.strictEqual(fs.readdirSync(dayDir).filter((name) => name.endsWith('.json')).length, 3);
  assert.strictEqual(fs.readdirSync(dayDir).filter((name) => name.endsWith('.md')).length, 3);
  assert.deepStrictEqual(jobs(), []);
  process.stdout.write(`${JSON.stringify({ ok: true, rejected: invalid.length, drafted: positive.length, automationJobs: jobs().length, fetchCalls }, null, 2)}\n`);
} finally {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  fs.rmSync(root, { recursive: true, force: true });
}
