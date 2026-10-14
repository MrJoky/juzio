import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { directus } from '../scripts/directus.mjs';
import { insightDashboards, setupInsights } from '../scripts/insights.mjs';

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
