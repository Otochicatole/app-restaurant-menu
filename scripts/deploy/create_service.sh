#!/bin/bash
# Este script requiere permisos de superusuario (sudo)
echo "Creando servicio Systemd para app-res (Next.js)..."

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
USER_NAME=$SUDO_USER
if [ -z "$USER_NAME" ]; then
    USER_NAME=$(whoami)
fi

BUN_PATH=$(which bun 2>/dev/null)
if [ -z "$BUN_PATH" ]; then
    BUN_PATH=$(find /root/.nvm/versions/node/*/bin/bun /home/*/.nvm/versions/node/*/bin/bun /usr/local/bin/bun -maxdepth 0 2>/dev/null | head -1)
fi
if [ -z "$BUN_PATH" ]; then
    echo "ERROR: bun no encontrado. Instala bun primero."
    exit 1
fi

cat <<EOF > /etc/systemd/system/app-res.service
[Unit]
Description=App Restaurant Menu Service (Next.js)
After=network.target

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$PROJECT_ROOT
ExecStart=$BUN_PATH run start
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=8201
Environment=PATH=$(dirname "$BUN_PATH"):/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
echo "Servicio app-res.service creado exitosamente. Bun: $BUN_PATH"
echo "Recuerda que .env debe existir en $PROJECT_ROOT con DATABASE_URL y JWT_SECRET."
