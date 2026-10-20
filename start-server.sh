#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if [[ ! -f .env.server ]]; then
  echo 'Zuerst .env.server anhand von .env.server.example erstellen (docs/BETRIEB.md).'
  exit 1
fi
exec docker compose -f compose.server.yaml --env-file .env.server up -d --build
