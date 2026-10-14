import { spawn } from 'node:child_process';

// No shell: paths with spaces and arguments containing special characters stay literal.
export function command(executable, args, { input, timeout = 60_000, env = process.env, cwd, signal } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { env, cwd, signal, killSignal: 'SIGKILL', shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeout);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => { stdout = (stdout + chunk).slice(-64_000); });
    child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-64_000); });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.stdin.on('error', () => {}); // Early process exit can close stdin.
    child.on('close', code => {
      clearTimeout(timer);
      if (code === 0 && !timedOut) resolve(stdout.trim());
      else reject(new Error(timedOut ? 'Befehl hat das Zeitlimit überschritten.' : `Befehl fehlgeschlagen (Exit ${code}): ${stderr.trim()}`));
    });
    child.stdin.end(input);
  });
}

export function isolatedTestEnv(source = process.env) {
  // Preserve OS/runtime essentials, discard application settings and production secrets.
  const allowed = /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|TMPDIR|HOME|USERPROFILE|APPDATA|LOCALAPPDATA|LANG|LC_.*|TZ|CI|NO_COLOR)$/i;
  return {
    ...Object.fromEntries(Object.entries(source).filter(([key]) => allowed.test(key))),
    DIRECTUS_URL: 'http://127.0.0.1:1', DIRECTUS_INTEGRATION: '0',
    DIRECTUS_ADMIN_TOKEN: 'test-only-admin', PUBLIC_SERVICE_TOKEN: 'test-only-service',
    HOST: '127.0.0.1', PORT: '0',
  };
}
