#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
SERVICE="app-res.service"

on_error() {
  local exit_code=$?
  echo "El redespliegue fallo (codigo $exit_code). Revisa la salida anterior."
  echo "Si el servicio ya fue detenido, permanecera detenido para no iniciar codigo contra un esquema incompleto."
  exit "$exit_code"
}
trap on_error ERR

echo "Actualizando repositorio ($PROJECT_ROOT)..."
cd "$PROJECT_ROOT"
if git rev-parse --is-inside-work-tree &>/dev/null; then
  git fetch origin
  git reset --hard origin/main
else
  echo "  No es un repositorio git, salteando."
fi

echo "Preparando aplicacion..."
cd "$PROJECT_ROOT"
bun install --frozen-lockfile
bun x prisma generate
bun run build

echo "Deteniendo servicio..."
sudo systemctl stop "$SERVICE"

echo "Aplicando esquema y migrando archivos legacy..."
bun x prisma migrate deploy
bun run db:migrate-storage
bun run db:seed

echo "Iniciando servicio..."
sudo systemctl start "$SERVICE"

for i in $(seq 1 20); do
  if sudo systemctl is-active --quiet "$SERVICE"; then
    echo "  $SERVICE activo."
    break
  fi
  sleep 1
done
if ! sudo systemctl is-active --quiet "$SERVICE"; then
  echo "ERROR: $SERVICE no arranco despues de 20s."
  exit 1
fi

trap - ERR
echo "Redespliegue finalizado exitosamente."
sudo systemctl status "$SERVICE" --no-pager
