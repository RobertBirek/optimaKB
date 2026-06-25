import { memo } from 'react';
import { formatNumber, shortLabel } from '../constants';
import EmptyState from './EmptyState';

const BarChart = memo(function BarChart({ data, valueKey = 'rows', labelKey = 'label', maxItems = 10 }) {
  const items = [...(data || [])]
    .sort((a, b) => Number(b[valueKey] || 0) - Number(a[valueKey] || 0))
    .slice(0, maxItems);
  const max = Math.max(1, ...items.map((item) => Number(item[valueKey] || 0)));
  if (!items.length) return <EmptyState>Brak danych do wykresu.</EmptyState>;
  return (
    <div className="barChart">
      {items.map((item) => {
        const value = Number(item[valueKey] || 0);
        return (
          <div className="barRow" key={`${item[labelKey]}-${value}`}>
            <div className="barLabel" title={item[labelKey]}>{shortLabel(item[labelKey])}</div>
            <div className="barTrack"><div className="barFill" style={{ width: `${Math.max(4, (value / max) * 100)}%` }} /></div>
            <div className="barValue">{formatNumber(value)}</div>
          </div>
        );
      })}
    </div>
  );
});

export default BarChart;
