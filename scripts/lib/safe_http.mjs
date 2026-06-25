#!/usr/bin/env node

import dns from 'dns/promises';
import net from 'net';

const ALLOW_PRIVATE = process.env.ERP_KB_ALLOW_PRIVATE_SOURCE_URLS === '1';
const MAX_REDIRECTS = Number(process.env.ERP_KB_SOURCE_MAX_REDIRECTS || 5);

function privateIpv4(address) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
  const [a, b] = parts;
  return (
    a === 0
    || a === 10
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 100 && b >= 64 && b <= 127)
    || a >= 224
  );
}

function privateIpv6(address) {
  const normalized = address.toLowerCase().split('%')[0];
  return (
    normalized === '::'
    || normalized === '::1'
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || /^fe[89ab]/.test(normalized)
    || normalized.startsWith('ff')
    || normalized.startsWith('::ffff:127.')
    || normalized.startsWith('::ffff:10.')
    || normalized.startsWith('::ffff:192.168.')
  );
}

export function isPrivateAddress(address) {
  const family = net.isIP(address);
  if (family === 4) return privateIpv4(address);
  if (family === 6) return privateIpv6(address);
  return true;
}

export async function assertSafeHttpUrl(value) {
  const url = new URL(String(value || '').trim());
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('URL must use http or https');
  if (url.username || url.password) throw new Error('URL credentials are not allowed');
  if (ALLOW_PRIVATE) return url;
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new Error(`Private or local hostname is not allowed: ${hostname}`);
  }
  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new Error(`Private IP address is not allowed: ${hostname}`);
    return url;
  }
  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length) throw new Error(`Hostname did not resolve: ${hostname}`);
  const blocked = addresses.find((entry) => isPrivateAddress(entry.address));
  if (blocked) throw new Error(`Hostname resolves to a private IP address: ${hostname} -> ${blocked.address}`);
  return url;
}

export async function safeFetch(value, options = {}) {
  let url = await assertSafeHttpUrl(value);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const response = await fetch(url, {
      ...options,
      redirect: 'manual',
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get('location');
    if (!location) throw new Error(`Redirect response ${response.status} has no Location header`);
    if (redirect === MAX_REDIRECTS) throw new Error(`Too many redirects; maximum is ${MAX_REDIRECTS}`);
    url = await assertSafeHttpUrl(new URL(location, url).toString());
  }
  throw new Error('Safe fetch redirect loop ended unexpectedly');
}

