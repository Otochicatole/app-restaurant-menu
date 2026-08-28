#!/usr/bin/env bash

# Shared deployment helpers. This file is sourced by the executable scripts.

DEPLOY_SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_PROJECT_ROOT="$(cd -- "$DEPLOY_SCRIPT_DIR/../.." && pwd)"
DEPLOY_ROOT="${APP_RELEASE_ROOT:-$DEPLOY_PROJECT_ROOT/.deploy}"
RELEASES_DIR="$DEPLOY_ROOT/releases"
SHARED_DIR="$DEPLOY_ROOT/shared"
DATABASE_DIR="$SHARED_DIR/database"
DATABASE_FILE="$DATABASE_DIR/app.db"
BACKUPS_DIR="$SHARED_DIR/backups"
STORAGE_DIR="$SHARED_DIR/storage"
LOGS_DIR="$SHARED_DIR/logs"
SHARED_ENV="$SHARED_DIR/.env"
CURRENT_LINK="$DEPLOY_ROOT/current"
PREVIOUS_LINK="$DEPLOY_ROOT/previous"
DEPLOY_LOCK="$DEPLOY_ROOT/deploy.lock"
EXPECTED_DATABASE_URL="file:$DATABASE_FILE"
DEPLOY_CANDIDATE_PID=""

