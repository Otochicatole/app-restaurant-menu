#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

SERVICE="${APP_SERVICE:-app-res.service}"
DEPLOY_REF="${DEPLOY_REF:-origin/main}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8201/api/health}"
CANDIDATE_PORT="${CANDIDATE_PORT:-8202}"

release_dir=""
release_id=""
previous_release=""
backup_path=""
database_was_present=0
database_may_have_changed=0
database_restore_allowed=0
service_was_active=0
service_was_stopped=0
activated=0

rollback_after_error() {
  local exit_code="${1:-$?}"
  local recovery_ok=1
  trap - ERR INT TERM
  set +e

  echo "El despliegue fallo (codigo $exit_code)." >&2
  stop_candidate
  if (( service_was_stopped == 1 )); then
    if ! sudo systemctl stop "$SERVICE" >/dev/null 2>&1; then
      echo "ERROR: no se pudo confirmar la detencion de $SERVICE; no se tocara la base." >&2
      recovery_ok=0
    fi
  fi

  if (( database_may_have_changed == 1 && database_restore_allowed == 1 )); then
    echo "El candidato aun no habia superado health; restaurando el estado SQLite previo." >&2
    if (( recovery_ok == 1 )) && assert_database_idle; then
      if (( database_was_present == 1 )) && [[ -n "$backup_path" ]]; then
        if ! restore_database_backup "$backup_path" "failed-${release_id:-deploy}"; then
          recovery_ok=0
        fi
      elif ! quarantine_current_database "failed-${release_id:-deploy}"; then
        recovery_ok=0
      fi
    else
      recovery_ok=0
    fi
  elif (( database_may_have_changed == 1 )); then
    echo "La base no se restaura: el candidato ya habia sido validado y se evita descartar escrituras." >&2
  fi

  if (( activated == 1 )); then
    if [[ -n "$previous_release" ]]; then
      echo "Restaurando el release de codigo anterior: $previous_release" >&2
      if ! replace_link "$previous_release" "$CURRENT_LINK"; then
        recovery_ok=0
      fi
    else
      echo "No existe un release anterior; el servicio permanecera detenido." >&2
    fi
  fi

  if (( recovery_ok == 1 && service_was_active == 1 )) && [[ -n "$previous_release" || -L "$CURRENT_LINK" ]]; then
    sudo systemctl start "$SERVICE"
    bash "$SCRIPT_DIR/health-check.sh" "$HEALTH_URL" || true
  elif (( recovery_ok == 0 )); then
    echo "ERROR: la recuperacion no pudo verificarse; $SERVICE queda detenido para evitar dano adicional." >&2
  fi

  if [[ -n "$release_dir" ]]; then
    echo "El release fallido se conserva para diagnostico: $release_dir" >&2
  fi
  exit "$exit_code"
}
trap rollback_after_error ERR
trap 'rollback_after_error 130' INT
trap 'rollback_after_error 143' TERM

validate_deploy_root
require_commands bun curl findmnt flock git readlink sed sha256sum sqlite3 systemctl tar
ensure_deploy_layout
acquire_deploy_lock
assert_local_database_filesystem
prepare_shared_environment

if ! git -C "$DEPLOY_PROJECT_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: $DEPLOY_PROJECT_ROOT no es un repositorio Git." >&2
  exit 1
fi

validate_shared_environment

echo "Actualizando referencias remotas sin modificar el checkout..."
git -C "$DEPLOY_PROJECT_ROOT" fetch --prune origin
commit="$(git -C "$DEPLOY_PROJECT_ROOT" rev-parse --verify "$DEPLOY_REF^{commit}")"
release_id="$(date -u +%Y%m%d%H%M%S)-${commit:0:12}"
release_dir="$RELEASES_DIR/$release_id"

if [[ -e "$release_dir" ]]; then
  echo "ERROR: el release ya existe: $release_dir" >&2
  exit 1
fi

if [[ -L "$CURRENT_LINK" ]]; then
  previous_release="$(resolve_release "$CURRENT_LINK")"
fi

echo "Creando release inmutable $release_id desde $DEPLOY_REF..."
mkdir -- "$release_dir"
git -C "$DEPLOY_PROJECT_ROOT" archive --format=tar "$commit" | tar -xf - -C "$release_dir"
ln -s -- "$SHARED_ENV" "$release_dir/.env"
ln -s -- "$STORAGE_DIR" "$release_dir/storage"

echo "Instalando dependencias y compilando..."
(
  cd -- "$release_dir"
  bun install --frozen-lockfile
  bun x prisma generate
  bun run build
)

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
  backup_path="$(create_database_backup "pre-${release_id}")"
fi

database_restore_allowed=1
database_may_have_changed=1
run_prisma_migrations "$release_dir"
run_candidate_health "$release_dir" "$CANDIDATE_PORT" "candidate-${release_id}"

# The migrated database is now committed. Later fallbacks are code-only so a
# request can never be discarded by restoring an older snapshot.
database_restore_allowed=0

echo "Activando release y arrancando $SERVICE..."
replace_link "$release_dir" "$CURRENT_LINK"
activated=1
sudo systemctl start "$SERVICE"
bash "$SCRIPT_DIR/health-check.sh" "$HEALTH_URL"

if [[ -n "$previous_release" ]]; then
  replace_link "$previous_release" "$PREVIOUS_LINK"
fi
activated=0
trap - ERR INT TERM

metadata_file="$BACKUPS_DIR/${release_id}-deployment.txt"
{
  printf 'release=%s\n' "$release_dir"
  printf 'previous_release=%s\n' "$previous_release"
  printf 'pre_migration_backup=%s\n' "$backup_path"
  printf 'database=%s\n' "$DATABASE_FILE"
  printf 'deployed_at=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "$metadata_file"
chmod 600 -- "$metadata_file"

echo "Despliegue finalizado: $release_dir"
if [[ -n "$backup_path" ]]; then
  echo "Backup pre-migracion conservado: $backup_path"
fi
sudo systemctl status "$SERVICE" --no-pager
