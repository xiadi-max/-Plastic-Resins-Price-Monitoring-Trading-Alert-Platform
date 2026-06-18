#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
APP_PORT="${APP_PORT:-${PORT:-3001}}"

cd "${COZE_WORKSPACE_PATH}"

kill_port_if_listening() {
    local pids
    pids=$(ss -H -lntp 2>/dev/null | awk -v port="${APP_PORT}" '$4 ~ ":"port"$"' | grep -o 'pid=[0-9]*' | cut -d= -f2 | paste -sd' ' - || true)
    if [[ -z "${pids}" ]]; then
      echo "Port ${APP_PORT} is free."
      return
    fi
    echo "Port ${APP_PORT} in use by PIDs: ${pids} (SIGKILL)"
    echo "${pids}" | xargs -r -I {} kill -9 {}
    sleep 1
    pids=$(ss -H -lntp 2>/dev/null | awk -v port="${APP_PORT}" '$4 ~ ":"port"$"' | grep -o 'pid=[0-9]*' | cut -d= -f2 | paste -sd' ' - || true)
    if [[ -n "${pids}" ]]; then
      echo "Warning: port ${APP_PORT} still busy after SIGKILL, PIDs: ${pids}"
    else
      echo "Port ${APP_PORT} cleared."
    fi
}

echo "Clearing port ${APP_PORT} before start."
kill_port_if_listening
echo "Starting HTTP service on port ${APP_PORT} for dev..."

PORT=${APP_PORT} pnpm tsx watch src/server.ts
