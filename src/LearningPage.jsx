import { useState, useEffect, useCallback } from 'react';
import { apiFetch, formatDate } from './constants';
import DataTable from './shared/DataTable';
import StatusBadge from './shared/StatusBadge';
import EmptyState from './shared/EmptyState';

export default function LearningPage({ data: _initialData }) {
  const [gaps, setGaps] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('open');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const loadGaps = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      params.set('limit', '200');
      const res = await apiFetch(`/api/learning/gaps?${params}`);
      if (res.ok) {
        const data = await res.json();
        setGaps(data.gaps || []);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [filter]);

  const loadStats = useCallback(async () => {
    try {
      const res = await apiFetch('/api/learning/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch {
      console.error('Failed to load stats');
    }
  }, []);

  useEffect(() => { loadGaps(); }, [loadGaps]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const handleProcess = async () => {
    setProcessing(true);
    setError('');
    try {
      const res = await apiFetch('/api/learning/gaps/process', { method: 'POST' });
      if (res.ok) {
        setTimeout(() => { loadGaps(); loadStats(); }, 2000);
      } else {
        setError('Nie udało się przetworzyć luk.');
      }
    } catch {
      setError('Nie udało się przetworzyć luk.');
    }
    setProcessing(false);
  };

  const handleIgnore = async (gapId) => {
    setError('');
    try {
      const res = await apiFetch(`/api/learning/gaps/${encodeURIComponent(gapId)}/ignore`, { method: 'POST' });
      if (!res.ok) { setError('Nie udało się zignorować luki.'); return; }
      loadGaps();
      loadStats();
    } catch {
      setError('Nie udało się zignorować luki.');
    }
  };

  const handleResolve = async (gapId) => {
    setError('');
    try {
      const res = await apiFetch(`/api/learning/gaps/${encodeURIComponent(gapId)}/resolve`, { method: 'POST' });
      if (!res.ok) { setError('Nie udało się rozwiązać luki.'); return; }
      loadGaps();
      loadStats();
    } catch {
      setError('Nie udało się rozwiązać luki.');
    }
  };

  const filters = ['open', 'drafted', 'resolved', 'ignored'];

  return (
    <section>
      <h2>Uczenie KB</h2>

      {stats && (
        <div className="learningStatGrid">
          {[
            ['Otwarte', stats.open, 'warn'],
            ['Przetworzone', stats.drafted, 'ok'],
            ['Rozwiązane', stats.resolved, 'ok'],
            ['Ignorowane', stats.ignored, ''],
            ['Dziś utworzone', stats.draftedToday, 'info'],
            ['Razem', stats.total, ''],
          ].map(([label, value, cls]) => (
            <div key={label} className={`stat-card${cls ? ` stat-${cls}` : ''}`}>
              <strong>{value}</strong>
              <small>{label}</small>
            </div>
          ))}
        </div>
      )}

      <div className="learningToolbar">
        {filters.map((f) => (
          <button
            key={f}
            className={filter === f ? 'primary' : 'secondary'}
            onClick={() => setFilter(f)}
          >
            {f === 'open' ? 'Otwarte' : f === 'drafted' ? 'Przetworzone' : f === 'resolved' ? 'Rozwiązane' : 'Ignorowane'}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <button className="primary" onClick={handleProcess} disabled={processing}>
          {processing ? 'Przetwarzanie...' : 'Przetwórz otwarte'}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {loading ? (
        <div className="loading">Ładowanie...</div>
      ) : gaps.length === 0 ? (
        <EmptyState message={filter === 'open' ? 'Brak otwartych luk. Nowe pojawią się po teście lub zapytaniu bez odpowiedzi.' : `Brak luk o statusie "${filter}".`} />
      ) : (
        <DataTable
          rows={gaps}
          columns={[
            { key: 'question', label: 'Pytanie', render: (gap) => <strong>{gap.question?.slice(0, 80)}{gap.question?.length > 80 ? '…' : ''}</strong> },
            { key: 'status', label: 'Status', render: (gap) => <StatusBadge value={gap.status} /> },
            { key: 'confidence', label: 'Pewność', render: (gap) => <code>{gap.confidence?.toFixed(2) || '0.00'}</code> },
            { key: 'routedKb', label: 'Routed KB', render: (gap) => <code>{gap.routedKb || '-'}</code> },
            { key: 'targetKb', label: 'Target KB', render: (gap) => <code>{gap.targetKb || '-'}</code> },
            { key: 'source', label: 'Źródło', render: (gap) => <StatusBadge value={gap.source} /> },
            { key: 'createdAt', label: 'Data', render: (gap) => formatDate(gap.createdAt) },
            { key: 'actions', label: 'Akcje', render: (gap) => (
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {gap.status === 'open' && (
                  <>
                    <button className="secondary" onClick={() => handleResolve(gap.id)} title="Oznacz jako rozwiązane">✓</button>
                    <button className="secondary" onClick={() => handleIgnore(gap.id)} title="Ignoruj">✕</button>
                  </>
                )}
                {gap.status === 'drafted' && <StatusBadge value={gap.draftId ? 'draft utworzony' : 'draft: ?'} />}
              </div>
            )},
          ]}
        />
      )}
    </section>
  );
}
