import StatusBadge from './StatusBadge';

export default function DraftAnalyzeBadge({ label, enabled, fallbackLabel = 'Fallback' }) {
  return (
    <span>
      {label} <StatusBadge value={enabled ? 'OK' : fallbackLabel} />
    </span>
  );
}
