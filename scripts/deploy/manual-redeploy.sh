#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

MANUAL_ENV="$DEPLOY_PROJECT_ROOT/.env"
MANUAL_BACKUP_DIR="$DEPLOY_ROOT/manual-backups"

validate_deploy_root
require_commands bun curl flock mkdir sqlite3
ensure_deploy_layout
acquire_deploy_lock

if [[ ! -f "$MANUAL_ENV" ]]; then
  echo "ERROR: falta $MANUAL_ENV." >&2
  exit 1
fi

manual_database_url="$(read_dotenv_value DATABASE_URL "$MANUAL_ENV" || true)"
manual_storage_root="$(read_dotenv_value STORAGE_ROOT "$MANUAL_ENV" || true)"
manual_database_path="${manual_database_url#file:}"

if [[ "$manual_database_url" != file:* || -z "$manual_database_path" || "$manual_database_url" == *\?* || "$manual_database_url" == *#* ]]; then
  echo "ERROR: DATABASE_URL en $MANUAL_ENV debe ser una URL SQLite file: valida." >&2
  exit 1
fi
if [[ -z "$manual_storage_root" ]]; then
  manual_storage_root="$DEPLOY_PROJECT_ROOT/storage"
fi
if [[ "$manual_database_path" != /* ]]; then
  manual_database_path="$DEPLOY_PROJECT_ROOT/$manual_database_path"
fi

mkdir -p -- "$manual_storage_root" "$(dirname -- "$manual_database_path")" "$MANUAL_BACKUP_DIR"

# Stop only the manual process before touching SQLite. The stop script has its
# own lock and is intentionally called before this script acquires one.
exec 9>&-
DEPLOY_MODE=manual bash "$SCRIPT_DIR/stop.sh"
exec 9>>"$DEPLOY_LOCK"
if ! flock -n 9; then
  echo "ERROR: no se pudo recuperar el lock de deploy manual." >&2
  exit 1
fi

if [[ -f "$manual_database_path" ]]; then
  backup_path="$MANUAL_BACKUP_DIR/app-$(date -u +%Y%m%dT%H%M%SZ).db"
  sqlite3 "$manual_database_path" <<SQL
.timeout 10000
.backup '$backup_path'
SQL
  sqlite3 "$backup_path" "PRAGMA integrity_check;" | grep -qx ok || {
    echo "ERROR: el backup SQLite no supero integrity_check: $backup_path" >&2
    exit 1
  }
  chmod 600 -- "$backup_path"
  echo "Backup manual creado: $backup_path"
fi

echo "Aplicando migraciones y compilando la instalacion manual..."
(
  cd -- "$DEPLOY_PROJECT_ROOT"
  DATABASE_URL="$manual_database_url" STORAGE_ROOT="$manual_storage_root" \
    bun run deploy:manual
)

exec 9>&-
DEPLOY_MODE=manual bash "$SCRIPT_DIR/start.sh"
