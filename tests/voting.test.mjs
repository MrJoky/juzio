import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const votePage=source.slice(source.indexOf('async function votePage()'),source.indexOf("window.addEventListener('pageshow'"));
async function browser(error=null){
  const status={textContent:''},code={value:'123456'};
  const form={elements:{code},querySelector:()=>status};
  let submit,requests=0;
  await runInNewContext(votePage+';votePage()',{
    app:{innerHTML:''},heading:()=>'',empty:()=>'',esc:v=>v??'',dateText:v=>v,
    document:{querySelector:()=>form},
    localStorage:{getItem(){throw Error('Must not read storage');},setItem(){throw Error('Must not write storage');}},
    bindForm:(_id,action)=>{submit=action;},
    api:async url=>{if(url==='/api/polls')return [{id:'poll',options:[{id:'option',name:'Waffeln'}]}];requests++;if(error)throw error;return {ok:true};}
  });
  return {submit,status,code,requests:()=>requests};
}
test('Nach einer Stimme bleibt das Formular für einen neuen Code benutzbar',async()=>{
  const p=await browser();await p.submit({option:'option',code:'123456'});
  assert.equal(p.code.value,'');assert.match(p.status.textContent,/gespeichert/);
  await p.submit({option:'option',code:'654321'});assert.equal(p.requests(),2);
});
test('Paralleles Absenden im Formular erzeugt nur eine Anfrage',async()=>{
  const p=await browser();await Promise.all([p.submit({}),p.submit({})]);assert.equal(p.requests(),1);
});
test('Ungültiger Code lässt einen erneuten Versuch zu',async()=>{
  const p=await browser(Object.assign(Error('Ungültiger Code'),{status:403}));
  await assert.rejects(()=>p.submit({}));await assert.rejects(()=>p.submit({}));assert.equal(p.requests(),2);
});
