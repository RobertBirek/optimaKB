import { useState } from 'react';
import { formatDate, formatNumber } from './constants';
import DataTable from './shared/DataTable';
import StatusBadge from './shared/StatusBadge';
import PageSkeleton from './shared/Skeleton';
import EmptyState from './shared/EmptyState';
import useApi from './shared/useApi';

export default function KbPage() {
  const [query, setQuery] = useState('');
  const { data, loading, error } = useApi('/api/kbs');
  const rows = (data?.kbs || []).filter((kb) => `${kb.kbName} ${kb.namespace} ${kb.category}`.toLowerCase().includes(query.toLowerCase()));
  if (loading) return <PageSkeleton />;
  if (error) return <EmptyState title="Błąd ładowania" description={error} />;
  return (
    <section>
      <div className="sectionHeader">
        <div>
          <h2>Knowledge Bases</h2>
          <p>Skonfigurowane KB z registry oraz ich ostatnie manifesty buildów.</p>
        </div>
        <input className="search" placeholder="Szukaj KB..." value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <DataTable
        rows={rows}
        columns={[
          { key: 'kb', label: 'KB', render: (kb) => <><strong>{kb.kbName}</strong><br /><code>{kb.namespace}</code><br /><span className="muted">{kb.category}</span></> },
          { key: 'totals', label: 'Totals', render: (kb) => <><strong>{formatNumber(kb.totals.rows)}</strong> rows<br />{formatNumber(kb.totals.chunks)} chunks<br />{formatNumber(kb.totals.files)} files</> },
          { key: 'files', label: 'Primary files', render: (kb) => kb.files.map((file) => <div key={file.fileName}><code>{file.fileName}</code>: {formatNumber(file.rowCount)}</div>) },
          { key: 'generatedAt', label: 'Generated', render: (kb) => formatDate(kb.generatedAt) },
          { key: 'job', label: 'Latest job', render: (kb) => kb.latestJob ? <><StatusBadge value={kb.latestJob.status} /><br /><code>{kb.latestJob.id} {kb.latestJob.fileName || kb.latestJob.jobName}</code></> : <StatusBadge value="NO_JOB" /> },
        ]}
      />
      <div className="subsection">
        <h3>Detected outside registry</h3>
        <DataTable
          rows={data?.discoveredKbs || []}
          columns={[
            { key: 'kb', label: 'Detected KB', render: (kb) => <><strong>{kb.kbName}</strong><br /><code>{kb.exportDir}</code></> },
            { key: 'rows', label: 'Rows', render: (kb) => formatNumber(kb.totals.rows) },
            { key: 'generatedAt', label: 'Generated', render: (kb) => formatDate(kb.generatedAt) },
            { key: 'job', label: 'Latest job', render: (kb) => kb.latestJob ? <StatusBadge value={kb.latestJob.status} /> : <StatusBadge value="NO_JOB" /> },
          ]}
        />
      </div>
    </section>
  );
}
