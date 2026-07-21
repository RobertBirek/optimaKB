#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/docker/openspg}"
ENV_FILE="${OPTIMA_SCHEMA_DRIFT_ENV_FILE:-/etc/optima-schema-drift.env}"
if [[ -r "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi
export OPTIMA_CONFIGURATION_DATABASE="${OPTIMA_CONFIGURATION_DATABASE:-CDN_Konfiguracja}"
cd "$ROOT"

/usr/bin/env node "$ROOT/scripts/check_optima_schema_drift.mjs"
