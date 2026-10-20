import test from 'node:test';
import assert from 'node:assert/strict';
import { serverOptions } from '../scripts/runtime.server.mjs';

const env = { PUBLIC_URL: 'https://juzio.example', DIRECTUS_PUBLIC_URL: 'https://cms.juzio.example', APP_SECURE_COOKIES: 'true', TRUSTED_PROXY_IP: '172.30.56.2' };
test('Server verlangt HTTPS, Secure-Cookies und eine einzelne Proxy-IP', () => {
  for (const change of [ {PUBLIC_URL:'http://juzio.example'}, {PUBLIC_URL:'https://juzio.example/path'}, {APP_SECURE_COOKIES:'false'}, {TRUSTED_PROXY_IP:'*'}, {DIRECTUS_PUBLIC_URL:'https://juzio.example'}, {DIRECTUS_PUBLIC_URL:'http://cms.juzio.example'} ])
    assert.throws(() => serverOptions({...env, ...change}));
  const options = serverOptions(env);
  assert.equal(options.acceptHost('juzio.example'), true);
  for (const host of ['evil.example', 'juzio.example.evil', 'evil@juzio.example', '172.30.56.3:3000']) assert.equal(options.acceptHost(host), false);
});
test('Client-IP wird nur vom bekannten Proxy übernommen', () => {
  const { clientAddress } = serverOptions(env);
  const request = (peer, header) => ({socket:{remoteAddress:peer}, headers:{'x-real-ip':header}});
  assert.equal(clientAddress(request('::ffff:172.30.56.2', '203.0.113.10')), '203.0.113.10');
  assert.equal(clientAddress(request('172.30.56.9', '203.0.113.10')), '172.30.56.9');
  assert.equal(clientAddress(request('172.30.56.2', '203.0.113.10, 1.2.3.4')), '172.30.56.2');
  assert.equal(clientAddress(request('172.30.56.2', undefined)), '172.30.56.2');
});
