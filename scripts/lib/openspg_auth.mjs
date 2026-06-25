#!/usr/bin/env node

import fs from 'fs';

export function readOpenSpgCookie(options = {}) {
  const envCookie = String(process.env.OPENSPG_COOKIE || '').trim();
  if (envCookie) return envCookie;

  const cookieFile = String(process.env.OPENSPG_COOKIE_FILE || '').trim();
  if (cookieFile) {
    try {
      const fileCookie = fs.readFileSync(cookieFile, 'utf8').trim();
      if (!fileCookie && options.required) {
        throw new Error(`OPENSPG_COOKIE_FILE ${cookieFile} is empty`);
      }
      return fileCookie;
    } catch (error) {
      if (options.required) {
        if (String(error.message).startsWith('OPENSPG_COOKIE_FILE')) throw error;
        throw new Error(`Unable to read OPENSPG_COOKIE_FILE ${cookieFile}: ${error.message}`);
      }
      return '';
    }
  }

  if (options.required) {
    throw new Error('OPENSPG_COOKIE or OPENSPG_COOKIE_FILE is required');
  }
  return '';
}

export function openSpgCookieSource() {
  if (String(process.env.OPENSPG_COOKIE || '').trim()) return 'OPENSPG_COOKIE';
  if (String(process.env.OPENSPG_COOKIE_FILE || '').trim()) return 'OPENSPG_COOKIE_FILE';
  return '';
}
