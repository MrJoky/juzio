import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { command } from './process.mjs';
import assert from 'node:assert/strict';

export const IMAGE = 'docker.io/directus/directus:12.5.0';
export const LABEL = 'io.juzio.test=installer-v1';
const uuidPattern = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const ownedName = new RegExp(`^juzio-test-${uuidPattern}(?:-db|-uploads)?$`);

export async function selectEngine(preferred, execute = command) {
  if (preferred && !['docker', 'podman'].includes(preferred)) throw new Error('Engine muss docker oder podman sein.');
  for (const engine of preferred ? [preferred] : ['docker', 'podman']) {
    try { await execute(engine, ['info'], { timeout: 15_000 }); return engine; } catch {}
  }
  throw new Error('Keine laufende Docker-/Podman-Engine gefunden. Docker Desktop bzw. Podman Machine zuerst starten.');
}

// Both the ownership label and the generated name must match before deletion.
export async function cleanupOwned(run, id) {
  if (id && !new RegExp(`^${uuidPattern}$`).test(id)) throw new Error('Ungültige Test-ID.');
  const filters = ['--filter', `label=${LABEL}`, ...(id ? ['--filter', `label=io.juzio.test.run=${id}`] : [])];
  for (const [list, format, remove] of [
    [['ps', '-a'], '{{.Names}}', ['rm', '-f']],
    [['volume', 'ls'], '{{.Name}}', ['volume', 'rm']],
    [['network', 'ls'], '{{.Name}}', ['network', 'rm']],
  ]) {
    const names = await run([...list, ...filters, '--format', format]);
    for (const name of names.split(/\r?\n/).filter(Boolean)) {
      if (!ownedName.test(name) || (id && !name.startsWith(`juzio-test-${id}`))) {
        throw new Error('Aufräumen verweigert: unerwarteter Ressourcenname.');
      }
      await run([...remove, name]);
    }
  }
}

export async function verifyIsolation(run, name) {
  assert.ok(ownedName.test(name), 'Nur eigene Testressourcen prüfen.');
  const ports = JSON.parse(await run(['inspect', '--format', '{{json .NetworkSettings.Ports}}', name]));
  assert.ok(Object.values(ports || {}).every(bindings => !bindings?.length), 'Sandbox darf keine Hostports veröffentlichen.');
  const internal = await run(['network', 'inspect', '--format', '{{.Internal}}', name]);
  assert.equal(internal, 'true', 'Sandbox-Netzwerk muss intern sein.');
}

export async function withSandbox(run, work, { id = randomUUID(), parent = tmpdir(), signal } = {}) {
  if (!new RegExp(`^${uuidPattern}$`).test(id)) throw new Error('Ungültige Test-ID.');
  const name = `juzio-test-${id}`;
  const directory = await mkdtemp(join(parent, 'juzio-test-'));
  const labelArgs = ['--label', LABEL, '--label', `io.juzio.test.run=${id}`];
  const start = (args, options) => run(args, { ...options, signal });
  try {
    const secret = () => randomBytes(32).toString('hex');
    const env = {
      SECRET: secret(), ADMIN_EMAIL: 'sandbox@example.org', ADMIN_PASSWORD: secret(),
      PUBLIC_URL: 'http://directus:8055', DB_CLIENT: 'sqlite3', DB_FILENAME: '/directus/database/data.db',
      TELEMETRY: 'false', WEBSOCKETS_ENABLED: 'false', PUBLIC_REGISTRATION: 'false', LOG_LEVEL: 'warn',
      JUZIO_TEST_ID: id,
    };
    const envFile = join(directory, 'sandbox.env');
    await writeFile(envFile, Object.entries(env).map(([key, value]) => `${key}=${value}`).join('\n') + '\n', { mode: 0o600 });
    await start(['network', 'create', '--internal', ...labelArgs, name]);
    for (const suffix of ['db', 'uploads']) await start(['volume', 'create', ...labelArgs, `${name}-${suffix}`]);
    await start(['run', '-d', '--name', name, ...labelArgs, '--network', name, '--network-alias', 'directus',
      '--env-file', envFile, '-v', `${name}-db:/directus/database`, '-v', `${name}-uploads:/directus/uploads`, IMAGE], { timeout: 240_000 });
    // Run only the smoke test inside the container. No checkout, secrets or engine socket mounted.
    const script = await readFile(new URL('../tests/integration/directus-smoke.mjs', import.meta.url), 'utf8');
    const probe = phase => start(['exec', '-i', name, 'node', '--input-type=module', '-', phase], { input: script, timeout: 180_000 });
    await work({ name, id, directory, probe, restart: () => start(['restart', name]) });
  } finally {
    try { await cleanupOwned(run, id); }
    finally { await rm(directory, { recursive: true, force: true }); }
  }
}
