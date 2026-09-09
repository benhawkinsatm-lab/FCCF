#!/usr/bin/env bash
# FC/FCCF staging deploy — docker-dev LXC 108 (192.168.5.13)
# Run ON the container, from /opt/fccf, after the source has been copied.
set -euo pipefail

APP_DIR="/opt/fccf"
cd "$APP_DIR"

echo "==> Preflight"

# local-lvm on the Proxmox node was 94.7% full at deploy time. A failed
# build that fills the thin pool affects every guest, not just this one.
AVAIL_KB=$(df --output=avail -k "$APP_DIR" | tail -1 | tr -d ' ')
AVAIL_GB=$(( AVAIL_KB / 1024 / 1024 ))
echo "    free space at $APP_DIR: ${AVAIL_GB}G"
if [ "$AVAIL_GB" -lt 8 ]; then
  echo "    ABORT: under 8G free. Run 'docker system prune -af' and retry." >&2
  exit 1
fi

if ss -lntp 2>/dev/null | grep -q ':3000 '; then
  echo "    ABORT: port 3000 already in use on this host." >&2
  ss -lntp | grep ':3000 ' >&2
  exit 1
fi
echo "    port 3000 free"

if [ ! -f .env ]; then
  echo "    ABORT: .env missing. Copy it from the dev machine first." >&2
  exit 1
fi
echo "    .env present"

# The Dockerfile runs 'npm ci', which requires package-lock.json.
if [ ! -f package-lock.json ]; then
  echo "    ABORT: package-lock.json missing — 'npm ci' will fail." >&2
  exit 1
fi
echo "    package-lock.json present"

echo "==> Building (this pulls node:20-alpine and postgres:16-alpine)"
docker compose build

echo "==> Starting stack"
docker compose up -d

echo "==> Waiting for health"
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    echo
    curl -sS http://127.0.0.1:3000/api/health
    echo
    echo "==> UP on 192.168.5.13:3000"
    exit 0
  fi
  sleep 2
done

echo "ABORT: health check never passed. Logs follow:" >&2
docker compose logs --tail=60 app >&2
exit 1
