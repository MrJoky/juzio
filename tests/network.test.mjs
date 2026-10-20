import test from 'node:test';
import assert from 'node:assert/strict';
import { publicUrls } from '../server.js';

test('QR-Links verwenden ausschließlich die konfigurierte HTTPS-Adresse', () => {
  assert.deepEqual(publicUrls('https://juzio.home.arpa/'), ['https://juzio.home.arpa']);
  for (const url of ['', 'http://192.168.1.50:3000', 'https://user:pass@juzio.home.arpa', 'https://juzio.home.arpa/path'])
    assert.throws(() => publicUrls(url), {status:503});
});
