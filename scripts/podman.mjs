import { spawnSync } from 'node:child_process';
function run(args) { const r = spawnSync('podman', args, { stdio: 'inherit' }); if (r.status) process.exit(r.status || 1); }
const exists = spawnSync('podman', ['container', 'exists', 'juze-directus']).status === 0;
if (exists) {
  const current = spawnSync('podman',['inspect','--format','{{.Config.Image}}','juze-directus'],{encoding:'utf8'}).stdout?.trim();
  if (current !== 'docker.io/directus/directus:11.12.0') {
    console.error('Directus-Update erforderlich. Vorher Backup und Lizenz-/Rollenprüfung: docs/BETRIEB.md. Der alte Container wird nicht automatisch migriert.');
    process.exit(1);
  }
  run(['start', 'juze-directus']);
}
else {
  run(['volume', 'create', 'juze-directus-database']);
  run(['volume', 'create', 'juze-directus-uploads']);
  const env = {
    SECRET: process.env.DIRECTUS_SECRET, ADMIN_EMAIL: process.env.DIRECTUS_ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.DIRECTUS_ADMIN_PASSWORD, ADMIN_TOKEN: process.env.DIRECTUS_ADMIN_TOKEN,
    DB_CLIENT: 'sqlite3', DB_FILENAME: '/directus/database/data.db', TELEMETRY: 'false', WEBSOCKETS_ENABLED: 'false', PUBLIC_REGISTRATION: 'false', RATE_LIMITER_ENABLED: 'true', RATE_LIMITER_POINTS: '300', RATE_LIMITER_DURATION: '60', LOG_LEVEL: 'warn'
  };
  run(['run', '-d', '--name', 'juze-directus', '--restart', 'unless-stopped', '-p', '127.0.0.1:8055:8055',
    '-v', 'juze-directus-database:/directus/database', '-v', 'juze-directus-uploads:/directus/uploads',
    ...Object.entries(env).flatMap(([k,v]) => ['-e', `${k}=${v}`]), 'docker.io/directus/directus:11.12.0']);
}
