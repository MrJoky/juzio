import { randomBytes } from 'node:crypto';
import { access, writeFile } from 'node:fs/promises';
try { await access('.env.local'); } catch {
  const secret = () => randomBytes(32).toString('hex');
  await writeFile('.env.local', `PORT=3000\nHOST=0.0.0.0\nDIRECTUS_URL=http://127.0.0.1:8056\nDIRECTUS_ADMIN_EMAIL=admin@example.org\nDIRECTUS_ADMIN_PASSWORD=${secret()}\nDIRECTUS_ADMIN_TOKEN=${secret()}\nDIRECTUS_SECRET=${secret()}\nPUBLIC_SERVICE_TOKEN=${secret()}\n`, { mode: 0o600, flag: 'wx' });
  console.log('Ersteinrichtung: Zugangsdaten wurden in .env.local gespeichert.');
}
