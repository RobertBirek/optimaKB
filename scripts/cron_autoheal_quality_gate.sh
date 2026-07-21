#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/docker/openspg}"
export OPENSPG_COOKIE_FILE="${OPENSPG_COOKIE_FILE:-/etc/erp-kb-openspg.cookie}"
cd "$ROOT"

/usr/bin/env node "$ROOT/scripts/kb_quality_gate.mjs" --all --auto-fix
OPTIMA_CONFIGURATION_DATABASE="${OPTIMA_CONFIGURATION_DATABASE:-CDN_Konfiguracja}" \
  /usr/bin/env node "$ROOT/scripts/check_optima_schema_drift.mjs"
