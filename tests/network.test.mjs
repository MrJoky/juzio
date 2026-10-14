import test from 'node:test';
import assert from 'node:assert/strict';
import { localUrls } from '../server.js';

test('QR-Links verwenden das lokale Netz statt Container- und VPN-Adressen', () => {
  const ipv4 = address => ({ family: 'IPv4', internal: false, address });
  const interfaces = {
    lo: [{ ...ipv4('127.0.0.1'), internal: true }],
    wlan0: [ipv4('192.168.181.127'), { family: 'IPv6', internal: false, address: 'fe80::1' }],
    docker0: [ipv4('172.17.0.1')],
    'br-abcd': [ipv4('172.18.0.1')],
    tailscale0: [ipv4('100.64.0.1')],
    eth0: [ipv4('169.254.1.2')],
  };
  assert.deepEqual(localUrls(interfaces, '', 3000), ['http://192.168.181.127:3000']);
  assert.deepEqual(localUrls(interfaces, 'https://juzio.example/', 3000), ['https://juzio.example']);
});
