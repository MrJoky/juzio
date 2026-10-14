import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, access, readdir, rm, readFile, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { command, isolatedTestEnv } from '../../test-environment/process.mjs';
import { cleanupOwned, LABEL, selectEngine, verifyIsolation, withSandbox } from '../../test-environment/sandbox.mjs';

const fixture = fileURLToPath(new URL('../fixtures/fake-engine.mjs', import.meta.url));
const id = '01234567-89ab-4cde-8fab-0123456789ab';

test('Tests übernehmen keine Produktionszugänge, Lizenz oder Integrationseinstellungen', () => {
  const env = isolatedTestEnv({ PATH: 'runtime', SystemRoot: 'Windows', DIRECTUS_URL: 'production',
    DIRECTUS_ADMIN_TOKEN: 'secret', DIRECTUS_INTEGRATION: '1', LICENSE: 'license', NODE_OPTIONS: '--env-file=.env.local' });
  assert.equal(env.PATH, 'runtime');
  assert.equal(env.SystemRoot, 'Windows');
  assert.equal(env.DIRECTUS_INTEGRATION, '0');
  assert.equal(env.DIRECTUS_URL, 'http://127.0.0.1:1');
  assert.equal(env.LICENSE, undefined);
  assert.equal(env.NODE_OPTIONS, undefined);
  assert.notEqual(env.DIRECTUS_ADMIN_TOKEN, 'secret');
});

test('Prozessadapter behandelt Leerzeichen, Umlaute und Shellzeichen als Daten', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'JuZ io ä '));
  try {
    const args = ['Pfad mit Leerzeichen/ä', '$(echo nope)', '& test'];
    const result = JSON.parse(await command(process.execPath, [fixture, 'ok', ...args], { cwd: directory, input: 'Eingabe ä\n' }));
    assert.deepEqual(result, { args, input: 'Eingabe ä\n' });
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('Fehlende Engine, Prozessfehler und Zeitlimit werden gemeldet', async () => {
  await assert.rejects(command('juzio-nonexistent-engine', []), { code: 'ENOENT' });
  await assert.rejects(command(process.execPath, [fixture, 'fail']), /Exit 42.*Engine ist nicht bereit/s);
  await assert.rejects(command(process.execPath, [fixture, 'timeout'], { timeout: 100 }), /Zeitlimit/);
  await assert.rejects(selectEngine(undefined, async () => { throw new Error('offline'); }), /Keine laufende/);
  assert.equal(await selectEngine(undefined, async engine => { if (engine === 'docker') throw new Error('offline'); }), 'podman');
});

test('Prozessabbruch beendet den laufenden Befehl', async () => {
  const controller = new AbortController();
  const pending = command(process.execPath, [fixture, 'timeout'], { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});

test('Frische Konfiguration ist mehrzeilig, zufällig und erhält vorhandene Einstellungen', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'JuZ Konfiguration ä '));
  const script = fileURLToPath(new URL('../../scripts/config.mjs', import.meta.url));
  const file = join(directory, '.env.local');
  try {
    await command(process.execPath, [script], { cwd: directory, env: isolatedTestEnv() });
    const first = await readFile(file, 'utf8');
    const env = parseEnv(first);
    assert.equal(env.PORT, '3000');
    assert.equal(env.DIRECTUS_ADMIN_EMAIL, 'admin@example.org');
    const secrets = ['DIRECTUS_ADMIN_PASSWORD', 'DIRECTUS_ADMIN_TOKEN', 'DIRECTUS_SECRET', 'PUBLIC_SERVICE_TOKEN'].map(key => env[key]);
    for (const value of secrets) assert.match(value, /^[a-f0-9]{64}$/);
    assert.equal(new Set(secrets).size, 4);
    if (process.platform !== 'win32') assert.equal((await stat(file)).mode & 0o777, 0o600);
    await command(process.execPath, [script], { cwd: directory, env: isolatedTestEnv() });
    assert.equal(await readFile(file, 'utf8'), first);
    await writeFile(file, 'PORT=3999\n# eigene Einstellungen\n');
    await command(process.execPath, [script], { cwd: directory, env: isolatedTestEnv() });
    assert.equal(await readFile(file, 'utf8'), 'PORT=3999\n# eigene Einstellungen\n');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('Sandbox wird bei Testfehler nur mit eigenen Ressourcen aufgeräumt', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'JuZ sandbox ü '));
  const calls = [];
  let directory;
  const name = `juzio-test-${id}`;
  const fake = async args => {
    calls.push(args);
    if (args[0] === 'ps') return name;
    if (args[0] === 'volume' && args[1] === 'ls') return `${name}-db\n${name}-uploads`;
    if (args[0] === 'network' && args[1] === 'ls') return name;
    return '';
  };
  try {
    await assert.rejects(withSandbox(fake, async sandbox => {
      directory = sandbox.directory;
      await access(join(directory, 'sandbox.env'));
      throw new Error('Absichtlicher Testabbruch');
    }, { id, parent }), /Absichtlicher Testabbruch/);
    await assert.rejects(access(directory), { code: 'ENOENT' });
    assert.deepEqual(await readdir(parent), []);
    const run = calls.find(args => args[0] === 'run');
    assert.ok(!run.includes('-p') && !run.includes('--publish') && !run.includes('--publish-all'));
    assert.ok(calls.some(args => args.includes('--internal')));
    assert.ok(run.includes(LABEL));
    for (const args of calls.filter(args => args.includes('ls') || args[0] === 'ps')) {
      assert.ok(args.includes(`label=${LABEL}`));
      assert.ok(args.includes(`label=io.juzio.test.run=${id}`));
    }
    assert.ok(calls.some(args => args[0] === 'rm' && args.at(-1) === name));
    assert.ok(!calls.flat().some(arg => /prune|juze-directus/.test(arg)));
  } finally { await rm(parent, { recursive: true, force: true }); }
});

