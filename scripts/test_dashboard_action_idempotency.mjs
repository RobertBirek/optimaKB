#!/usr/bin/env node

import assert from 'node:assert/strict';
import { reusableDraftApprovalAction } from './lib/dashboard_action_idempotency.mjs';

const draftId = 'draft_test';
const actions = [
  { id: 'failed', draftId, type: 'approve_export_build', status: 'FAIL' },
  { id: 'finished', draftId, type: 'approve_export_build', status: 'FINISH' },
];

assert.equal(reusableDraftApprovalAction({ id: draftId, status: 'promoted' }, actions)?.id, 'finished');
assert.equal(reusableDraftApprovalAction({ id: draftId, status: 'pending' }, actions), null);

const running = { id: 'running', draftId, type: 'approve_export_build', status: 'RUNNING' };
assert.equal(reusableDraftApprovalAction({ id: draftId, status: 'promoted' }, [running])?.id, 'running');
assert.equal(reusableDraftApprovalAction({ id: draftId, status: 'pending' }, [running])?.id, 'running');

console.log('Dashboard approval idempotency tests passed.');
