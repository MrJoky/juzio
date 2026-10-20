import { command } from '../test-environment/process.mjs';
import { cleanupOwned, selectEngine, verifyIsolation, withSandbox } from '../test-environment/sandbox.mjs';

const args = process.argv.slice(2);
if (args.some(arg => !['--cleanup', '--engine=docker', '--engine=podman'].includes(arg))) {
  throw new Error('Verwendung: npm run test:sandbox -- [--engine=docker|--engine=podman] [--cleanup]');
}
try {
  const engine = await selectEngine(args.find(arg => arg.startsWith('--engine='))?.split('=')[1]);
  const run = (options, settings) => command(engine, options, settings);
  if (args.includes('--cleanup')) {
    await cleanupOwned(run);
    console.log('Markierte JuZ.io-Testressourcen dieser Engine entfernt.');
  } else {
    const controller = new AbortController();
    const stop = () => controller.abort();
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    console.log(`Directus-Sandbox startet mit ${engine}; keine veröffentlichten Ports.`);
    try {
      await withSandbox(run, async ({ name, probe, restart }) => {
        console.log(`Testlauf: ${name}`);
        await verifyIsolation(run, name);
        console.log(await probe('create'));
        await restart();
        console.log(await probe('verify'));
      }, { signal: controller.signal });
    } finally {
      process.removeListener('SIGINT', stop);
      process.removeListener('SIGTERM', stop);
    }
    console.log('Sandbox einschließlich Datenbank, Uploads und Netzwerk entfernt.');
  }
} catch (error) {
  console.error(error.message);
  console.error('Bei abgebrochenem Lauf: npm run test:sandbox -- --cleanup --engine=docker (bzw. podman).');
  process.exitCode = 1;
}
