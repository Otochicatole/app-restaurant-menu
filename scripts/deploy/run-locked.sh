#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

if (( $# == 0 )); then
  echo "Uso: run-locked.sh <comando> [argumentos...]" >&2
  exit 2
fi

validate_deploy_root
require_commands flock
ensure_deploy_layout
acquire_deploy_lock
prepare_shared_environment
validate_shared_environment

if [[ ! -L "$CURRENT_LINK" ]]; then
  echo "ERROR: no existe un release activo en $CURRENT_LINK." >&2
  exit 1
fi

release="$(resolve_release "$CURRENT_LINK")"
cd -- "$release"
exec env DATABASE_URL="$EXPECTED_DATABASE_URL" "$@"
