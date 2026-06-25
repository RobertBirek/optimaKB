import process from 'node:process';

export const OPENSPG_API_BASE = (
  process.env.OPENSPG_API_BASE || 'http://10.10.254.42:8887'
).replace(/\/+$/, '');

export const ERP_KB_MCP_BASE_URL = (
  process.env.ERP_KB_MCP_BASE_URL || 'http://10.10.254.42:3400'
).replace(/\/+$/, '');

export const ERP_KB_MCP_PROXY_TARGET_BASE = (
  process.env.ERP_KB_MCP_PROXY_TARGET_BASE || 'http://10.10.254.42:3400'
).replace(/\/+$/, '');

export const ERP_KB_DASHBOARD_TEST_URL = (
  process.env.ERP_KB_DASHBOARD_TEST_URL || 'http://10.10.254.42:3410/panel'
).replace(/\/+$/, '');
