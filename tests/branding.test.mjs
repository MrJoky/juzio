import test from 'node:test';
import assert from 'node:assert/strict';
import { findOrRename, setupBranding } from '../scripts/branding.mjs';

test('Umbenennung erhält bestehende Rollen-IDs und Eigenschaften und ist wiederholbar', async () => {
  const role = { id: 'existing-role', name: 'Juze Team', description: 'Teamzugriff' };
  const writes = [];
  const api = async (url, method = 'GET', body) => {
    if (method === 'GET') return role.name === new URL(url, 'http://local').searchParams.get('filter[name][_eq]') ? [role] : [];
    assert.equal(method, 'PATCH');
    assert.equal(url, '/roles/existing-role');
    writes.push(body);
    Object.assign(role, body);
    return role;
  };
  const renamed = await findOrRename(api, '/roles', 'JuZ.io Team', 'Juze Team');
  assert.deepEqual(renamed, { id: 'existing-role', name: 'JuZ.io Team', description: 'Teamzugriff' });
  await findOrRename(api, '/roles', 'JuZ.io Team', 'Juze Team');
  assert.equal(writes.length, 1);
});

test('Branding erhält eigene Projektnamen und Collection-Notizen', async () => {
  const patches = [];
  const api = async (url, method = 'GET', body) => {
    if (method === 'PATCH') { patches.push({ url, body }); return; }
    if (url.startsWith('/settings')) return { project_name: 'Eigenes Jugendzentrum' };
    if (url === '/collections') return [
      { collection: 'rooms', meta: { note: 'Juze · lokal' } },
      { collection: 'products', meta: { note: 'Eigene Beschreibung' } }
    ];
    throw Error(url);
  };
  await setupBranding(api);
  assert.deepEqual(patches, [{ url: '/collections/rooms', body: { meta: { note: 'JuZ.io · lokal' } } }]);
});
