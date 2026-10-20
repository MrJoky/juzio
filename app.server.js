import { createApp } from './server.js';
import { serverOptions } from './scripts/runtime.server.mjs';
if (!process.env.PUBLIC_SERVICE_TOKEN) throw new Error('PUBLIC_SERVICE_TOKEN fehlt.');
const app = createApp(serverOptions());
app.on('error', error => { console.error(`Serverstart fehlgeschlagen (${error.code}).`); process.exitCode = 1; });
app.listen(3000, '0.0.0.0', () => console.log(`JuZ.io: ${process.env.PUBLIC_URL}`));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
  app.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
});
