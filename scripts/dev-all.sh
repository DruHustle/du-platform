#!/usr/bin/env bash
set -euo pipefail

SERVER_CMD=(pnpm dev:server)
FRONTEND_CMD=(pnpm dev:web)
OLLAMA_CMD=(ollama serve)

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

get_onesa_provider() {
  if [[ -f ".env" ]]; then
    local provider
    provider="$(grep -E '^ONESA_PROVIDER=' .env | tail -n 1 | cut -d'=' -f2- | tr -d '[:space:]' || true)"
    if [[ -n "${provider}" ]]; then
      printf '%s\n' "$(printf '%s' "${provider}" | tr '[:upper:]' '[:lower:]')"
      return
    fi
  fi
  printf '%s\n' "ollama"
}

is_ollama_running() {
  curl -fsS "http://127.0.0.1:11434/api/tags" >/dev/null 2>&1
}

ensure_ollama() {
  local provider
  provider="$(get_onesa_provider)"
  if [[ "${provider}" == "openai_compatible" ]]; then
    return 0
  fi

  if ! command -v ollama >/dev/null 2>&1; then
    echo "[dev:all] ERROR: Ollama is required but not installed."
    echo "[dev:all] Install Ollama from https://ollama.com/download and re-run 'pnpm dev'."
    echo "[dev:all] Continuing without Ollama. Onesa chat will be offline."
    return 0
  fi

  if is_ollama_running; then
    echo "[dev:all] Ollama is already running."
    return 0
  fi

  echo "[dev:all] Starting Ollama..."
  "${OLLAMA_CMD[@]}" >/tmp/zigd-ollama.log 2>&1 &
  OLLAMA_PID=$!

  for _ in {1..20}; do
    if is_ollama_running; then
      echo "[dev:all] Ollama is ready."
      return 0
    fi
    sleep 1
  done

  echo "[dev:all] ERROR: Failed to start Ollama. Check /tmp/zigd-ollama.log for details."
  echo "[dev:all] Continuing without Ollama. Onesa chat will be offline."
  return 0
}

cleanup() {
  local code=$?
  trap - INT TERM EXIT
  if [[ "${SERVER_STARTED:-0}" -eq 1 ]] && [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
  fi
  if [[ "${FRONTEND_STARTED:-0}" -eq 1 ]] && [[ -n "${FRONTEND_PID:-}" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  if [[ -n "${OLLAMA_PID:-}" ]] && kill -0 "$OLLAMA_PID" 2>/dev/null; then
    kill "$OLLAMA_PID" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
  exit "$code"
}

trap cleanup INT TERM EXIT

ensure_ollama

BACKEND_PORT="$(get_backend_port)"
SERVER_STARTED=0
FRONTEND_STARTED=0
USE_EXISTING_BACKEND=0

if lsof -tiTCP:"${BACKEND_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[dev:all] Port ${BACKEND_PORT} is busy. Reusing existing backend process."
  USE_EXISTING_BACKEND=1
fi

if [[ "${USE_EXISTING_BACKEND}" -eq 0 ]]; then
  echo "[dev:all] Starting backend..."
  "${SERVER_CMD[@]}" &
  SERVER_PID=$!
  SERVER_STARTED=1
fi

sleep 1

echo "[dev:all] Starting frontend..."
"${FRONTEND_CMD[@]}" &
FRONTEND_PID=$!
FRONTEND_STARTED=1

echo "[dev:all] Running. Press Ctrl+C to stop both."

# Portable wait loop for macOS Bash 3.x (no `wait -n` support)
while true; do
  if [[ "${SERVER_STARTED}" -eq 1 ]] && ! kill -0 "$SERVER_PID" 2>/dev/null; then
    wait "$SERVER_PID"
    exit $?
  fi

  if [[ "${FRONTEND_STARTED}" -eq 1 ]] && ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    wait "$FRONTEND_PID"
    exit $?
  fi

  sleep 1
done
