import { memo } from 'react';
import { formatNumber } from '../constants';
import EmptyState from './EmptyState';

const DonutChart = memo(function DonutChart({ data }) {
  const items = (data || []).filter((item) => Number(item.value || 0) > 0);
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (!total) return <EmptyState>Brak danych.</EmptyState>;
  let cumulative = 0;
  const stops = items.map((item, index) => {
    const start = (cumulative / total) * 100;
    cumulative += Number(item.value || 0);
    const end = (cumulative / total) * 100;
    const color = ['#155eef', '#0f7a45', '#a15c00', '#b42318', '#475467'][index % 5];
    return `${color} ${start}% ${end}%`;
  });
  return (
    <div className="donutWrap">
      <div className="donut" style={{ background: `conic-gradient(${stops.join(',')})` }}>
        <span>{formatNumber(total)}</span>
      </div>
      <div className="legend">
        {items.map((item) => <div key={item.label}><span />{item.label}: {formatNumber(item.value)}</div>)}
      </div>
    </div>
  );
});

export default DonutChart;
