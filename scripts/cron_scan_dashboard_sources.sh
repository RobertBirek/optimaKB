#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/docker/openspg}"
cd "$ROOT"

/usr/bin/env node "$ROOT/scripts/scan_dashboard_sources.mjs" --all --create-drafts && /usr/bin/env node "$ROOT/scripts/cleanup_optima_reference_duplicates.mjs"
