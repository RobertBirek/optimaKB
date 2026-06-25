export const BASE_PATH = window.location.pathname.includes('/panel') ? '/panel' : '';

let _csrfToken = '';
export function getCsrfToken() { return _csrfToken; }
export function setCsrfToken(value) { _csrfToken = value; }

export const INBOX_FILTERS = [
  ['pending', 'Do zatwierdzenia'],
  ['all', 'Wszystkie'],
  ['promoted', 'Zatwierdzone'],
  ['withdrawn', 'Wycofane'],
  ['rejected', 'Odrzucone'],
];

export const STATUS_LABELS = {
  pending: 'Do zatwierdzenia',
  promoted: 'Zatwierdzone',
  withdrawn: 'Wycofane',
  rejected: 'Odrzucone',
  SHADOW_COMPLETE: 'Shadow zakończony',
  REROUTE_PROPOSED: 'Proponowany reroute',
  REROUTED: 'Przekierowano',
};

export const UPLOAD_ACCEPT = [
  '.md', '.txt', '.pdf', '.xml', '.xpt', '.xsd', '.json', '.jsonl',
  '.vb', '.vbs', '.bas', '.sql', '.js', '.ts', '.cs', '.ps1',
  '.bat', '.cmd', '.html', '.htm', '.css', '.ini', '.cfg', '.conf',
  '.yml', '.yaml', '.csv',
  'text/markdown', 'text/plain', 'application/pdf', 'application/json',
  'application/xml', 'text/xml',
].join(',');

export function classForStatus(value) {
  const text = String(value ?? 'UNKNOWN');
  if (/PASS|FINISH|FRESH|OK|REMEDIATED|PUBLISHED|ROLLED_BACK|SHADOW_COMPLETE|REROUTED|^0$/i.test(text)) return 'ok';
  if (/WARN|PARTIAL|WAITING|RUNNING|INIT|QUEUED|PENDING|REVIEWING|APPROVED|BUILDING|VALIDATING|ROLLING_BACK|REROUTE_PROPOSED/i.test(text)) return 'warn';
  if (/FAIL|MISS|ERROR|MISSING|NO_JOB|EXCEPTION|ROLLBACK_FAILED/i.test(text)) return 'bad';
  return 'neutral';
}

export function formatNumber(value) {
  return new Intl.NumberFormat('pl-PL').format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pl-PL');
}

export function shortLabel(value, limit = 34) {
  const text = String(value || '');
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

export function safeExternalHref(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const parsed = new URL(raw, base);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.href;
  } catch {
    return '';
  }
}

export function apiUrl(path) {
  return `${BASE_PATH}${path}`;
}

export async function apiFetch(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const timeout = Number(options.timeout || 45000);
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), timeout);
  const { signal: externalSignal, ...rest } = options;
  delete rest.timeout;
  const signals = [timeoutController.signal];
  if (externalSignal) signals.push(externalSignal);
  const signal = signals.length === 1 ? signals[0] : AbortSignal.any(signals);
  try {
    return await fetch(apiUrl(path), {
      ...rest,
      signal,
      headers: {
        ...(rest.headers || {}),
        ...(!['GET', 'HEAD', 'OPTIONS'].includes(method) && _csrfToken
          ? { 'X-ERP-KB-CSRF': _csrfToken }
          : {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}
