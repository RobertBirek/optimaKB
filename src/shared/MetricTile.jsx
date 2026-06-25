import { memo } from 'react';
import { Activity, BarChart3, CheckCircle, Clock, Database, FileText, Inbox, Radar, RefreshCw } from 'lucide-react';
import { classForStatus } from '../constants';

const METRIC_ICONS = {
  Quality: CheckCircle,
  Freshness: Clock,
  'Official delta': RefreshCw,
  'Do zatwierdzenia': Inbox,
  'KB active': Database,
  Rows: BarChart3,
  Files: FileText,
  Cron: Activity,
  'Kandydaci źródeł': Radar,
};

const MetricTile = memo(function MetricTile({ label, value, status, hint }) {
  const Icon = METRIC_ICONS[label] || Activity;
  return (
    <div className={`metric ${status ? classForStatus(status) : ''}`}>
      <div className="metricLabel"><Icon className="metricIcon" aria-hidden="true" />{label}</div>
      <div className="metricValue">{value}</div>
      {hint ? <div className="metricHint">{hint}</div> : null}
    </div>
  );
});

export default MetricTile;
