#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

SERVICE="${APP_SERVICE:-app-res.service}"
USER_NAME="${SUDO_USER:-$(whoami)}"
BUN_PATH="$(command -v bun || true)"

validate_deploy_root
require_commands findmnt flock sqlite3 systemctl
ensure_deploy_layout
acquire_deploy_lock
assert_local_database_filesystem

if [[ -z "$BUN_PATH" ]]; then
  echo "ERROR: bun no encontrado en PATH." >&2
  exit 1
fi

if [[ ! -f "$SHARED_ENV" ]]; then
  if [[ -f "$DEPLOY_PROJECT_ROOT/.env" ]]; then
    echo "Inicializando configuracion compartida desde el checkout..."
    install -m 600 -- "$DEPLOY_PROJECT_ROOT/.env" "$SHARED_ENV"
  else
    echo "ERROR: falta $SHARED_ENV. Copia y ajusta .env.example antes de crear el servicio." >&2
    exit 1
  fi
fi
chmod 600 -- "$SHARED_ENV"
validate_shared_environment

echo "Creando $SERVICE para una unica instancia SQLite..."
sudo tee "/etc/systemd/system/$SERVICE" >/dev/null <<EOF
[Unit]
Description=App Restaurant Menu Service (Next.js + SQLite)
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$CURRENT_LINK
ExecStart=$BUN_PATH run start
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
KillMode=mixed
EnvironmentFile=$SHARED_ENV
Environment=NODE_ENV=production
Environment=PORT=8201
Environment=PATH=$(dirname "$BUN_PATH"):/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
UMask=0027
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=$SHARED_DIR

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE"
echo "$SERVICE creado y habilitado. El primer deploy lo iniciara con scripts/deploy/redeploy.sh."
echo "Base persistente: $DATABASE_FILE"
