import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const votePage = source.slice(source.indexOf('async function votePage()'),source.indexOf("window.addEventListener('pageshow'"));

async function browser({ voted=false, error=null }={}) {
  const input={disabled:false},button={hidden:false},status={textContent:''};
  const form={querySelector:selector=>selector==='button'?button:status,querySelectorAll:()=>[input]};
  let submit, requests=0;
  await runInNewContext(votePage+';votePage()',{
    navigator:{userAgent:'iPhone'},app:{innerHTML:''},heading:()=>'',empty:()=>'',esc:value=>value??'',dateText:value=>value,
    document:{querySelector:()=>form},window:{addEventListener:()=>{}},
    localStorage:{getItem(){throw new Error('Storage unavailable');},setItem(){throw new Error('Storage unavailable');}},
    bindForm:(_id,action)=>{submit=action;},
    api:async url=>{
      if(url==='/api/polls')return [{id:'poll',voted,options:[{id:'option',name:'Waffeln'}]}];
      requests++;
      if(error)throw error;
      return {ok:true};
    }
  });
  return {input,button,status,submit,requests:()=>requests};
}

test('Serverstatus sperrt das Formular auch ohne LocalStorage',async()=>{
  const page=await browser({voted:true});
  assert.equal(page.input.disabled,true);
  assert.equal(page.button.hidden,true);
  await page.submit({option:'option'});
  assert.equal(page.requests(),0);
});

test('Erfolgreiche Stimme bleibt ohne LocalStorage im offenen Formular gesperrt',async()=>{
  const page=await browser();
  await page.submit({option:'option'});
  await page.submit({option:'option'});
  assert.equal(page.requests(),1);
  assert.equal(page.input.disabled,true);
  assert.equal(page.button.hidden,true);
});

test('Abgewiesene doppelte Stimme sperrt das Formular ohne LocalStorage',async()=>{
  const page=await browser({error:Object.assign(new Error('Schon abgestimmt'),{status:409})});
  await page.submit({option:'option'});
  await page.submit({option:'option'});
  assert.equal(page.requests(),1);
  assert.equal(page.button.hidden,true);
  assert.match(page.status.textContent,/bereits abgestimmt/);
});
