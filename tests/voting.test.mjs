import test from 'node:test';
import assert from 'node:assert/strict';
import { votePage } from '../public/pages/abstimmung.js';

function replaceGlobal(t, name, value) {
  const original = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, {
    value,
    configurable: true,
    writable: true,
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, name, original);
    else delete globalThis[name];
  });
}

async function browser(t, error = null) {
  const status = { textContent: '' },
    code = { value: '123456' },
    button = { disabled: false };
  let handler,
    requests = 0;
  const form = {
    elements: { code },
    values: {},
    querySelector: (selector) =>
      selector === 'button[type=submit]' ? button : status,
    addEventListener: (_type, action) => {
      handler = action;
    },
  };
  replaceGlobal(t, 'document', { querySelector: () => form });
  replaceGlobal(
    t,
    'FormData',
    class {
      constructor(form) {
        this.values = form.values;
      }
      [Symbol.iterator]() {
        return Object.entries(this.values)[Symbol.iterator]();
      }
    },
  );
  replaceGlobal(t, 'localStorage', {
    getItem() {
      throw Error('Must not read storage');
    },
    setItem() {
      throw Error('Must not write storage');
    },
  });
  t.mock.method(globalThis, 'fetch', async (url) => {
    if (url === '/api/polls')
      return new Response(
        JSON.stringify([
          { id: 'poll', options: [{ id: 'option', name: 'Waffeln' }] },
        ]),
      );
    requests++;
    return new Response(
      JSON.stringify(error ? { error: error.message } : { ok: true }),
      { status: error?.status || 201 },
    );
  });
  await votePage({ innerHTML: '' });
  return {
    status,
    code,
    requests: () => requests,
    submit: async (values) => {
      form.values = values;
      await handler({ preventDefault() {} });
    },
  };
}

test('Nach einer Stimme bleibt das Formular für einen neuen Code benutzbar', async (t) => {
  const p = await browser(t);
  await p.submit({ option: 'option', code: '123456' });
  assert.equal(p.code.value, '');
  assert.match(p.status.textContent, /gespeichert/);
  await p.submit({ option: 'option', code: '654321' });
  assert.equal(p.requests(), 2);
});

test('Paralleles Absenden im Formular erzeugt nur eine Anfrage', async (t) => {
  const p = await browser(t);
  await Promise.all([p.submit({}), p.submit({})]);
  assert.equal(p.requests(), 1);
});

test('Ungültiger Code lässt einen erneuten Versuch zu', async (t) => {
  const p = await browser(
    t,
    Object.assign(Error('Ungültiger Code'), { status: 403 }),
  );
  await p.submit({});
  assert.match(p.status.textContent, /Ungültiger Code/);
  await p.submit({});
  assert.equal(p.requests(), 2);
});
