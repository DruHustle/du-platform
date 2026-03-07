#!/usr/bin/env bash
set -euo pipefail

resolve_base_url() {
  if [[ $# -ge 1 && -n "${1}" ]]; then
    printf '%s\n' "${1}"
    return
  fi

  if [[ -n "${ONESA_E2E_BASE_URL:-}" ]]; then
    printf '%s\n' "${ONESA_E2E_BASE_URL}"
    return
  fi

  local candidate
  local first_healthy=""
  for candidate in \
    "http://127.0.0.1:5001" \
    "http://127.0.0.1:5002" \
    "http://127.0.0.1:5003" \
    "http://127.0.0.1:5000"; do
    if curl -fsS --max-time 2 "${candidate}/api/ai/ready" 2>/dev/null | node --input-type=module -e '
      import fs from "node:fs";
      const data = JSON.parse(fs.readFileSync(0, "utf8"));
      if (data?.ready === true) process.exit(0);
      process.exit(1);
    ' >/dev/null 2>&1; then
      printf '%s\n' "${candidate}"
      return
    fi

    if [[ -z "${first_healthy}" ]] && curl -fsS --max-time 2 "${candidate}/api/ai/health" >/dev/null 2>&1; then
      first_healthy="${candidate}"
    fi
  done

  if [[ -n "${first_healthy}" ]]; then
    printf '%s\n' "${first_healthy}"
    return
  fi

  printf '%s\n' "http://127.0.0.1:5001"
}

BASE_URL="$(resolve_base_url "${1:-}")"
API_BASE="${BASE_URL%/}/api/ai"

tmp_body=""

cleanup() {
  if [[ -n "${tmp_body}" && -f "${tmp_body}" ]]; then
    rm -f "${tmp_body}"
  fi
}
trap cleanup EXIT

request() {
  local method="$1"
  local url="$2"
  local data="${3:-}"

  tmp_body="$(mktemp)"
  if [[ -n "${data}" ]]; then
    HTTP_CODE="$(curl -sS -o "${tmp_body}" -w "%{http_code}" -X "${method}" "${url}" -H "Content-Type: application/json" --data "${data}")"
  else
    HTTP_CODE="$(curl -sS -o "${tmp_body}" -w "%{http_code}" -X "${method}" "${url}")"
  fi
  RESPONSE_BODY="$(cat "${tmp_body}")"
  rm -f "${tmp_body}"
  tmp_body=""
}

assert_status() {
  local expected="$1"
  local label="$2"
  if [[ "${HTTP_CODE}" != "${expected}" ]]; then
    echo "[FAIL] ${label}: expected HTTP ${expected}, got ${HTTP_CODE}"
    echo "${RESPONSE_BODY}"
    exit 1
  fi
}

assert_json_true() {
  local path="$1"
  local label="$2"
  if ! printf '%s' "${RESPONSE_BODY}" | node --input-type=module -e '
    import fs from "node:fs";
    const data = JSON.parse(fs.readFileSync(0, "utf8"));
    const path = process.argv[1].split(".");
    let current = data;
    for (const key of path) current = current?.[key];
    if (current !== true) process.exit(1);
  ' "${path}"; then
    echo "[FAIL] ${label}: expected ${path}=true"
    echo "${RESPONSE_BODY}"
    exit 1
  fi
}

assert_reply_contains() {
  local needle="$1"
  local label="$2"
  if ! printf '%s' "${RESPONSE_BODY}" | node --input-type=module -e '
    import fs from "node:fs";
    const data = JSON.parse(fs.readFileSync(0, "utf8"));
    const reply = String(data?.reply ?? "");
    const needle = process.argv[1];
    if (!reply || !reply.includes(needle)) process.exit(1);
  ' "${needle}"; then
    echo "[FAIL] ${label}: reply missing '${needle}'"
    echo "${RESPONSE_BODY}"
    exit 1
  fi
}

assert_reply_not_contains() {
  local needle="$1"
  local label="$2"
  if ! printf '%s' "${RESPONSE_BODY}" | node --input-type=module -e '
    import fs from "node:fs";
    const data = JSON.parse(fs.readFileSync(0, "utf8"));
    const reply = String(data?.reply ?? "");
    const needle = process.argv[1];
    if (reply.includes(needle)) process.exit(1);
  ' "${needle}"; then
    echo "[FAIL] ${label}: reply includes banned text '${needle}'"
    echo "${RESPONSE_BODY}"
    exit 1
  fi
}

echo "[E2E] Base URL: ${BASE_URL}"

request GET "${API_BASE}/health"
assert_status "200" "health"
assert_json_true "ok" "health"
echo "[PASS] /health"

request GET "${API_BASE}/ready"
assert_status "200" "ready"
assert_json_true "ready" "ready"
echo "[PASS] /ready"

request POST "${API_BASE}/chat" '{"language":"en","messages":[{"role":"user","content":"Hello"}]}'
assert_status "200" "chat hello en"
assert_reply_contains "Hi" "chat hello en"
echo "[PASS] /chat English greeting"

request POST "${API_BASE}/chat" '{"language":"sn","messages":[{"role":"user","content":"Mhoro"}]}'
assert_status "200" "chat hello sn"
assert_reply_contains "Mhoro" "chat hello sn"
echo "[PASS] /chat Shona greeting"

request POST "${API_BASE}/chat" '{"language":"en","messages":[{"role":"user","content":"Give me 3 practical first steps to start exporting packaged herbal tea from Zimbabwe to Germany."}]}'
assert_status "200" "chat export guidance"
assert_reply_not_contains "Translate from en to en" "chat export guidance"
assert_reply_not_contains "Noted. Noted. Noted." "chat export guidance"
echo "[PASS] /chat practical guidance"

echo "[E2E] Onesa smoke test passed."
