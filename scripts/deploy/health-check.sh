#!/usr/bin/env bash
set -Eeuo pipefail

HEALTH_URL="${1:-${HEALTH_URL:-http://127.0.0.1:8201/api/health}}"
ATTEMPTS="${HEALTH_ATTEMPTS:-30}"
DELAY_SECONDS="${HEALTH_DELAY_SECONDS:-2}"

for ((attempt = 1; attempt <= ATTEMPTS; attempt++)); do
  response="$(curl --fail --silent --show-error --connect-timeout 2 --max-time 5 "$HEALTH_URL" 2>/dev/null || true)"
  if [[ "$response" == *'"status":"ok"'* || "$response" == *'"status": "ok"'* ]]; then
    echo "Health check OK: $HEALTH_URL"
    exit 0
  fi

  if ((attempt < ATTEMPTS)); then
    sleep "$DELAY_SECONDS"
  fi
done

echo "ERROR: health check sin respuesta sana despues de $ATTEMPTS intentos: $HEALTH_URL" >&2
exit 1
