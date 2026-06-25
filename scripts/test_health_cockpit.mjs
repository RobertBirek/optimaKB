import test from 'node:test';
import assert from 'node:assert/strict';

import { buildHealthCockpit } from '../src/shared/healthCockpit.js';

test('buildHealthCockpit marks clean overview as OK', () => {
  const cockpit = buildHealthCockpit({
    overall: { quality: 'PASS', freshness: 'FRESH', officialDelta: 'OK' },
    summary: { pendingDrafts: 0, runningActions: 0 },
    actions: [],
    sources: { items: [] },
    automation: { exceptions: [] },
    tools: [{ id: 'mcp', status: 'OK' }],
  });

  assert.equal(cockpit.overallStatus, 'OK');
  assert.equal(cockpit.signals.every((signal) => signal.status === 'OK'), true);
});

test('buildHealthCockpit escalates failed actions above warnings', () => {
  const cockpit = buildHealthCockpit({
    overall: { quality: 'PASS', freshness: 'STALE', officialDelta: 'OK' },
    summary: { pendingDrafts: 3, runningActions: 1 },
    actions: [{ id: 'a1', status: 'FAIL' }],
    sources: { items: [{ id: 's1', lastError: 'timeout' }] },
    automation: { exceptions: [{ id: 'e1' }] },
    tools: [{ id: 'mcp', status: 'OK' }],
  });

  assert.equal(cockpit.overallStatus, 'FAIL');
  assert.equal(cockpit.signals.find((signal) => signal.id === 'actions').status, 'FAIL');
  assert.equal(cockpit.signals.find((signal) => signal.id === 'inbox').value, '3');
});
