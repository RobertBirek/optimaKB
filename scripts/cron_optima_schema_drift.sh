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
QUALITY_ROOT="${OPTIMA_SCHEMA_QUALITY_ROOT:-/var/lib/openspg-schema-quality}"
export KB_QUALITY_GATE_OUT_JSON="${KB_QUALITY_GATE_OUT_JSON:-$QUALITY_ROOT/quality-gate.json}"
export KB_QUALITY_GATE_OUT_MD="${KB_QUALITY_GATE_OUT_MD:-$QUALITY_ROOT/quality-gate.md}"
cd "$ROOT"

output_file="$(mktemp)"
trap 'rm -f "$output_file"' EXIT

status=0
/usr/bin/env node "$ROOT/scripts/check_optima_schema_drift.mjs" > >(tee "$output_file") 2>&1 || status=$?
if [[ "$status" -eq 0 ]]; then
  /usr/bin/env node "$ROOT/scripts/kb_quality_gate.mjs" --kb ComarchOptimaSchema >> "$output_file" 2>&1 || status=$?
fi
if [[ "$status" -eq 0 ]]; then
  /usr/bin/env node "$ROOT/scripts/verify_optima_schema_graph_parity.mjs" >> "$output_file" 2>&1 || status=$?
fi
if [[ "$status" -eq 0 ]]; then
  exit 0
fi

message="Optima schema validation pipeline failed with exit code $status"
logger -t optima-schema-drift -- "$message" || true
/usr/bin/env node "$ROOT/scripts/send_optima_schema_drift_alert.mjs" \
  --exit-code "$status" \
  --details-file "$output_file" || true
exit "$status"
