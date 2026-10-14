#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
command -v node >/dev/null || { echo 'Bitte Node.js ab Version 22 installieren.'; exit 1; }
node -e 'if(Number(process.versions.node.split(".")[0])<22)process.exit(1)' || { echo 'Node.js 22 oder neuer erforderlich.'; exit 1; }
node scripts/config.mjs
if command -v docker >/dev/null && docker info >/dev/null 2>&1; then
  existing_id=$(docker compose --env-file .env.local ps -aq directus)
  if [[ -n "$existing_id" ]] && [[ "$(docker inspect --format '{{.Config.Image}}' "$existing_id")" != "directus/directus:12.5.0" ]]; then
    echo 'Directus-Update erforderlich. Vorher Backup und Lizenz-/Rollenprüfung: docs/BETRIEB.md.'
    exit 1
  fi
  docker compose --env-file .env.local up -d directus
elif command -v podman >/dev/null && podman info >/dev/null 2>&1; then
  node --env-file=.env.local scripts/podman.mjs
else
  echo 'Docker oder Podman muss installiert und für deinen Benutzer nutzbar sein.'
  echo 'Docker: Zugriff auf den Dienst prüfen. Podman: podman info prüfen.'
  exit 1
fi
npm ci --no-audit --no-fund
node --env-file=.env.local scripts/setup.mjs
printf '\nDirectus 12 CMS: http://localhost:8056\nLizenzverwaltung: http://localhost:8056/admin/settings/license\nAdmin-Zugang: siehe .env.local\nStoppen der App: Strg+C (Directus und Daten bleiben erhalten).\n\n'
exec node --env-file=.env.local server.js
