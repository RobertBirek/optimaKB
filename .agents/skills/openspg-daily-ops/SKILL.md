---
name: openspg-daily-ops
description: Daily operational triage for the OpenSPG ERP KB dashboard. Use when performing daily inspection, responding to autopilot alerts, reviewing discovery pipeline state, checking quality trends, or deciding whether to override automated decisions. Not for building KBs, configuring MCP, or creating content (use dedicated skills for those).
---

# OpenSPG Daily Ops

## Entry Point

Open `http://10.10.254.42:3410/panel/` in your browser. The base path is `/panel`.

## Daily Checklist

### 1. Overview Page (`/#/overview`)

- **Quality gates**: All green? Any yellow/red indicators?
- **KAG Readiness panel**: Check LLM, Tavily, Firecrawl, Exa, Auto-draft, Autopilot, Freeze, Learning, Alerts signals. A red signal means that capability is degraded.
- **Autopilot summary**: Number of frozen KBs and domains.

### 2. Autopilot State

Navigate to **Automation** tab (`/#/automation`) and scroll to Autopilot Actions History. For each freeze:

- **KB freeze**: triggered when KB error rate > threshold (default 0.15) in last 20 jobs. Recovery: 48h after last error.
- **Domain freeze**: triggered when domain error rate > threshold. Recovery: same 48h cooldown.
- **Throttle**: per-job delay applied instead of freeze. Throttle reduces throughput during partial degradation.

Decision matrix:

| Condition | Action |
|---|---|
| All frozen items have `operatorOverride: true` | Nothing — operator already decided |
| Freeze > 48h and recovery didn't fire | Check autopilot state file (`data/dashboard/learning/autopilot_state.json`), manual recovery via `removeOperatorOverride(kbName, namespace)` or `removeOperatorOverride(namespace, domain)` |
| Throttled but no freeze | Monitor — throttle is normal graceful degradation |
| New freeze since last check | Investigate root cause before overriding |

### 3. Discovery Pipeline

Navigate to **Sources** tab (`/#/sources`).

- **Pending candidates**: number of undiscovered candidates waiting for operator decision.
- **Auto-draft log**: check `autoDraftLog` counter and last entries. Daily limit: 25. Systemd timer fires at 00/06/12/18 UTC.
- **Query health table**: review queries with low yield. Suspended queries show `suspendedUntil` timestamps.
- **Domain suggestions**: allowlist/blocklist suggestions from canary analysis. Approve via PATCH if confidence > 90%.

### 4. Alerts & Trends

Navigate to **Trends** tab (`/#/trends`).

- **Anomaly banner**: red banner at top if anomalies are active.
- **Trend charts**: 14-day quality metrics per KB. Look for sudden drops in `automationAccuracy` or spikes in `noisePenalty`.
- **Weekly report**: if it's Monday or report is >7 days stale, generate via **Reports** tab (`/#/reports`) → "Generate weekly quality report".

### 5. Weekly (day 7 of cycle)

Only on dashboard weekly maintenance:

1. **Generate quality report** via Reports tab.
2. **Review `docs/reference/ERP_KB_Quality_Weekly_Report.md`** — does anything need operator intervention?
3. **Check discovery policy**: `semiAutoEnabled` status, per-KB thresholds, canary confidence.
4. **Clear stale autopilot state** if any freeze is >7 days old with no recovery — likely a stuck state.

## API Quick Reference

```bash
# Autopilot summary
curl -s http://10.10.254.42:3410/panel/api/automation/autopilot

# Active alerts
curl -s http://10.10.254.42:3410/panel/api/automation/alerts

# Trends (last 14 days)
curl -s http://10.10.254.42:3410/panel/api/automation/trends?days=14

# Generate weekly report (POST, requires CSRF)
curl -s -X POST -H "X-ERP-KB-CSRF: 1" http://10.10.254.42:3410/panel/api/automation/report

# Learning state
curl -s http://10.10.254.42:3410/panel/api/automation/learning

# Discovery state (includes .candidates, .semiAuto, .report, .qualityAlerts)
curl -s http://10.10.254.42:3410/panel/api/discovery
```

## When to Escalate

- **Dashboard 500 errors**: check service logs `journalctl -u erp-kb-dashboard -n 50 --no-pager`
- **MCP bridge down**: `curl http://10.10.254.42:3400/health` — if dead, restart via `sudo systemctl restart erp-kb-mcp-bridge`
- **Build jobs stuck**: check OpenSPG job list directly — `GET /public/v1/builder/job/list?projectId=N&start=1`
- **Disk or ownership issues**: `sudo chown -R mcpbot:mcpbot /docker/openspg/data/dashboard/ /docker/openspg/docs/reference/`
- **Approve/build preflight fails with `openspg_cookie_file: FAIL ... EACCES`**: someone ran
  `scripts/openspg_login.mjs` as root, which resets `/etc/erp-kb-openspg.cookie` to `root:root 0600`
  (the dashboard runs as `mcpbot` and can no longer read it). Fix:
  `chmod 644 /etc/erp-kb-openspg.cookie`. See
  `docs/reference/OpenSPG_KB_Operational_Memory.md` → "Auth / cookie file permissions".
