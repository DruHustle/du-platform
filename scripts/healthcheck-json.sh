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
  echo "[healthcheck] FAIL — Network error (DNS, TLS, timeout, or connection refused)."
  echo "[healthcheck] URL: ${URL}"
  echo "[healthcheck] Timeout: ${TIMEOUT_SECONDS}s"
  exit 1
fi

if [[ "${http_code}" -lt 200 || "${http_code}" -ge 400 ]]; then
  echo "[healthcheck] FAIL — HTTP ${http_code} from ${URL}"
  echo "[healthcheck] Response body:"
  cat "${BODY_FILE}" || true
  exit 1
fi

content_type="$(
  awk -F': *' 'tolower($1)=="content-type"{print tolower($2)}' "${HEADER_FILE}" | tail -n 1 | tr -d '\r'
)"

if [[ "${content_type}" != application/json* ]]; then
  echo "[healthcheck] FAIL — Expected Content-Type: application/json but got: ${content_type:-<missing>}"
  echo "[healthcheck] This usually means a proxy, CDN, or auth wall is intercepting the request."
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
} catch (err) {
  console.error("[healthcheck] FAIL — Response is not valid JSON.");
  console.error(`[healthcheck] Parse error: ${err.message}`);
  console.error(`[healthcheck] Raw response:\n${rawBody}`);
  process.exit(1);
}

// Field-level diagnostics: describe exactly what is wrong, not just what was expected.
function diagnose(profile, payload) {
  switch (profile) {
    case "app-ping": {
      const issues = [];
      if (payload?.ok !== true)
        issues.push(`"ok" is ${JSON.stringify(payload?.ok)} — expected true`);
      if (payload?.service !== "du-platform")
        issues.push(`"service" is ${JSON.stringify(payload?.service)} — expected "du-platform"`);
      return issues;
    }
    case "db-health": {
      const issues = [];
      if (payload?.ok !== true)
        issues.push(`"ok" is ${JSON.stringify(payload?.ok)} — expected true. ${payload?.error ? `Server error: "${payload.error}"` : ""}`);
      if (payload?.mode !== "mysql")
        issues.push(`"mode" is ${JSON.stringify(payload?.mode)} — expected "mysql". Database may be down or misconfigured.`);
      return issues;
    }
    case "onesa-ready": {
      const issues = [];
      if (payload?.ready !== true)
        issues.push(`"ready" is ${JSON.stringify(payload?.ready)} — expected true. ${payload?.reason ? `Reason: "${payload.reason}"` : "AI service may still be initialising."}`);
      return issues;
    }
    default:
      return [`Unknown profile: "${profile}"`];
  }
}

const issues = diagnose(profile, payload);

if (issues.length > 0) {
  console.error(`[healthcheck] FAIL — ${profile}`);
  issues.forEach((msg) => console.error(`  ✗ ${msg}`));
  console.error(`[healthcheck] Full response: ${rawBody}`);
  process.exit(1);
}

console.log(`[healthcheck] PASS — ${profile}`);
NODE
