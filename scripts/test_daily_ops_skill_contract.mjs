// Offline reference-contract checks only: no runtime imports, writes or network.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const skill = fs.readFileSync(new URL('.agents/skills/openspg-daily-ops/SKILL.md', root), 'utf8');
const agents = [
  '.opencode/agent/daily-ops.md',
  '.claude/agents/daily-ops.md',
].map((file) => [file, fs.readFileSync(new URL(file, root), 'utf8')]);

test('triage references the live overview, pause latch and separate publication safeguards', () => {
  for (const field of ['/panel/api/status', 'paused', 'pauseReason', 'pausedAt', 'shadowOnly',
    'publicationApproved', 'llm_health_no_auto_resume']) assert(skill.includes(field), field);
  assert.match(skill, /does not automatically resume/i);
});

test('API reference identifies envelopes and excludes credentials from status examples', () => {
  for (const field of ['.discovery', '.autopilot', '.trends', '.overall', '.summary',
    'providerSecrets', 'projection']) assert(skill.includes(field), field);
  assert.match(skill, /null.*unknown/i);
  assert.match(skill, /HTTP.*timeout/i);
});

test('recovery and throttle reference match implementation rather than elapsed time guesses', () => {
  assert.match(skill, /KB.*7.*domain.*14/i);
  assert.match(skill, /48.*override/i);
  assert.match(skill, /removing.*override.*does not unfreeze/i);
  assert.match(skill, /throttle.*confidence threshold/i);
  assert.doesNotMatch(skill, /per-job delay|48h after last error|last 20 jobs/i);
});

test('timer reference distinguishes local timezone, jitter and configuration-dependent limits', () => {
  for (const value of ['OnCalendar', 'Europe/Warsaw', 'RandomizedDelaySec=300',
    'semiAutoMaxPerRun']) assert(skill.includes(value), value);
  assert.match(skill, /host.*timezone/i);
  assert.doesNotMatch(skill, /fires at 00\/06\/12\/18 UTC/i);
});

test('triage distinguishes anomaly provenance, historic failures and scoped queue counts', () => {
  for (const value of ['high_noise_domain', 'generatedAt', '423', '426', '500',
    'historical', 'GET /api/automation/learning']) assert(skill.includes(value), value);
  assert.match(skill, /not.*fresh incident/i);
});

test('skill keeps operational writes out of read-only triage', () => {
  assert.match(skill, /read-only/i);
  assert.match(skill, /explicit.*operator authorization/i);
  assert.match(skill, /report.*operator action/i);
  assert.doesNotMatch(skill, /sudo (?:chown|systemctl restart)|chmod 644|curl[^\n]*-X POST/);
  assert.doesNotMatch(skill, /Check autopilot state file|Clear stale autopilot state/i);
});

for (const [file, agent] of agents) {
  test(`${file} delegates to the skill without starting services or applying remediation`, () => {
    assert(agent.includes('openspg-daily-ops'), 'authoritative skill reference');
    assert.match(agent, /read-only/i);
    assert.match(agent, /Never POST\/PATCH/i);
    assert(agent.includes('/panel/api/status'), 'live overview');
    assert.doesNotMatch(agent, /docker compose up|node scripts\/erp_kb_dashboard_server\.mjs/);
  });
}
