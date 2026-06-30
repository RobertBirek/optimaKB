import { useState } from 'react';
import { formatDate, apiUrl, apiFetch } from './constants';
import DataTable from './shared/DataTable';
import StatusBadge from './shared/StatusBadge';
import PageSkeleton from './shared/Skeleton';
import EmptyState from './shared/EmptyState';
import useApi from './shared/useApi';

export default function ReportsPage() {
  const { data, loading, error } = useApi('/api/reports');
  const [reporting, setReporting] = useState(false);
  const [reportMsg, setReportMsg] = useState('');

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

  if (loading) return <PageSkeleton />;
  if (error) return <EmptyState title="Błąd ładowania" description={error} />;
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
    </section>
  );
}
