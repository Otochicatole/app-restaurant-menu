#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

SERVICE="${APP_SERVICE:-app-res.service}"
MANUAL_PID_FILE="${MANUAL_PID_FILE:-$DEPLOY_ROOT/manual.pid}"
MANUAL_LOG_FILE="${MANUAL_LOG_FILE:-$LOGS_DIR/manual.log}"

validate_deploy_root
require_commands bun curl flock
ensure_deploy_layout
acquire_deploy_lock

# A checkout without the `current` release link is the supported manual mode.
# It does not require systemd and keeps the same persistent SQLite paths.
if [[ "${DEPLOY_MODE:-auto}" == "manual" || ! -L "$CURRENT_LINK" ]]; then
  MANUAL_ENV="$DEPLOY_PROJECT_ROOT/.env"
  if [[ ! -f "$MANUAL_ENV" ]]; then
    echo "ERROR: falta $MANUAL_ENV para el modo manual." >&2
    exit 1
  fi

  manual_database_url="$(read_dotenv_value DATABASE_URL "$MANUAL_ENV" || true)"
  manual_storage_root="$(read_dotenv_value STORAGE_ROOT "$MANUAL_ENV" || true)"
  if [[ "$manual_database_url" != file:* || -z "${manual_database_url#file:}" || "$manual_database_url" == *\?* || "$manual_database_url" == *#* ]]; then
    echo "ERROR: DATABASE_URL en $MANUAL_ENV debe ser una URL SQLite file: valida." >&2
    exit 1
  fi
  if [[ -z "$manual_storage_root" ]]; then
    manual_storage_root="$DEPLOY_PROJECT_ROOT/storage"
  fi
  mkdir -p -- "$manual_storage_root" "$(dirname -- "${manual_database_url#file:}")"

  if [[ -f "$MANUAL_PID_FILE" ]]; then
    manual_pid="$(tr -d '[:space:]' < "$MANUAL_PID_FILE")"
    if [[ "$manual_pid" =~ ^[0-9]+$ ]] && kill -0 "$manual_pid" >/dev/null 2>&1; then
      echo "ERROR: la aplicacion manual ya esta ejecutandose (PID $manual_pid)." >&2
      exit 1
    fi
    rm -f -- "$MANUAL_PID_FILE"
  fi

  if [[ ! -d "$DEPLOY_PROJECT_ROOT/.next" ]]; then
    echo "ERROR: falta .next. Ejecuta bun run build antes de iniciar la aplicacion." >&2
    exit 1
  fi

  echo "Iniciando la aplicacion manual en 0.0.0.0:8201..."
  (
    # The long-lived server must not inherit the deployment lock. Otherwise
    # stop/redeploy commands remain blocked for the entire server lifetime.
    exec 9>&-
    cd -- "$DEPLOY_PROJECT_ROOT"
    exec env NODE_ENV=production DATABASE_URL="$manual_database_url" \
      STORAGE_ROOT="$manual_storage_root" bun run start
  ) >"$MANUAL_LOG_FILE" 2>&1 &
  manual_pid=$!
  printf '%s\n' "$manual_pid" > "$MANUAL_PID_FILE"
  chmod 600 -- "$MANUAL_PID_FILE"
  exec 9>&-

  sleep 2
  if ! kill -0 "$manual_pid" >/dev/null 2>&1; then
    echo "ERROR: la aplicacion no pudo iniciar. Log: $MANUAL_LOG_FILE" >&2
    sed -n '1,120p' "$MANUAL_LOG_FILE" >&2 || true
    rm -f -- "$MANUAL_PID_FILE"
    exit 1
  fi

  if ! "$SCRIPT_DIR/health-check.sh" "${HEALTH_URL:-http://127.0.0.1:8201/api/health}"; then
    echo "ERROR: la aplicacion inicio pero no supero health-check. Log: $MANUAL_LOG_FILE" >&2
    exit 1
  fi
  echo "Aplicacion manual iniciada (PID $manual_pid). Log: $MANUAL_LOG_FILE"
  exit 0
fi

prepare_shared_environment
validate_shared_environment
require_commands systemctl
resolve_release "$CURRENT_LINK" >/dev/null

echo "Iniciando y habilitando $SERVICE..."
sudo systemctl enable --now "$SERVICE"
sudo systemctl status "$SERVICE" --no-pager
