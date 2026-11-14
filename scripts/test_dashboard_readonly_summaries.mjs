// Synthetic ROOT only. Starts a loopback fixture server; never calls live services.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../', import.meta.url));
const root = fs.mkdtempSync('/tmp/opencode/dashboard-readonly-');
process.env.ROOT = root;
const discovery = await import('./lib/dashboard_discovery.mjs');
const automation = await import('./lib/dashboard_automation.mjs');
const feedback = await import('./lib/feedback_learning.mjs');
const learningPath = 'data/dashboard/learning/discovery_learning_state.json';
const autoLearningPath = 'data/dashboard/learning/automation_learning_state.json';
const canaryPath = 'docs/reference/ERP_KB_Dashboard_Canary_Readiness_Report.json';
const configPath = 'data/dashboard/automation/config.json';

function write(relative, value) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value));
}

// Includes directories, byte contents, permissions and mtimes; ignores atime.
function snapshot() {
  function visit(dir) {
    return fs.readdirSync(dir).sort().flatMap((name) => {
      const target = path.join(dir, name);
      const stat = fs.statSync(target, { bigint: true });
      const entry = { path: path.relative(root, target), mode: String(stat.mode), mtime: String(stat.mtimeNs) };
      return stat.isDirectory() ? [entry, ...visit(target)] : [{ ...entry, content: fs.readFileSync(target).toString('base64') }];
    });
  }
  return visit(root);
}

function seed() {
  for (const name of fs.readdirSync(root)) fs.rmSync(path.join(root, name), { recursive: true, force: true });
  write('docs/reference/knowledge_inbox/registry.json', { entries: [] });
  write(configPath, { enabled: true, paused: true, shadowOnly: true, publicationApproved: false });
  // Five recent assessments yield 60%, but all 36 yield 8/36 = 22.22%.
  // 495 newer unreviewed items push the other 31 assessments past the UI cap.
  for (let i = 0; i < 531; i += 1) {
    const reviewedIndex = i - 495;
    const reviewed = reviewedIndex >= 0;
    const reject = reviewedIndex < 5 ? reviewedIndex < 3 : reviewedIndex < 10;
    write(`data/dashboard/discovery/candidates/c${i}.json`, {
      id: `c${i}`, kbNamespace: 'ComarchOptimaReference',
      canonicalUrl: `https://pomoc.comarch.pl/fixture/${i}`,
      sourceTier: 'official', queryId: 'seed_ComarchOptimaReference',
      createdAt: new Date(Date.UTC(2026, 10, 13) - i * 1000).toISOString(),
      action: 'CANDIDATE_ONLY', status: reviewed ? (reject ? 'REJECTED' : 'DRAFTED') : 'CANDIDATE_ONLY',
      assessment: { confidence: 0.99, duplicateRisk: 'low', contentRisk: 'low' },
      ...(reviewed ? { operatorDecision: {
        source: 'operator', actualAction: reject ? 'REJECT' : 'CREATE_DRAFT',
        decidedAt: '2026-11-13T00:00:00Z',
      } } : {}),
    });
  }
}

