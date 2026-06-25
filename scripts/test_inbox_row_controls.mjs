import test from 'node:test';
import assert from 'node:assert/strict';

import { isPendingDraft, inboxRowControlState } from '../src/shared/inboxRowControls.js';

test('isPendingDraft handles pending status case-insensitively', () => {
  assert.equal(isPendingDraft({ status: 'pending' }), true);
  assert.equal(isPendingDraft({ status: 'PENDING' }), true);
  assert.equal(isPendingDraft({ status: 'promoted' }), false);
});

test('inboxRowControlState keeps controls visible and disables non-pending rows', () => {
  assert.deepEqual(inboxRowControlState({ status: 'promoted' }), {
    visible: true,
    actionable: false,
    disabledReason: 'Dostępne tylko dla pending draftów',
  });
});
