import { useState, useEffect, useMemo } from 'react';
import useApi from './shared/useApi';
import PageShell from './shared/PageShell';
import PageSkeleton from './shared/Skeleton';
import EmptyState from './shared/EmptyState';
import { AlertTriangle, BarChart3 } from 'lucide-react';
import './styles/trends.css';

const METRICS = [
  { key: 'fpRate', label: 'FP Rate', format: (v) => v != null ? `${(v * 100).toFixed(1)}%` : '\u2014' },
  { key: 'tunedBaseline', label: 'Tuned Baseline', format: (v) => v != null ? v.toFixed(2) : '\u2014' },
  { key: 'acceptanceRate', label: 'Acceptance Rate', format: (v) => v != null ? `${(v * 100).toFixed(1)}%` : '\u2014' },
  { key: 'draftedCount', label: 'Drafts', format: (v) => v != null ? String(v) : '0' },
];
const RANGES = [7, 30, 90, 0];
const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

export default function TrendsPage({ overview }) {
  const [metric, setMetric] = useState('fpRate');
  const [days, setDays] = useState(30);
  const { data, loading } = useApi(`/api/automation/trends?days=${days}`);
  const { data: alertsData } = useApi('/api/automation/alerts');

  const entries = useMemo(() => {
    if (!data?.trends) return [];
    const result = [];
    for (const [ns, points] of Object.entries(data.trends)) {
      if (!Array.isArray(points) || points.length < 2) continue;
      result.push({ ns, points: points.sort((a, b) => a.date.localeCompare(b.date)) });
    }
    return result.sort((a, b) => b.points.length - a.points.length);
  }, [data]);

  const selectedMetric = METRICS.find((m) => m.key === metric);

  function chartDims(points) {
    const w = Math.max(400, points.length * 10);
    return { width: Math.min(w, 1200), height: 250 };
  }

  function linePath(points, dim) {
    const values = points.map((p) => p[metric]).filter((v) => v != null);
    if (!values.length) return '';
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const pad = range * 0.1;
    const yMin = Math.max(0, min - pad);
    const yMax = range < 0.01 ? yMin + 0.1 : Math.min(1, max + pad);
    const yRng = yMax - yMin || 1;
    const stepX = dim.width / Math.max(points.length - 1, 1);
    return points.map((p, i) => {
      const x = i * stepX;
      const v = p[metric] != null ? p[metric] : min;
      const y = dim.height - ((v - yMin) / yRng) * (dim.height - 20) - 10;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');
  }

  if (loading) return <PageShell title="Trendy" description="Metryki jakości w czasie"><PageSkeleton /></PageShell>;

  return (
    <PageShell title="Trendy" description="Metryki jakości w czasie">
      <div className="trendsPage">
        <div className="trendsControls">
          <div className="metricTabs">
            {METRICS.map((m) => (
              <button key={m.key} className={metric === m.key ? 'active' : ''} onClick={() => setMetric(m.key)}>
                {m.label}
              </button>
            ))}
          </div>
          <div className="rangeTabs">
            {RANGES.map((d) => (
              <button key={d} className={days === d ? 'active' : ''} onClick={() => setDays(d)}>
                {d === 0 ? 'All' : `${d}d`}
              </button>
            ))}
          </div>
        </div>

        {alertsData?.alerts?.length ? (
          <div className="alertsBar">
            {alertsData.alerts.map((alert, i) => (
              <div key={i} className={`alertItem ${alert.severity}`}>
                <AlertTriangle size={16} />
                <span><strong>{alert.kbNamespace}</strong> — {alert.message}</span>
              </div>
            ))}
          </div>
        ) : null}

        {entries.length === 0 ? (
          <EmptyState icon={BarChart3} title="Brak danych historycznych" description="Trendy pojawią się po kilku dniach od włączenia snapshota." />
        ) : (
          <div className="trendsGrid">
            {entries.map(({ ns, points }, index) => {
              const dim = chartDims(points);
              return (
                <div key={ns} className="trendChart">
                  <h4><span className="trendDot" style={{ background: COLORS[index % COLORS.length] }} />{ns}</h4>
                  <svg viewBox={`0 0 ${dim.width} ${dim.height}`} className="trendSvg" preserveAspectRatio="xMidYMid meet">
                    <polyline fill="none" stroke={COLORS[index % COLORS.length]} strokeWidth="2" strokeLinejoin="round" points={linePath(points, dim)} />
                  </svg>
                  <div className="trendSummary">
                    {points.length} dni | {selectedMetric.format(points.at(-1)?.[metric])} obecnie
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
