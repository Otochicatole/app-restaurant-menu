#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

SERVICE="${APP_SERVICE:-app-res.service}"

validate_deploy_root
require_commands flock systemctl
ensure_deploy_layout
acquire_deploy_lock

echo "Deteniendo $SERVICE..."
sudo systemctl stop "$SERVICE"
