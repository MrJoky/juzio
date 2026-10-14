const app = document.querySelector('#app');
const route = location.pathname;
const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const money = cents => new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(cents/100);
const today = () => new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(new Date());
const dateText = d => d ? new Intl.DateTimeFormat('de-DE',{dateStyle:'medium'}).format(new Date(d.length===10?`${d}T12:00:00`:d)) : '–';
const uid = () => '10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
async function api(url, body) {
  const response = await fetch(url,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
  const data = await response.json();
  if (!response.ok) { if(response.status===401 && route!=='/login' && url.startsWith('/api/staff/')) location.assign('/login'); throw Object.assign(new Error(data.error || 'Anfrage fehlgeschlagen.'), {status:response.status}); }
  return data;
}
function heading(eyebrow,title,description='') { return `<div class="section-heading"><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(title)}</h1><p class="lead">${esc(description)}</p></div>`; }
function select(name,label,values) { return `<label>${esc(label)}<select name="${name}" required><option value="">Bitte wählen</option>${values.map(v=>`<option>${esc(v)}</option>`).join('')}</select></label>`; }
function dateInput() { return `<label>Datum<input type="date" name="visit_date" value="${today()}" required></label>`; }
function bindForm(id,action) {
  const form = document.querySelector(`#${id}`);
  form.addEventListener('submit', async event=> {
    event.preventDefault(); const button = form.querySelector('button[type=submit]'); const status=form.querySelector('[role=status]');
    button.disabled=true; status.textContent='Wird gespeichert …';
    try { await action(Object.fromEntries(new FormData(form)),form); } catch(e) { status.textContent=e.message; }
    finally { button.disabled=false; }
  });
}
function empty(message) { return `<p class="empty">${esc(message)}</p>`; }
function cards(rows,render,message='Noch keine Einträge vorhanden.') { return rows.length?rows.map(r=>`<article class="entry-card">${render(r)}</article>`).join(''):empty(message); }
function table(headers,rows) { return `<div class="table-scroll"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; }
function exportCsv(name,rows) {
  const cell = v => { let s=String(v??''); if(/^[=+\-@\t\r]/.test(s)) s="'"+s; return `"${s.replaceAll('"','""')}"`; };
  const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(row=>row.map(cell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function filterControls() { return `<div class="toolbar filter"><label>Von<input id="from" type="date" value="${today()}"></label><label>Bis<input id="to" type="date" value="${today()}"></label><button id="refresh" class="ghost-button">Aktualisieren</button><button id="export" class="ghost-button">CSV exportieren</button></div><p id="viewStatus" role="status"></p>`; }
function filter(rows,key) { const from=document.querySelector('#from').value,to=document.querySelector('#to').value; return rows.filter(r=>{const d=key==='created_at'?new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(new Date(r[key])):r[key]?.slice(0,10);return(!from||d>=from)&&(!to||d<=to);}); }
function safe(action) { return async()=>{try{await action();}catch(e){const status=document.querySelector('#viewStatus');if(status)status.textContent=e.message;}}; }
async function roomPage() {
  const rooms = await api('/api/rooms');
  app.innerHTML=heading('Willkommen im Juze','Welchen Raum nutzt du?','Trage dich und deine Freunde ein. Eure Namen sind nur für das Team sichtbar.')+`<div class="section-grid"><div class="intro-panel"><span class="big-symbol">↗</span><h2>Platz für euch.</h2><p>Raum auswählen, Namen eintragen und los geht’s.</p><p>Bitte verwende nur deinen Vornamen oder Spitznamen.</p></div><form id="roomForm" class="panel form-panel">${dateInput()}<label>Uhrzeit<input type="time" name="visit_time" value="${new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'}).format(new Date())}" required></label><label>Raum<select name="room" required><option value="">Bitte wählen</option>${rooms.map(r=>`<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}</select></label><label>Dein Vorname oder Spitzname<input name="name" maxlength="120" autocomplete="off" required></label><label>Wer ist noch dabei?<textarea name="guests" maxlength="1200" rows="3" placeholder="Weitere Vornamen oder Spitznamen"></textarea></label><p>Verwende nur Vornamen oder Spitznamen. Weitere Gäste bitte nur nach Rücksprache eintragen. <a href="/datenschutz">Datenschutzhinweise</a></p><button type="submit" class="primary-button" ${rooms.length?'':'disabled'}>Eintragen</button><p role="status">${rooms.length?'':'Aktuell sind keine Räume verfügbar.'}</p></form></div>`;
  bindForm('roomForm',async(b,f)=>{await api('/api/room-entries',b);f.querySelector('[name=name]').value='';f.querySelector('[name=guests]').value='';f.querySelector('[role=status]').textContent='Danke! Dein Eintrag ist gespeichert.';});
}
function loginPage(user) {
  app.innerHTML=heading('Für das Team','Einmal anmelden.','Dein persönlicher Directus-Account öffnet alle Teambereiche.')+(user?`<div class="panel form-panel"><p>Du bist als ${esc(user.first_name||user.email)} angemeldet.</p><a class="primary-button" href="/team">Zum Teambereich</a></div>`:`<form id="loginForm" class="panel login-panel"><label>E-Mail<input type="email" name="email" autocomplete="username" required></label><label>Passwort<input type="password" name="password" autocomplete="current-password" required></label><label>Einmalcode (nur bei aktivierter Zwei-Faktor-Anmeldung)<input name="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="10"></label><button type="submit" class="primary-button">Anmelden</button><p role="status"></p></form>`);
  if(!user) bindForm('loginForm',async b=>{await api('/api/login',b);location.assign('/team');});
}
function teamPage(user) {
  const links=[['/raumliste','Raumliste','Alle Raumeintragungen ansehen.'],['/statistik','Besucherstatistik','Besuche erfassen und auswerten.'],['/theke','Thekenverkauf','Angebote buchen und Umsatz sehen.'],['/abstimmung-team','Abstimmung','Wünsche für nächste Woche auswerten.'],['/qr','QR-Codes','Links für Jugendliche ausdrucken.']];
  app.innerHTML=heading('Team',`Hallo ${user.first_name||'Team'}.`,'Alles für euren Alltag an einem Ort.')+`<div class="dashboard-grid">${links.map(([href,title,description])=>`<a class="panel dashboard-card" href="${href}"><h2>${title} ↗</h2><p>${description}</p></a>`).join('')}</div><div class="cms-note"><strong>Inhalte und Kollegen verwalten</strong><p>Directus am Server-Laptop öffnen: <a href="http://localhost:8055" target="_blank" rel="noopener">CMS öffnen</a>. Hier bearbeitet ihr Räume, Produkte und Abstimmungen. Benutzerkonten legt ein Administrator an.</p></div>`;
}
function editEntry(title, fields, row, endpoint, saved) {
  const dialog=document.createElement('dialog');
  dialog.className='entry-editor';
  dialog.innerHTML=`<form id="editEntryForm" class="form-panel"><h2>${esc(title)}</h2>${fields}<div class="view-header"><button type="submit" class="primary-button">Änderungen speichern</button><button type="button" class="ghost-button" id="cancelEdit">Abbrechen</button></div><p role="status"></p></form>`;
  document.body.append(dialog);
  const form=dialog.querySelector('form');
  for(const [name,value] of Object.entries(row)) {
    const input=form.elements.namedItem(name);
    if(input)input.value=value ?? '';
  }
  dialog.querySelector('#cancelEdit').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>dialog.remove());
  bindForm('editEntryForm',async b=>{
    await api(endpoint,{...b,id:row.id});
    dialog.close();
    await saved();
  });
  dialog.showModal();
}
function statsFields(editing=false) {
  return `${dateInput()}<label>Uhrzeit<input type="time" name="visit_time" value="${editing?'':new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'}).format(new Date())}"></label>${select('age_group','Altersgruppe',['unter 12','12–15','16–18','19–27','über 27','keine Angabe'])}${select('gender','Geschlecht',['weiblich','männlich','divers','keine Angabe'])}<label>Anzahl<input name="quantity" type="number" min="1" max="1000" value="1" required></label><label>Notiz (keine Namen oder vertraulichen Angaben)<textarea name="note" maxlength="1200" rows="2"></textarea></label>`;
}
async function entriesPage() {
  let rows=await api('/api/staff/entries');
  const rooms=await api('/api/staff/rooms');
  app.innerHTML=heading('Team · Räume','Raumliste','Die gespeicherten Eintragungen der Jugendlichen.')+filterControls()+`<div id="entries" class="entry-list"></div>`;
  const render=()=>{const filtered=filter(rows,'visit_date');document.querySelector('#entries').innerHTML=cards(filtered,r=>`<div class="view-header"><h3>${esc(r.room_name)}</h3><span>${esc(dateText(r.visit_date))} · ${esc(r.visit_time)}</span></div><strong>${esc(r.name)}</strong><p>Weitere Gäste: ${esc(r.guests||'–')}</p><button type="button" class="ghost-button" data-edit="${esc(r.id)}">Bearbeiten</button>`);
    for(const button of document.querySelectorAll('#entries [data-edit]'))button.onclick=()=>{
      const row=rows.find(r=>r.id===button.dataset.edit);
      editEntry('Raumeintragung bearbeiten',`${dateInput()}<label>Uhrzeit<input type="time" name="visit_time" required></label><label>Raum<select name="room"><option value="">${esc(row.room_name)} (bisheriger Raum)</option>${rooms.map(r=>`<option value="${esc(r.id)}">${esc(r.name)}${r.active?'':' (inaktiv)'}</option>`).join('')}</select></label><label>Name<input name="name" maxlength="120" required></label><label>Weitere Gäste<textarea name="guests" maxlength="1200" rows="3"></textarea></label>`,row,'/api/staff/entries',async()=>{rows=await api('/api/staff/entries');render();});
    }
  };
  for(const id of ['from','to'])document.querySelector('#'+id).onchange=render;
  document.querySelector('#refresh').onclick=safe(async()=>{rows=await api('/api/staff/entries');render();});
  document.querySelector('#export').onclick=()=>exportCsv('raumliste.csv',[['Datum','Uhrzeit','Raum','Name','Gäste'],...filter(rows,'visit_date').map(r=>[r.visit_date,r.visit_time,r.room_name,r.name,r.guests])]);render();
}
function summarizeStatistics(rows) {
  const groups = new Map();
  for (const row of rows) {
    const visit_date = row.visit_date.slice(0,10);
    const key = JSON.stringify([visit_date,row.age_group,row.gender]);
    if (!groups.has(key)) groups.set(key,{visit_date,age_group:row.age_group,gender:row.gender,quantity:0,notes:[],times:[],entries:[]});
    const group = groups.get(key);
    group.quantity += Number(row.quantity);
    group.entries.push(row);
    if(row.visit_time)group.times.push(row.visit_time);
    if (row.note) group.notes.push(row.note);
  }
  return [...groups.values()].map(({notes,...group})=>({...group,note:notes.join(' · '),visit_time:[...new Set(group.times)].sort().join(', ')}));
}
async function statsPage() {
  let rows=await api('/api/staff/statistics');
  app.innerHTML=heading('Team · Besucher','Besucherstatistik','Besuche zählen, nach Zeitraum filtern und als CSV mitnehmen.')+`<form id="statsForm" class="panel form-panel stats-entry">${statsFields()}<button type="submit" class="primary-button">Besuche erfassen</button><p role="status"></p></form>`+filterControls()+`<div id="statsSummary" class="summary-grid"></div><h2>Besuche nach Tag, Alter und Geschlecht</h2><p>Mit den Pfeilen passt du die Anzahl direkt an. Änderungen werden sofort gespeichert.</p><div id="statsRows"></div>`;
  let adjusting=false;
  const render=()=>{
    const groups=summarizeStatistics(filter(rows,'visit_date'));
    const sum=groups.reduce((n,r)=>n+r.quantity,0);
    document.querySelector('#statsSummary').innerHTML=`<div class="panel metric"><strong>${sum}</strong><span>Erfasste Besuche</span></div><div class="panel metric"><strong>${new Set(groups.map(r=>r.visit_date)).size}</strong><span>Tage mit Einträgen</span></div>`;
    document.querySelector('#statsRows').innerHTML=groups.length?`<div class="table-scroll"><table class="stats-table"><thead><tr>${['Datum','Uhrzeit','Alter','Geschlecht','Anzahl','Notiz'].map(label=>`<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${groups.map((r,i)=>`<tr>${[dateText(r.visit_date),r.visit_time||'–',r.age_group,r.gender].map(value=>`<td>${esc(value)}</td>`).join('')}<td><div class="quantity-controls"><strong>${r.quantity}</strong><div><button type="button" class="ghost-button" data-group="${i}" data-delta="1" aria-label="Anzahl erhöhen" ${r.entries.some(e=>e.quantity<1000)?'':'disabled'}>▲</button><button type="button" class="ghost-button" data-group="${i}" data-delta="-1" aria-label="Anzahl verringern" ${r.quantity>0?'':'disabled'}>▼</button></div></div></td><td>${esc(r.note||'–')}</td></tr>`).join('')}</tbody></table></div>`:empty('Für diesen Zeitraum sind keine Besuche erfasst.');
    for(const button of document.querySelectorAll('#statsRows [data-delta]'))button.onclick=async()=>{
      if(adjusting)return;
      const delta=Number(button.dataset.delta),group=groups[Number(button.dataset.group)];
      const entry=group.entries.find(r=>delta>0?r.quantity<1000:r.quantity>0);
      if(!entry)return;
      adjusting=true;
      document.querySelectorAll('#statsRows button').forEach(b=>{b.disabled=true;});
      const status=document.querySelector('#viewStatus');status.textContent='Anzahl wird gespeichert …';
      try {
        const result=await api('/api/staff/statistics/quantity',{id:entry.id,delta});
        rows=rows.map(r=>r.id===result.id?{...r,quantity:result.quantity}:r);
        status.textContent='Anzahl gespeichert.';
      } catch(e) {status.textContent=e.message;}
      finally {adjusting=false;render();}
    };
  };
  bindForm('statsForm',async(b,f)=>{await api('/api/staff/statistics',b);rows=await api('/api/staff/statistics');render();f.querySelector('[role=status]').textContent='Besuche gespeichert.';});
  for(const id of ['from','to'])document.querySelector('#'+id).onchange=render;
  document.querySelector('#refresh').onclick=safe(async()=>{rows=await api('/api/staff/statistics');render();});
  document.querySelector('#export').onclick=()=>exportCsv('besucherstatistik.csv',[['Datum','Uhrzeit','Alter','Geschlecht','Anzahl','Notiz'],...summarizeStatistics(filter(rows,'visit_date')).map(r=>[r.visit_date,r.visit_time||'',r.age_group,r.gender,r.quantity,r.note])]);render();
}
function salesSummary(rows) {
  return rows.reduce((totals,r)=>{
    const amount=r.quantity*r.price_cents;
    totals.cash+=amount;
    if(r.kind==='deposit')totals.deposit+=amount;
    else if(r.kind==='deposit_return')totals.returns-=amount;
    else {totals.revenue+=amount;totals.count+=r.quantity;}
    return totals;
  },{cash:0,revenue:0,deposit:0,returns:0,count:0});
}
const saleKind = r => r.kind==='deposit'?'Pfand':r.kind==='deposit_return'?'Pfandrückgabe':'Verkauf';
async function salesPage() {
  let products=await api('/api/staff/products'),rows=await api('/api/staff/sales');
  app.innerHTML=heading('Team · Theke','Verkauf & Pfand','Pfand wird beim Verkauf zusätzlich gebucht. Rückgaben ziehen den ausgezahlten Betrag von der Kasse ab.')+`<div id="productCards" class="dashboard-grid"></div><form id="depositReturn" class="panel form-panel stats-entry"><h2>Pfand zurückzahlen</h2><label>Pfand pro Stück (€)<input name="amount" type="number" min="0.01" max="1000" step="0.01" value="0.25" required></label><label>Anzahl zurückgegebener Behälter<input name="quantity" type="number" min="1" max="1000" value="1" required></label><button type="submit" class="primary-button">Pfandrückgabe buchen</button><p role="status"></p></form>`+filterControls()+`<div id="salesSummary" class="summary-grid"></div><div id="salesRows"></div>`;
  const render=()=>{
    const f=filter(rows,'created_at'),sum=salesSummary(f);
    document.querySelector('#salesSummary').innerHTML=[['Kassenbewegung',money(sum.cash)],['Warenumsatz',money(sum.revenue)],['Pfand eingenommen',money(sum.deposit)],['Pfand zurückgezahlt',money(sum.returns)],['Pfand verbleibend im Zeitraum',money(sum.deposit-sum.returns)],['Verkaufte Artikel',sum.count]].map(([label,value])=>`<div class="panel metric"><strong>${value}</strong><span>${label}</span></div>`).join('');
    document.querySelector('#salesRows').innerHTML=f.length?table(['Zeitpunkt','Position','Art','Menge','Einzelbetrag','Summe'],f.map(r=>[new Date(r.created_at).toLocaleString('de-DE'),r.product_name,saleKind(r),r.quantity,money(r.price_cents),money(r.quantity*r.price_cents)])):empty('Noch keine Buchungen in diesem Zeitraum.');
  };
  const renderProducts=()=>{
    document.querySelector('#productCards').innerHTML=products.map(p=>`<form class="panel form-panel product" data-product="${esc(p.id)}"><h2>${esc(p.name)}</h2><strong>${money(p.price_cents)}</strong><p>${p.has_deposit?`+ ${money(p.deposit_cents)} Pfand pro Stück · zusammen ${money(p.price_cents+p.deposit_cents)}`:'Ohne Pfand'}</p><button type="button" class="ghost-button" data-deposit="${esc(p.id)}">Pfand einstellen</button><label>Menge<input name="quantity" type="number" min="1" max="1000" value="1" required></label><button type="submit" class="primary-button">Verkauf buchen</button><p role="status"></p></form>`).join('')||empty('Keine aktiven Produkte. Bitte in Directus anlegen.');
    for(const form of document.querySelectorAll('.product')) {
      let requestKey=null;
      form.onsubmit=async event=>{
        event.preventDefault();const button=form.querySelector('button[type=submit]'),status=form.querySelector('[role=status]');
        if(button.disabled)return;
        button.disabled=true;requestKey ||= uid();
        try {await api('/api/staff/sales',{product:form.dataset.product,quantity:form.elements.quantity.value,request_key:requestKey});requestKey=null;status.textContent='Verkauf gebucht.';rows=await api('/api/staff/sales');render();}
        catch(e){status.textContent=e.message;}finally{button.disabled=false;}
      };
    }
    for(const button of document.querySelectorAll('[data-deposit]'))button.onclick=()=>{
      const p=products.find(p=>p.id===button.dataset.deposit),dialog=document.createElement('dialog');dialog.className='entry-editor';
      dialog.innerHTML=`<form id="depositSettings" class="form-panel"><h2>Pfand für ${esc(p.name)}</h2><label class="deposit-checkbox"><input name="has_deposit" type="checkbox" ${p.has_deposit?'checked':''}>Produkt mit Pfand</label><label>Pfand pro Stück (€)<input name="amount" type="number" min="0.01" max="1000" step="0.01" value="${(p.deposit_cents||25)/100}" required></label><p>Der Produktpreis enthält kein Pfand. Bei jedem Verkauf wird Pfand als eigene Position hinzugefügt.</p><button type="submit" class="primary-button">Speichern</button><button id="cancelDeposit" type="button" class="ghost-button">Abbrechen</button><p role="status"></p></form>`;
      document.body.append(dialog);dialog.querySelector('#cancelDeposit').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());
      bindForm('depositSettings',async(b,form)=>{await api('/api/staff/products',{id:p.id,has_deposit:form.elements.has_deposit.checked,deposit_cents:Math.round(Number(b.amount)*100)});products=await api('/api/staff/products');renderProducts();dialog.close();});dialog.showModal();
    };
  };
  let returnKey=null;
  bindForm('depositReturn',async(b,form)=>{
    returnKey ||= uid();
    await api('/api/staff/deposit-returns',{quantity:b.quantity,deposit_cents:Math.round(Number(b.amount)*100),request_key:returnKey});returnKey=null;
    form.querySelector('[role=status]').textContent=`${money(Math.round(Number(b.amount)*100)*Number(b.quantity))} Pfandrückgabe gebucht.`;
    rows=await api('/api/staff/sales');render();
  });
  for(const id of ['from','to'])document.querySelector('#'+id).onchange=render;
  document.querySelector('#refresh').onclick=safe(async()=>{products=await api('/api/staff/products');rows=await api('/api/staff/sales');renderProducts();render();});
  document.querySelector('#export').onclick=()=>exportCsv('thekenverkauf.csv',[['Zeitpunkt','Position','Art','Menge','Einzelbetrag in Cent','Summe in Cent'],...filter(rows,'created_at').map(r=>[r.created_at,r.product_name,saleKind(r),r.quantity,r.price_cents,r.quantity*r.price_cents])]);renderProducts();render();
}
async function votePage() {
  const polls=await api('/api/polls');
  app.innerHTML=heading('Deine Stimme zählt','Nächste Woche an der Theke','Was wünschst du dir? Die Datenschutzhinweise findest du unten. Frage das Team direkt vor dem Absenden nach dem aktuellen Mitarbeitercode.')+polls.map((p,i)=>`<form id="poll${i}" class="panel form-panel poll"><p class="eyebrow">${p.week_of?'Woche ab '+esc(dateText(p.week_of)):'Nächste Woche'}</p><h2>${esc(p.title)}</h2><p>${esc(p.description)}</p>${p.options.map(o=>`<label class="vote-option"><input type="radio" name="option" value="${esc(o.id)}" required><span><strong>${esc(o.name)}</strong><span class="option-description">${esc(o.description)}</span></span></label>`).join('')}<label>Mitarbeitercode<input name="code" type="text" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="off" placeholder="6-stelliger Code" required></label><p>Der Code gilt zehn Sekunden und nur für eine Stimme.</p><button type="submit" class="primary-button" ${p.options.length?'':'disabled'}>Meine Stimme abgeben</button><p role="status">${p.options.length?'':'Noch keine Angebote verfügbar.'}</p></form>`).join('');
  if(!polls.length) app.innerHTML+=empty('Momentan läuft keine Abstimmung. Schau später wieder vorbei.');
  polls.forEach((p,i)=>{
    const form=document.querySelector('#poll'+i);
    let submitting=false;
    bindForm('poll'+i,async b=>{
      if(submitting)return;
      submitting=true;
      try{
        await api('/api/vote',{poll:p.id,option:b.option,code:b.code});
        form.elements.code.value='';
        form.querySelector('[role=status]').textContent='Danke! Deine Stimme ist gespeichert.';
      }finally{submitting=false;}
    });
  });
}
window.addEventListener('pageshow', event=>{
  if(event.persisted && route==='/abstimmung')votePage().catch(e=>{app.innerHTML=empty(e.message);});
});
async function pollTeamPage() {
  const polls=await api('/api/staff/polls');
  app.innerHTML=heading('Team · Wünsche','Abstimmung & Ergebnisse','Titel, Zeitraum, Angebote und die nächste Woche werden in Directus gepflegt.')+`<div class="cms-note"><p>Sammlung <strong>polls</strong>: Abstimmung anlegen und „active“ aktivieren. „starts_at“ und „ends_at“ sind optional. Sammlung <strong>poll_options</strong>: Angebote anlegen und unter „poll“ die Abstimmung auswählen.</p><p><a href="/abstimmung">Öffentliche Abstimmung öffnen ↗</a></p></div>`+cards(polls,p=>`<div class="view-header"><h2>${esc(p.title)}</h2><span class="badge">${p.active?'Aktiv':'Inaktiv'}</span></div><p>Woche ab ${esc(dateText(p.week_of))} · ${p.total} Stimmen insgesamt</p><div class="vote-code" data-code-poll="${esc(p.id)}"><span>Mitarbeitercode</span><strong>–</strong><small>Wird geladen …</small></div>${p.options.map(o=>`<div class="result-row"><span>${esc(o.name)}${o.active?'':' (inaktiv)'}</span><meter min="0" max="${Math.max(p.total,1)}" value="${o.count}"></meter><strong>${o.count}</strong></div>`).join('')}`,'Noch keine Abstimmungen angelegt.');
  let refreshRunning=false;
  const refreshCodes=async()=>{
    if(refreshRunning)return;
    refreshRunning=true;
    try {
      const codes=await api('/api/staff/vote-codes');
      const received=Date.now();
      for(const panel of document.querySelectorAll('[data-code-poll]')) {
        const entry=codes.find(c=>c.poll===panel.dataset.codePoll);
        panel.dataset.deadline=entry ? received+entry.remaining_ms : '';
        panel.querySelector('strong').textContent=entry?.code || '–';
        panel.querySelector('small').textContent=entry?'':'Abstimmung geschlossen';
      }
    } catch(e) {
      for(const panel of document.querySelectorAll('[data-code-poll]')) {
        panel.dataset.deadline='';
        panel.querySelector('strong').textContent='–';
        panel.querySelector('small').textContent=e.message;
      }
    } finally {refreshRunning=false;}
  };
  const tick=()=>{
    for(const panel of document.querySelectorAll('[data-code-poll]')) {
      if(!panel.dataset.deadline)continue;
      const remaining=Math.max(0,Math.ceil((Number(panel.dataset.deadline)-Date.now())/1000));
      panel.querySelector('small').textContent=remaining?`Noch ${remaining} Sekunden · nur einmal verwendbar`:'Neuer Code wird geladen …';
      if(!remaining)panel.querySelector('strong').textContent='–';
    }
  };
  await refreshCodes();tick();
  const refreshTimer=setInterval(refreshCodes,1000),countdownTimer=setInterval(tick,200);
  window.addEventListener('pagehide',()=>{clearInterval(refreshTimer);clearInterval(countdownTimer);});
  window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
}
async function qrPage() {
  const data=await api('/api/staff/links');
  app.innerHTML=heading('Im selben WLAN','Scannen. Eintragen. Mitmachen.','Jugendliche verbinden sich mit dem Haus-WLAN und scannen den passenden Code.')+`<div class="cms-note no-print"><p>Wähle die Adresse des WLAN-Adapters. Für dauerhafte Ausdrucke empfiehlt sich eine feste Laptop-IP im Router. Bei mehreren Adressen kannst du PUBLIC_URL in .env.local setzen.</p><p>Auch im gleichen WLAN muss der Router Verbindungen zwischen Geräten erlauben. Der Laptop muss eingeschaltet bleiben.</p><button id="print" class="primary-button">QR-Codes drucken</button></div><div class="qr-grid">${data.links.map(l=>`<article class="panel qr-card"><h2>${esc(l.label)}</h2><img src="${l.qr}" alt="QR-Code für ${esc(l.label)}" width="320" height="320"><a href="${esc(l.url)}">${esc(l.url)}</a><p>Mit dem Haus-WLAN verbinden und scannen.</p></article>`).join('')||empty('Keine Netzwerkadresse gefunden. WLAN verbinden oder PUBLIC_URL in .env.local setzen.')}</div>`;
  document.querySelector('#print').onclick=()=>window.print();
}
async function privacyPage() {
  try {
    const page=await api('/api/datenschutz');
    app.innerHTML=heading('Deine Daten',page.title||'Datenschutz')+(page.status==='published'?'':`<p class="cms-note" role="status">Entwurf: Der Träger muss die fehlenden Angaben ergänzen und die Hinweise freigeben. Bei Fragen wende dich an das Team.</p>`)+`<article class="panel privacy-content">${esc(page.content)}</article>`;
  } catch {
    app.innerHTML=heading('Deine Daten','Datenschutz','Die Datenschutzhinweise sind gerade nicht erreichbar. Bitte frage das Team vor Ort, bevor du personenbezogene Angaben einträgst.');
  }
}
async function init() {
  if(route==='/datenschutz'){await privacyPage();return;}
  const {user}=await api('/api/me');
  if(user){document.querySelector('#nav').innerHTML=[['/','Eintragen'],['/team','Team'],['/raumliste','Raumliste'],['/statistik','Statistik'],['/theke','Theke'],['/abstimmung-team','Abstimmung'],['/qr','QR-Codes']].map(([href,label])=>`<a href="${href}" ${route===href?'aria-current="page"':''}>${label}</a>`).join('')+'<button id="logout" class="ghost-button">Abmelden</button>';document.querySelector('#logout').onclick=async()=>{try{await api('/api/logout',{});location.assign('/');}catch(e){app.innerHTML=empty(e.message);}};}
  const routes={'/':roomPage,'/login':()=>loginPage(user),'/team':()=>teamPage(user),'/raumliste':entriesPage,'/statistik':statsPage,'/theke':salesPage,'/abstimmung':votePage,'/abstimmung-team':pollTeamPage,'/qr':qrPage};
  if(!user&&!['/','/login','/abstimmung'].includes(route)){location.assign('/login');return;}
  await routes[route]?.();
}
init().catch(e=>{app.innerHTML=heading('Juze','Gerade nicht erreichbar',e.message)+`<a class="primary-button" href="${esc(route)}">Erneut versuchen</a>`;});
