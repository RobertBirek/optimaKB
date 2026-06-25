import { memo } from 'react';
import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { STATUS_LABELS, classForStatus } from '../constants';

const STATUS_ICONS = {
  ok: CheckCircle,
  warn: AlertTriangle,
  bad: XCircle,
  neutral: Clock,
};

const StatusBadge = memo(function StatusBadge({ value }) {
  const text = STATUS_LABELS[value] || String(value ?? 'UNKNOWN');
  const statusClass = classForStatus(value);
  const Icon = STATUS_ICONS[statusClass] || STATUS_ICONS.neutral;
  return (
    <span className={`badge ${statusClass}`}>
      <Icon className="badgeIcon" aria-hidden="true" />
      {text}
    </span>
  );
});

export default StatusBadge;
