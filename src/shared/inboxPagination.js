export function buildInboxUrl({ page, pageSize, status = 'all', kbNamespace = 'all', query = '' }) {
  const currentPage = Math.max(1, Number(page) || 1);
  const limit = Math.max(1, Number(pageSize) || 50);
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String((currentPage - 1) * limit),
  });

  if (status && status !== 'all') params.set('status', status);
  if (kbNamespace && kbNamespace !== 'all') params.set('kb', kbNamespace);
  if (query.trim()) params.set('q', query.trim());

  return `/api/inbox?${params.toString()}`;
}

export function deriveInboxPagination({ page, pageSize, total, rowCount, hasMore }) {
  const currentPage = Math.max(1, Number(page) || 1);
  const limit = Math.max(1, Number(pageSize) || 50);
  const totalRows = Number.isFinite(total) ? total : rowCount;

  return {
    currentPage,
    totalRows,
    totalPages: Math.max(1, Math.ceil(totalRows / limit)),
    hasMore: Boolean(hasMore),
  };
}
