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

output_file="$(mktemp)"
trap 'rm -f "$output_file"' EXIT

if /usr/bin/env node "$ROOT/scripts/check_optima_schema_drift.mjs" > >(tee "$output_file") 2>&1; then
  exit 0
else
  status=$?
fi

message="Optima schema drift check failed with exit code $status"
logger -t optima-schema-drift -- "$message" || true
/usr/bin/env node "$ROOT/scripts/send_optima_schema_drift_alert.mjs" \
  --exit-code "$status" \
  --details-file "$output_file" || true
exit "$status"
