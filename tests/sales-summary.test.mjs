import test from 'node:test';
import assert from 'node:assert/strict';
import { salesSummary as summarize } from '../public/pages/theke.js';
test('Kassenbewegung trennt Warenumsatz, Pfand und Rückgaben, auch bei alten Verkäufen',()=>{
  const result=summarize([{quantity:2,price_cents:150,kind:'sale'},{quantity:2,price_cents:25,kind:'deposit'},{quantity:1,price_cents:-25,kind:'deposit_return'},{quantity:1,price_cents:100}]);
  assert.equal(result.cash,425);assert.equal(result.revenue,400);assert.equal(result.deposit,50);assert.equal(result.returns,25);assert.equal(result.count,3);
  assert.equal(summarize([{quantity:2,price_cents:-25,kind:'deposit_return'}]).cash,-50);
});
