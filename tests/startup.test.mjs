import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('Server verweigert den Start ohne gültige HTTPS-Konfiguration', () => {
  const child = spawnSync(process.execPath, ['app.server.js'], {
    cwd: new URL('..', import.meta.url),
    env: {...process.env, PUBLIC_SERVICE_TOKEN:'startup-test', PUBLIC_URL:'http://juzio.home.arpa', APP_SECURE_COOKIES:'true', TRUSTED_PROXY_IP:'172.30.56.2'},
    encoding:'utf8'
  });
  assert.equal(child.status, 1);
  assert.match(child.stderr, /HTTPS-Origin/);
});
