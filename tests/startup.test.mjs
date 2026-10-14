import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('Belegter App-Port zeigt eine verständliche Meldung statt eines Stacktraces', async () => {
  const occupied = createServer();
  occupied.listen(0, '127.0.0.1');
  await once(occupied, 'listening');
  try {
    const port = occupied.address().port;
    const child = spawn(process.execPath, ['server.js'], {
      cwd: new URL('..', import.meta.url),
      env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', PUBLIC_SERVICE_TOKEN: 'startup-test' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let output = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => { output += chunk; });
    const [code] = await once(child, 'close');
    assert.equal(code, 1);
    assert.match(output, new RegExp(`Port ${port} ist bereits belegt`));
    assert.match(output, /Strg\+C/);
    assert.doesNotMatch(output, /Unhandled|node:events|\n\s+at /);
    assert.equal(occupied.listening, true);
  } finally { await new Promise(resolve => occupied.close(resolve)); }
});
