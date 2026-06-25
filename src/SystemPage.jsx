import { useEffect, useState } from 'react';
import StatusBadge from './shared/StatusBadge';
import PageShell from './shared/PageShell';
import DataTable from './shared/DataTable';
import IconButton from './shared/IconButton';
import PageSkeleton from './shared/Skeleton';
import EmptyState from './shared/EmptyState';
import { apiFetch, formatDate, shortLabel } from './constants';
import useApi from './shared/useApi';
import { XCircle, RefreshCw, Play } from 'lucide-react';

export default function SystemPage({ overview }) {
  const [selectedAction, setSelectedAction] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [retryBusy, setRetryBusy] = useState(false);
  const [retryMsg, setRetryMsg] = useState('');
  const [page, setPage] = useState(1);
  const { data: actionsData, loading: actionsLoading, error: actionsError, reload: reloadActions } = useApi('/api/actions');
  const { data: systemData, loading: systemLoading } = useApi('/api/system');
  const actions = (actionsData?.actions || [])
    .filter((action) => statusFilter === 'all' || action.status === statusFilter)
    .filter((action) => typeFilter === 'all' || action.type === typeFilter);
  const actionTypes = [...new Set(actions.map((action) => action.type).filter(Boolean))].sort();

  useEffect(() => { setPage(1); }, [statusFilter, typeFilter]);
  const failedActions = actions.filter((a) => ['FAIL', 'ERROR'].includes(a.status));
  const totalPages = Math.max(1, Math.ceil(actions.length / 50));
  const pageRows = actions.slice((page - 1) * 50, page * 50);

  async function retryAllFailed() {
    setRetryBusy(true);
    setRetryMsg(`Ponawiam ${failedActions.length} akcji...`);
    let ok = 0, fail = 0;
    for (const a of failedActions) {
      try {
        const res = await apiFetch(`/api/actions/${encodeURIComponent(a.id)}/retry`, { method: 'POST' });
        const payload = await res.json();
        if (res.ok && payload.ok) ok += 1;
        else fail += 1;
      } catch { fail += 1; }
    }
    setRetryMsg(`Ponowiono ${ok} OK, ${fail} FAIL.`);
    reloadActions();
    setRetryBusy(false);
  }

  async function dismissAction(actionId) {
    setRetryBusy(true);
    try {
      const res = await apiFetch(`/api/actions/${encodeURIComponent(actionId)}/dismiss`, { method: 'POST' });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload.error || payload.message || 'Dismiss failed');
      reloadActions();
      if (selectedAction?.id === actionId) setSelectedAction(null);
    } catch (err) {
      setRetryMsg(`Błąd: ${err.message}`);
    } finally {
      setRetryBusy(false);
    }
  }

  async function loadAction(actionId) {
    const action = await apiFetch(`/api/actions/${encodeURIComponent(actionId)}`)
      .then((response) => response.json())
      .catch((error) => ({ error: error.message }));
    setSelectedAction(action);
  }

  if (actionsLoading || systemLoading) return <PageSkeleton />;

  return (
    <PageShell
      title="System"
      description="Stan usługi, crona i logi akcji dashboardu."
    >
      <div className="infoGrid">
        <div><span>Backend</span><strong>{overview.service?.host}:{overview.service?.port}</strong></div>
        <div><span>Base path</span><code>{overview.service?.basePath}</code></div>
        <div><span>Auth</span><StatusBadge value={overview.service?.auth} /></div>
        <div><span>Role</span><StatusBadge value={overview.service?.role} /></div>
        <div><span>Body limit</span><strong>{overview.service?.maxBody}</strong></div>
        <div><span>Node</span><code>{systemData?.system?.nodeVersion}</code></div>
        <div><span>Frontend dist</span><code>{systemData?.system?.dashboardDist}</code></div>
      </div>
      {actionsError ? <EmptyState title="Błąd ładowania akcji" description={actionsError} /> : (
        <div className="subsection">
          <div className="sectionHeader compactHeader">
            <h3>Dashboard actions</h3>
            <div className="filterBar">
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">Wszystkie statusy</option>
                <option value="RUNNING">RUNNING</option>
                <option value="FAIL">FAIL</option>
                <option value="FINISH">FINISH</option>
                <option value="REMEDIATED">REMEDIATED</option>
              </select>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="all">Wszystkie typy</option>
                {actionTypes.map((type) => <option value={type} key={type}>{type}</option>)}
              </select>
              {failedActions.length ? <>
                <IconButton icon={retryBusy ? RefreshCw : Play} label={retryBusy ? 'Pracuję' : `Ponów ${failedActions.length}`} variant="primary" showLabel onClick={retryAllFailed} disabled={retryBusy} className={retryBusy ? 'isSpinning' : ''} />
              </> : null}
            </div>
          </div>
          {retryMsg ? <div className="formMessage">{retryMsg}</div> : null}
          <DataTable
            rows={pageRows}
            page={page}
            totalPages={totalPages}
            setPage={setPage}
            onRowClick={(action) => loadAction(action.id)}
            columns={[
              { key: 'status', label: 'Status', render: (action) => <StatusBadge value={action.status} /> },
              { key: 'type', label: 'Action', render: (action) => <><strong>{action.type}</strong><br /><code>{action.id}</code></> },
              { key: 'draft', label: 'Draft', render: (action) => <><span>{shortLabel(action.title, 42)}</span><br /><code>{action.draftId}</code></> },
              { key: 'kb', label: 'KB', render: (action) => <code>{action.kbNamespace}</code> },
              { key: 'time', label: 'Time', render: (action) => <>{formatDate(action.createdAt)}<br />{action.finishedAt ? formatDate(action.finishedAt) : <span className="muted">running</span>}</> },
              { key: 'actions', label: '', render: (action) => ['FAIL', 'ERROR'].includes(action.status) ? (
                <div className="cellActions">
                  <IconButton icon={XCircle} label="Odrzuć" onClick={() => dismissAction(action.id)} disabled={retryBusy} />
                </div>
              ) : null },
            ]}
          />
          {selectedAction ? (
            <div className="detailPanel actionLog">
              <strong>{selectedAction.id}</strong>
              <div className="detailMeta"><StatusBadge value={selectedAction.status} /> <code>{selectedAction.logPath}</code></div>
              <div className="detailMeta"><span>Command</span><code>{selectedAction.command || ''}</code></div>
              {selectedAction.error ? <div className="formMessage badMessage">{selectedAction.error}</div> : null}
              <pre>{selectedAction.logTail || selectedAction.error || ''}</pre>
            </div>
          ) : null}
        </div>
      )}
      <div className="subsection">
        <div className="sectionHeader compactHeader">
          <h3>Audit log</h3>
          <div className="detailMeta">
            <StatusBadge value={overview.automation?.promotionGate ? 'OK' : 'N/A'} />
            <span>audit dostępny po wdrożeniu oddzielnego endpointu</span>
          </div>
        </div>
        <span className="muted">Audit jest dostępny przez GET /api/audit dla roli admin.</span>
      </div>
      <div className="subsection">
        <h3>Cron</h3>
        <pre className="cron">{systemData?.crontab?.raw || overview.crontab?.raw || ''}</pre>
      </div>
    </PageShell>
  );
}
