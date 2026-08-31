#!/usr/bin/env node

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import process from 'process';
import { spawnSync } from 'child_process';
import { assertSafeHttpUrl } from './lib/safe_http.mjs';

const REPO_ROOT = process.env.ROOT || '/docker/openspg';

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function createDraft(root, suffix) {
  const id = `draft_2026-06-06_test_${suffix}`;
  const draft = {
    id,
    kbName: 'Comarch Optima Reference',
    kbNamespace: 'ComarchOptimaReference',
    title: `Automation test ${suffix}`,
    content: `This is a deterministic automation fixture for ${suffix}. `.repeat(8),
    sourceUrl: `https://pomoc.comarch.pl/test/${suffix}`,
    tags: ['automation', 'test'],
    metadata: {
      sourceTier: 'official',
      retrievedAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
  };
  writeJson(path.join(root, 'downloads/knowledge_inbox/2026-06-06', `${id}.json`), draft);
  fs.writeFileSync(
    path.join(root, 'downloads/knowledge_inbox/2026-06-06', `${id}.md`),
    `# ${draft.title}\n\n${draft.content}\n`,
    'utf8',
  );
  return draft;
}

function runAutomation(root, draftId, mode, mockFile) {
  return spawnSync(process.execPath, [
    path.join(REPO_ROOT, 'scripts/run_dashboard_automation.mjs'),
    '--draft',
    draftId,
  ], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      ROOT: root,
      ERP_KB_AUTOMATION_ENABLED: '1',
      ERP_KB_AUTOMATION_LLM_MOCK_FILE: mockFile,
      ERP_KB_AUTOMATION_MOCK_PIPELINE: mode,
    },
    encoding: 'utf8',
  });
}

function runShadowHistory(root, mockFile) {
  return spawnSync(process.execPath, [
    path.join(REPO_ROOT, 'scripts/run_dashboard_automation.mjs'),
    '--shadow-history',
    '--limit',
    '20',
  ], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      ROOT: root,
      ERP_KB_AUTOMATION_LLM_MOCK_FILE: mockFile,
      ERP_KB_AUTOMATION_MOCK_PIPELINE: 'success',
    },
    encoding: 'utf8',
  });
}

function runShadowDraft(root, draftId, mockFile) {
  return spawnSync(process.execPath, [
    path.join(REPO_ROOT, 'scripts/run_dashboard_automation.mjs'),
    '--shadow',
    draftId,
  ], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      ROOT: root,
      ERP_KB_AUTOMATION_LLM_MOCK_FILE: mockFile,
      ERP_KB_AUTOMATION_MOCK_PIPELINE: 'success',
    },
    encoding: 'utf8',
  });
}

