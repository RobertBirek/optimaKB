#!/usr/bin/env node

import assert from 'assert';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import process from 'process';
import { spawn, spawnSync } from 'child_process';
import { deriveDiscoveryAutoDraftState } from './lib/feedback_learning.mjs';

const REPO_ROOT = process.env.ROOT || '/docker/openspg';

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function runDiscovery(root, args, llmMock, searchMock) {
  return spawnSync(process.execPath, [
    path.join(REPO_ROOT, 'scripts/run_dashboard_discovery.mjs'),
    ...args,
  ], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      ROOT: root,
      ERP_KB_DISCOVERY_LLM_MOCK_FILE: llmMock,
      ERP_KB_DISCOVERY_SEARCH_MOCK_FILE: searchMock,
      ERP_KB_DISCOVERY_DRY_RUN: '1',
    },
    encoding: 'utf8',
  });
}

function runDiscoveryAsync(env, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [
      path.join(REPO_ROOT, 'scripts/run_dashboard_discovery.mjs'),
      ...args,
    ], {
      cwd: REPO_ROOT,
      env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

function startSlowLlmServer(fixtures, delayMs) {
  const server = http.createServer((req, res) => {
    if (req.method !== 'POST') {
      res.writeHead(404);
      res.end();
      return;
    }
    setTimeout(() => {
      const answer = JSON.stringify({
        queries: Object.keys(fixtures).map((kbNamespace) => ({
          kbNamespace,
          query: `weekly focused query for ${kbNamespace}`,
          includeDomains: [new URL(fixtures[kbNamespace]).hostname],
          reason: 'Weekly timeout override fixture.',
        })),
      });
      const body = `data: ${JSON.stringify({ success: true, answer })}\n\n`;
      res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8' });
      res.end(body);
    }, delayMs);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function startAssessmentServer({ url, failuresBeforeSuccess }) {
  let requestCount = 0;
  const server = http.createServer((req, res) => {
    if (req.method !== 'POST') {
      res.writeHead(404);
      res.end();
      return;
    }
    requestCount += 1;
    if (requestCount <= failuresBeforeSuccess) {
      req.socket.destroy();
      return;
    }
    const answer = JSON.stringify([{
      url,
      action: 'CANDIDATE_ONLY',
      targetKb: 'ComarchOptimaSprint',
      confidence: 0.99,
      novelty: 'high',
      duplicateRisk: 'low',
      contentRisk: 'low',
      reasons: ['Transient retry fixture.'],
    }]);
    const body = `data: ${JSON.stringify({ success: true, answer })}\n\n`;
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8' });
    res.end(body);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({
      server,
      requestCount: () => requestCount,
    }));
  });
}

const fixtures = {
  ComarchOptimaSchema: 'https://pomoc.comarch.pl/test/schema-2026',
  ComarchOptimaAdditionalFunctions: 'https://pomoc.comarch.pl/test/additional-functions-2026',
  ComarchOptimaSprint: 'https://pomoc.comarch.pl/test/sprint-2026',
  ComarchOptimaReference: 'https://pomoc.comarch.pl/test/optima-reference-2026',
  ComarchOptimaPartnerTechnical: 'https://partner.erp.comarch.pl/test/technical-2026',
  ComarchBetterflyReference: 'https://pomoc.comarchbetterfly.pl/test/api-2026',
  ComarchCommunityNews: 'https://spolecznosc.comarch.pl/test/community-2026',
  TaxbellLegalReference: 'https://podatki.gov.pl/test/legal-2026',
  TaxbellPayrollHRReference: 'https://zus.pl/test/payroll-2026',
  TaxbellAccountingVATReference: 'https://ksef.podatki.gov.pl/test/vat-2026',
};

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-kb-dashboard-discovery-'));
const today = new Date().toISOString().slice(0, 10);
let slowServer;
let retryServer;
let failedServer;
let retryRoot;
let failedRoot;
try {
  writeJson(path.join(root, 'docs/reference/knowledge_inbox/registry.json'), {
    generatedAt: new Date().toISOString(),
    entries: [],
  });
  const llmMock = path.join(root, 'llm.json');
  const searchMock = path.join(root, 'search.json');
  const llmPayload = {
    queries: {
      queries: Object.keys(fixtures).map((kbNamespace) => ({
        kbNamespace,
        query: `weekly focused query for ${kbNamespace}`,
        includeDomains: [new URL(fixtures[kbNamespace]).hostname],
        reason: 'Deterministic weekly planner fixture.',
      })),
    },
  };
  const searchPayload = {};
  for (const [kbNamespace, url] of Object.entries(fixtures)) {
    searchPayload[kbNamespace] = [{
      title: `Discovery fixture ${kbNamespace}`,
      url,
      snippet: `Current official source fixture for ${kbNamespace}. `.repeat(8),
      text: `Detailed source content for ${kbNamespace}. `.repeat(20),
      sourceType: kbNamespace === 'ComarchCommunityNews' ? 'community' : 'official',
      publishedDate: '2026-06-06T08:00:00.000Z',
      retrievedAt: '2026-06-06T09:00:00.000Z',
    }];
    llmPayload[`assessments:${kbNamespace}`] = [{
      url,
      action: kbNamespace === 'ComarchOptimaPartnerTechnical'
        ? 'ROUTE_TO_PIPELINE'
        : 'CREATE_DRAFT',
      targetKb: kbNamespace,
      confidence: 0.99,
      novelty: 'high',
      duplicateRisk: 'low',
      contentRisk: 'low',
      reasons: ['Trusted current source with relevant content.'],
    }];
  }
  writeJson(llmMock, llmPayload);
  writeJson(searchMock, searchPayload);

  slowServer = await startSlowLlmServer(fixtures, 150);
  const { port: slowPort } = slowServer.address();

  const weekly = runDiscovery(root, ['--weekly'], llmMock, searchMock);
  assert.strictEqual(weekly.status, 0, weekly.stderr || weekly.stdout);
  const weeklyResult = JSON.parse(weekly.stdout);
  assert.strictEqual(weeklyResult.result.generatedCount, 10);

  const weeklyTimeoutOverride = await runDiscoveryAsync({
    ...process.env,
    ROOT: root,
    OPENSPG_API_BASE: `http://127.0.0.1:${slowPort}`,
    OPENSPG_LLM_ENDPOINT: '/v1/chat/completions',
    OPENSPG_LLM_APP_ID: '4',
    OPENSPG_LLM_SESSION_ID: '4',
    OPENSPG_COOKIE: 'test-cookie=1',
    ERP_KB_DISCOVERY_LLM_TIMEOUT_MS: '50',
    ERP_KB_DISCOVERY_WEEKLY_LLM_TIMEOUT_MS: '500',
    ERP_KB_DISCOVERY_SEARCH_MOCK_FILE: searchMock,
  }, ['--weekly']);
  assert.strictEqual(weeklyTimeoutOverride.status, 0, weeklyTimeoutOverride.stderr || weeklyTimeoutOverride.stdout);
  const weeklyTimeoutOverrideResult = JSON.parse(weeklyTimeoutOverride.stdout);
  assert.strictEqual(weeklyTimeoutOverrideResult.result.ok, true, weeklyTimeoutOverride.stdout);
  assert.strictEqual(weeklyTimeoutOverrideResult.result.resultCount, 10);

  const retryUrl = 'https://pomoc.comarch.pl/test/sprint-retry-2026';
  const retrySearchPayload = Object.fromEntries(Object.keys(fixtures).map((namespace) => [namespace, []]));
  retrySearchPayload.ComarchOptimaSprint = [{
    title: 'Transient Sprint fixture',
    url: retryUrl,
    snippet: 'Current Sprint source requiring a transient LLM retry.',
    text: 'Detailed Sprint retry fixture content.',
    sourceType: 'official',
    publishedDate: '2026-06-06T08:00:00.000Z',
    retrievedAt: '2026-06-06T09:00:00.000Z',
  }];

  retryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-kb-dashboard-discovery-retry-'));
  writeJson(path.join(retryRoot, 'docs/reference/knowledge_inbox/registry.json'), {
    generatedAt: new Date().toISOString(),
    entries: [],
  });
  const retrySearchMock = path.join(retryRoot, 'search.json');
  writeJson(retrySearchMock, retrySearchPayload);
  retryServer = await startAssessmentServer({ url: retryUrl, failuresBeforeSuccess: 1 });
  const { port: retryPort } = retryServer.server.address();
  const retryEnv = {
    ...process.env,
    ROOT: retryRoot,
    OPENSPG_API_BASE: `http://127.0.0.1:${retryPort}`,
    OPENSPG_LLM_ENDPOINT: '/v1/chat/completions',
    OPENSPG_LLM_APP_ID: '4',
    OPENSPG_LLM_SESSION_ID: '4',
    OPENSPG_COOKIE: 'test-cookie=1',
    ERP_KB_DISCOVERY_LLM_TIMEOUT_MS: '500',
    ERP_KB_TRANSIENT_RETRY_DELAY_MS: '0',
    ERP_KB_DISCOVERY_SEARCH_MOCK_FILE: retrySearchMock,
  };
  const retryRun = await runDiscoveryAsync(retryEnv, ['--daily', '--dry-run', '--limit', '1']);
  assert.strictEqual(retryRun.status, 0, retryRun.stderr || retryRun.stdout);
  const retryResult = JSON.parse(retryRun.stdout).result;
  assert.strictEqual(retryResult.ok, true);
  assert.strictEqual(retryResult.candidateCount, 1);
  assert.deepStrictEqual(retryResult.errors, []);
  assert.strictEqual(retryServer.requestCount(), 2);
  assert.strictEqual(
    fs.readdirSync(path.join(retryRoot, 'data/dashboard/discovery/candidates')).length,
    1,
  );

  failedRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-kb-dashboard-discovery-failed-'));
  writeJson(path.join(failedRoot, 'docs/reference/knowledge_inbox/registry.json'), {
    generatedAt: new Date().toISOString(),
    entries: [],
  });
  const failedSearchMock = path.join(failedRoot, 'search.json');
  writeJson(failedSearchMock, retrySearchPayload);
  failedServer = await startAssessmentServer({ url: retryUrl, failuresBeforeSuccess: 2 });
  const { port: failedPort } = failedServer.server.address();
  const failedRun = await runDiscoveryAsync({
    ...retryEnv,
    ROOT: failedRoot,
    OPENSPG_API_BASE: `http://127.0.0.1:${failedPort}`,
    ERP_KB_DISCOVERY_SEARCH_MOCK_FILE: failedSearchMock,
  }, ['--daily', '--dry-run', '--limit', '1']);
  assert.strictEqual(failedRun.status, 1);
  const failedResult = JSON.parse(failedRun.stdout).result;
  assert.strictEqual(failedResult.ok, false);
  assert.strictEqual(failedResult.errors.length, 1);
  assert.strictEqual(failedResult.errors[0].queryId, 'seed_ComarchOptimaSprint');
  assert.strictEqual(failedResult.errors[0].stage, 'llm');
  assert.strictEqual(failedServer.requestCount(), 2);
  assert.strictEqual(
    fs.existsSync(path.join(failedRoot, 'data/dashboard/discovery/candidates')),
    false,
  );

  const failedReport = JSON.parse(fs.readFileSync(
    path.join(failedRoot, 'docs/reference/ERP_KB_Discovery_Coverage_Report.json'),
    'utf8',
  ));
  assert.deepStrictEqual(failedReport.recentRuns[0].errors, failedResult.errors);
  assert.strictEqual(failedReport.overall, 'PASS');

  const daily = runDiscovery(root, ['--daily', '--dry-run', '--limit', '1'], llmMock, searchMock);
  assert.strictEqual(daily.status, 0, daily.stderr || daily.stdout);
  const dailyResult = JSON.parse(daily.stdout);
  assert.strictEqual(dailyResult.result.dryRun, true);
  assert.strictEqual(dailyResult.result.candidateCount, 10);
  assert.strictEqual(dailyResult.result.draftedCount, 0);
  assert.strictEqual(fs.existsSync(path.join(root, 'downloads/knowledge_inbox', today)), false);

  process.env.ROOT = root;
  process.env.ERP_KB_DISCOVERY_DRY_RUN = '1';
  const discovery = await import(`./lib/dashboard_discovery.mjs?test=${Date.now()}`);
  const candidates = discovery.listDiscoveryCandidates(100);
  assert.strictEqual(candidates.length, 10);
  assert.strictEqual(
    candidates.find((candidate) => candidate.kbNamespace === 'ComarchOptimaSchema').action,
    'CANDIDATE_ONLY',
  );
  assert.strictEqual(
    candidates.find((candidate) => candidate.kbNamespace === 'ComarchOptimaPartnerTechnical').action,
    'ROUTE_TO_PIPELINE',
  );

  const partner = candidates.find((candidate) => candidate.kbNamespace === 'ComarchOptimaPartnerTechnical');
  const routed = discovery.routeDiscoveryCandidate(partner.id, 'test');
  assert.strictEqual(routed.status, 'ROUTED');
  assert.match(
    fs.readFileSync(discovery.DISCOVERY_ROUTES_PATH, 'utf8'),
    /download_optima_partner_technical_assets/,
  );

  const schema = candidates.find((candidate) => candidate.kbNamespace === 'ComarchOptimaSchema');
  assert.strictEqual(discovery.rejectDiscoveryCandidate(schema.id, 'test').status, 'REJECTED');

  const reference = candidates.find((candidate) => candidate.kbNamespace === 'ComarchOptimaReference');
  assert.strictEqual((await discovery.createDraftFromDiscoveryCandidate(reference.id, 'test')).status, 'DRAFTED');
  for (let index = 1; index <= 3; index += 1) {
    discovery.saveDiscoveryCandidate({
      ...reference,
      id: `candidate_budget_${index}`,
      canonicalUrl: `https://pomoc.comarch.pl/test/budget-${index}`,
      title: `Budget candidate ${index}`,
      status: 'CANDIDATE_ONLY',
      createdAt: new Date(Date.now() + index).toISOString(),
    });
  }
  assert.strictEqual(
    (await discovery.createDraftFromDiscoveryCandidate('candidate_budget_1', 'test')).status,
    'DRAFTED',
  );
  assert.strictEqual(
    (await discovery.createDraftFromDiscoveryCandidate('candidate_budget_2', 'test')).status,
    'DRAFTED',
  );
  await assert.rejects(
    () => discovery.createDraftFromDiscoveryCandidate('candidate_budget_3', 'test'),
    /budget exceeded/,
  );

  discovery.saveDiscoveryCandidate({
    ...schema,
    id: 'candidate_bulk_reject_1',
    canonicalUrl: 'https://pomoc.comarch.pl/test/bulk-reject-1',
    title: 'Bulk reject candidate 1',
    status: 'REJECTED',
    rejectedBy: '',
    operatorDecision: null,
    createdAt: new Date(Date.now() + 10).toISOString(),
  });
  discovery.saveDiscoveryCandidate({
    ...schema,
    id: 'candidate_bulk_reject_2',
    canonicalUrl: 'https://pomoc.comarch.pl/test/bulk-reject-2',
    title: 'Bulk reject candidate 2',
    status: 'CANDIDATE_ONLY',
    rejectedBy: '',
    operatorDecision: null,
    createdAt: new Date(Date.now() + 11).toISOString(),
  });
  assert.strictEqual(
    discovery.isReviewableDiscoveryCandidate(discovery.readDiscoveryCandidate('candidate_bulk_reject_1')),
    true,
  );
  const bulk = await discovery.bulkDecideDiscoveryCandidates(
    ['candidate_bulk_reject_1', 'candidate_bulk_reject_2'],
    'reject',
    'test',
    'Deterministic bulk feedback.',
  );
  assert.strictEqual(bulk.succeeded, 2);
  assert.strictEqual(bulk.failed, 0);

  discovery.saveDiscoveryCandidate({
    ...partner,
    id: 'candidate_undo_route',
    canonicalUrl: 'https://partner.erp.comarch.pl/test/undo-route',
    status: 'CANDIDATE_ONLY',
    operatorDecision: null,
    route: null,
    createdAt: new Date(Date.now() + 20).toISOString(),
  });
  assert.strictEqual(discovery.routeDiscoveryCandidate('candidate_undo_route', 'test').status, 'ROUTED');
  assert.strictEqual(discovery.undoDiscoveryCandidate('candidate_undo_route', 'test').status, 'CANDIDATE_ONLY');
  assert.strictEqual(discovery.readDiscoveryCandidate('candidate_undo_route').decisionHistory.length, 1);

  writeJson(path.join(root, 'downloads/official/betterfly_reference/meta/source_registry.json'), {
    sources: [{
      canonicalUrl: fixtures.ComarchBetterflyReference,
      title: 'Existing Betterfly corpus source',
    }],
  });
  const corpusMatch = discovery.findExistingCorpusSource(fixtures.ComarchBetterflyReference);
  assert.strictEqual(corpusMatch.kbNamespace, 'ComarchBetterflyReference');
  const reconciliation = discovery.reconcileDiscoveryCorpusDuplicates('test-reconcile');
  assert.strictEqual(reconciliation.reconciled, 1);
  const duplicateCandidate = discovery.findDiscoveryCandidateByUrl(fixtures.ComarchBetterflyReference);
  assert.strictEqual(duplicateCandidate.status, 'DUPLICATE');
  assert.strictEqual(duplicateCandidate.duplicateType, 'existing_corpus');

  discovery.writeDiscoveryRun({
    id: 'legacy_run_error_without_stage',
    type: 'daily',
    ok: false,
    startedAt: '9999-01-01T00:00:00.000Z',
    finishedAt: '9999-01-01T00:00:01.000Z',
    errors: [{ queryId: 'legacy_query', message: 'Legacy query failure.' }],
  });
  const report = discovery.refreshDiscoveryReport();
  assert.strictEqual(report.overall, 'PASS');
  assert.deepStrictEqual(report.coverage, { configuredKbs: 10, coveredKbs: 10 });
  assert.strictEqual(report.totals.drafted, 3);
  assert.strictEqual(report.feedback.overall.reviewed, 7);
  assert.strictEqual(report.feedback.overall.evaluable, 4);
  assert.strictEqual(report.feedback.overall.agreement, 1);
  assert.strictEqual(report.feedback.overall.falsePositives, 0);
  assert.strictEqual(report.feedback.calibration.target, 30);
  assert.strictEqual(report.feedback.calibration.size, 15);
  assert.strictEqual(report.feedback.recentNotes.length, 2);
  assert.strictEqual(report.totals.duplicates, 1);
  assert.deepStrictEqual(
    report.recentRuns.find((run) => run.id === 'legacy_run_error_without_stage').errors,
    [{ queryId: 'legacy_query', stage: 'query', message: 'Legacy query failure.' }],
  );
  const priority = discovery.discoveryCandidatePriority(
    discovery.readDiscoveryCandidate('candidate_undo_route'),
  );
  assert(Number.isInteger(priority.score));
  assert(['HIGH', 'MEDIUM', 'LOW'].includes(priority.level));
  const queryAnalytics = discovery.discoveryQueryAnalytics();
  assert.strictEqual(queryAnalytics.length, 20);
  assert(queryAnalytics.every((query) => query.analytics));
  let weakQuery = { id: 'weak', source: 'generated', enabled: true };
  for (let index = 0; index < 3; index += 1) {
    weakQuery = discovery.discoveryQueryStateAfterRun(
      weakQuery,
      5,
      5,
      new Date(Date.now() + index),
    );
  }
  assert.strictEqual(weakQuery.enabled, false);
  assert.strictEqual(weakQuery.retiredReason, 'repeated_low_value');
  let seedQuery = { id: 'seed', source: 'seed', enabled: true };
  for (let index = 0; index < 3; index += 1) {
    seedQuery = discovery.discoveryQueryStateAfterRun(
      seedQuery,
      0,
      0,
      new Date(Date.now() + index),
    );
  }
  assert.strictEqual(seedQuery.enabled, true);
  const semiAuto = discovery.discoverySemiAutoStatus();
  assert.strictEqual(semiAuto.active, false);
  assert(semiAuto.blockers.length > 0);
  const refreshedPolicy = discovery.loadDiscoveryPolicy();
  assert.strictEqual(
    refreshedPolicy.profiles.find((profile) => profile.kbNamespace === 'ComarchOptimaSchema').seedQuery,
    'Comarch ERP Optima struktura bazy danych tabele procedury klucze obce TraNag TraElem 2026',
  );
  assert.strictEqual(
    refreshedPolicy.profiles.find((profile) => profile.kbNamespace === 'ComarchOptimaSprint').seedQuery,
    'Comarch ERP Optima sPrint konfigurator danych szablonu parametry subszablony SQL 2026',
  );
  assert.strictEqual(
    refreshedPolicy.profiles.find((profile) => profile.kbNamespace === 'ComarchOptimaReference').seedQuery,
    'Comarch ERP Optima instrukcja obsługi konfiguracja personalizacja kolumny użytkownika 2026',
  );
  const briefing = discovery.refreshDiscoveryBriefing();
  assert.strictEqual(briefing.totals.candidates, 16);
  assert(Array.isArray(briefing.topCandidates));
  assert.strictEqual(fs.existsSync(discovery.DISCOVERY_BRIEFING_PATH), true);
  assert.strictEqual(fs.existsSync(discovery.DISCOVERY_REPORT_PATH), true);

  const autoDraftTests = [
    {
      name: 'autoDraftState: fallback threshold when no learning state',
      test() {
        const policy = discovery.defaultDiscoveryPolicy();
        const result = deriveDiscoveryAutoDraftState(policy, null);
        for (const ns of Object.keys(result)) {
          assert.strictEqual(result[ns].threshold, policy.semiAutoMinConfidence,
            `Expected threshold ${policy.semiAutoMinConfidence} for ${ns}, got ${result[ns].threshold}`);
          assert.strictEqual(result[ns].blockedByFp, false,
            `Expected blockedByFp=false for ${ns} with no learning state`);
          assert.strictEqual(result[ns].eligible, policy.semiAutoAllowedNamespaces.includes(ns),
            `Expected eligible=${policy.semiAutoAllowedNamespaces.includes(ns)} for ${ns}`);
        }
      },
    },
    {
      name: 'autoDraftState: dynamic threshold from learning state',
      test() {
        const policy = discovery.defaultDiscoveryPolicy();
        const automationState = {
          byKbNamespace: {
            ComarchOptimaReference: { tunedBaseline: 0.82, windowFpRate: 0.03, reviewed: 10, windowSize: 50 },
            ComarchOptimaAdditionalFunctions: { tunedBaseline: 0.95, windowFpRate: 0.12, reviewed: 5, windowSize: 30 },
          },
        };
        const result = deriveDiscoveryAutoDraftState(policy, automationState);
        assert.strictEqual(result.ComarchOptimaReference.threshold, 0.82,
          `Expected 0.82, got ${result.ComarchOptimaReference.threshold}`);
        assert.strictEqual(result.ComarchOptimaReference.eligible, true,
          'ComarchOptimaReference should be eligible');
        assert.strictEqual(result.ComarchOptimaAdditionalFunctions.blockedByFp, true,
          'ComarchOptimaAdditionalFunctions should be blocked by FP > 5%');
        assert.strictEqual(result.ComarchOptimaAdditionalFunctions.eligible, false,
          'ComarchOptimaAdditionalFunctions should not be eligible');
      },
    },
    {
      name: 'autoDraftState: profiled KB excluded from allowedNamespaces is not eligible',
      test() {
        const policy = discovery.defaultDiscoveryPolicy();
        const result = deriveDiscoveryAutoDraftState(policy, null);
        assert.strictEqual(result.ComarchOptimaSchema.eligible, false,
          'Non-allowed KB should not be eligible');
        assert.strictEqual(result.NonExistentNamespace, undefined,
          'Unknown namespace not in profiles should be undefined');
      },
    },
  ];
  let autoDraftPassed = 0;
  let autoDraftFailed = 0;
  for (const { name, test } of autoDraftTests) {
    try {
      test();
      autoDraftPassed += 1;
      process.stderr.write(`  PASS  ${name}\n`);
    } catch (err) {
      autoDraftFailed += 1;
      process.stderr.write(`  FAIL  ${name}\n    ${err.message}\n`);
    }
  }
  if (autoDraftFailed > 0) {
    throw new Error(`${autoDraftFailed} auto-draft state test(s) failed`);
  }

  process.stdout.write(`${JSON.stringify({
    ok: true,
    coverage: report.coverage,
    candidates: report.totals.candidates,
    drafted: report.totals.drafted,
    routed: report.totals.routed,
    rejected: report.totals.rejected,
    duplicates: report.totals.duplicates,
    briefingCandidates: briefing.totals.candidates,
    reviewed: report.feedback.overall.reviewed,
    agreement: report.feedback.overall.agreement,
    autoDraftPassed,
  }, null, 2)}\n`);
} finally {
  if (retryServer) {
    await new Promise((resolve) => retryServer.server.close(resolve));
  }
  if (failedServer) {
    await new Promise((resolve) => failedServer.server.close(resolve));
  }
  if (slowServer) {
    await new Promise((resolve) => slowServer.close(resolve));
  }
  if (retryRoot) fs.rmSync(retryRoot, { recursive: true, force: true });
  if (failedRoot) fs.rmSync(failedRoot, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
}
