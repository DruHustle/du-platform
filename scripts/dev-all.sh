#!/usr/bin/env bash
set -euo pipefail

SERVER_CMD=(pnpm dev:server)
FRONTEND_CMD=(pnpm dev:web)
OLLAMA_CMD=(ollama serve)
ONESA_PROVIDER_RUNTIME=""

get_env_value() {
  local key="$1"
  local current
  current="$(printenv "$key" 2>/dev/null || true)"
  if [[ -n "${current}" ]]; then
    printf '%s\n' "$current"
    return
  fi
  if [[ -f ".env" ]]; then
    local file_value
    file_value="$(grep -E "^${key}=" .env | tail -n 1 | cut -d'=' -f2- | tr -d '[:space:]' || true)"
    if [[ -n "${file_value}" ]]; then
      printf '%s\n' "$file_value"
      return
    fi
  fi
  printf '%s\n' ""
}

get_backend_port() {
  local dev_port
  dev_port="$(get_env_value "DEV_PORT")"
  if [[ -n "${dev_port}" ]]; then
    printf '%s\n' "$dev_port"
    return
  fi

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

choose_onesa_provider_mode() {
  # Prompt only in interactive terminals. Non-interactive runs keep env behavior.
  if [[ -t 0 && -t 1 ]]; then
    echo "[dev:all] AI mode:"
    echo "[dev:all]   y = Local model (Ollama)"
    echo "[dev:all]   n = Cloud endpoint"
    local use_local
    read -r -p "[dev:all] Use local model? (y/N): " use_local
    case "$(printf '%s' "${use_local:-}" | tr '[:upper:]' '[:lower:]')" in
      y|yes)
        ONESA_PROVIDER_RUNTIME="ollama"
        ;;
      *)
        ONESA_PROVIDER_RUNTIME="openai_compatible"
        ;;
    esac
  else
    ONESA_PROVIDER_RUNTIME="$(get_onesa_provider)"
  fi
}

ensure_ollama() {
  local provider
  provider="${ONESA_PROVIDER_RUNTIME:-$(get_onesa_provider)}"
  if [[ "${provider}" == "openai_compatible" ]]; then
    echo "[dev:all] Cloud mode selected. Skipping Ollama startup."
    local api_key
    api_key="$(get_env_value "ONESA_AI_API_KEY")"
    if [[ -z "${api_key}" || "${api_key}" == "YOUR_GEMINI_API_KEY" ]]; then
      echo "[dev:all] WARNING: ONESA_AI_API_KEY is missing/placeholder. Chat will be unavailable until configured."
    fi

    local secondary_key secondary_base secondary_model secondary_candidates
    local tertiary_key tertiary_base tertiary_model tertiary_candidates
    local claude_key claude_base claude_model
    local cerebras_key cerebras_base cerebras_model
    secondary_key="$(get_env_value "ONESA_SECONDARY_AI_API_KEY")"
    secondary_base="$(get_env_value "ONESA_SECONDARY_AI_BASE_URL")"
    secondary_model="$(get_env_value "ONESA_SECONDARY_MODEL")"
    secondary_candidates="$(get_env_value "ONESA_SECONDARY_MODEL_CANDIDATES")"
    tertiary_key="$(get_env_value "ONESA_TERTIARY_AI_API_KEY")"
    tertiary_base="$(get_env_value "ONESA_TERTIARY_AI_BASE_URL")"
    tertiary_model="$(get_env_value "ONESA_TERTIARY_MODEL")"
    tertiary_candidates="$(get_env_value "ONESA_TERTIARY_MODEL_CANDIDATES")"
    claude_key="$(get_env_value "ONESA_CLAUDE_API_KEY")"
    claude_base="$(get_env_value "ONESA_CLAUDE_BASE_URL")"
    claude_model="$(get_env_value "ONESA_CLAUDE_MODEL")"
    cerebras_key="$(get_env_value "ONESA_CEREBRAS_API_KEY")"
    cerebras_base="$(get_env_value "ONESA_CEREBRAS_BASE_URL")"
    cerebras_model="$(get_env_value "ONESA_CEREBRAS_MODEL")"

    if [[ -n "${secondary_key}" && -n "${secondary_base}" && -n "${secondary_model}" ]]; then
      echo "[dev:all] Cloud fallback enabled from env: ONESA_SECONDARY_* configured."
    else
      echo "[dev:all] WARNING: Secondary cloud fallback is not fully configured in env."
      echo "[dev:all] Set ONESA_SECONDARY_AI_BASE_URL, ONESA_SECONDARY_AI_API_KEY, and ONESA_SECONDARY_MODEL."
      if [[ -n "${secondary_candidates}" ]]; then
        echo "[dev:all] NOTE: ONESA_SECONDARY_MODEL_CANDIDATES is set but base/key/model is incomplete."
      fi
    fi

    if [[ -n "${tertiary_key}" && -n "${tertiary_base}" && -n "${tertiary_model}" ]]; then
      echo "[dev:all] Cloud fallback enabled from env: ONESA_TERTIARY_* configured."
    elif [[ -n "${tertiary_key}" || -n "${tertiary_base}" || -n "${tertiary_model}" || -n "${tertiary_candidates}" ]]; then
      echo "[dev:all] WARNING: Tertiary cloud fallback is partially configured in env."
      echo "[dev:all] Set ONESA_TERTIARY_AI_BASE_URL, ONESA_TERTIARY_AI_API_KEY, and ONESA_TERTIARY_MODEL."
      if [[ -n "${tertiary_candidates}" ]]; then
        echo "[dev:all] NOTE: ONESA_TERTIARY_MODEL_CANDIDATES is set but base/key/model is incomplete."
      fi
    fi

    if [[ -n "${claude_key}" ]]; then
      if [[ -z "${claude_model}" ]]; then
        echo "[dev:all] WARNING: ONESA_CLAUDE_API_KEY is set but ONESA_CLAUDE_MODEL is missing."
      else
        echo "[dev:all] Claude fallback enabled from env: ONESA_CLAUDE_* configured."
      fi
      if [[ -z "${claude_base}" ]]; then
        echo "[dev:all] NOTE: ONESA_CLAUDE_BASE_URL not set. Using default https://api.anthropic.com."
      fi
    fi

    if [[ -n "${cerebras_key}" ]]; then
      if [[ -z "${cerebras_model}" ]]; then
        echo "[dev:all] WARNING: ONESA_CEREBRAS_API_KEY is set but ONESA_CEREBRAS_MODEL is missing."
      else
        echo "[dev:all] Cerebras fallback enabled from env: ONESA_CEREBRAS_* configured."
      fi
      if [[ -z "${cerebras_base}" ]]; then
        echo "[dev:all] NOTE: ONESA_CEREBRAS_BASE_URL not set. Using default https://api.cerebras.ai/v1."
      fi
    fi
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

choose_onesa_provider_mode
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
  if [[ -n "${ONESA_PROVIDER_RUNTIME}" ]]; then
    ONESA_PROVIDER="${ONESA_PROVIDER_RUNTIME}" "${SERVER_CMD[@]}" &
  else
    "${SERVER_CMD[@]}" &
  fi
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