test('Auch fehlgeschlagener Containerstart räumt bereits angelegte Ressourcen auf', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'JuZ Teilstart '));
  const calls = [];
  try {
    await assert.rejects(withSandbox(async args => {
      calls.push(args);
      if (args[0] === 'run') throw new Error('Containerstart fehlgeschlagen');
      if (args[0] === 'volume' && args[1] === 'ls') return `juzio-test-${id}-db`;
      if (args[0] === 'network' && args[1] === 'ls') return `juzio-test-${id}`;
      return '';
    }, () => assert.fail('Test darf nicht starten'), { id, parent }), /Containerstart fehlgeschlagen/);
    assert.ok(calls.some(args => args[0] === 'volume' && args[1] === 'rm'));
    assert.ok(calls.some(args => args[0] === 'network' && args[1] === 'rm'));
    assert.deepEqual(await readdir(parent), []);
  } finally { await rm(parent, { recursive: true, force: true }); }
});

test('Aufräumen verweigert Produktionsnamen und beliebige Test-IDs', async () => {
  const calls = [];
  await assert.rejects(cleanupOwned(async args => { calls.push(args); return 'juze-directus-v12'; }), /verweigert/);
  assert.equal(calls.length, 1);
  await assert.rejects(cleanupOwned(async () => { assert.fail('Keine Engine-Abfrage erlaubt'); }, '../production'), /Ungültige/);
});

test('Isolationsprüfung erkennt versehentlich veröffentlichte Ports und externe Netzwerke', async () => {
  const name = `juzio-test-${id}`;
  await verifyIsolation(async args => args[0] === 'inspect' ? '{"8055/tcp":null}' : 'true', name);
  await assert.rejects(verifyIsolation(async () => '{"8055/tcp":[{"HostPort":"8056"}]}', name), /keine Hostports/);
  await assert.rejects(verifyIsolation(async args => args[0] === 'inspect' ? '{}' : 'false', name), /intern sein/);
});
