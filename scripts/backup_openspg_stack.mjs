#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import process from 'process';
import { spawnSync } from 'child_process';

const ROOT = process.env.ROOT || '/docker/openspg';
const BACKUP_ROOT = process.env.OPENSPG_BACKUP_ROOT || path.join(ROOT, 'backups/automated');
const RETENTION_DAYS = Math.max(1, Number(process.env.OPENSPG_BACKUP_RETENTION_DAYS || 14));
const NOW = new Date();
const STAMP = NOW.toISOString().replace(/[:.]/g, '-');
const FINAL_SNAPSHOT_DIR = path.join(BACKUP_ROOT, STAMP);
const SNAPSHOT_DIR = path.join(BACKUP_ROOT, `.partial-${STAMP}`);
const NEO4J_CONTAINER = 'release-openspg-neo4j';
const MINIO_DIR = path.join(ROOT, 'data/minio');
const CONSISTENCY_SERVICES = ['server', 'neo4j', 'minio'];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}\n${result.stderr || result.stdout}`);
  }
  return (result.stdout || '').trim();
}

function runNoCapture(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

function runQuiet(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'ignore', 'pipe'], ...options });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}\n${result.stderr || ''}`);
  }
}

function runCompose(args, options = {}) {
  try {
    return run('docker', ['compose', ...args], options);
  } catch (error) {
    const message = String(error.message || error);
    if (!/unknown command: docker compose/i.test(message)) throw error;
    return run('docker-compose', args, options);
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function archiveDirectory(sourceDir, outputPath) {
  run('tar', ['-cf', outputPath, '-C', path.dirname(sourceDir), path.basename(sourceDir)]);
}

function dumpMysql(outputPath) {
  const escaped = outputPath.replace(/'/g, "'\\''");
  const command = `docker exec release-openspg-mysql sh -lc 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --databases "$MYSQL_DATABASE"' > '${escaped}'`;
  runNoCapture('bash', ['-lc', command]);
}

function getRunningComposeServices() {
  const output = runCompose(['ps', '--services', '--status', 'running'], { cwd: ROOT });
  return new Set(output.split(/\r?\n/).map((value) => value.trim()).filter(Boolean));
}

function stopConsistencyServices(runningServices, stoppedServices) {
  for (const service of CONSISTENCY_SERVICES) {
    if (!runningServices.has(service)) continue;
    runCompose(['stop', '-t', '120', service], { cwd: ROOT });
    stoppedServices.push(service);
  }
}

function waitForContainerReady(containerName, timeoutSeconds = 600) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() < deadline) {
    const status = run('docker', [
      'inspect',
      '--format',
      '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}',
      containerName,
    ]);
    if (status === 'healthy' || status === 'running') return;
    if (status === 'unhealthy' || status === 'exited' || status === 'dead') {
      throw new Error(`${containerName} entered state ${status}`);
    }
    run('sleep', ['5']);
  }
  throw new Error(`${containerName} did not become ready within ${timeoutSeconds}s`);
}

function restoreConsistencyServices(stoppedServices) {
  const stopped = new Set(stoppedServices);
  const errors = [];

  for (const service of ['neo4j', 'minio']) {
    if (!stopped.has(service)) continue;
    try {
      runCompose(['start', service], { cwd: ROOT });
      waitForContainerReady(service === 'neo4j' ? NEO4J_CONTAINER : 'release-openspg-minio');
    } catch (error) {
      errors.push(`${service}: ${String(error.message || error)}`);
    }
  }

  if (stopped.has('server')) {
    try {
      runCompose(['start', 'server'], { cwd: ROOT });
      waitForContainerReady('release-openspg-server');
    } catch (error) {
      errors.push(`server: ${String(error.message || error)}`);
    }
  }

  if (errors.length > 0) throw new Error(errors.join('; '));
}

function dumpNeo4j(outputDir) {
  ensureDir(outputDir);
  const image = run('docker', ['inspect', '--format', '{{.Config.Image}}', NEO4J_CONTAINER]);
  runQuiet('docker', [
    'run', '--rm',
    '--memory', '1g',
    '--volumes-from', NEO4J_CONTAINER,
    '--mount', `type=bind,src=${outputDir},dst=/backup`,
    '--entrypoint', '/var/lib/neo4j/bin/neo4j-admin',
    image,
    'database', 'dump', '*',
    '--to-path=/backup',
    '--overwrite-destination=true',
  ]);

  return fs.readdirSync(outputDir)
    .filter((name) => name.endsWith('.dump'))
    .sort()
    .map((name) => {
      const dumpPath = path.join(outputDir, name);
      return { id: `neo4j_${path.basename(name, '.dump')}`, archivePath: dumpPath, sizeBytes: fs.statSync(dumpPath).size };
    });
}

function cleanupPartialSnapshots() {
  for (const entry of fs.readdirSync(BACKUP_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('.partial-')) continue;
    fs.rmSync(path.join(BACKUP_ROOT, entry.name), { recursive: true, force: true });
  }
}

function pruneOldSnapshots() {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (const entry of fs.readdirSync(BACKUP_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.partial-')) continue;
    const full = path.join(BACKUP_ROOT, entry.name);
    const stat = fs.statSync(full);
    if (stat.mtimeMs < cutoff && fs.existsSync(path.join(full, '_manifest.json'))) {
      fs.rmSync(full, { recursive: true, force: true });
    }
  }
}

function writeText(filePath, value) {
  fs.writeFileSync(filePath, `${value.endsWith('\n') ? value : `${value}\n`}`, 'utf8');
}

function main() {
  ensureDir(BACKUP_ROOT);
  cleanupPartialSnapshots();
  pruneOldSnapshots();
  ensureDir(SNAPSHOT_DIR);

  const composeConfig = runCompose(['config', '--no-interpolate'], { cwd: ROOT });
  writeText(path.join(SNAPSHOT_DIR, 'compose.config.yaml'), composeConfig);
  const composePs = runCompose(['ps'], { cwd: ROOT });
  writeText(path.join(SNAPSHOT_DIR, 'compose.ps.txt'), composePs);

  const archives = [];
  const warnings = [];
  try {
    const mysqlDumpPath = path.join(SNAPSHOT_DIR, 'mysql.sql');
    dumpMysql(mysqlDumpPath);
    archives.push({ id: 'mysql_logical', archivePath: mysqlDumpPath, sizeBytes: fs.statSync(mysqlDumpPath).size });
  } catch (error) {
    warnings.push(`mysql_logical_dump_failed: ${String(error.message || error)}`);
  }

  const runningServices = getRunningComposeServices();
  const stoppedServices = [];
  try {
    try {
      stopConsistencyServices(runningServices, stoppedServices);
    } catch (error) {
      warnings.push(`service_stop_failed: ${String(error.message || error)}`);
    }

    if (stoppedServices.includes('neo4j')) {
      try {
        const neo4jArchives = dumpNeo4j(path.join(SNAPSHOT_DIR, 'neo4j-dumps'));
        archives.push(...neo4jArchives);
        if (neo4jArchives.length === 0) warnings.push('neo4j_dump_failed: no dump files created');
      } catch (error) {
        warnings.push(`neo4j_dump_failed: ${String(error.message || error)}`);
      }
    } else if (runningServices.has('neo4j')) {
      warnings.push('neo4j_dump_skipped: service could not be stopped');
    }

    if (stoppedServices.includes('minio') && fs.existsSync(MINIO_DIR)) {
      try {
        const archivePath = path.join(SNAPSHOT_DIR, 'minio.tar');
        archiveDirectory(MINIO_DIR, archivePath);
        archives.push({ id: 'minio', archivePath, sizeBytes: fs.statSync(archivePath).size });
      } catch (error) {
        warnings.push(`minio_archive_failed: ${String(error.message || error)}`);
      }
    } else if (runningServices.has('minio')) {
      warnings.push('minio_archive_skipped: service could not be stopped');
    }
  } finally {
    try {
      restoreConsistencyServices(stoppedServices);
    } catch (error) {
      warnings.push(`service_restore_failed: ${String(error.message || error)}`);
    }
  }

  const archiveIds = new Set(archives.map(({ id }) => id));
  const requiredArchives = ['mysql_logical', 'neo4j_neo4j', 'neo4j_system', 'minio'];
  const manifestArchives = archives.map((archive) => ({
    ...archive,
    archivePath: path.relative(SNAPSHOT_DIR, archive.archivePath),
  }));

  const manifest = {
    ok: warnings.length === 0 && requiredArchives.every((id) => archiveIds.has(id)),
    createdAt: NOW.toISOString(),
    root: ROOT,
    backupRoot: BACKUP_ROOT,
    snapshotDir: FINAL_SNAPSHOT_DIR,
    retentionDays: RETENTION_DAYS,
    consistencyMode: 'mysql-single-transaction; neo4j-admin-offline; minio-offline',
    archives: manifestArchives,
    warnings,
  };
  fs.writeFileSync(path.join(SNAPSHOT_DIR, '_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  fs.renameSync(SNAPSHOT_DIR, FINAL_SNAPSHOT_DIR);
  pruneOldSnapshots();
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
  if (!manifest.ok) process.exitCode = 1;
}

main();
