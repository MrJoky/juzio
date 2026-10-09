import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request } from 'node:http';
import { createApp, networkVoterKey } from '../server.js';
import { directus } from '../scripts/directus.mjs';

test('IP-Kennung ist pro Abstimmung stabil und speichert keine Klartextadresse',()=>{
  const key=networkVoterKey('poll-a','192.168.181.39','test-secret');
  assert.match(key,/^[a-f0-9]{64}$/);
  assert.equal(key,networkVoterKey('poll-a','::ffff:192.168.181.39','test-secret'));
  assert.notEqual(key,networkVoterKey('poll-b','192.168.181.39','test-secret'));
  assert.notEqual(key,networkVoterKey('poll-a','192.168.181.116','test-secret'));
  assert.notEqual(key,networkVoterKey('poll-a','192.168.181.39','other-secret'));
});

test('IP-Sperre: neuer Scan, parallele Stimmen, zweites Gerät und Neustart', {skip:process.env.DIRECTUS_INTEGRATION!=='1'},async()=>{
  const admin=(url,method='GET',body)=>directus(url,{token:process.env.DIRECTUS_ADMIN_TOKEN,method,body});
  const polls=[],options=[];
  let server,base,staff;
  const start=async()=>{server=createApp();server.listen(0,'127.0.0.1');await once(server,'listening');base=`http://127.0.0.1:${server.address().port}`;};
  const req=(path,ip,cookie='',body=null,extraHeaders={})=>new Promise((resolve,reject)=>{
    const connection=request(base+path,{localAddress:ip,method:body?'POST':'GET',headers:{Origin:base,...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{}),...extraHeaders}},response=>{
      let raw='';response.setEncoding('utf8');response.on('data',chunk=>{raw+=chunk;});
      response.on('end',()=>{try{resolve({status:response.statusCode,data:JSON.parse(raw),cookie:response.headers['set-cookie']?.[0].split(';')[0]});}catch(e){reject(e);}});
      response.on('error',reject);
    });
    connection.on('error',reject);connection.end(body?JSON.stringify(body):undefined);
  });
  try {
    for(let i=0;i<2;i++) {
      const poll=await admin('/items/polls','POST',{title:'IP-Sperrtest',active:true});polls.push(poll);
      options.push(await admin('/items/poll_options','POST',{poll:poll.id,name:'Testoption',active:true}));
    }
    const schema=await admin('/fields/votes/network_key');assert.equal(schema.schema.is_unique,true);
    await start();
    const login=await req('/api/login','127.0.0.1','',{email:process.env.DIRECTUS_ADMIN_EMAIL,password:process.env.DIRECTUS_ADMIN_PASSWORD});
    assert.equal(login.status,200);staff=login.cookie;
    const poll=polls[0],choice={poll:poll.id,option:options[0].id};
    const withCode=async(choice)=>({...choice,code:(await req('/api/staff/vote-codes','127.0.0.1',staff)).data.find(c=>c.poll===choice.poll).code});
    const first=await req('/api/polls','127.0.0.2');
    const second=await req('/api/polls','127.0.0.2');
    assert.equal(first.status,200);assert.equal(second.status,200);
    assert.notEqual(first.cookie,second.cookie);
    const parallelChoice=await withCode(choice);
    const attempts=await Promise.all([req('/api/vote','127.0.0.2',first.cookie,parallelChoice),req('/api/vote','127.0.0.2',second.cookie,parallelChoice)]);
    assert.deepEqual(attempts.map(r=>r.status).sort(),[201,403]);
    const winner=attempts[0].status===201?first:second;
    const rescanned=await req('/api/polls','127.0.0.2');
    assert.equal(rescanned.data.find(p=>p.id===poll.id).voted,true);
    assert.equal((await req('/api/vote','127.0.0.2',rescanned.cookie,await withCode(choice),{'X-Forwarded-For':'127.0.0.99',Forwarded:'for=127.0.0.99'})).status,409);
    const otherDevice=await req('/api/polls','127.0.0.3');
    assert.equal(otherDevice.data.find(p=>p.id===poll.id).voted,false);
    assert.equal((await req('/api/vote','127.0.0.3',otherDevice.cookie,await withCode(choice))).status,201);
    // Die vorhandene Browsersperre greift auch nach einem IP-Wechsel.
    assert.equal((await req('/api/vote','127.0.0.4',winner.cookie,await withCode(choice))).status,409);
    assert.equal((await req('/api/vote','127.0.0.2',rescanned.cookie,await withCode({poll:polls[1].id,option:options[1].id}))).status,201);
    await new Promise(resolve=>server.close(resolve));server=null;await start();
    staff=(await req('/api/login','127.0.0.1','',{email:process.env.DIRECTUS_ADMIN_EMAIL,password:process.env.DIRECTUS_ADMIN_PASSWORD})).cookie;
    const afterRestart=await req('/api/polls','127.0.0.2');
    assert.equal(afterRestart.data.find(p=>p.id===poll.id).voted,true);
    assert.equal((await req('/api/vote','127.0.0.2',afterRestart.cookie,await withCode(choice))).status,409);
    const votes=await admin(`/items/votes?filter[poll][_eq]=${poll.id}`);
    assert.equal(votes.length,2);
    assert.ok(votes.every(v=>/^[a-f0-9]{64}$/.test(v.network_key)));
  } finally {
    if(server)await new Promise(resolve=>server.close(resolve));
    for(const poll of polls) {
      const votes=await admin(`/items/votes?filter[poll][_eq]=${poll.id}`);
      for(const vote of votes)await admin('/items/votes/'+vote.id,'DELETE');
    }
    for(const option of options)await admin('/items/poll_options/'+option.id,'DELETE');
    for(const poll of polls)await admin('/items/polls/'+poll.id,'DELETE');
  }
});
