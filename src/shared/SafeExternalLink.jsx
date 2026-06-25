import { shortLabel, safeExternalHref } from '../constants';

export default function SafeExternalLink({ value, limit = 72, label = '' }) {
  const raw = String(value || '').trim();
  const href = safeExternalHref(raw);
  const text = label || shortLabel(raw, limit);
  if (!raw) return null;
  if (!href) {
    return <span className="muted" title={raw}>{text}</span>;
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {text}
    </a>
  );
}