function runHealthCheck(root, mock, threshold = 2) {
  return spawnSync(process.execPath, [
    path.join(REPO_ROOT, 'scripts/check_dashboard_llm_health.mjs'),
  ], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      ROOT: root,
      ERP_KB_AUTOMATION_LLM_HEALTH_MOCK: mock,
      ERP_KB_AUTOMATION_LLM_HEALTH_FAILURE_THRESHOLD: String(threshold),
    },
    encoding: 'utf8',
  });
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-kb-dashboard-automation-'));
try {
  await assert.rejects(
    () => assertSafeHttpUrl('http://127.0.0.1/private'),
    /Private IP address/,
  );
  writeJson(path.join(root, 'docs/reference/knowledge_inbox/registry.json'), {
    generatedAt: new Date().toISOString(),
    entries: [],
  });
  const mockFile = path.join(root, 'llm-review.json');
  writeJson(mockFile, {
    decision: 'approve',
    confidence: 0.98,
    targetKb: 'ComarchOptimaReference',
    sourceQuality: 'high',
    factuality: 'high',
    duplicateRisk: 'low',
    contentRisk: 'low',
    reasons: ['Official source and coherent content.'],
    title: 'Reviewed automation test',
    tags: ['automation', 'official'],
  });

  const successDraft = createDraft(root, 'success');
  const success = runAutomation(root, successDraft.id, 'success', mockFile);
  assert.strictEqual(success.status, 0, success.stderr || success.stdout);
  const successPayload = JSON.parse(success.stdout);
  assert.strictEqual(successPayload.status, 'PUBLISHED');
  const successRegistry = JSON.parse(fs.readFileSync(
    path.join(root, 'docs/reference/knowledge_inbox/registry.json'),
    'utf8',
  ));
  assert.strictEqual(
    successRegistry.entries.find((entry) => entry.draftId === successDraft.id)?.status,
    'promoted',
  );

  const rollbackDraft = createDraft(root, 'rollback');
  const rollback = runAutomation(root, rollbackDraft.id, 'regression', mockFile);
  assert.strictEqual(rollback.status, 0, rollback.stderr || rollback.stdout);
  const rollbackPayload = JSON.parse(rollback.stdout);
  assert.strictEqual(rollbackPayload.status, 'ROLLED_BACK');
  const rollbackRegistry = JSON.parse(fs.readFileSync(
    path.join(root, 'docs/reference/knowledge_inbox/registry.json'),
    'utf8',
  ));
  assert.strictEqual(
    rollbackRegistry.entries.some((entry) => entry.draftId === rollbackDraft.id),
    false,
  );
  assert.strictEqual(
    fs.existsSync(path.join(
      root,
      'docs/reference/knowledge_inbox/promoted/ComarchOptimaReference',
      `${rollbackDraft.id}.json`,
    )),
    false,
  );

  const rerouteDraft = createDraft(root, 'reroute');
  const rerouteMockFile = path.join(root, 'llm-reroute-review.json');
  writeJson(rerouteMockFile, {
    decision: 'approve',
    confidence: 0.98,
    targetKb: 'ComarchBetterflyReference',
    sourceQuality: 'high',
    factuality: 'high',
    duplicateRisk: 'low',
    contentRisk: 'low',
    reasons: ['The content belongs in the Betterfly reference KB.'],
    title: 'Rerouted automation test',
    tags: ['automation', 'betterfly'],
  });
  const registryBeforeReroute = fs.readFileSync(
    path.join(root, 'docs/reference/knowledge_inbox/registry.json'),
    'utf8',
  );
  const reroute = runShadowDraft(root, rerouteDraft.id, rerouteMockFile);
  assert.strictEqual(reroute.status, 0, reroute.stderr || reroute.stdout);
  const reroutePayload = JSON.parse(reroute.stdout);
  assert.strictEqual(reroutePayload.status, 'REROUTE_PROPOSED');
  assert.strictEqual(reroutePayload.reroute.targetKb, 'ComarchBetterflyReference');
  assert.strictEqual(reroutePayload.shadow.actualAction, 'reroute');
  assert.strictEqual(
    fs.readFileSync(path.join(root, 'docs/reference/knowledge_inbox/registry.json'), 'utf8'),
    registryBeforeReroute,
  );

  process.env.ROOT = root;
  delete process.env.ERP_KB_AUTOMATION_SHADOW_ONLY;
  delete process.env.ERP_KB_AUTOMATION_ENABLED;
  const automation = await import(`./lib/dashboard_automation.mjs?test=${Date.now()}`);
  const { deriveAutomationLearningState } = await import(
    `./lib/feedback_learning.mjs?test=${Date.now()}`
  );
  const adjudicatedReroute = automation.adjudicateAutomationJob(
    reroutePayload.id,
    'reroute',
    'test-operator',
  );
  assert.strictEqual(adjudicatedReroute.adjudication.correct, true);
  process.env.ERP_KB_AUTOMATION_LLM_MOCK_FILE = rerouteMockFile;
  process.env.ERP_KB_AUTOMATION_MOCK_PIPELINE = 'success';
  const appliedReroute = automation.applyAutomationReroute(
    reroutePayload.id,
    'test-operator',
    'Validated reroute fixture',
  );
  assert.strictEqual(appliedReroute.job.status, 'REROUTED');
  assert.strictEqual(appliedReroute.draft.kbNamespace, 'ComarchBetterflyReference');
  assert.strictEqual(appliedReroute.reviewJob.reroutedFrom, reroutePayload.id);
  assert.strictEqual(appliedReroute.reviewJob.mode, 'shadow');
  const reviewDeadline = Date.now() + 5000;
  let postRerouteReview = automation.readAutomationJob(appliedReroute.reviewJob.id);
  while (
    Date.now() < reviewDeadline
    && ['QUEUED', 'RUNNING'].includes(postRerouteReview?.status)
  ) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    postRerouteReview = automation.readAutomationJob(appliedReroute.reviewJob.id);
  }
  assert.strictEqual(postRerouteReview.status, 'SHADOW_COMPLETE');
  const reroutedRawDraft = JSON.parse(fs.readFileSync(
    rerouteDraft.rawJsonPath || path.join(
      root,
      'downloads/knowledge_inbox/2026-06-06',
      `${rerouteDraft.id}.json`,
    ),
    'utf8',
  ));
  assert.strictEqual(reroutedRawDraft.kbNamespace, 'ComarchBetterflyReference');
  assert.strictEqual(reroutedRawDraft.metadata.routingHistory.at(-1).automationJobId, reroutePayload.id);
  assert.throws(
    () => automation.applyAutomationReroute(reroutePayload.id, 'test-operator'),
    /does not have an applicable reroute proposal|already applied/,
  );

  const pendingDraft = createDraft(root, 'pending-exception');
  automation.saveAutomationJob({
    id: 'job_stale_exception',
    draftId: successDraft.id,
    title: successDraft.title,
    kbNamespace: successDraft.kbNamespace,
    status: 'EXCEPTION',
    stage: 'EXCEPTION',
    mode: 'shadow',
    origin: 'live',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    error: 'historical exception on promoted draft',
  });
  automation.saveAutomationJob({
    id: 'job_actionable_exception',
    draftId: pendingDraft.id,
    title: pendingDraft.title,
    kbNamespace: pendingDraft.kbNamespace,
    status: 'EXCEPTION',
    stage: 'EXCEPTION',
    mode: 'shadow',
    origin: 'live',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    error: 'actionable exception on pending draft',
  });
  automation.saveAutomationJob({
    id: 'job_stale_reroute',
    draftId: successDraft.id,
    title: successDraft.title,
    kbNamespace: successDraft.kbNamespace,
    status: 'REROUTE_PROPOSED',
    stage: 'REROUTE_PROPOSED',
    mode: 'shadow',
    origin: 'live',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    reroute: { sourceKb: successDraft.kbNamespace, targetKb: 'ComarchBetterflyReference' },
  });
  automation.saveAutomationJob({
    id: 'job_actionable_reroute',
    draftId: pendingDraft.id,
    title: pendingDraft.title,
    kbNamespace: pendingDraft.kbNamespace,
    status: 'REROUTE_PROPOSED',
    stage: 'REROUTE_PROPOSED',
    mode: 'shadow',
    origin: 'live',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    reroute: { sourceKb: pendingDraft.kbNamespace, targetKb: 'ComarchBetterflyReference' },
  });
  const actionableSummary = automation.automationSummary();
  assert.strictEqual(actionableSummary.exceptions.some((job) => job.id === 'job_stale_exception'), false);
  assert.strictEqual(actionableSummary.exceptions.some((job) => job.id === 'job_actionable_exception'), true);
  assert.strictEqual(actionableSummary.reroutes.some((job) => job.id === 'job_stale_reroute'), false);
  assert.strictEqual(actionableSummary.reroutes.some((job) => job.id === 'job_actionable_reroute'), true);

  const registryBeforeShadow = fs.readFileSync(
    path.join(root, 'docs/reference/knowledge_inbox/registry.json'),
    'utf8',
  );
  const shadow = runShadowHistory(root, mockFile);
  assert.strictEqual(shadow.status, 0, shadow.stderr || shadow.stdout);
  const shadowPayload = JSON.parse(shadow.stdout);
  assert.strictEqual(shadowPayload.report.summary.complete, 1);
  assert.strictEqual(shadowPayload.report.summary.matches, 1);
  assert.strictEqual(
    fs.readFileSync(path.join(root, 'docs/reference/knowledge_inbox/registry.json'), 'utf8'),
    registryBeforeShadow,
  );

  writeJson(path.join(root, 'data/dashboard/automation/config.json'), {
    enabled: true,
    paused: false,
    shadowOnly: true,
    allowedNamespaces: ['ComarchCommunityNews'],
    minimumConfidence: 0.9,
    autoRollback: true,
    canaryMinimumSamples: 20,
    canaryMinimumAccuracy: 0.95,
    canaryMaximumFalsePositives: 0,
    publicationApproved: false,
  });
  const healthFailure = runHealthCheck(root, 'fail', 1);
  assert.strictEqual(healthFailure.status, 1, healthFailure.stderr || healthFailure.stdout);
  assert.strictEqual(
    JSON.parse(fs.readFileSync(path.join(root, 'data/dashboard/automation/config.json'), 'utf8')).paused,
    true,
  );
  const healthRecovery = runHealthCheck(root, 'success', 1);
  assert.strictEqual(healthRecovery.status, 0, healthRecovery.stderr || healthRecovery.stdout);
  const recoveredConfig = JSON.parse(fs.readFileSync(
    path.join(root, 'data/dashboard/automation/config.json'),
    'utf8',
  ));
  assert.strictEqual(recoveredConfig.paused, true);

  const jobsRoot = path.join(root, 'data/dashboard/automation/jobs');
  for (let index = 0; index < 20; index += 1) {
    const id = `automation_gate_${String(index + 1).padStart(2, '0')}`;
    writeJson(path.join(jobsRoot, `${id}.json`), {
      id,
      draftId: `gate_draft_${index + 1}`,
      title: `Gate sample ${index + 1}`,
      kbNamespace: 'ComarchCommunityNews',
      mode: 'shadow',
      origin: 'live',
      status: 'SHADOW_COMPLETE',
      stage: 'SHADOW_COMPLETE',
      createdAt: new Date(Date.now() + index).toISOString(),
      updatedAt: new Date(Date.now() + index).toISOString(),
      shadow: { publishable: true, actualAction: 'publish' },
      adjudication: {
        expectedAction: 'publish',
        actualAction: 'publish',
        correct: true,
        operator: 'test',
        adjudicatedAt: new Date().toISOString(),
      },
    });
  }
  writeJson(path.join(jobsRoot, 'automation_gate_repeat.json'), {
    id: 'automation_gate_repeat',
    draftId: 'gate_draft_1',
    title: 'Repeated decision for one draft',
    kbNamespace: 'ComarchCommunityNews',
    mode: 'shadow',
    origin: 'live',
    status: 'SHADOW_COMPLETE',
    stage: 'SHADOW_COMPLETE',
    createdAt: new Date(Date.now() + 100).toISOString(),
    updatedAt: new Date(Date.now() + 100).toISOString(),
    shadow: { publishable: true, actualAction: 'publish' },
    adjudication: {
      expectedAction: 'publish',
      actualAction: 'publish',
      correct: true,
      operator: 'test',
      adjudicatedAt: new Date().toISOString(),
    },
  });

  let gate = automation.evaluateAutomationPromotionGate();
  assert.strictEqual(gate.eligible, false);
  assert.strictEqual(gate.checks.automationReady, false);
  automation.saveAutomationConfig({ paused: false }, 'test');
  gate = automation.evaluateAutomationPromotionGate();
  assert.strictEqual(gate.eligible, true);
  assert.strictEqual(gate.approved, false);
  assert.strictEqual(gate.metrics.samples, 20);
  assert.strictEqual(gate.metrics.decisions, 21);
  assert.strictEqual(gate.metrics.accuracy, 1);
  const approved = automation.approveAutomationPublication('test-admin');
  assert.strictEqual(approved.gate.approved, true);
  assert.strictEqual(approved.config.publicationApprovedBy, 'test-admin');
  assert.strictEqual(automation.saveAutomationConfig({ shadowOnly: false }, 'test-admin').shadowOnly, false);
  const policyChanged = automation.saveAutomationConfig({ minimumConfidence: 0.91 }, 'test-admin');
  assert.strictEqual(policyChanged.publicationApproved, false);
  assert.strictEqual(policyChanged.shadowOnly, true);
  await assert.rejects(
    async () => automation.saveAutomationConfig({ shadowOnly: false }, 'test-admin'),
    /Publication mode is locked/,
  );

  const audit = await import(`./lib/dashboard_audit.mjs?test=${Date.now()}`);
  const auditVerification = audit.verifyDashboardAudit();
  assert.strictEqual(auditVerification.ok, true);
  assert(auditVerification.checked > 0);
  assert(
    audit.listDashboardAudit({ limit: 100 })
      .some((event) => event.action === 'automation.reroute.apply'),
  );
  const auditFile = path.join(
    root,
    'data/dashboard/audit',
    `${new Date().toISOString().slice(0, 10)}.jsonl`,
  );
  const validAudit = fs.readFileSync(auditFile, 'utf8');
  fs.appendFileSync(auditFile, '{malformed\n', 'utf8');
  assert.strictEqual(audit.verifyDashboardAudit().ok, false);
  assert(
    audit.verifyDashboardAudit().problems.some((problem) => problem.problem === 'malformed_json'),
  );
  fs.writeFileSync(auditFile, validAudit, 'utf8');
  assert.strictEqual(audit.verifyDashboardAudit().ok, true);
  const auditLines = validAudit.split(/\r?\n/).filter(Boolean);
  fs.writeFileSync(auditFile, `${auditLines.slice(1).join('\n')}\n`, 'utf8');
  assert(
    audit.verifyDashboardAudit().problems
      .some((problem) => problem.problem === 'chain_origin_mismatch'),
  );
  fs.writeFileSync(auditFile, validAudit, 'utf8');
  assert.strictEqual(
    fs.existsSync(path.join(
      root,
      'docs/reference/ERP_KB_Dashboard_Canary_Readiness_Report.json',
    )),
    true,
  );
  const canaryJsonPath = path.join(
    root,
    'docs/reference/ERP_KB_Dashboard_Canary_Readiness_Report.json',
  );
  const canaryMarkdownPath = canaryJsonPath.replace(/\.json$/, '.md');
  automation.refreshAutomationCanaryReport();
  const stableCanaryJson = fs.readFileSync(canaryJsonPath);
  const stableCanaryMarkdown = fs.readFileSync(canaryMarkdownPath);
  const stableCanaryReport = JSON.parse(stableCanaryJson.toString('utf8'));
  await new Promise((resolve) => setTimeout(resolve, 25));
  const nextGeneratedAt = new Date().toISOString();
  assert.notStrictEqual(nextGeneratedAt, stableCanaryReport.generatedAt);
  const nextLearningGeneratedAt = deriveAutomationLearningState(
    automation.listAutomationJobs(500),
    { persist: false },
  ).generatedAt;
  assert.notStrictEqual(nextLearningGeneratedAt, stableCanaryReport.learning.generatedAt);
  const unchangedCanaryReport = automation.refreshAutomationCanaryReport();
  assert.deepStrictEqual(unchangedCanaryReport, stableCanaryReport);
  assert.deepStrictEqual(fs.readFileSync(canaryJsonPath), stableCanaryJson);
  assert.deepStrictEqual(fs.readFileSync(canaryMarkdownPath), stableCanaryMarkdown);

  fs.writeFileSync(canaryMarkdownPath, '# stale canary report\n', 'utf8');
  const staleMarkdownRepair = automation.refreshAutomationCanaryReport();
  assert.deepStrictEqual(staleMarkdownRepair, stableCanaryReport);
  assert.deepStrictEqual(fs.readFileSync(canaryJsonPath), stableCanaryJson);
  assert.deepStrictEqual(fs.readFileSync(canaryMarkdownPath), stableCanaryMarkdown);

  fs.rmSync(canaryMarkdownPath);
  const missingMarkdownRepair = automation.refreshAutomationCanaryReport();
  assert.deepStrictEqual(missingMarkdownRepair, stableCanaryReport);
  assert.deepStrictEqual(fs.readFileSync(canaryJsonPath), stableCanaryJson);
  assert.deepStrictEqual(fs.readFileSync(canaryMarkdownPath), stableCanaryMarkdown);

  fs.writeFileSync(canaryJsonPath, '{malformed\n', 'utf8');
  const recoveredCanaryReport = automation.refreshAutomationCanaryReport();
  const recoveredCanaryJson = fs.readFileSync(canaryJsonPath);
  assert.deepStrictEqual(JSON.parse(recoveredCanaryJson.toString('utf8')), recoveredCanaryReport);
  assert.strictEqual(
    fs.readFileSync(canaryMarkdownPath, 'utf8'),
    stableCanaryMarkdown.toString('utf8').replace(
      stableCanaryReport.generatedAt,
      recoveredCanaryReport.generatedAt,
    ),
  );

  const automationModule = await import(`./lib/dashboard_automation.mjs?test=${Date.now()}`);
  assert.throws(
    () => automationModule.applyAutomationRerouteAuto({ id: 'x', kbNamespace: 'Src', status: 'REVIEWED' }, {}),
    /does not have a reroute proposal/,
    'Should reject job without reroute',
  );
  assert.throws(
    () => automationModule.applyAutomationRerouteAuto(
      { id: 'x', kbNamespace: 'Src', status: 'REROUTE_PROPOSED', draftId: 'd', reroute: { targetKb: 'Dst' } },
      { reroutePairs: { 'Src->Dst': { correctRate: 0.5, reviewed: 3 } } },
    ),
    /does not meet auto-apply threshold/,
    'Should reject pair below threshold',
  );

  process.stdout.write(`${JSON.stringify({
    ok: true,
    checks: [
      'ssrf_private_ip_block',
      'publish_success',
      'regression_rollback',
      'reroute_proposed_no_mutation',
      'reroute_apply_and_re_review',
      'reroute_single_apply_guard',
      'shadow_history_no_mutation',
      'llm_health_auto_pause',
      'llm_health_no_auto_resume',
      'canary_gate_approval',
      'policy_change_invalidates_approval',
      'audit_hash_chain',
      'audit_malformed_line_detection',
      'audit_origin_deletion_detection',
      'canary_readiness_report',
      'canary_readiness_report_timestamp_stability',
      'canary_readiness_report_artifact_recovery',
      'auto_reroute_threshold_rejection',
    ],
  }, null, 2)}\n`);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
