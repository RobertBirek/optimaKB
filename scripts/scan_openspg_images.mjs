#!/usr/bin/env node
import { execSync } from 'node:child_process';
import process from 'node:process';

const IMAGES = [
  { env: 'OPENSPG_MYSQL_IMAGE', label: 'MySQL' },
  { env: 'OPENSPG_NEO4J_IMAGE', label: 'Neo4j' },
  { env: 'OPENSPG_MINIO_IMAGE', label: 'MinIO' },
  { env: 'OPENSPG_SERVER_IMAGE', label: 'OpenSPG Server' },
];

function loadImageRef(key) {
  return process.env[key] || '';
}

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 30000 }).trim();
  } catch {
    return '';
  }
}

function inspectImage(imageRef) {
  if (!imageRef) return { pulled: false, errors: ['No image reference'] };
  const localId = run(`docker image inspect --format '{{.Id}}' "${imageRef}" 2>/dev/null`);
  if (!localId) {
    return { pulled: false, errors: ['Not pulled locally'] };
  }
  const created = run("docker inspect --format '{{.Created}}' " + JSON.stringify(imageRef) + " 2>/dev/null");
  const size = run("docker inspect --format '{{.Size}}' " + JSON.stringify(imageRef) + " 2>/dev/null");
  const labels = run("docker inspect --format '{{json .Config.Labels}}' " + JSON.stringify(imageRef) + " 2>/dev/null");
  let labelsParsed = {};
  try { labelsParsed = JSON.parse(labels); } catch { /* ignore */ }
  return {
    pulled: true,
    created,
    sizeBytes: size ? Number(size) : 0,
    labels: labelsParsed,
  };
}

const results = [];

for (const { env, label } of IMAGES) {
  const imageRef = loadImageRef(env);
  process.stdout.write(`${label} (${env}): `);
  const info = inspectImage(imageRef);
  if (!info.pulled) {
    process.stdout.write(`NOT PULLED — ${info.errors.join(', ')}\n`);
    results.push({ label, env, status: 'not_pulled' });
    continue;
  }
  const sizeMB = (info.sizeBytes / 1024 / 1024).toFixed(0);
  const createdDate = info.created ? info.created.slice(0, 10) : 'unknown';
  const version = info.labels?.['org.opencontainers.image.version']
    || info.labels?.version
    || '(no version label)';
  process.stdout.write(`PULLED | created: ${createdDate} | size: ${sizeMB}MB | version: ${version}\n`);
  results.push({ label, env, status: 'pulled', created: createdDate, sizeMB, version });
}

process.stdout.write('\n');

const trivyPath = run('which trivy 2>/dev/null');
if (trivyPath) {
  process.stdout.write('\n=== Trivy CVE scan ===\n');
  for (const { label, env } of IMAGES) {
    const imageRef = loadImageRef(env);
    if (!imageRef) continue;
    process.stdout.write(`\n--- ${label} ---\n`);
    try {
      const output = execSync(
        `trivy image --severity HIGH,CRITICAL --no-progress --quiet "${imageRef}" 2>&1`,
        { encoding: 'utf8', timeout: 120000, maxBuffer: 10 * 1024 * 1024 },
      );
      process.stdout.write(output || 'No HIGH/CRITICAL vulnerabilities found.\n');
    } catch (error) {
      process.stdout.write(`trivy error: ${error.stderr || error.message}\n`);
    }
  }
} else {
  process.stdout.write('trivy not installed. Install it from https://trivy.dev to enable CVE scanning.\n');
  process.stdout.write('Usage: trivy image --severity HIGH,CRITICAL <image-ref>\n');
}

process.stdout.write('\n=== Refresh recommendations ===\n');
process.stdout.write('1. Backup the stack: systemctl start openspg-backup.service\n');
process.stdout.write('2. Pull latest images from upstream OpenSPG registry\n');
process.stdout.write('3. Update digest in .env\n');
process.stdout.write('4. Restart services: docker compose up -d --pull always\n');
process.stdout.write('5. Verify health: docker compose ps\n');
