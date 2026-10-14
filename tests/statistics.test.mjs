import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeStatistics as summarize } from '../public/pages/statistik.js';
test('Statistik bleibt unabhängig von Uhrzeit zusammengefasst und zählt Korrekturen',()=>{
  const row={visit_date:'2026-10-07',age_group:'12–15',gender:'divers'};
  const rows=[{...row,id:'a',quantity:4,visit_time:'16:00'},{...row,id:'b',quantity:2,visit_time:'15:00'},{...row,id:'c',quantity:0,visit_time:'16:00'}];
  const groups=summarize(rows);
  assert.equal(groups.length,1);
  assert.equal(groups[0].quantity,6);
  assert.equal(groups[0].visit_time,'15:00, 16:00');
  assert.equal(groups[0].entries.length,3);
  rows[0].quantity++;
  assert.equal(summarize(rows)[0].quantity,7);
  assert.equal(summarize([{...row,quantity:1}])[0].visit_time,'');
});
