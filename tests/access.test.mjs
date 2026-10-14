import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../server.js';

test('Öffentliche Seiten und Zugriffsschutz ohne Sitzung',async()=>{
  const server=createApp();server.listen(0,'127.0.0.1');await once(server,'listening');
  const base=`http://127.0.0.1:${server.address().port}`;
  try {
    for(const route of ['/','/login','/abstimmung','/datenschutz','/app.js','/styles.css']) assert.equal((await fetch(base+route)).status,200,route);
    for(const route of ['/team','/raumliste','/statistik','/theke','/abstimmung-team','/qr']) {
      const r=await fetch(base+route,{redirect:'manual'});assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/login');
    }
    for(const route of ['rooms','entries','statistics','products','sales','polls','links','vote-codes'])assert.equal((await fetch(base+'/api/staff/'+route)).status,401);
    assert.deepEqual(await (await fetch(base+'/api/me')).json(),{user:null});
    for (const cookie of ['', 'juze_voter=invalid']) {
      const response=await fetch(base+'/api/vote',{method:'POST',headers:{'Content-Type':'application/json',Origin:base,Cookie:cookie},body:'{}'});
      assert.equal(response.status,400);
      assert.match((await response.json()).error,/Ungültige Auswahl/);
      assert.equal(response.headers.get('set-cookie'),null);
    }
    assert.equal((await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json','Origin':'http://fremd.invalid'},body:'{}'})).status,403);
    assert.equal((await fetch(base+'/../.env.local')).status,404);
    assert.equal((await fetch(base+'/team.js')).status,404);
  } finally {await new Promise(r=>server.close(r));}
});