validate_deploy_root() {
  if [[ "$DEPLOY_ROOT" != /* || "$DEPLOY_ROOT" == "/" || "$DEPLOY_ROOT" == *$'\n'* || "$DEPLOY_ROOT" == *$'\r'* ]]; then
    echo "ERROR: APP_RELEASE_ROOT debe ser una ruta absoluta segura y no puede ser /." >&2
    return 1
  fi
}

require_commands() {
  local command_name
  for command_name in "$@"; do
    if ! command -v "$command_name" >/dev/null 2>&1; then
      echo "ERROR: falta el comando requerido: $command_name" >&2
      return 1
    fi
  done
}

ensure_deploy_layout() {
  validate_deploy_root
  mkdir -p -- "$RELEASES_DIR" "$DATABASE_DIR" "$BACKUPS_DIR" "$STORAGE_DIR" "$LOGS_DIR"
  chmod 700 -- "$DATABASE_DIR" "$BACKUPS_DIR"
  chmod 750 -- "$SHARED_DIR" "$STORAGE_DIR" "$LOGS_DIR"
}

acquire_deploy_lock() {
  exec 9>"$DEPLOY_LOCK"
  if ! flock -n 9; then
    echo "ERROR: ya hay un despliegue, migracion, backup u operacion bloqueada en curso ($DEPLOY_LOCK)." >&2
    return 1
  fi
}

read_dotenv_value() {
  local key="$1"
  local file="$2"
  local line value first last

  line="$(grep -E "^[[:space:]]*${key}[[:space:]]*=" "$file" | tail -n 1 || true)"
  if [[ -z "$line" ]]; then
    return 1
  fi

  value="${line#*=}"
  value="$(printf '%s' "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  if (( ${#value} >= 2 )); then
    first="${value:0:1}"
    last="${value: -1}"
    if [[ ( "$first" == '"' && "$last" == '"' ) || ( "$first" == "'" && "$last" == "'" ) ]]; then
      value="${value:1:${#value}-2}"
    fi
  fi

  printf '%s' "$value"
}

validate_shared_environment() {
  local configured_database configured_storage

  if [[ ! -f "$SHARED_ENV" ]]; then
    echo "ERROR: falta la configuracion compartida $SHARED_ENV." >&2
    return 1
  fi

  configured_database="$(read_dotenv_value DATABASE_URL "$SHARED_ENV" || true)"
  configured_storage="$(read_dotenv_value STORAGE_ROOT "$SHARED_ENV" || true)"

  if [[ "$configured_database" != "$EXPECTED_DATABASE_URL" ]]; then
    echo "ERROR: DATABASE_URL debe apuntar exactamente a la base persistente compartida." >&2
    echo "       Valor requerido: $EXPECTED_DATABASE_URL" >&2
    return 1
  fi

  if [[ "$configured_storage" != "$STORAGE_DIR" ]]; then
    echo "ERROR: STORAGE_ROOT debe ser una ruta absoluta al storage persistente compartido." >&2
    echo "       Valor requerido: $STORAGE_DIR" >&2
    return 1
  fi
}

assert_local_database_filesystem() {
  local filesystem_type
  filesystem_type="$(findmnt -T "$DATABASE_DIR" -n -o FSTYPE | tr '[:upper:]' '[:lower:]')"

  if [[ -z "$filesystem_type" ]]; then
    echo "ERROR: no se pudo determinar el filesystem de $DATABASE_DIR." >&2
    return 1
  fi

  case "$filesystem_type" in
    nfs|nfs4|cifs|smb3|9p|fuse.sshfs)
      echo "ERROR: SQLite no puede desplegarse sobre $filesystem_type. Usa disco local persistente." >&2
      return 1
      ;;
  esac
}

resolve_release() {
  local requested="$1"
  local resolved
  resolved="$(readlink -f -- "$requested")"

  case "$resolved" in
    "$RELEASES_DIR"/*) ;;
    *)
      echo "ERROR: el release debe estar dentro de $RELEASES_DIR." >&2
      return 1
      ;;
  esac

  if [[ ! -f "$resolved/package.json" || ! -d "$resolved/prisma/migrations" || ! -d "$resolved/.next" ]]; then
    echo "ERROR: release invalido o no compilado: $resolved" >&2
    return 1
  fi

  printf '%s' "$resolved"
}

replace_link() {
  local target="$1"
  local destination="$2"
  local temporary="$DEPLOY_ROOT/.link-$PPID-$$-$(basename "$destination")"

  rm -f -- "$temporary"
  ln -s -- "$target" "$temporary"
  mv -Tf -- "$temporary" "$destination"
}

service_is_active() {
  systemctl is-active --quiet "${APP_SERVICE:-app-res.service}"
}

stop_service() {
  local service="${APP_SERVICE:-app-res.service}"
  if systemctl is-active --quiet "$service"; then
    echo "Deteniendo $service para la ventana SQLite..."
    sudo systemctl stop "$service"
  fi
}

assert_database_idle() {
  if [[ -f "$DATABASE_FILE" ]] && command -v fuser >/dev/null 2>&1 && fuser -s "$DATABASE_FILE"; then
    echo "ERROR: otro proceso conserva abierta la base $DATABASE_FILE." >&2
    return 1
  fi
}

checkpoint_database() {
  local checkpoint_result busy
  [[ -f "$DATABASE_FILE" ]] || return 0

  if [[ -L "$DATABASE_FILE" ]]; then
    echo "ERROR: la base SQLite no puede ser un enlace simbolico: $DATABASE_FILE" >&2
    return 1
  fi
  checkpoint_result="$(printf '.timeout 10000\nPRAGMA wal_checkpoint(TRUNCATE);\n' | sqlite3 -batch -noheader "$DATABASE_FILE")"
  busy="${checkpoint_result%%|*}"
  if [[ "$busy" != "0" ]]; then
    echo "ERROR: SQLite no pudo completar el checkpoint WAL: $checkpoint_result" >&2
    return 1
  fi
}

ensure_sqlite_database_file() {
  if [[ ! -e "$DATABASE_FILE" ]]; then
    echo "Inicializando el archivo SQLite persistente: $DATABASE_FILE"
    sqlite3 -batch "$DATABASE_FILE" "PRAGMA user_version;" >/dev/null
  fi
  if [[ ! -f "$DATABASE_FILE" || -L "$DATABASE_FILE" ]]; then
    echo "ERROR: la base debe ser un archivo regular y no un enlace: $DATABASE_FILE" >&2
    return 1
  fi
  chmod 600 -- "$DATABASE_FILE"
}

configure_sqlite_wal_mode() {
  local database="$1"
  local journal_mode
  journal_mode="$(sqlite3 -batch -noheader "$database" "PRAGMA journal_mode=WAL;" | tr '[:upper:]' '[:lower:]')"
  if [[ "$journal_mode" != "wal" ]]; then
    echo "ERROR: SQLite no pudo activar WAL en $database (modo devuelto: $journal_mode)." >&2
    return 1
  fi
}

validate_sqlite_database() {
  local database="$1"
  local integrity foreign_keys

  if [[ ! -f "$database" ]]; then
    echo "ERROR: no existe la base SQLite a validar: $database" >&2
    return 1
  fi

  integrity="$(sqlite3 -batch -noheader "$database" "PRAGMA integrity_check;")"
  if [[ "$integrity" != "ok" ]]; then
    echo "ERROR: integrity_check fallo para $database:" >&2
    printf '%s\n' "$integrity" >&2
    return 1
  fi

  foreign_keys="$(sqlite3 -batch -noheader "$database" "PRAGMA foreign_keys=ON; PRAGMA foreign_key_check;")"
  if [[ -n "$foreign_keys" ]]; then
    echo "ERROR: foreign_key_check encontro inconsistencias en $database:" >&2
    printf '%s\n' "$foreign_keys" >&2
    return 1
  fi
}

escape_sqlite_shell_path() {
  local value="$1"
  if [[ "$value" == *$'\n'* || "$value" == *$'\r'* ]]; then
    echo "ERROR: ruta SQLite invalida." >&2
    return 1
  fi
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  printf '%s' "$value"
}

sqlite_online_backup() {
  local source="$1"
  local destination="$2"
  local escaped_destination
  escaped_destination="$(escape_sqlite_shell_path "$destination")"

  if [[ -e "$destination" ]]; then
    echo "ERROR: el destino del backup ya existe: $destination" >&2
    return 1
  fi

  printf '.timeout 10000\n.backup "%s"\n' "$escaped_destination" | sqlite3 -batch "$source"
  chmod 600 -- "$destination"
  validate_sqlite_database "$destination"
}

create_database_backup() {
  local label="$1"
  local timestamp destination checksum
  [[ -f "$DATABASE_FILE" ]] || return 0

  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  destination="$BACKUPS_DIR/${timestamp}-${label}.db"
  if [[ -e "$destination" ]]; then
    destination="$BACKUPS_DIR/${timestamp}-${label}-$$.db"
  fi

  echo "Creando backup SQLite consistente: $destination" >&2
  sqlite_online_backup "$DATABASE_FILE" "$destination"
  checksum="$(sha256sum "$destination" | awk '{print $1}')"
  printf '%s\n' "$checksum" > "$destination.sha256"
  chmod 600 -- "$destination.sha256"
  printf '%s' "$destination"
}

verify_database_backup() {
  local backup="$1"
  local expected actual

  validate_sqlite_database "$backup"
  if [[ -f "$backup.sha256" ]]; then
    expected="$(tr -d '[:space:]' < "$backup.sha256")"
    actual="$(sha256sum "$backup" | awk '{print $1}')"
    if [[ -z "$expected" || "$expected" != "$actual" ]]; then
      echo "ERROR: checksum invalido para $backup." >&2
      return 1
    fi
  fi
}

resolve_managed_backup() {
  local requested="$1"
  local resolved
  resolved="$(readlink -f -- "$requested")"
  case "$resolved" in
    "$BACKUPS_DIR"/*.db) ;;
    *)
      echo "ERROR: el backup debe ser un archivo .db dentro de $BACKUPS_DIR." >&2
      return 1
      ;;
  esac
  [[ -f "$resolved" ]] || {
    echo "ERROR: backup inexistente: $resolved" >&2
    return 1
  }
  if [[ ! -f "$resolved.sha256" ]]; then
    echo "ERROR: falta el checksum administrado $resolved.sha256." >&2
    return 1
  fi
  printf '%s' "$resolved"
}

quarantine_current_database() {
  local label="$1"
  local timestamp quarantine suffix
  [[ -e "$DATABASE_FILE" || -e "$DATABASE_FILE-wal" || -e "$DATABASE_FILE-shm" || -e "$DATABASE_FILE-journal" ]] || return 0

  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  quarantine="$BACKUPS_DIR/${timestamp}-${label}.db"
  if [[ -e "$quarantine" ]]; then
    quarantine="$BACKUPS_DIR/${timestamp}-${label}-$$.db"
  fi

  if [[ -e "$DATABASE_FILE" ]]; then
    mv -- "$DATABASE_FILE" "$quarantine"
  fi
  for suffix in -wal -shm -journal; do
    if [[ -e "$DATABASE_FILE$suffix" ]]; then
      mv -- "$DATABASE_FILE$suffix" "$quarantine$suffix"
    fi
  done
  echo "Base reemplazada preservada para diagnostico: $quarantine" >&2
}

restore_database_backup() {
  local backup="$1"
  local label="$2"
  local temporary

  verify_database_backup "$backup"
  temporary="$DATABASE_DIR/.restore-$PPID-$$.db"
  rm -f -- "$temporary"
  sqlite_online_backup "$backup" "$temporary"
  quarantine_current_database "$label"
  mv -- "$temporary" "$DATABASE_FILE"
  chmod 600 -- "$DATABASE_FILE"
  configure_sqlite_wal_mode "$DATABASE_FILE"
  validate_sqlite_database "$DATABASE_FILE"
}

run_candidate_health() {
  local release="$1"
  local port="$2"
  local label="$3"
  local health_url="http://127.0.0.1:${port}/api/health"
  local log_file="$LOGS_DIR/${label}.log"
  local status

  echo "Validando el release en loopback ($health_url)..."
  (
    cd -- "$release"
    exec env NODE_ENV=production DATABASE_URL="$EXPECTED_DATABASE_URL" \
      bun x next start --hostname 127.0.0.1 --port "$port"
  ) >"$log_file" 2>&1 &
  DEPLOY_CANDIDATE_PID=$!

  set +e
  bash "$DEPLOY_SCRIPT_DIR/health-check.sh" "$health_url"
  status=$?
  stop_candidate
  set -e

  if (( status != 0 )); then
    echo "ERROR: el release candidato no quedo sano. Log: $log_file" >&2
    return "$status"
  fi
}

stop_candidate() {
  if [[ -n "$DEPLOY_CANDIDATE_PID" ]]; then
    kill -TERM "$DEPLOY_CANDIDATE_PID" >/dev/null 2>&1 || true
    wait "$DEPLOY_CANDIDATE_PID" >/dev/null 2>&1 || true
    DEPLOY_CANDIDATE_PID=""
  fi
}

run_prisma_migrations() {
  local release="$1"
  ensure_sqlite_database_file
  configure_sqlite_wal_mode "$DATABASE_FILE"
  echo "Aplicando migraciones SQLite de $release..."
  (
    cd -- "$release"
    DATABASE_URL="$EXPECTED_DATABASE_URL" bun x prisma migrate deploy
  )
  configure_sqlite_wal_mode "$DATABASE_FILE"
  validate_sqlite_database "$DATABASE_FILE"
}
