import test from 'node:test';
import assert from 'node:assert/strict';

import { canRenderTabWithoutOverview } from '../src/shared/appContentGate.js';

test('kb and reports can render before overview payload is loaded', () => {
  assert.equal(canRenderTabWithoutOverview('kb'), true);
  assert.equal(canRenderTabWithoutOverview('reports'), true);
});

test('overview still requires overview payload', () => {
  assert.equal(canRenderTabWithoutOverview('overview'), false);
});
