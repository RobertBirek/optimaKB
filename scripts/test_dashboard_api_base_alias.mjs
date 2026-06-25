import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'child_process';

const PORT = 3421;
const BASE = `http://127.0.0.1:${PORT}`;

function waitForServer(child) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timer = setInterval(async () => {
      if (child.exitCode !== null) {
        clearInterval(timer);
        reject(new Error(`dashboard server exited early: ${child.exitCode}`));
        return;
      }
      if (Date.now() - startedAt > 15000) {
        clearInterval(timer);
        reject(new Error('dashboard server did not start'));
        return;
      }
      try {
        const response = await fetch(`${BASE}/panel/api/kbs`);
        await response.arrayBuffer();
        clearInterval(timer);
        resolve();
      } catch {
        // keep polling until the server accepts connections
      }
    }, 250);
  });
}

async function getStatus(path) {
  const response = await fetch(`${BASE}${path}`);
  await response.arrayBuffer();
  return response.status;
}

test('dashboard API works with and without configured base path', async () => {
  const child = spawn(process.execPath, ['scripts/erp_kb_dashboard_server.mjs'], {
    cwd: '/docker/openspg',
    env: {
      ...process.env,
      ERP_KB_DASHBOARD_ALLOW_ANON: '1',
      ERP_KB_DASHBOARD_HOST: '127.0.0.1',
      ERP_KB_DASHBOARD_PORT: String(PORT),
    },
  });

  try {
    await waitForServer(child);
    assert.equal(await getStatus('/panel/api/kbs'), 200);
    assert.equal(await getStatus('/api/kbs'), 200);
  } finally {
    child.kill('SIGTERM');
  }
});
