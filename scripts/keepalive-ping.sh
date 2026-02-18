#!/usr/bin/env bash

set -euo pipefail

URL="${1:-${KEEPALIVE_URL:-}}"
TIMEOUT_SECONDS="${KEEPALIVE_TIMEOUT_SECONDS:-25}"

if [[ -z "${URL}" ]]; then
  echo "[keepalive] Missing URL. Provide as first arg or KEEPALIVE_URL env var."
  exit 1
fi

echo "[keepalive] Pinging ${URL}"

if ! http_code="$(curl -sS --max-time "${TIMEOUT_SECONDS}" -o /tmp/keepalive-body.txt -w "%{http_code}" "${URL}")"; then
  echo "[keepalive] Request failed (network, DNS, or timeout)."
  exit 1
fi

if [[ "${http_code}" -ge 200 && "${http_code}" -lt 400 ]]; then
  echo "[keepalive] Success (HTTP ${http_code})"
  exit 0
fi

echo "[keepalive] Failed (HTTP ${http_code})"
echo "[keepalive] Response body:"
cat /tmp/keepalive-body.txt || true
exit 1
