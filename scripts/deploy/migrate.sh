#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

SERVICE="${APP_SERVICE:-app-res.service}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8201/api/health}"
CANDIDATE_PORT="${CANDIDATE_PORT:-8202}"
requested_release="${1:-$CURRENT_LINK}"

release=""
current_release=""
backup_path=""
database_was_present=0
database_may_have_changed=0
database_restore_allowed=0
service_was_active=0
service_was_stopped=0

rollback_migration() {
  local exit_code="${1:-$?}"
  local recovery_ok=1
  trap - ERR INT TERM
  set +e

  echo "La migracion fallo (codigo $exit_code)." >&2
  stop_candidate
  if (( service_was_stopped == 1 )); then
    if ! sudo systemctl stop "$SERVICE" >/dev/null 2>&1; then
      echo "ERROR: no se pudo confirmar la detencion de $SERVICE; no se tocara la base." >&2
      recovery_ok=0
    fi
  fi

  if (( database_may_have_changed == 1 && database_restore_allowed == 1 )); then
    echo "Restaurando el snapshot anterior a la migracion." >&2
    if (( recovery_ok == 1 )) && assert_database_idle; then
      if (( database_was_present == 1 )) && [[ -n "$backup_path" ]]; then
        if ! restore_database_backup "$backup_path" "failed-migration"; then
          recovery_ok=0
        fi
      elif ! quarantine_current_database "failed-migration"; then
        recovery_ok=0
      fi
    else
      recovery_ok=0
    fi
  elif (( database_may_have_changed == 1 )); then
    echo "La base no se restaura porque ya fue validada; se evita perder escrituras posteriores." >&2
  fi

  if (( recovery_ok == 1 && service_was_active == 1 )); then
    sudo systemctl start "$SERVICE"
    bash "$SCRIPT_DIR/health-check.sh" "$HEALTH_URL" || true
  elif (( recovery_ok == 0 )); then
    echo "ERROR: la recuperacion no pudo verificarse; $SERVICE queda detenido." >&2
  fi
  exit "$exit_code"
}
trap rollback_migration ERR
trap 'rollback_migration 130' INT
trap 'rollback_migration 143' TERM

validate_deploy_root
require_commands bun curl findmnt flock readlink sed sha256sum sqlite3 systemctl
ensure_deploy_layout
acquire_deploy_lock
assert_local_database_filesystem
validate_shared_environment
release="$(resolve_release "$requested_release")"

if [[ -L "$CURRENT_LINK" ]]; then
  current_release="$(resolve_release "$CURRENT_LINK")"
fi

if service_is_active; then
  service_was_active=1
fi
stop_service
service_was_stopped=1
assert_database_idle

if [[ -f "$DATABASE_FILE" ]]; then
  database_was_present=1
  checkpoint_database
  validate_sqlite_database "$DATABASE_FILE"
  backup_path="$(create_database_backup "pre-manual-migration")"
fi

database_restore_allowed=1
database_may_have_changed=1
run_prisma_migrations "$release"

# Validate both the new release and the currently active release when they are
# different. This proves the migration remains backward compatible before the
# old service is allowed to serve again.
run_candidate_health "$release" "$CANDIDATE_PORT" "migration-target-$(basename "$release")"
if [[ -n "$current_release" && "$current_release" != "$release" ]]; then
  run_candidate_health "$current_release" "$CANDIDATE_PORT" "migration-current-$(basename "$current_release")"
fi

database_restore_allowed=0
if (( service_was_active == 1 )); then
  echo "Reiniciando $SERVICE con la migracion validada..."
  sudo systemctl start "$SERVICE"
  bash "$SCRIPT_DIR/health-check.sh" "$HEALTH_URL"
fi

trap - ERR INT TERM
echo "Preflight Canvas, migraciones y validaciones completados. No se ejecutaron seeds."
if [[ -n "$backup_path" ]]; then
  echo "Backup pre-migracion: $backup_path"
fi
