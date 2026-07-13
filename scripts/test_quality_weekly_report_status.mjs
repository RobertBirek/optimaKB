#!/usr/bin/env node

const BASE_URL = 'http://10.10.254.42:3410/panel';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const response = await fetch(`${BASE_URL}/api/status`);
assert(response.ok, `status returned ${response.status}`);

const status = await response.json();
const weeklyReport = status.reports.find((report) => report.key === 'quality_weekly');

assert(weeklyReport, 'weekly report entry is missing');
assert(weeklyReport.markdown.exists === true, 'weekly report markdown is missing');
assert(weeklyReport.hasJsonPath === false, 'weekly report should be md-only');
assert(weeklyReport.overallStatus === 'OK', `weekly report status is ${weeklyReport.overallStatus}`);

process.stdout.write(`${JSON.stringify({ ok: true, weeklyReport: {
  key: weeklyReport.key,
  overallStatus: weeklyReport.overallStatus,
  markdownExists: weeklyReport.markdown.exists,
  hasJsonPath: weeklyReport.hasJsonPath,
}}, null, 2)}\n`);
