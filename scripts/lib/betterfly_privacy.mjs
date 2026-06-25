#!/usr/bin/env node

const PRIVACY_MODES = new Set(['strict_privacy', 'trusted_operator']);

const SENSITIVE_KEY_PATTERNS = [
  /taxnumber/i,
  /taxid/i,
  /nip/i,
  /mail/i,
  /email/i,
  /phone/i,
  /address/i,
  /bankaccount/i,
  /accountnumber/i,
  /documentnumber/i,
  /paymentid/i,
  /recipient/i,
  /sender/i,
  /representative/i,
  /^number$/i,
];

function toBool(value, fallback = false) {
  if (value == null || value === '') return fallback;
  const text = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(text);
}

function normalizeMode(value) {
  const normalized = String(value || 'strict_privacy').trim().toLowerCase();
  if (PRIVACY_MODES.has(normalized)) return normalized;
  return 'strict_privacy';
}

export function getPrivacyPolicy() {
  const mode = normalizeMode(process.env.BETTERFLY_MCP_PRIVACY_MODE || 'strict_privacy');
  const allowSensitive = toBool(process.env.BETTERFLY_MCP_ALLOW_SENSITIVE, false);
  return {
    mode,
    allowSensitive,
    strict: mode === 'strict_privacy',
    trustedOperator: mode === 'trusted_operator',
  };
}

export function assertSensitiveAllowed(includeSensitive) {
  if (!includeSensitive) return;
  const policy = getPrivacyPolicy();
  if (policy.strict) {
    const error = new Error('Sensitive output is disabled by strict privacy policy.');
    error.code = 'SENSITIVE_DISABLED_STRICT';
    throw error;
  }
  if (!policy.allowSensitive) {
    const error = new Error('Sensitive output is disabled by server configuration.');
    error.code = 'SENSITIVE_DISABLED_CONFIG';
    throw error;
  }
}

function isSensitiveKey(keyPath) {
  const key = String(keyPath || '').split('.').pop() || '';
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function maskEmail(value) {
  const text = String(value || '');
  const at = text.indexOf('@');
  if (at <= 1) return '***@***';
  const name = text.slice(0, at);
  const domain = text.slice(at + 1);
  return `${name.slice(0, 1)}***@${domain || '***'}`;
}

function maskNumeric(value) {
  const text = String(value || '');
  const digits = text.replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  const visibleStart = digits.slice(0, 2);
  const visibleEnd = digits.slice(-2);
  return `${visibleStart}${'*'.repeat(Math.max(digits.length - 4, 4))}${visibleEnd}`;
}

function maskName(value) {
  const text = String(value || '').trim();
  if (!text) return '[REDACTED]';
  if (text.length <= 2) return `${text.slice(0, 1)}*`;
  return `${text.slice(0, 1)}***`;
}

function maskGeneric(value) {
  const text = String(value || '').trim();
  if (!text) return '[REDACTED]';
  if (text.length <= 4) return '****';
  return `${text.slice(0, 2)}***${text.slice(-2)}`;
}

function maskSensitiveValue(value, keyPath) {
  if (value == null) return value;
  const key = String(keyPath || '').toLowerCase();
  const text = String(value);

  if (/mail|email/.test(key)) return maskEmail(text);
  if (/phone|tax|nip|account|paymentid/.test(key)) return maskNumeric(text);
  if (/name|representative|sender|recipient/.test(key)) return maskName(text);
  if (/address/.test(key)) return '[REDACTED_ADDRESS]';
  if (/number/.test(key)) return maskGeneric(text);
  return maskGeneric(text);
}

function redactInternal(value, keyPath = '') {
  if (Array.isArray(value)) {
    return value.map((item, index) => redactInternal(item, `${keyPath}[${index}]`));
  }

  if (value && typeof value === 'object') {
    const output = {};
    for (const [key, nested] of Object.entries(value)) {
      const nestedPath = keyPath ? `${keyPath}.${key}` : key;
      if (isSensitiveKey(nestedPath)) {
        output[key] = maskSensitiveValue(nested, nestedPath);
      } else {
        output[key] = redactInternal(nested, nestedPath);
      }
    }
    return output;
  }

  return value;
}

export function redactBetterflyPayload(payload) {
  return redactInternal(payload, '');
}

export function applyPrivacyMode(payload, options = {}) {
  const includeSensitive = Boolean(options.includeSensitive);
  const policy = getPrivacyPolicy();

  if (includeSensitive) {
    assertSensitiveAllowed(true);
    return {
      payload,
      privacy: {
        mode: policy.mode,
        includeSensitive: true,
        redacted: false,
      },
    };
  }

  return {
    payload: redactBetterflyPayload(payload),
    privacy: {
      mode: policy.mode,
      includeSensitive: false,
      redacted: true,
    },
  };
}

export function redactError(error) {
  const message = String(error?.message || 'Unknown error');
  return {
    code: error?.code || 'ERROR',
    message: message
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
      .replace(/Basic\s+[A-Za-z0-9+/=]+/gi, 'Basic [REDACTED]'),
  };
}
