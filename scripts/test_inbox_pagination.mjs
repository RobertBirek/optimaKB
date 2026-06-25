import test from 'node:test';
import assert from 'node:assert/strict';

import { buildInboxUrl, deriveInboxPagination } from '../src/shared/inboxPagination.js';

test('buildInboxUrl encodes limit and offset', () => {
  assert.equal(buildInboxUrl({ page: 3, pageSize: 50 }), '/api/inbox?limit=50&offset=100');
});

test('buildInboxUrl includes active filters', () => {
  assert.equal(
    buildInboxUrl({ page: 1, pageSize: 25, status: 'pending', kbNamespace: 'Comarch Optima/ERP', query: 'faktura VAT' }),
    '/api/inbox?limit=25&offset=0&status=pending&kb=Comarch+Optima%2FERP&q=faktura+VAT',
  );
});

test('deriveInboxPagination uses server total and hasMore', () => {
  assert.deepEqual(
    deriveInboxPagination({ page: 2, pageSize: 50, total: 126, rowCount: 50, hasMore: true }),
    { currentPage: 2, totalRows: 126, totalPages: 3, hasMore: true },
  );
});

test('deriveInboxPagination falls back to current rows when total is missing', () => {
  assert.deepEqual(
    deriveInboxPagination({ page: 1, pageSize: 50, total: undefined, rowCount: 7, hasMore: false }),
    { currentPage: 1, totalRows: 7, totalPages: 1, hasMore: false },
  );
});
