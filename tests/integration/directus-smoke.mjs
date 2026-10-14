// Executed inside the disposable Directus container, never on the host.
import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

const base = 'http://127.0.0.1:8055';
const phase = process.argv[2];
assert.ok(['create', 'verify'].includes(phase));
assert.match(process.env.JUZIO_TEST_ID || '', /^[0-9a-f-]{36}$/);
let ready = false;
for (let attempt = 0; attempt < 75; attempt++) {
  try {
    const response = await fetch(`${base}/server/ping`, { signal: AbortSignal.timeout(1500) });
    if (response.ok) { ready = true; break; }
  } catch {}
  await setTimeout(1000);
}
assert.ok(ready, 'Neue Directus-Instanz wurde nicht bereit.');
const login = await fetch(`${base}/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }),
});
assert.equal(login.status, 200, 'Frischer Sandbox-Admin muss sich anmelden können.');
const token = (await login.json()).data.access_token;
async function api(path, method = 'GET', body) {
  const response = await fetch(base + path, {
    method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15_000),
  });
  const result = await response.json();
  assert.equal(response.status, 200, `Sandbox-API ${method} ${path}: ${JSON.stringify(result.errors || [])}`);
  return result.data;
}
assert.equal((await api('/users/me')).email, 'sandbox@example.org');
if (phase === 'create') {
  const collections = await api('/collections');
  assert.ok(!collections.some(collection => collection.collection === 'sandbox_probe'), 'Datenbank muss frisch sein.');
  await api('/collections', 'POST', {
    collection: 'sandbox_probe', schema: {}, meta: {},
    fields: [
      { field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true } },
      { field: 'marker', type: 'string', schema: {} },
    ],
  });
  await api('/items/sandbox_probe', 'POST', { marker: process.env.JUZIO_TEST_ID });
}
const rows = await api('/items/sandbox_probe');
assert.equal(rows.length, 1);
assert.equal(rows[0].marker, process.env.JUZIO_TEST_ID, 'Eigene Testdaten müssen den Neustart überstehen.');
console.log(`Directus-Sandbox: ${phase} erfolgreich (Admin, eigene Datenbank, Testdaten).`);
