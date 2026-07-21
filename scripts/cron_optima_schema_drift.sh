#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/docker/openspg}"
export OPTIMA_CONFIGURATION_DATABASE="${OPTIMA_CONFIGURATION_DATABASE:-CDN_Konfiguracja}"
cd "$ROOT"

/usr/bin/env node "$ROOT/scripts/check_optima_schema_drift.mjs"
