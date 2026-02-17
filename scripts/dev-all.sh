#!/usr/bin/env bash
set -euo pipefail

SERVER_CMD=(pnpm dev:server)
FRONTEND_CMD=(pnpm dev:web)

get_backend_port() {
  if [[ -f ".env" ]]; then
    local env_port
    env_port="$(grep -E '^PORT=' .env | tail -n 1 | cut -d'=' -f2- | tr -d '[:space:]' || true)"
    if [[ -n "${env_port}" ]]; then
      printf '%s\n' "$env_port"
      return
    fi
  fi
  printf '%s\n' "5001"
}

cleanup() {
  local code=$?
  trap - INT TERM EXIT
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
  fi
  if [[ -n "${FRONTEND_PID:-}" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
  exit "$code"
}

trap cleanup INT TERM EXIT

BACKEND_PORT="$(get_backend_port)"
if lsof -tiTCP:"${BACKEND_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[dev:all] Port ${BACKEND_PORT} is busy. Releasing it..."
  lsof -tiTCP:"${BACKEND_PORT}" -sTCP:LISTEN | xargs kill -9 2>/dev/null || true
  sleep 1
fi

echo "[dev:all] Starting backend..."
"${SERVER_CMD[@]}" &
SERVER_PID=$!

sleep 1

echo "[dev:all] Starting frontend..."
"${FRONTEND_CMD[@]}" &
FRONTEND_PID=$!

echo "[dev:all] Running. Press Ctrl+C to stop both."

# Portable wait loop for macOS Bash 3.x (no `wait -n` support)
while true; do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    wait "$SERVER_PID"
    exit $?
  fi

  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    wait "$FRONTEND_PID"
    exit $?
  fi

  sleep 1
done
