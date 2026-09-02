#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

SERVICE="${APP_SERVICE:-app-res.service}"
MANUAL_PID_FILE="${MANUAL_PID_FILE:-$DEPLOY_ROOT/manual.pid}"

validate_deploy_root
require_commands flock
ensure_deploy_layout
acquire_deploy_lock

if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet "$SERVICE"; then
  echo "Deteniendo $SERVICE..."
  sudo systemctl stop "$SERVICE"
  exit 0
fi

if [[ ! -f "$MANUAL_PID_FILE" ]]; then
  echo "No hay una aplicacion manual en ejecucion."
  exit 0
fi

manual_pid="$(tr -d '[:space:]' < "$MANUAL_PID_FILE")"
if [[ ! "$manual_pid" =~ ^[0-9]+$ ]]; then
  echo "ERROR: PID invalido en $MANUAL_PID_FILE." >&2
  exit 1
fi

if kill -0 "$manual_pid" >/dev/null 2>&1; then
  echo "Deteniendo aplicacion manual (PID $manual_pid)..."
  kill -TERM "$manual_pid"
  for _ in {1..30}; do
    kill -0 "$manual_pid" >/dev/null 2>&1 || break
    sleep 1
  done
  if kill -0 "$manual_pid" >/dev/null 2>&1; then
    echo "ERROR: el proceso no termino despues de 30 segundos." >&2
    exit 1
  fi
fi

rm -f -- "$MANUAL_PID_FILE"
echo "Aplicacion manual detenida."
