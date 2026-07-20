import { useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { formatDate, apiUrl, apiFetch } from './constants';
import DataTable from './shared/DataTable';
import IconButton from './shared/IconButton';
import StatusBadge from './shared/StatusBadge';
import PageSkeleton from './shared/Skeleton';
import EmptyState from './shared/EmptyState';
import useApi from './shared/useApi';

export default function ReportsPage() {
  const { data, loading, error } = useApi('/api/reports');
  const quality = useApi('/api/reports/quality?format=json');
  const mountedRef = useRef(true);
  const [reporting, setReporting] = useState(false);
  const [reportMsg, setReportMsg] = useState('');
  const [buildState, setBuildState] = useState({});
  const [rebuildLog, setRebuildLog] = useState([]);

  async function pollAction(actionId, namespace, kbName) {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      if (!mountedRef.current) return;
      const action = await apiFetch(`/api/actions/${encodeURIComponent(actionId)}`)
        .then((r) => r.json())
        .catch(() => ({ status: 'FAIL' }));
      if (!mountedRef.current) return;
      const status = action.status || 'UNKNOWN';
      setBuildState(prev => ({ ...prev, [namespace]: { busy: true, msg: `${kbName}: ${status}` } }));
      if (['FINISH', 'FAIL'].includes(status)) {
        setBuildState(prev => ({ ...prev, [namespace]: { busy: false, msg: `${kbName}: ${status === 'FINISH' ? 'Gotowe' : 'Błąd'}` } }));
        setRebuildLog(prev => [{ namespace, kbName, actionId, status, at: new Date().toISOString() }, ...prev].slice(0, 20));
        quality.reload();
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    setBuildState(prev => ({ ...prev, [namespace]: { busy: false, msg: `${kbName}: Przekroczono limit czasu. Sprawdź System.` } }));
  }

  const handleGenerate = async () => {
    setReporting(true);
    setReportMsg('');
    try {
      const res = await apiFetch('/api/automation/report', { method: 'POST' });
      if (res.ok) { setReportMsg('Raport wygenerowany.'); }
      else { const e = await res.json(); setReportMsg(`Błąd: ${e.message}`); }
    } catch (e) { setReportMsg(`Błąd: ${e.message}`); }
    setReporting(false);
  };

  const handleRebuild = async (namespace, kbName) => {
    setBuildState(prev => ({ ...prev, [namespace]: { busy: true, msg: `${kbName}: Uruchamianie...` } }));
    try {
      const res = await apiFetch(`/api/kbs/${encodeURIComponent(namespace)}/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const payload = await res.json();
      if (res.ok && payload.ok) {
        setBuildState(prev => ({ ...prev, [namespace]: { busy: true, msg: `Akcja ${payload.actionId}` } }));
        await pollAction(payload.actionId, namespace, kbName);
      } else {
        setBuildState(prev => ({ ...prev, [namespace]: { busy: false, msg: payload.message || payload.error || 'Błąd' } }));
      }
    } catch (e) {
      setBuildState(prev => ({ ...prev, [namespace]: { busy: false, msg: e.message } }));
    }
  };

  if (loading) return <PageSkeleton />;
  if (error) return <EmptyState title="Błąd ładowania" description={error} />;

  const failedKbs = (quality.data?.results || []).filter(r => r.verdict === 'FAIL');

  return (
    <section>
      <h2>Raporty</h2>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
        <button className="primary" onClick={handleGenerate} disabled={reporting}>
          {reporting ? 'Generowanie...' : 'Generuj raport jakości'}
        </button>
        {reportMsg ? <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{reportMsg}</span> : null}
      </div>
      <DataTable
        rows={data?.reports || []}
        columns={[
          { key: 'title', label: 'Report', render: (report) => <strong>{report.title}</strong> },
          { key: 'status', label: 'Status', render: (report) => <StatusBadge value={report.overallStatus} /> },
          { key: 'updated', label: 'Updated', render: (report) => formatDate(report.json?.mtime || report.markdown?.mtime) },
          { key: 'size', label: 'Files', render: (report) => <><code>{report.json?.exists ? 'json' : 'json missing'}</code><br /><code>{report.markdown?.exists ? 'md' : 'md missing'}</code></> },
          { key: 'links', label: 'Links', render: (report) => <><a href={apiUrl(`/api/reports/${encodeURIComponent(report.key)}?format=md`)}>Markdown</a><br /><a href={apiUrl(`/api/reports/${encodeURIComponent(report.key)}?format=json`)}>JSON</a></> },
        ]}
      />
      {!quality.loading && failedKbs.length > 0 ? (
        <section style={{ marginTop: '2rem' }}>
          <h3>Akcje naprawcze</h3>
          <DataTable
            rows={failedKbs}
            columns={[
              { key: 'kbName', label: 'KB', render: (r) => <strong>{r.kbName}</strong> },
              { key: 'verdict', label: 'Status', render: (r) => <StatusBadge value={r.verdict} /> },
              { key: 'errors', label: 'Błędy', render: (r) => <span style={{ fontSize: '0.85rem', color: 'var(--red)' }}>{(r.errors || []).join('; ')}</span> },
              { key: 'action', label: 'Naprawa', render: (r) => {
                const state = buildState[r.namespace] || {};
                return (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <IconButton
                      icon={RotateCcw}
                      label={`Rebuild ${r.kbName}`}
                      variant="primary"
                      showLabel
                      onClick={() => handleRebuild(r.namespace, r.kbName)}
                      disabled={state.busy}
                      className={state.busy ? 'isSpinning' : ''}
                    >
                      {state.busy ? 'Budowanie...' : `Rebuild ${r.kbName}`}
                    </IconButton>
                    {state.msg ? <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{state.msg}</span> : null}
                  </div>
                );
              }},
            ]}
          />
        </section>
      ) : null}
      {rebuildLog.length > 0 ? (
        <section style={{ marginTop: '2rem' }}>
          <h3>Ostatnie akcje naprawcze</h3>
          <DataTable
            rows={rebuildLog}
            columns={[
              { key: 'at', label: 'Czas', render: (r) => formatDate(r.at) },
              { key: 'kbName', label: 'KB' },
              { key: 'actionId', label: 'Action ID', render: (r) => <code style={{ fontSize: '0.85rem' }}>{r.actionId}</code> },
              { key: 'status', label: 'Wynik', render: (r) => <StatusBadge value={r.status} /> },
            ]}
          />
        </section>
      ) : null}
    </section>
  );
}
