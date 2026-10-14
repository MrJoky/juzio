import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../server.js';

test('Browsermodule und alle Imports werden als JavaScript ausgeliefert, private Dateien bleiben gesperrt', async () => {
  const server = createApp();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const visited = new Set();
    const pending = [new URL('/app.js', base)];
    while (pending.length) {
      const url = pending.pop();
      if (visited.has(url.href)) continue;
      visited.add(url.href);
      const response = await fetch(url);
      assert.equal(response.status, 200, url.pathname);
      assert.match(
        response.headers.get('content-type'),
        /javascript/,
        url.pathname,
      );
      const source = await response.text();
      for (const match of source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) {
        const dependency = new URL(match[1], url);
        assert.equal(dependency.origin, base);
        pending.push(dependency);
      }
    }
    for (const module of [
      'pages/raumeintragung.js',
      'pages/statistik.js',
      'pages/theke.js',
      'pages/abstimmung.js',
      'pages/datenschutz.js',
      'lib/api.js',
      'lib/forms.js',
    ]) {
      assert.ok(visited.has(new URL(module, base).href), module);
    }
    for (const path of [
      '/pages/missing.js',
      '/lib/missing.js',
      '/pages/server.js',
      '/lib/.env.local',
      '/server.js',
      '/scripts/setup.mjs',
    ]) {
      assert.equal((await fetch(base + path)).status, 404, path);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
