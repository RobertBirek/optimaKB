# Official Reference Delta Refresh

This runbook covers the delta refresh path for the official reference KBs:

- `ComarchOptimaReference`
- `ComarchBetterflyReference`

The runner is:

```bash
node scripts/refresh_official_reference_delta.mjs
```

It refreshes known local official source snapshots, compares SHA-256 hashes before and after download, runs the exporter only when source content changes, and can run OpenSPG builder jobs only for changed CSV files through `OPENSPG_FORCE_FILES`.

## Smoke test

Use this when checking network, URL mapping, and report generation without rewriting source snapshots:

```bash
node scripts/refresh_official_reference_delta.mjs --kb all --dry-run --max-sources 5
```

## Manual refresh without OpenSPG build

Use this to update local snapshots and regenerated export files only if official source content changed:

```bash
node scripts/refresh_official_reference_delta.mjs --kb all --freshness --quality
```

## Manual refresh with OpenSPG build

Use this when changed CSV files should be uploaded and rebuilt in OpenSPG:

```bash
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie \
node scripts/refresh_official_reference_delta.mjs --kb all --build --freshness --quality --test
```

If only one KB is needed:

```bash
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie \
node scripts/refresh_official_reference_delta.mjs --kb betterfly --build --freshness --quality --test
```

## Reports

The runner writes:

- `docs/reference/Official_Reference_Delta_Refresh_Report.json`
- `docs/reference/Official_Reference_Delta_Refresh_Report.md`

The follow-up reports are still:

- `docs/reference/KB_Source_Freshness_Report.json`
- `docs/reference/KB_Source_Freshness_Report.md`
- `docs/reference/KB_Quality_Gate_Report.json`
- `docs/reference/KB_Quality_Gate_Report.md`

## Cron candidate

A conservative weekly official-doc refresh:

```cron
35 5 * * 1 OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie /usr/bin/env node /docker/openspg/scripts/refresh_official_reference_delta.mjs --kb all --build --freshness --quality >> /docker/openspg/logs/official_reference_delta_refresh.log 2>&1
```

Keep this separate from the daily community-news cron. Official documentation changes less frequently, while community/news sources are expected to move daily.
