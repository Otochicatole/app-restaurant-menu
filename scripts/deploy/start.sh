#!/bin/bash
# Iniciar y habilitar el servicio para que arranque con el sistema
echo "Iniciando servicio..."

sudo systemctl start app-res.service
sudo systemctl enable app-res.service
echo "Servicio app-res iniciado y habilitado."

echo "Mostrando estado del servicio:"
sudo systemctl status app-res.service --no-pager
