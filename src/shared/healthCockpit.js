function normalizeStatus(value) {
  const status = String(value || '').toUpperCase();
  if (['PASS', 'FRESH', 'OK', 'FINISH', 'PUBLISHED', 'REMEDIATED'].includes(status)) return 'OK';
  if (['FAIL', 'ERROR', 'BAD', 'BLOCKED'].includes(status)) return 'FAIL';
  if (['WARN', 'WARNING', 'STALE', 'RUNNING', 'PENDING', 'UNKNOWN'].includes(status)) return 'WARN';
  return status || 'WARN';
}

function worstStatus(statuses) {
  if (statuses.includes('FAIL')) return 'FAIL';
  if (statuses.includes('WARN')) return 'WARN';
  return 'OK';
}

export function buildHealthCockpit(overview = {}) {
  const summary = overview.summary || {};
  const actions = overview.actions || [];
  const failedActions = actions.filter((action) => ['FAIL', 'ERROR'].includes(String(action.status || '').toUpperCase())).length;
  const failedSources = (overview.sources?.items || []).filter((source) => source.lastError).length;
  const automationExceptions = overview.automation?.exceptions?.length || 0;
  const mcpTool = (overview.tools || []).find((tool) => tool.id === 'mcp');

  const signals = [
    {
      id: 'quality',
      label: 'Quality gate',
      value: overview.overall?.quality || 'UNKNOWN',
      status: normalizeStatus(overview.overall?.quality),
    },
    {
      id: 'freshness',
      label: 'Freshness',
      value: overview.overall?.freshness || 'UNKNOWN',
      status: normalizeStatus(overview.overall?.freshness),
    },
    {
      id: 'inbox',
      label: 'Inbox',
      value: String(summary.pendingDrafts || 0),
      status: summary.pendingDrafts ? 'WARN' : 'OK',
    },
    {
      id: 'actions',
      label: 'Akcje',
      value: failedActions ? String(failedActions) : String(summary.runningActions || 0),
      status: failedActions ? 'FAIL' : (summary.runningActions ? 'WARN' : 'OK'),
    },
    {
      id: 'sources',
      label: 'Źródła',
      value: String(failedSources),
      status: failedSources ? 'WARN' : 'OK',
    },
    {
      id: 'automation',
      label: 'Automatyzacja',
      value: String(automationExceptions),
      status: automationExceptions ? 'WARN' : 'OK',
    },
    {
      id: 'mcp',
      label: 'MCP',
      value: mcpTool?.status || 'UNKNOWN',
      status: normalizeStatus(mcpTool?.status),
    },
  ];

  return {
    overallStatus: worstStatus(signals.map((signal) => signal.status)),
    signals,
  };
}
