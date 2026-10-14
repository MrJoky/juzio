import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp, trustedHost, localUrls } from '../server.js';
import { privacyPage } from '../public/pages/datenschutz.js';

test('Hostprüfung blockiert fremde Domains und URL-Tricks',()=>{
  assert.equal(trustedHost('localhost:3000'),true);
  assert.equal(trustedHost('127.0.0.1:3000'),true);
  for(const host of ['evil.example:3000','localhost.evil.example','evil@localhost','localhost/path','localhost?x=1'])assert.equal(trustedHost(host),false,host);
});

test('Öffentliche Datenschutzseite führt Backend-HTML nicht aus',async(t)=>{
  t.mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify({title:'Datenschutz',status:'draft',content:'<img src=x onerror=alert(1)><script>alert(2)</script>'})));
  const app={innerHTML:''};
  await privacyPage(app);
  assert.ok(!app.innerHTML.includes('<script>'));
  assert.ok(!app.innerHTML.includes('<img'));
  assert.match(app.innerHTML,/&lt;script&gt;/);
  assert.match(app.innerHTML,/Entwurf/);
});

test('API weist falsche Typen, Methoden, Herkunft und große Eingaben ab',async()=>{
  const server=createApp();server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(base+'/datenschutz')).status,200);
    const page=await fetch(base+'/');
    assert.match(page.headers.get('content-security-policy'),/frame-ancestors 'none'/);
    assert.equal(page.headers.get('cache-control'),'no-store');
    assert.equal(page.headers.get('x-frame-options'),'DENY');
    for(const body of ['null','[]','"hello"','{']) {
      const response=await fetch(base+'/api/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body});
      assert.equal(response.status,400,body);
    }
    assert.equal((await fetch(base+'/api/login',{method:'POST',headers:{Origin:base,'Content-Type':'text/plain'},body:'{}'})).status,415);
    assert.equal((await fetch(base+'/api/login',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'})).status,403);
    assert.equal((await fetch(base+'/api/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({password:'x'.repeat(17000)})})).status,413);
    assert.equal((await fetch(base+'/api/staff/entries',{method:'DELETE',headers:{Origin:base}})).status,405);
    for(const path of ['/.env','/.env.local','/data/data.json','/scripts/setup.mjs','/.git/config'])assert.equal((await fetch(base+path)).status,404,path);
  }finally{await new Promise(resolve=>server.close(resolve));}
});

test('QR-Ziel akzeptiert keine Script-URL, Zugangsdaten oder fremden Pfad',()=>{
  for(const url of ['javascript:alert(1)','http://user:pass@example.org','https://example.org/path'])assert.throws(()=>localUrls({},url),{status:503});
});
