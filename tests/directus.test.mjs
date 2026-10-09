import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID,randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { directus } from '../scripts/directus.mjs';
import { createApp } from '../server.js';

test('Directus: Teamlogin, Eintragung, Statistik, Verkauf, Abstimmung und Rechte', { skip: process.env.DIRECTUS_INTEGRATION !== '1' }, async()=>{
  const admin=(url,method='GET',body)=>directus(url,{token:process.env.DIRECTUS_ADMIN_TOKEN,method,body});
  const cleanup=[]; const password=randomBytes(24).toString('hex');const suffix=randomUUID();
  async function item(collection,body){const r=await admin('/items/'+collection,'POST',body);cleanup.push(()=>admin(`/items/${collection}/${r.id}`,'DELETE'));return r;}
  let server;
  try {
    const role=(await admin('/roles?filter[name][_eq]=Juze%20Team'))[0];
    const user=await admin('/users','POST',{email:`test-${suffix}@example.org`,password,role:role.id,status:'active'});cleanup.push(()=>admin('/users/'+user.id,'DELETE'));
    const room=await item('rooms',{name:'Integrationstest',active:true});
    const product=await item('products',{name:'Integrationstest',price_cents:175,active:true});
    const poll=await item('polls',{title:'Integrationstest',active:true});
    const option=await item('poll_options',{poll:poll.id,name:'Integrationstest',active:true});
    server=createApp();server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;
    const req=async(path,body,cookie='')=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Origin:base,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();return {r,data,cookie:r.headers.get('set-cookie')?.split(';')[0]};};
    const login=await req('/api/login',{email:user.email,password});assert.equal(login.r.status,200,JSON.stringify(login.data));const staff=login.cookie;
    assert.equal((await req('/api/me',null,staff)).data.user.id,user.id);
    assert.match(login.r.headers.get('set-cookie'),/HttpOnly/);
    assert.match(login.r.headers.get('set-cookie'),/SameSite=Strict/);
    assert.equal((await req('/api/room-entries',{room:room.id,name:'Test',guests:'Gast',visit_date:'2026-10-06',visit_time:'15:30'})).r.status,201);
    const entries=(await req('/api/staff/entries',null,staff)).data;const entry=entries.find(e=>e.room===room.id);assert.equal(entry.name,'Test');cleanup.push(()=>admin('/items/room_entries/'+entry.id,'DELETE'));
    assert.equal((await req('/api/room-entries',{room:room.id,name:'Test',visit_date:'2026-02-31',visit_time:'25:90'})).r.status,400);
    const stats=await req('/api/staff/statistics',{visit_date:'2026-10-06',visit_time:'15:30',age_group:'12–15',gender:'keine Angabe',quantity:2,note:suffix},staff);assert.equal(stats.r.status,201,JSON.stringify(stats.data));
    const stat=(await admin(`/items/visitor_statistics?filter[note][_eq]=${suffix}`))[0];cleanup.push(()=>admin('/items/visitor_statistics/'+stat.id,'DELETE'));
    const editedEntry={id:entry.id,visit_date:'2026-10-07',visit_time:'16:45',room:room.id,name:'Korrigiert',guests:'Neue Gäste'};
    assert.equal((await req('/api/staff/entries',editedEntry)).r.status,401);
    assert.equal((await req('/api/staff/entries',editedEntry,staff)).r.status,200);
    const updatedEntry=(await req('/api/staff/entries',null,staff)).data.find(r=>r.id===entry.id);
    assert.equal(updatedEntry.name,'Korrigiert');assert.equal(updatedEntry.visit_time,'16:45');assert.equal(updatedEntry.guests,'Neue Gäste');assert.equal(updatedEntry.room_name,room.name);
    assert.equal((await req('/api/staff/entries',{...editedEntry,visit_time:'25:90'},staff)).r.status,400);
    assert.equal((await req('/api/staff/entries',{...editedEntry,name:' '},staff)).r.status,400);
    assert.equal((await req('/api/staff/rooms',null,staff)).data.some(r=>r.id===room.id),true);
    const editedStat={id:stat.id,visit_date:'2026-10-07',visit_time:'17:15',age_group:'16–18',gender:'divers',quantity:5,note:'Korrigierte Statistik'};
    assert.equal((await req('/api/staff/statistics',editedStat)).r.status,401);
    assert.equal((await req('/api/staff/statistics',editedStat,staff)).r.status,200);
    const updatedStat=(await req('/api/staff/statistics',null,staff)).data.find(r=>r.id===stat.id);
    assert.equal(updatedStat.visit_time,'17:15');assert.equal(updatedStat.quantity,5);assert.equal(updatedStat.age_group,'16–18');assert.equal(updatedStat.note,editedStat.note);
    assert.equal((await req('/api/staff/statistics',{...editedStat,quantity:0},staff)).r.status,400);
    assert.equal((await req('/api/staff/statistics',{...editedStat,visit_date:'2026-02-31'},staff)).r.status,400);
    assert.equal((await req('/api/staff/statistics',{...editedStat,visit_time:'25:90'},staff)).r.status,400);
    assert.equal((await req('/api/staff/statistics',{...editedStat,visit_time:''},staff)).r.status,200);
    assert.equal((await req('/api/staff/statistics',null,staff)).data.find(r=>r.id===stat.id).visit_time,null);
    assert.equal((await req('/api/staff/statistics/quantity',{id:stat.id,delta:1})).r.status,401);
    assert.equal((await req('/api/staff/statistics/quantity',{id:stat.id,delta:2},staff)).r.status,400);
    const increments=await Promise.all([req('/api/staff/statistics/quantity',{id:stat.id,delta:1},staff),req('/api/staff/statistics/quantity',{id:stat.id,delta:1},staff)]);
    assert.deepEqual(increments.map(r=>r.data.quantity).sort(),[6,7]);
    assert.equal((await req('/api/staff/statistics/quantity',{id:stat.id,delta:-1},staff)).data.quantity,6);
    await admin('/items/visitor_statistics/'+stat.id,'PATCH',{quantity:1});
    assert.equal((await req('/api/staff/statistics/quantity',{id:stat.id,delta:-1},staff)).data.quantity,0);
    assert.equal((await req('/api/staff/statistics/quantity',{id:stat.id,delta:-1},staff)).r.status,400);
    assert.equal((await req('/api/staff/statistics/quantity',{id:stat.id,delta:1},staff)).data.quantity,1);
    const request_key=randomUUID();const sale={product:product.id,quantity:3,request_key};
    assert.equal((await req('/api/staff/sales',sale,staff)).r.status,201);assert.equal((await req('/api/staff/sales',sale,staff)).r.status,201);
    const sales=(await req('/api/staff/sales',null,staff)).data.filter(s=>s.request_key===request_key);assert.equal(sales.length,1);assert.equal(sales[0].price_cents,175);cleanup.push(()=>admin('/items/sales/'+sales[0].id,'DELETE'));
    const depositProduct=await item('products',{name:'Pfandtest',price_cents:150,active:true});
    const settings={id:depositProduct.id,has_deposit:true,deposit_cents:25};
    assert.equal((await req('/api/staff/products',settings)).r.status,401);
    assert.equal((await req('/api/staff/products',{...settings,deposit_cents:0},staff)).r.status,400);
    assert.equal((await req('/api/staff/products',settings,staff)).r.status,200);
    const depositKey=randomUUID(),depositSale={product:depositProduct.id,quantity:2,request_key:depositKey};
    const attempts=await Promise.all([req('/api/staff/sales',depositSale,staff),req('/api/staff/sales',depositSale,staff)]);
    assert.ok(attempts.every(a=>a.r.status===201),JSON.stringify(attempts.map(a=>a.data)));
    let positions=await admin(`/items/sales?filter[request_key][_starts_with]=${depositKey}`);
    for(const position of positions)cleanup.push(()=>admin('/items/sales/'+position.id,'DELETE'));
    assert.equal(positions.length,2);
    assert.equal(positions.find(p=>p.kind==='sale').price_cents,150);
    assert.equal(positions.find(p=>p.kind==='deposit').price_cents,25);
    assert.ok(positions.every(p=>p.quantity===2));
    assert.equal(positions.reduce((total,p)=>total+p.quantity*p.price_cents,0),350);
    await admin('/items/products/'+depositProduct.id,'PATCH',{price_cents:999,deposit_cents:50});
    assert.equal((await req('/api/staff/sales',depositSale,staff)).r.status,201);
    positions=await admin(`/items/sales?filter[request_key][_starts_with]=${depositKey}`);
    assert.equal(positions.length,2);assert.equal(positions.find(p=>p.kind==='deposit').price_cents,25);
    const refundKey=randomUUID(),refund={quantity:1,deposit_cents:25,request_key:refundKey};
    assert.equal((await req('/api/staff/deposit-returns',refund)).r.status,401);
    assert.equal((await req('/api/staff/deposit-returns',{...refund,deposit_cents:-25},staff)).r.status,400);
    assert.equal((await req('/api/staff/deposit-returns',refund,staff)).r.status,201);
    assert.equal((await req('/api/staff/deposit-returns',refund,staff)).r.status,201);
    const refunds=await admin(`/items/sales?filter[request_key][_eq]=${refundKey}`);
    for(const position of refunds)cleanup.push(()=>admin('/items/sales/'+position.id,'DELETE'));
    assert.equal(refunds.length,1);assert.equal(refunds[0].kind,'deposit_return');assert.equal(refunds[0].price_cents,-25);
    assert.equal([...positions,...refunds].reduce((total,p)=>total+p.quantity*p.price_cents,0),325);
    // Batch-Transaktion: Kollidiert eine Position, darf auch die andere nicht gespeichert werden.
    const atomicKey=randomUUID();
    await assert.rejects(()=>admin('/items/sales','POST',[
      {product_name:'Rollback-Test',price_cents:150,quantity:1,request_key:atomicKey,kind:'sale'},
      {product_name:'Rollback-Pfand',price_cents:25,quantity:1,request_key:depositKey+':deposit',kind:'deposit'}
    ]));
    const leaked=await admin(`/items/sales?filter[request_key][_eq]=${atomicKey}`);
    for(const position of leaked)cleanup.push(()=>admin('/items/sales/'+position.id,'DELETE'));
    assert.equal(leaked.length,0,'Ware und Pfand müssen gemeinsam gespeichert werden');
    const privacy=await req('/api/datenschutz');assert.equal(privacy.r.status,200);assert.ok(privacy.data.content.length>100);
    assert.deepEqual(Object.keys(privacy.data).sort(),['content','status','title','updated_at']);
    const privacyItem=(await admin('/items/privacy_pages?filter[slug][_eq]=datenschutz'))[0];
    await assert.rejects(()=>directus('/items/privacy_pages/'+privacyItem.id,{token:process.env.PUBLIC_SERVICE_TOKEN,method:'PATCH',body:{content:'Unbefugte Änderung'}}),e=>e.status===403);
    const savedPrivacy={title:privacyItem.title,content:privacyItem.content,status:privacyItem.status};
    try {
      await admin('/items/privacy_pages/'+privacyItem.id,'PATCH',{title:'Datenschutz-Test',content:'Vom Admin bearbeiteter Text',status:'draft'});
      assert.equal((await req('/api/datenschutz')).data.content,'Vom Admin bearbeiteter Text');
    } finally {await admin('/items/privacy_pages/'+privacyItem.id,'PATCH',savedPrivacy);}
    const teamAuth=await directus('/auth/login',{method:'POST',body:{email:user.email,password,mode:'json'}});
    try {
      await assert.rejects(()=>directus('/items/privacy_pages/'+privacyItem.id,{token:teamAuth.access_token,method:'PATCH',body:{content:'Unbefugte Änderung'}}),e=>e.status===403);
    } finally {await directus('/auth/logout',{method:'POST',body:{refresh_token:teamAuth.refresh_token}});}
    const unpublished=await item('privacy_pages',{slug:'internal-'+suffix,title:'Intern',content:'Nicht öffentlich',status:'draft'});
    assert.equal((await directus('/items/privacy_pages',{token:process.env.PUBLIC_SERVICE_TOKEN})).some(p=>p.slug===unpublished.slug),false);
    const beforeVote=await req('/api/polls');
    assert.equal(beforeVote.data.find(p=>p.id===poll.id).voted,false);
    const voter=beforeVote.cookie;
    assert.match(voter,/^juze_voter=[a-f0-9]{64}$/);
    const code=async()=> (await req('/api/staff/vote-codes',null,staff)).data.find(c=>c.poll===poll.id).code;
    assert.equal((await req('/api/vote',{poll:poll.id,option:option.id},voter)).r.status,403);
    const vote=await req('/api/vote',{poll:poll.id,option:option.id,code:await code()},voter);assert.equal(vote.r.status,201,JSON.stringify(vote.data));
    const votes=await admin(`/items/votes?filter[poll][_eq]=${poll.id}`);assert.equal(votes.length,1);cleanup.push(()=>admin('/items/votes/'+votes[0].id,'DELETE'));
    assert.equal((await req('/api/vote',{poll:poll.id,option:option.id,code:await code()},voter)).r.status,409);
    assert.equal((await req('/api/polls',null,voter)).data.find(p=>p.id===poll.id).voted,true);
    const anotherBrowser=await req('/api/polls');
    assert.equal(anotherBrowser.data.find(p=>p.id===poll.id).voted,true);
    assert.equal((await req('/api/vote',{poll:poll.id,option:option.id,code:await code()},anotherBrowser.cookie)).r.status,409);
    const results=(await req('/api/staff/polls',null,staff)).data.find(p=>p.id===poll.id);assert.equal(results.total,1);assert.equal(results.options[0].count,1);
    const links=await req('/api/staff/links',null,staff);assert.equal(links.r.status,200);assert.ok(links.data.links[0].qr.startsWith('data:image/png;base64,'));
    await assert.rejects(()=>directus('/items/room_entries',{token:process.env.PUBLIC_SERVICE_TOKEN}),e=>e.status===403);
    const statusKeys=await directus('/items/votes?limit=1',{token:process.env.PUBLIC_SERVICE_TOKEN});
    assert.ok(statusKeys.every(row=>Object.keys(row).every(key=>['voter_key','network_key'].includes(key))));
    await admin('/items/polls/'+poll.id,'PATCH',{active:false});assert.equal((await req('/api/vote',{poll:poll.id,option:option.id,code:'000000'},voter)).r.status,400);
    await admin('/users/'+user.id,'PATCH',{role:null});
    assert.equal((await req('/api/me',null,staff)).data.user,null);
    assert.equal((await req('/api/staff/vote-codes',null,staff)).r.status,401);
    assert.equal((await req('/api/logout',{},staff)).r.status,200);assert.equal((await req('/api/staff/sales',null,staff)).r.status,401);
  }finally{
    if(server)await new Promise(r=>server.close(r));
    for(const remove of cleanup.reverse())await remove();
  }
});
