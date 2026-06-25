import { AlertTriangle, RefreshCw, XCircle } from 'lucide-react';

export default function ApiErrorBox({ error, onRetry, onDismiss, variant = 'inline' }) {
  if (!error) return null;
  const content = (
    <>
      <AlertTriangle size={16} aria-hidden="true" />
      <span>{error}</span>
      {onDismiss ? (
        <button className="apiErrorDismiss" onClick={onDismiss} aria-label="Odrzuć">
          <XCircle size={14} />
        </button>
      ) : null}
      {onRetry ? (
        <button className="secondary compactButton" onClick={onRetry}>
          <RefreshCw size={12} /> Ponów
        </button>
      ) : null}
    </>
  );
  if (variant === 'banner') return <div className="apiErrorBanner">{content}</div>;
  return <div className="apiErrorInline">{content}</div>;
}
