#!/usr/bin/env bash
set -euo pipefail

ROOT="/docker/openspg"
LOG_DIR="$ROOT/logs"
NODE_BIN="${NODE_BIN:-/usr/bin/node}"

mkdir -p "$LOG_DIR"

export EXA_API_KEY="${EXA_API_KEY:-}"
export OPENSPG_API_BASE="${OPENSPG_API_BASE:-http://10.10.254.42:8887}"
export OPENSPG_COOKIE_FILE="${OPENSPG_COOKIE_FILE:-/etc/erp-kb-openspg.cookie}"
export OPENSPG_LOGIN_FILE="${OPENSPG_LOGIN_FILE:-/etc/erp-kb-openspg-login.env}"
export OPENSPG_BUILD="${OPENSPG_BUILD:-1}"

cd "$ROOT"

if ! "$NODE_BIN" scripts/openspg_auth_check.mjs >/dev/null 2>&1; then
  "$NODE_BIN" scripts/openspg_login.mjs >/dev/null
fi

LOG_FILE="$LOG_DIR/refresh_taxbell_sources_$(date +%Y%m%d_%H%M%S).log"

echo "[$(date -Iseconds)] Starting Taxbell reference source refresh..." >> "$LOG_FILE"

"$NODE_BIN" scripts/refresh_taxbell_reference_sources.mjs --kb all >> "$LOG_FILE" 2>&1

echo "[$(date -Iseconds)] Taxbell reference sources refreshed." >> "$LOG_FILE"
