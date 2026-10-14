import { readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { isolatedTestEnv } from '../test-environment/process.mjs';

const suite = process.argv[2] || 'all';
if (!['all', 'installer'].includes(suite)) throw new Error('Unbekannte Testsuite.');
const root = new URL('../', import.meta.url);
const directories = suite === 'installer' ? ['tests/installer'] : ['tests', 'tests/installer'];
const files = [];
for (const directory of directories) {
  for (const name of (await readdir(new URL(directory, root))).sort()) {
    if (name.endsWith('.test.mjs')) files.push(`${directory}/${name}`);
  }
}
const child = spawn(process.execPath, ['--test', ...files], {
  cwd: root, env: isolatedTestEnv(), stdio: 'inherit', shell: false,
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
