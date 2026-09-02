#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

validate_deploy_root
require_commands findmnt flock sed sha256sum sqlite3
ensure_deploy_layout
acquire_deploy_lock
assert_local_database_filesystem
prepare_shared_environment
validate_shared_environment

if [[ ! -f "$DATABASE_FILE" ]]; then
  echo "ERROR: no existe la base SQLite: $DATABASE_FILE" >&2
  exit 1
fi

backup_path="$(create_database_backup "scheduled")"
echo "Backup SQLite consistente creado: $backup_path"
echo "Copia este snapshot a un destino externo para cubrir la perdida del disco local."
