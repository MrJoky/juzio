import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoteCodes } from '../server.js';

test('Mitarbeitercode ist kurzlebig, abstimmungsgebunden und einmal verwendbar',()=>{
  let now=1000;
  const codes=createVoteCodes(()=>now);
  const first=codes.current('a');
  assert.match(first.code,/^[0-9]{6}$/);
  assert.equal(first.remaining_ms,10000);
  now=2000;
  assert.equal(codes.current('a').code,first.code);
  assert.throws(()=>codes.consume('b',first.code),{status:403});
  assert.throws(()=>codes.consume('a',''),{status:403});
  codes.consume('a',first.code);
  assert.throws(()=>codes.consume('a',first.code),{status:403});
  const next=codes.current('a');
  now=next.expires_at;
  assert.throws(()=>codes.consume('a',next.code),{status:403});
  assert.equal(codes.current('a').remaining_ms,10000);
  codes.retain(new Set());
  assert.throws(()=>codes.consume('a',codes.current('b').code),{status:403});
});

test('Neuer App-Prozess akzeptiert keinen zuvor ausgegebenen Code',()=>{
  const old=createVoteCodes().current('a');
  assert.throws(()=>createVoteCodes().consume('a',old.code),{status:403});
});
