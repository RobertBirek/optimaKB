import StatusBadge from '../StatusBadge';

export default function ServerHealthBadge({ status }) {
  const map = { reachable: 'ok', error: 'warn', unreachable: 'bad', unknown: '' };
  return <StatusBadge value={status} className={map[status] || ''} />;
}