let child;
let base;
async function startFixtureServer() {
  const reservation = net.createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  child = spawn(process.execPath, [path.join(repo, 'scripts/erp_kb_dashboard_server.mjs')], {
    cwd: repo,
    // Deliberately do not inherit credentials or provider configuration.
    env: {
      PATH: process.env.PATH, HOME: root, ROOT: root,
      OPENSPG_COOKIE: 'synthetic-cookie', OPENSPG_COOKIE_FILE: path.join(root, 'unused-cookie'),
      OPENSPG_API_BASE: 'http://127.0.0.1:1', ERP_KB_MCP_BASE_URL: 'http://127.0.0.1:1',
      ERP_KB_DASHBOARD_HOST: '127.0.0.1', ERP_KB_DASHBOARD_PORT: String(port),
      ERP_KB_DASHBOARD_ALLOW_ANON: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', (chunk) => { logs += chunk; });
  child.stderr.on('data', (chunk) => { logs += chunk; });
  base = `http://127.0.0.1:${port}/panel`;
  for (let i = 0; i < 100; i += 1) {
    if (child.exitCode != null) throw new Error(`Fixture server exited: ${logs}`);
    try {
      const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(1000) });
      if (res.ok) return;
    } catch { /* fixture server starting */ }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Fixture server not ready: ${logs}`);
}

async function get(route) {
  const res = await fetch(`${base}${route}`, { signal: AbortSignal.timeout(15000) });
  const body = await res.json();
  assert.equal(res.status, 200, `${route}: ${JSON.stringify(body)}`);
  return body;
}

try {
  await test('discovery summary uses the pipeline window without creating learning state', () => {
    seed();
    const before = snapshot();
    const summary = discovery.discoverySummary();
    assert.equal(summary.learning.overall.candidates, 531);
    assert.equal(summary.learning.byDomain['pomoc.comarch.pl'].reviewed, 36);
    assert.equal(summary.learning.byDomain['pomoc.comarch.pl'].noisePenalty, 0.2222);
    assert.equal(summary.candidates.length, 500);
    assert(summary.candidates.every((candidate) => Number(candidate.id.slice(1)) < 500));
    assert.deepEqual(snapshot(), before);
  });

  await test('summary preserves stored domain override and never overwrites its snapshot', () => {
    seed();
    write(learningPath, { generatedAt: 'old', byDomain: {
      'pomoc.comarch.pl': { reviewed: 5, accepted: 2, rejected: 3, noisePenalty: 0.6, operatorOverride: 0.15 },
    } });
    const before = snapshot();
    const summary = discovery.discoverySummary();
    assert.equal(summary.learning.byDomain['pomoc.comarch.pl'].noisePenalty, 0.2222);
    assert.equal(summary.learning.byDomain['pomoc.comarch.pl'].operatorOverride, 0.15);
    assert.deepEqual(snapshot(), before);
  });

  await test('automation summary renders canary in memory without creating files', () => {
    seed();
    const before = snapshot();
    const summary = automation.automationSummary();
    assert.equal(summary.canaryReport.overall, 'BLOCKED');
    assert.equal(summary.canaryReport.gate.checks.automationReady, false);
    assert.equal(summary.config.paused, true);
    assert.equal(summary.config.publicationApproved, false);
    assert.deepEqual(snapshot(), before);
  });

  await test('automation summary does not repair corrupt JSON or stale Markdown', () => {
    seed();
    write(canaryPath, '{broken\n');
    write(canaryPath.replace('.json', '.md'), 'stale markdown');
    write(autoLearningPath, { marker: 'preserve' });
    const before = snapshot();
    assert.equal(automation.automationSummary().canaryReport.overall, 'BLOCKED');
    assert.deepEqual(snapshot(), before);
  });

  await test('existing explicit writers still persist learning and repair canary artifacts', () => {
    seed();
    feedback.deriveDiscoveryLearningState(discovery.listDiscoveryCandidates(5000));
    assert.equal(JSON.parse(fs.readFileSync(path.join(root, learningPath))).byDomain['pomoc.comarch.pl'].noisePenalty, 0.2222);
    feedback.deriveAutomationLearningState([]);
    assert(fs.existsSync(path.join(root, autoLearningPath)));
    write(canaryPath, '{broken\n');
    const report = automation.refreshAutomationCanaryReport();
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, canaryPath))), report);
    assert(fs.readFileSync(path.join(root, canaryPath.replace('.json', '.md')), 'utf8').includes('BLOCKED'));
  });

  await test('domain alerts use current candidates rather than a stale low-noise snapshot', () => {
    seed();
    for (let i = 500; i < 531; i += 1) {
      fs.unlinkSync(path.join(root, `data/dashboard/discovery/candidates/c${i}.json`));
    }
    write(learningPath, { byDomain: {
      'pomoc.comarch.pl': { noisePenalty: 0.2222, operatorOverride: null },
    } });
    const before = snapshot();
    const alert = discovery.detectAnomalies().find((item) => item.type === 'high_noise_domain');
    assert(alert, 'Current high-noise candidates must produce an alert despite a stale low-noise snapshot');
    assert.equal(alert.kbNamespace, 'pomoc.comarch.pl');
    assert.equal(alert.value, '0.60');
    assert.deepEqual(snapshot(), before);
  });

  await test('default priority and canary queue calculations do not persist learning', () => {
    seed();
    const before = snapshot();
    const candidate = discovery.listDiscoveryCandidates(1)[0];
    assert.equal(typeof discovery.discoveryCandidatePriority(candidate).score, 'number');
    assert.deepEqual(automation.automationCanaryQueue(), []);
    assert.deepEqual(snapshot(), before);
  });

  await test('corrupt override storage does not block candidate metrics or unrelated automation alerts', () => {
    seed();
    write(learningPath, '{broken override storage\n');
    write(autoLearningPath, { byKbNamespace: { ComarchCommunityNews: { windowFpRate: 0.2 } } });
    const before = snapshot();
    assert.equal(discovery.discoverySummary().learning.byDomain['pomoc.comarch.pl'].noisePenalty, 0.2222);
    const alert = discovery.detectAnomalies().find((item) => item.type === 'high_fp_rate');
    assert(alert, 'Malformed discovery override storage must not suppress automation FP alerts');
    assert.equal(alert.kbNamespace, 'ComarchCommunityNews');
    assert.deepEqual(snapshot(), before);
  });

  await test('stored-only domain overrides remain visible with neutral metrics, including zero', () => {
    seed();
    write(learningPath, { byDomain: {
      'absent.example.org': { reviewed: 20, accepted: 0, rejected: 20, noisePenalty: 0.8, operatorOverride: 0.35 },
      'zero.example.org': { noisePenalty: 0.8, operatorOverride: 0 },
    } });
    const before = snapshot();
    const learning = discovery.discoverySummary().learning;
    const absent = learning.byDomain['absent.example.org'];
    assert(absent, 'Stored-only override must retain its UI removal control');
    assert.equal(absent.operatorOverride, 0.35);
    assert.equal(absent.reviewed, 0);
    assert.equal(absent.accepted, 0);
    assert.equal(absent.rejected, 0);
    assert.equal(absent.noisePenalty, 0);
    assert.equal(absent.acceptanceRate, null);
    assert.equal(learning.byDomain['zero.example.org'].operatorOverride, 0);
    assert.deepEqual(snapshot(), before);
  });

  await test('GET learning/alerts/discovery/status agree regardless of order and leave files unchanged', async () => {
    seed();
    write(learningPath, { byDomain: {
      'pomoc.comarch.pl': { reviewed: 5, accepted: 2, rejected: 3, noisePenalty: 0.6, operatorOverride: null },
    } });
    write(canaryPath, '{broken\n');
    await startFixtureServer();
    const before = snapshot();
    for (const route of ['/api/automation/learning', '/api/automation/alerts',
      '/api/discovery', '/api/status', '/api/automation', '/api/automation/alerts', '/api/automation/learning']) {
      const body = await get(route);
      if (route.endsWith('/learning')) assert.equal(body.penalties['pomoc.comarch.pl'].noisePenalty, 0.2222);
      if (route.endsWith('/alerts')) assert(!body.alerts.some((alert) => alert.type === 'high_noise_domain'));
      if (route === '/api/discovery') assert.equal(body.discovery.learning.byDomain['pomoc.comarch.pl'].noisePenalty, 0.2222);
      if (route === '/api/status') {
        assert.equal(body.reports.find((report) => report.key === 'dashboard_canary').overallStatus, 'INVALID');
        assert(body.alerts.some((alert) => alert.message === 'Invalid JSON report: Dashboard Canary Readiness'));
      }
      if (body.automation) assert.equal(body.automation.canaryReport.overall, 'BLOCKED');
      assert.deepEqual(snapshot(), before, `GET ${route} mutated the fixture`);
    }
  });

  await test('cold-start GETs return empty snapshots without creating state or report directories', async () => {
    for (const name of fs.readdirSync(root)) fs.rmSync(path.join(root, name), { recursive: true, force: true });
    const before = snapshot();
    for (const route of ['/api/automation', '/api/discovery', '/api/status', '/api/automation/learning']) {
      await get(route);
      assert.deepEqual(snapshot(), before, `GET ${route} created fixture state`);
    }
  });

  await test('HTTP reads tolerate corrupt overrides and preserve stored-only override controls', async () => {
    seed();
    write(learningPath, '{broken\n');
    write(autoLearningPath, { byKbNamespace: { ComarchCommunityNews: { windowFpRate: 0.2 } } });
    const before = snapshot();
    for (const route of ['/api/discovery', '/api/status', '/api/automation/alerts', '/api/automation/learning']) {
      const body = await get(route);
      if (route.endsWith('/alerts')) assert(body.alerts.some((alert) => alert.type === 'high_fp_rate'));
      if (route.endsWith('/learning')) assert.equal(body.penalties['pomoc.comarch.pl'].noisePenalty, 0.2222);
      assert.deepEqual(snapshot(), before);
    }
    write(learningPath, { byDomain: {
      'absent.example.org': { reviewed: 20, rejected: 20, noisePenalty: 0.8, operatorOverride: 0 },
    } });
    const withOverride = snapshot();
    const body = await get('/api/automation/learning');
    assert.equal(body.penalties['absent.example.org'].operatorOverride, 0);
    assert.equal(body.penalties['absent.example.org'].total, 0);
    assert.equal(body.penalties['absent.example.org'].noisePenalty, 0);
    assert.deepEqual(snapshot(), withOverride);
  });
} finally {
  if (child && child.exitCode == null) {
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    await exited;
  }
  fs.rmSync(root, { recursive: true, force: true });
}
