#!/usr/bin/env bash
set -euo pipefail

ROOT="/docker/openspg"
LOG_DIR="$ROOT/logs"
NODE_BIN="${NODE_BIN:-/usr/bin/node}"

mkdir -p "$LOG_DIR"

export OPENSPG_API_BASE="${OPENSPG_API_BASE:-http://10.10.254.42:8887}"
export OPENSPG_PROJECT_ID="${OPENSPG_PROJECT_ID:-11}"
export OPENSPG_COOKIE_FILE="${OPENSPG_COOKIE_FILE:-/etc/erp-kb-openspg.cookie}"
export OPENSPG_LOGIN_FILE="${OPENSPG_LOGIN_FILE:-/etc/erp-kb-openspg-login.env}"
export COMMUNITY_NEWS_MAX_POSTS="${COMMUNITY_NEWS_MAX_POSTS:-200}"
export COMMUNITY_NEWS_FORCE="${COMMUNITY_NEWS_FORCE:-1}"
export OPENSPG_BUILD="${OPENSPG_BUILD:-1}"

cd "$ROOT"

if ! "$NODE_BIN" scripts/openspg_auth_check.mjs >/dev/null 2>&1; then
  "$NODE_BIN" scripts/openspg_login.mjs >/dev/null
fi

"$NODE_BIN" scripts/refresh_comarch_community_news.mjs
