#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

SERVICE="${APP_SERVICE:-app-res.service}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8201/api/health}"
CANDIDATE_PORT="${CANDIDATE_PORT:-8202}"

requested_backup=""
confirm_data_loss=0

usage() {
  cat <<'EOF'
Uso:
  rollback.sh
      Revierte solamente el codigo. La base SQLite no se modifica.

  rollback.sh --restore-database /ruta/al/backup.db --confirm-data-loss
      Revierte codigo y restaura explicitamente un backup administrado. Antes
      crea un backup de rescate del estado actual.
EOF
}

while (( $# > 0 )); do
  case "$1" in
    --restore-database)
      [[ $# -ge 2 ]] || { echo "ERROR: falta la ruta del backup." >&2; exit 2; }
      requested_backup="$2"
      shift 2
      ;;
    --confirm-data-loss)
      confirm_data_loss=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: argumento desconocido: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -n "$requested_backup" && "$confirm_data_loss" != "1" ]]; then
  echo "ERROR: restaurar una base descarta escrituras posteriores al snapshot." >&2
  echo "       Repite con --confirm-data-loss despues de verificar el backup." >&2
  exit 2
fi
if [[ -z "$requested_backup" && "$confirm_data_loss" == "1" ]]; then
  echo "ERROR: --confirm-data-loss requiere --restore-database." >&2
  exit 2
fi

validate_deploy_root
require_commands bun curl findmnt flock readlink sed sha256sum sqlite3 systemctl
ensure_deploy_layout
acquire_deploy_lock
assert_local_database_filesystem
prepare_shared_environment
validate_shared_environment

if [[ ! -L "$CURRENT_LINK" || ! -L "$PREVIOUS_LINK" ]]; then
  echo "ERROR: se necesitan los enlaces current y previous para hacer rollback." >&2
  exit 1
fi

current_release="$(resolve_release "$CURRENT_LINK")"
previous_release="$(resolve_release "$PREVIOUS_LINK")"
if [[ "$current_release" == "$previous_release" ]]; then
  echo "ERROR: current y previous apuntan al mismo release." >&2
  exit 1
fi

service_was_active=0
if service_is_active; then
  service_was_active=1
fi

if [[ -z "$requested_backup" ]]; then
  echo "Rollback code-only: la base SQLite no sera modificada."
  replace_link "$previous_release" "$CURRENT_LINK"
  if ! replace_link "$current_release" "$PREVIOUS_LINK"; then
    replace_link "$current_release" "$CURRENT_LINK"
    echo "ERROR: no se pudo actualizar previous; current fue restaurado." >&2
    exit 1
  fi

  if (( service_was_active == 1 )); then
    if ! sudo systemctl restart "$SERVICE" || ! "$SCRIPT_DIR/health-check.sh" "$HEALTH_URL"; then
      echo "ERROR: el release anterior no quedo sano; restaurando el codigo actual." >&2
      replace_link "$current_release" "$CURRENT_LINK"
      replace_link "$previous_release" "$PREVIOUS_LINK"
      sudo systemctl restart "$SERVICE"
      "$SCRIPT_DIR/health-check.sh" "$HEALTH_URL"
      exit 1
    fi
  fi

  echo "Rollback de codigo completado: $previous_release"
  exit 0
fi

backup="$(resolve_managed_backup "$requested_backup")"
verify_database_backup "$backup"
echo "ADVERTENCIA: se restaurara $backup y se descartaran datos posteriores a ese snapshot." >&2

rescue_backup=""
database_changed=0
database_restore_allowed=1
links_swapped=0

recover_explicit_rollback() {
  local exit_code="${1:-$?}"
  local recovery_ok=1
  trap - ERR INT TERM
  set +e

  echo "El rollback con datos fallo (codigo $exit_code); recuperando el estado previo." >&2
  stop_candidate
  if ! sudo systemctl stop "$SERVICE" >/dev/null 2>&1; then
    echo "ERROR: no se pudo confirmar la detencion de $SERVICE; no se tocara la base." >&2
    recovery_ok=0
  fi
  if (( recovery_ok == 1 )) && ! assert_database_idle; then
    recovery_ok=0
  fi

  if (( database_changed == 1 && database_restore_allowed == 1 )); then
    if (( recovery_ok == 1 )) && [[ -n "$rescue_backup" ]]; then
      if ! restore_database_backup "$rescue_backup" "failed-explicit-rollback"; then
        recovery_ok=0
      fi
    else
      recovery_ok=0
    fi
  elif (( database_changed == 1 )); then
    echo "La base restaurada no se revierte: ya se habilito el servicio y se preservan posibles escrituras." >&2
  fi
  if (( recovery_ok == 1 && links_swapped == 1 )); then
    if ! replace_link "$current_release" "$CURRENT_LINK" || ! replace_link "$previous_release" "$PREVIOUS_LINK"; then
      recovery_ok=0
    fi
  fi
  if (( recovery_ok == 1 && service_was_active == 1 )); then
    sudo systemctl start "$SERVICE"
    "$SCRIPT_DIR/health-check.sh" "$HEALTH_URL" || true
  elif (( recovery_ok == 0 )); then
    echo "ERROR: la recuperacion no pudo verificarse; $SERVICE queda detenido." >&2
  fi
  exit "$exit_code"
}
trap recover_explicit_rollback ERR
trap 'recover_explicit_rollback 130' INT
trap 'recover_explicit_rollback 143' TERM

stop_service
assert_database_idle
if [[ -f "$DATABASE_FILE" ]]; then
  checkpoint_database
  validate_sqlite_database "$DATABASE_FILE"
  rescue_backup="$(create_database_backup "pre-explicit-rollback-rescue")"
fi
if [[ -z "$rescue_backup" ]]; then
  echo "ERROR: no existe una base actual que pueda respaldarse antes de restaurar." >&2
  exit 1
fi

database_changed=1
restore_database_backup "$backup" "before-explicit-rollback"

# Both releases are tested against the restored snapshot before public traffic
# can resume. If either is incompatible, the rescue snapshot is restored.
run_candidate_health "$previous_release" "$CANDIDATE_PORT" "rollback-previous-$(basename "$previous_release")"
run_candidate_health "$current_release" "$CANDIDATE_PORT" "rollback-current-$(basename "$current_release")"

links_swapped=1
replace_link "$previous_release" "$CURRENT_LINK"
replace_link "$current_release" "$PREVIOUS_LINK"
database_restore_allowed=0

if (( service_was_active == 1 )); then
  sudo systemctl start "$SERVICE"
  "$SCRIPT_DIR/health-check.sh" "$HEALTH_URL"
fi

trap - ERR INT TERM
echo "Rollback de codigo y datos completado: $previous_release"
echo "Backup de rescate conservado: $rescue_backup"
