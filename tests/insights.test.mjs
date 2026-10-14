import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { directus } from '../scripts/directus.mjs';
import { insightDashboards, setupInsights } from '../scripts/insights.mjs';

test('Insights-Layouts verwenden gültige Rasterlinien, lesbare Breiten und überlappen sich nicht', () => {
  for (const dashboard of insightDashboards) {
    for (const panel of dashboard.panels) {
      assert.ok(Number.isInteger(panel.position_x) && panel.position_x >= 1, panel.name);
      assert.ok(Number.isInteger(panel.position_y) && panel.position_y >= 1, panel.name);
      assert.ok(panel.width >= (panel.type === 'metric' ? 16 : 24), panel.name);
      for (const other of dashboard.panels.filter(p => p.id !== panel.id)) {
        const overlaps = panel.position_x < other.position_x + other.width &&
          panel.position_x + panel.width > other.position_x &&
          panel.position_y < other.position_y + other.height &&
          panel.position_y + panel.height > other.position_y;
        assert.equal(overlaps, false, `${panel.name} / ${other.name}`);
      }
    }
  }
});

test('Insights repariert alte Rastermaße einmalig und erhält eigene Layouts und Paneloptionen', async () => {
  const dashboard = insightDashboards[0];
  const panels = structuredClone(dashboard.panels);
  Object.assign(panels[0], { position_x: 0, position_y: 0, width: 12, height: 8, name: 'Eigener Titel' });
  Object.assign(panels[1], { position_x: 6, position_y: 50, width: 24, height: 10 });
  Object.assign(panels[2], { name: 'Tage mit erfassten Besuchen', options: {
    ...panels[2].options, field: 'visit_date', function: 'countDistinct'
  } });
  const custom = structuredClone(panels[1]);
  const originalOptions = structuredClone(panels[0].options);
  const patches = [];
  const api = async (url, method = 'GET', body) => {
    if (url.startsWith('/dashboards')) return insightDashboards;
    if (url === '/panels?limit=-1') return panels;
    if (url.startsWith('/permissions')) return [{ id: 'existing-permission' }];
    if (method === 'POST') return body;
    if (method === 'PATCH') {
      patches.push(body);
      Object.assign(panels.find(p => p.id === url.split('/').pop()), body);
      return;
    }
    throw new Error(`Unerwartete Anfrage: ${method} ${url}`);
  };
  await setupInsights(api, 'team');
  assert.equal(patches.length, 2);
  assert.equal(panels[0].position_x, 1);
  assert.equal(panels[0].position_y, 1);
  assert.equal(panels[0].width, 16);
  assert.equal(panels[0].name, 'Eigener Titel');
  assert.deepEqual(panels[0].options, originalOptions);
  assert.deepEqual(panels[1], custom);
  assert.equal(panels[2].options.field, 'id');
  assert.equal(panels[2].options.function, 'count');
  assert.equal(panels[2].name, 'Einträge mit Besuchern · gesamt');
  await setupInsights(api, 'team');
  assert.equal(patches.length, 2);
});

test('Insights: Team kann alle Diagramme lesen; Abfragen stimmen und Service bleibt ausgeschlossen', {
  skip: process.env.DIRECTUS_INTEGRATION !== '1'
}, async () => {
  const admin = (url, method = 'GET', body) => directus(url, { token: process.env.DIRECTUS_ADMIN_TOKEN, method, body });
  const role = (await admin('/roles?filter[name][_eq]=Juze%20Team'))[0];
  const token = randomBytes(32).toString('hex');
  const user = await admin('/users', 'POST', { email: `insights-${randomUUID()}@example.org`, role: role.id, token, status: 'active' });
  const team = url => directus(url, { token });
  try {
    const policy = (await admin('/policies?filter[name][_eq]=Juze%20Team'))[0];
    const before = await admin('/panels?limit=-1');
    await setupInsights(admin, policy.id);
    assert.deepEqual(await admin('/panels?limit=-1'), before, 'Erneutes Setup verändert vorhandene Panels nicht');
    const dashboards = await team('/dashboards?limit=-1');
    const panels = await team('/panels?limit=-1');
    for (const d of insightDashboards) {
      assert.ok(dashboards.some(saved => saved.id === d.id));
      for (const panel of d.panels) {
        const saved = panels.find(p => p.id === panel.id);
        assert.ok(saved, panel.name);
        const o = saved.options;
        const params = new URLSearchParams({ limit: '-1' });
        let fn, field;
        if (saved.type === 'metric') { fn = o.function; field = o.field; }
        if (saved.type === 'bar-chart') {
          fn = o.function; field = o.yAxis; params.set('groupBy', o.xAxis);
        }
        let filter = o.filter || {};
        if (saved.type === 'time-series') {
          fn = o.function; field = o.valueField;
          params.set('groupBy', ['year', 'month', 'day'].map(p => `${p}(${o.dateField})`).join(','));
          filter = { _and: [filter, { [o.dateField]: { _gte: `$NOW(-${o.range})`, _lte: '$NOW' } }] };
        }
        params.set(`aggregate[${fn}]`, field);
        params.set('filter', JSON.stringify(filter));
        const rows = await team(`/items/${o.collection}?${params}`);
        assert.ok(Array.isArray(rows), panel.name);
        if (saved.type === 'metric' && rows.length) {
          assert.ok(Number.isFinite(Number(rows[0][fn][field])), `${panel.name}: numerische Kennzahl erwartet`);
        }
        if (saved.type === 'metric' && fn === 'sum' && !Object.keys(filter).length) {
          const items = await team(`/items/${o.collection}?fields=${field}&limit=-1`);
          assert.equal(Number(rows[0].sum[field]), items.reduce((sum, row) => sum + Number(row[field] || 0), 0));
        }
        if (o.xAxisDisplayField) {
          const related = o.xAxis === 'poll' ? 'polls' : 'poll_options';
          assert.ok(Array.isArray(await team(`/items/${related}?fields=id,${o.xAxisDisplayField}&limit=-1`)));
        }
      }
    }
    for (const path of ['/dashboards', '/panels']) {
      await assert.rejects(() => directus(path, { token: process.env.PUBLIC_SERVICE_TOKEN }), error => error.status === 403);
    }
    await assert.rejects(() => directus(`/dashboards/${insightDashboards[0].id}`, {
      token, method: 'PATCH', body: { name: 'Nicht erlaubt' }
    }), error => error.status === 403);
  } finally { await admin(`/users/${user.id}`, 'DELETE'); }
});
