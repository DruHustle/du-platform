#!/usr/bin/env bash

set -euo pipefail

URL="${1:-}"
PROFILE="${2:-}"
TIMEOUT_SECONDS="${KEEPALIVE_TIMEOUT_SECONDS:-25}"
BODY_FILE="$(mktemp)"
HEADER_FILE="$(mktemp)"

cleanup() {
  rm -f "${BODY_FILE}" "${HEADER_FILE}"
}

trap cleanup EXIT

if [[ -z "${URL}" || -z "${PROFILE}" ]]; then
  echo "[healthcheck] Usage: ./scripts/healthcheck-json.sh <url> <profile>"
  echo "[healthcheck] Profiles: app-ping | db-health | onesa-ready"
  exit 1
fi

echo "[healthcheck] Probing ${PROFILE} via ${URL}"

if ! http_code="$(curl -sS --max-time "${TIMEOUT_SECONDS}" -D "${HEADER_FILE}" -o "${BODY_FILE}" -w "%{http_code}" "${URL}")"; then
  echo "[healthcheck] Request failed (network, DNS, TLS, or timeout)."
  exit 1
fi

if [[ "${http_code}" -lt 200 || "${http_code}" -ge 400 ]]; then
  echo "[healthcheck] Failed (HTTP ${http_code})"
  echo "[healthcheck] Response body:"
  cat "${BODY_FILE}" || true
  exit 1
fi

content_type="$(
  awk -F': *' 'tolower($1)=="content-type"{print tolower($2)}' "${HEADER_FILE}" | tail -n 1 | tr -d '\r'
)"

if [[ "${content_type}" != application/json* ]]; then
  echo "[healthcheck] Expected JSON but received content-type: ${content_type:-<missing>}"
  echo "[healthcheck] Response body:"
  cat "${BODY_FILE}" || true
  exit 1
fi

node - "${BODY_FILE}" "${PROFILE}" <<'NODE'
const fs = require("fs");

const [bodyPath, profile] = process.argv.slice(2);
const rawBody = fs.readFileSync(bodyPath, "utf8");

let payload;
try {
  payload = JSON.parse(rawBody);
} catch (error) {
  console.error("[healthcheck] Response body is not valid JSON.");
  console.error(rawBody);
  process.exit(1);
}

const checks = {
  "app-ping": {
    pass: payload?.ok === true && payload?.service === "zigd-platform",
    expected: 'expected {"ok": true, "service": "zigd-platform"}',
  },
  "db-health": {
    pass: payload?.ok === true && payload?.mode === "mysql",
    expected: 'expected {"ok": true, "mode": "mysql"}',
  },
  "onesa-ready": {
    pass: payload?.ready === true,
    expected: 'expected {"ready": true}',
  },
};

if (!checks[profile]) {
  console.error(`[healthcheck] Unknown profile: ${profile}`);
  process.exit(1);
}

if (!checks[profile].pass) {
  console.error(`[healthcheck] ${profile} validation failed: ${checks[profile].expected}`);
  console.error(`[healthcheck] Response body: ${rawBody}`);
  process.exit(1);
}

console.log(`[healthcheck] ${profile} passed.`);
NODE
