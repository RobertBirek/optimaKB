import { useState } from 'react';
import { Check, Copy as CopyIcon } from 'lucide-react';
import IconButton from '../IconButton';

export default function SnippetBlock({ label, snippet, compact }) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(snippet, null, 2);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => setCopied(true)).catch(() => {});
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ marginBottom: compact ? '8px' : '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <strong style={{ fontSize: '13px' }}>{label}</strong>
        <IconButton icon={copied ? Check : CopyIcon} label="Kopiuj" onClick={copy} />
      </div>
      <pre style={{
        fontSize: '12px', background: 'var(--bg)', padding: '8px', borderRadius: '6px',
        overflowX: 'auto', maxHeight: compact ? '120px' : '250px', overflowY: 'auto',
        border: '1px solid var(--line)',
      }}>{text}</pre>
    </div>
  );
}
