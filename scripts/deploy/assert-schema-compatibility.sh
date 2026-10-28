#!/usr/bin/env bash
set -Eeuo pipefail

release="${1:?Falta el directorio del release}"
database="${2:?Falta la base SQLite}"
command -v sqlite3 >/dev/null 2>&1 || { echo "ERROR: sqlite3 es obligatorio para comprobar la compatibilidad del esquema." >&2; exit 1; }
expected=1
if [[ -f "$release/app-schema-generation" ]]; then
  expected="$(tr -d '[:space:]' < "$release/app-schema-generation")"
fi
if [[ ! "$expected" =~ ^[1-9][0-9]*$ ]]; then
  echo "ERROR: generacion de esquema invalida para $release." >&2
  exit 1
fi
if [[ ! -f "$database" ]]; then
  echo "ERROR: la base SQLite no existe: $database." >&2
  exit 1
fi
actual=1
state=READY
has_state="$(sqlite3 -readonly "$database" "SELECT COUNT(*) FROM sqlite_schema WHERE type='table' AND name='AppSchemaState';")"
if [[ "$has_state" == "1" ]]; then
  actual="$(sqlite3 -readonly "$database" "SELECT generation FROM AppSchemaState WHERE id='singleton';")"
  state="$(sqlite3 -readonly "$database" "SELECT state FROM AppSchemaState WHERE id='singleton';")"
fi
if [[ "$state" != READY || "$actual" != "$expected" ]]; then
  echo "ERROR: release incompatible con SQLite (release=$expected, base=$actual, estado=$state). No se iniciara el servicio." >&2
  exit 1
fi
