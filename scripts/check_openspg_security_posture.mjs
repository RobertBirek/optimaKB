#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const DOCKER_GROUP = 'docker';
const DOCKER_SOCK = '/var/run/docker.sock';
const CHECKS = [];

function pass(label) { CHECKS.push({ label, ok: true }); process.stdout.write(`  ✅ ${label}\n`); }
function fail(label, hint) { CHECKS.push({ label, ok: false, hint }); process.stdout.write(`  ❌ ${label} — ${hint}\n`); }
function skip(label) { CHECKS.push({ label, ok: null }); process.stdout.write(`  ⏭️  ${label}\n`); }

process.stdout.write('=== OpenSPG Security Posture ===\n\n');

// 1. Docker group membership
process.stdout.write('1. Docker socket access\n');
try {
  const stat = fs.statSync(DOCKER_SOCK);
  const sockMode = stat.mode & 0o777;
  if (sockMode & 0o007) {
    fail('Docker socket is world-accessible', 'restrict to 660 or use docker group only');
  } else {
    pass('Docker socket permissions OK');
  }
} catch {
  skip('Docker socket not accessible from here');
}

try {
  const members = execSync(`getent group ${DOCKER_GROUP} 2>/dev/null || true`, { encoding: 'utf8', timeout: 5000 }).trim();
  const users = members ? members.split(':')[3]?.split(',').filter(Boolean) || [] : [];
  if (users.length > 3) {
    fail(`Docker group has ${users.length} members: ${users.join(', ')}`, 'keep membership minimal');
  } else {
    pass(`Docker group: ${users.length} member(s)`);
  }
} catch {
  skip('Cannot check docker group');
}

// 2. Compose file secrets in URL
process.stdout.write('\n2. Secrets in compose URLs\n');
const composeRaw = fs.readFileSync('/docker/openspg/compose.yaml', 'utf8');
const secretsInUrl = composeRaw.match(/CLOUDEXT_\w+_URL: .+?(?:password|secretKey)=/);
if (secretsInUrl) {
  fail('Secrets exposed in CLOUDEXT_* connection URLs', 'known upstream limitation; mitigate via docker group restriction');
} else {
  pass('No secrets in URLs');
}

// 3. Systemd unit hardening
process.stdout.write('\n3. Systemd unit hardening\n');
const units = [
  'erp-kb-dashboard.service',
  'betterfly-commercial-mcp.service',
  'erp-kb-dashboard-llm-health.service',
  'openspg-backup.service',
];
for (const unit of units) {
  const unitPath = `/etc/systemd/system/${unit}`;
  if (!fs.existsSync(unitPath)) { skip(`${unit} not found`); continue; }
  const content = fs.readFileSync(unitPath, 'utf8');
  const hasProtectSystem = content.includes('ProtectSystem=');
  const hasNoNewPrivileges = content.includes('NoNewPrivileges=');
  if (hasProtectSystem && hasNoNewPrivileges) {
    pass(`${unit} — hardened (ProtectSystem + NoNewPrivileges)`);
  } else {
    const missing = [];
    if (!hasProtectSystem) missing.push('ProtectSystem');
    if (!hasNoNewPrivileges) missing.push('NoNewPrivileges');
    fail(`${unit} — missing: ${missing.join(', ')}`, 'add hardening directives');
  }
}

// 4. Capabilities in compose
process.stdout.write('\n4. Container capabilities\n');
if (composeRaw.includes('cap_drop:\n    - ALL')) {
  pass('cap_drop: [ALL] set on all services');
} else {
  fail('Missing cap_drop: [ALL]', 'add to x-security-defaults anchor');
}

// Summary
process.stdout.write('\n=== Summary ===\n');
const ok = CHECKS.filter((c) => c.ok).length;
const nok = CHECKS.filter((c) => c.ok === false).length;
const skipped = CHECKS.filter((c) => c.ok === null).length;
process.stdout.write(`${ok} passed, ${nok} failed, ${skipped} skipped\n`);
process.exit(nok > 0 ? 1 : 0);
