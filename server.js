import { randomBytes, randomInt } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { directus } from './scripts/directus.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const sessions = new Map();
const limits = new Map();
const publicToken = process.env.PUBLIC_SERVICE_TOKEN;
const protectedPages = new Set(['/team', '/raumliste', '/statistik', '/theke', '/abstimmung-team', '/qr']);
const pages = new Set(['/', '/login', '/abstimmung', '/datenschutz', ...protectedPages]);
const assets = new Set(['/app.js', '/styles.css', '/manifest.json']);
// Nur vorhandene Browsermodule in den öffentlichen Modulordnern ausliefern.
for (const directory of ['lib', 'pages']) {
  for (const entry of readdirSync(path.join(root, 'public', directory), { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.js')) assets.add(`/${directory}/${entry.name}`);
  }
}
function fail(status, message) { throw Object.assign(new Error(message), { status }); }
function text(value, max = 120) { return String(value ?? '').trim().slice(0, max); }
function integer(value, min, max) { const n = Number(value); if (!Number.isInteger(n) || n < min || n > max) fail(400, 'Bitte eine gültige Anzahl eingeben.'); return n; }
function date(value) { const d = text(value, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d)) || new Date(`${d}T12:00:00Z`).toISOString().slice(0,10) !== d) fail(400, 'Bitte ein gültiges Datum eingeben.'); return d; }
function uuid(value) { if (typeof value !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)) fail(400, 'Ungültige Auswahl.'); return value; }
function cookies(req) { return Object.fromEntries((req.headers.cookie || '').split(';').map(p => p.trim().split('='))); }
function cookie(res, name, value, maxAge) { res.setHeader('Set-Cookie', `${name}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${process.env.APP_SECURE_COOKIES === 'true' ? '; Secure' : ''}`); }
async function body(req) {
  let raw = ''; for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 16384) fail(413, 'Eingabe zu groß.'); }
  let parsed;
  try { parsed = JSON.parse(raw || '{}'); } catch { fail(400, 'Ungültige Eingabe.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) fail(400,'Bitte ein gültiges Formular senden.');
  return parsed;
}
function json(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); }
function rate(req, category, maximum) {
  const key = `${req.clientAddress || req.socket.remoteAddress}:${category}`; const now = Date.now();
  let r = limits.get(key); if (!r || now > r.until) { r = { count: 0, until: now + 60000 }; limits.set(key, r); }
  if (++r.count > maximum) fail(429, 'Zu viele Anfragen. Bitte in einer Minute erneut versuchen.');
}
setInterval(() => { const now = Date.now(); for (const [k,v] of limits) if (now > v.until) limits.delete(k); for (const [k,v] of sessions) if (now > v.until) sessions.delete(k); },60000).unref();
async function session(req) {
  const id = cookies(req).juze_session; const s = sessions.get(id);
  if (!s || Date.now() > s.until) { sessions.delete(id); return null; }
  if (Date.now() > s.expires - 30000) {
    s.refreshing ??= directus('/auth/refresh', { method: 'POST', body: { refresh_token: s.refresh, mode: 'json' } }).then(d => { s.token = d.access_token; s.refresh = d.refresh_token; s.expires = Date.now() + d.expires; }).finally(() => { s.refreshing = null; });
    try { await s.refreshing; } catch { sessions.delete(id); return null; }
  }
  try {
    const current = await directus('/users/me?fields=id,first_name,email,role,status', { token: s.token });
    if (current.role !== s.role || current.status !== 'active') { sessions.delete(id); return null; }
    s.user = {id:current.id,first_name:current.first_name,email:current.email};
    await directus('/items/visitor_statistics?limit=1&fields=id',{token:s.token});
  } catch (e) { if ([401,403].includes(e.status)) { sessions.delete(id); return null; } throw e; }
  return s;
}
export function publicUrls(publicUrl = process.env.PUBLIC_URL) {
  let parsed;
  try { parsed = new URL(publicUrl); } catch { fail(503, 'PUBLIC_URL muss eine gültige HTTPS-Adresse sein.'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash)
    fail(503, 'PUBLIC_URL muss eine HTTPS-Adresse ohne Pfad oder Zugangsdaten sein.');
  return [parsed.origin];
}
export function trustedHost(hostHeader) {
  let requested;
  try {
    const parsed = new URL(`http://${hostHeader}`);
    if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) return false;
    requested = parsed.hostname;
  } catch { return false; }
  const hosts = new Set(['localhost','127.0.0.1','[::1]',...(process.env.PUBLIC_URL ? publicUrls().map(url=>new URL(url).hostname) : [])]);
  return hosts.has(requested);
}
async function activePolls() {
  const polls = await directus('/items/polls?filter[active][_eq]=true&sort=-created_at&limit=-1', { token: publicToken });
  const now = Date.now(); return polls.filter(p => (!p.starts_at || Date.parse(p.starts_at) <= now) && (!p.ends_at || Date.parse(p.ends_at) > now));
}
// Codes existieren nur im laufenden App-Prozess und werden atomar verbraucht.
export function createVoteCodes(now = Date.now) {
  const codes = new Map();
  return {
    current(poll) {
      const time = now();
      let entry = codes.get(poll);
      if (!entry || entry.used || time >= entry.expires_at) {
        let code;
        do { code = String(randomInt(100000, 1000000)); } while (code === entry?.code);
        entry = { code, expires_at: time + 10000 };
        codes.set(poll, entry);
      }
      return { ...entry, remaining_ms: entry.expires_at - time };
    },
    consume(poll, code) {
      const entry = codes.get(poll);
      if (!entry || entry.used || now() >= entry.expires_at || typeof code !== 'string' || code !== entry.code) {
        fail(403, 'Der Mitarbeitercode ist ungültig, abgelaufen oder bereits verwendet. Bitte frage das Team nach dem aktuellen Code.');
      }
      entry.used = true;
    },
    retain(polls) { for (const id of codes.keys()) if (!polls.has(id)) codes.delete(id); }
  };
}
export function createApp({ clientAddress = req => req.socket.remoteAddress, acceptHost = trustedHost } = {}) {
  const voteCodes = createVoteCodes();
  const statisticUpdates = new Map();
  return createServer({requestTimeout:30000,headersTimeout:10000,maxHeaderSize:16384},async (req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    try {
      req.clientAddress = clientAddress(req);
      if (!acceptHost(req.headers.host)) fail(403,'Diese Serveradresse ist nicht freigegeben.');
      const url = new URL(req.url, 'http://local'); const p = url.pathname;
      if (!['GET', 'POST'].includes(req.method)) fail(405, 'Methode nicht erlaubt.');
      if (req.method === 'GET') rate(req,'read',240);
      if (req.method === 'POST') {
        if (!(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) fail(415,'Bitte JSON senden.');
        if (req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) fail(403, 'Anfrage muss von dieser App kommen.');
        rate(req, p === '/api/login' ? 'login' : 'write', p === '/api/login' ? 10 : 120);
      }
      if (p === '/api/datenschutz' && req.method === 'GET') {
        const entries = await directus('/items/privacy_pages?filter[slug][_eq]=datenschutz&fields=title,content,status,updated_at&limit=1',{token:publicToken});
        if (!entries.length) fail(503,'Die Datenschutzhinweise werden gerade eingerichtet. Bitte frage das Team vor Ort.');
        return json(res,200,entries[0]);
      }
      if (p === '/api/health') { await directus('/server/ping'); return json(res,200,{ok:true}); }
      if (p === '/api/login' && req.method === 'POST') {
        const b = await body(req);
        let auth;
        try { auth = await directus('/auth/login', { method: 'POST', body: { email: text(b.email,254), password: String(b.password || ''), ...(b.otp ? { otp: text(b.otp,10) } : {}), mode: 'json' } }); }
        catch (e) { if ([400,401,403].includes(e.status)) fail(401,'E-Mail, Passwort oder Einmalcode stimmen nicht.'); throw e; }
        // Nur Konten mit Teamzugriff erhalten eine App-Sitzung.
        try { await directus('/items/visitor_statistics?limit=1&fields=id', { token: auth.access_token }); }
        catch { await directus('/auth/logout', { method: 'POST', body: { refresh_token: auth.refresh_token } }).catch(() => {}); fail(403,'Dieses Konto benötigt die Rolle „JuZ.io Team“.'); }
        const account = await directus('/users/me?fields=id,first_name,email,role,status', { token: auth.access_token });
        const user = {id:account.id,first_name:account.first_name,email:account.email};
        const sid = randomBytes(32).toString('hex');
        sessions.delete(cookies(req).juze_session);
        sessions.set(sid, { token: auth.access_token, refresh: auth.refresh_token, expires: Date.now()+auth.expires, until: Date.now()+28800000, user, role:account.role });
        cookie(res,'juze_session',sid,28800); return json(res,200,{ok:true,user});
      }
      if (p === '/api/logout' && req.method === 'POST') {
        const sid = cookies(req).juze_session; const s = sessions.get(sid); sessions.delete(sid);
        if (s) await directus('/auth/logout', { method: 'POST', body: { refresh_token: s.refresh } }).catch(() => {});
        cookie(res,'juze_session','',0); return json(res,200,{ok:true});
      }
      if (p === '/api/me') { const s = await session(req); return json(res,200,{user:s?.user || null}); }
      if (p === '/api/rooms' && req.method === 'GET') return json(res,200,await directus('/items/rooms?filter[active][_eq]=true&fields=id,name&sort=name&limit=-1',{token:publicToken}));
      if (p === '/api/room-entries' && req.method === 'POST') {
        const b = await body(req); const room = await directus(`/items/rooms/${uuid(b.room)}?fields=id,name`,{token:publicToken});
        if (!text(b.name) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(text(b.visit_time))) fail(400,'Name und gültige Uhrzeit sind erforderlich.');
        await directus('/items/room_entries',{token:publicToken,method:'POST',body:{visit_date:date(b.visit_date),visit_time:text(b.visit_time,5),room:room.id,room_name:room.name,name:text(b.name),guests:text(b.guests,1200)}});
        return json(res,201,{ok:true});
      }
      if (p === '/api/polls' && req.method === 'GET') {
        const polls = await activePolls();
        const options = await directus('/items/poll_options?filter[active][_eq]=true&fields=id,poll,name,description&limit=-1',{token:publicToken});
        return json(res,200,polls.map(p => ({id:p.id,title:p.title,description:p.description,week_of:p.week_of,ends_at:p.ends_at,options:options.filter(o=>o.poll===p.id)})));
      }
      if (p === '/api/vote' && req.method === 'POST') {
        const b = await body(req), pollId = uuid(b.poll), optionId = uuid(b.option);
        const poll = (await activePolls()).find(p=>p.id===pollId);
        if (!poll) fail(400,'Diese Abstimmung ist nicht geöffnet.');
        const option = await directus(`/items/poll_options/${optionId}`,{token:publicToken});
        if (!option.active) fail(400,'Dieses Angebot ist nicht mehr verfügbar.');
        if (option.poll !== poll.id) fail(400,'Angebot gehört nicht zu dieser Abstimmung.');
        voteCodes.consume(poll.id,b.code);
        await directus('/items/votes',{token:publicToken,method:'POST',body:{poll:poll.id,option:option.id}});
        return json(res,201,{ok:true});
      }
      if (p.startsWith('/api/staff/') || protectedPages.has(p)) {
        const s = await session(req);
        if (!s) { if (!p.startsWith('/api/')) { res.writeHead(303,{Location:'/login'}); return res.end(); } fail(401,'Bitte anmelden.'); }
        const api = (endpoint,method='GET',data) => directus(endpoint,{token:s.token,method,body:data});
        if (p === '/api/staff/config' && req.method === 'GET') return json(res,200,{cmsUrl:publicUrls(process.env.DIRECTUS_PUBLIC_URL)[0]});
        if (p === '/api/staff/entries') {
          if (req.method === 'GET') return json(res,200,await api('/items/room_entries?sort=-created_at&limit=-1'));
          const b = await body(req);
          const id = uuid(b.id);
          const existing = await api(`/items/room_entries/${id}`);
          if (!text(b.name) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(text(b.visit_time))) fail(400,'Name und gültige Uhrzeit sind erforderlich.');
          const roomId = b.room || existing.room;
          let room_name = existing.room_name;
          if (roomId) room_name = (await api(`/items/rooms/${uuid(roomId)}?fields=id,name`)).name;
          await api(`/items/room_entries/${id}`,'PATCH',{visit_date:date(b.visit_date),visit_time:text(b.visit_time,5),room:roomId || null,room_name,name:text(b.name),guests:text(b.guests,1200)});
          return json(res,200,{ok:true});
        }
        if (p === '/api/staff/rooms' && req.method === 'GET') return json(res,200,await api('/items/rooms?fields=id,name,active&sort=name&limit=-1'));
        if (p === '/api/staff/statistics/quantity' && req.method === 'POST') {
          const b = await body(req), id = uuid(b.id);
          if (b.delta !== 1 && b.delta !== -1) fail(400,'Die Anzahl kann nur um eins geändert werden.');
          // Gleichzeitige Pfeilklicks verschiedener Teammitglieder nacheinander speichern.
          const previous = statisticUpdates.get(id) || Promise.resolve();
          const update = previous.catch(() => {}).then(async () => {
            const entry = await api(`/items/visitor_statistics/${id}`);
            const quantity = integer(Number(entry.quantity) + b.delta,0,1000);
            await api(`/items/visitor_statistics/${id}`,'PATCH',{quantity});
            return {id,quantity};
          });
          statisticUpdates.set(id,update);
          try { return json(res,200,await update); }
          finally { if (statisticUpdates.get(id) === update) statisticUpdates.delete(id); }
        }
        if (p === '/api/staff/statistics') {
          if (req.method === 'GET') return json(res,200,await api('/items/visitor_statistics?sort=-visit_date,-created_at&limit=-1'));
          const b = await body(req);
          if (!['unter 12','12–15','16–18','19–27','über 27','keine Angabe'].includes(b.age_group) || !['weiblich','männlich','divers','keine Angabe'].includes(b.gender)) fail(400,'Altersgruppe und Geschlecht auswählen.');
          const visit_time = text(b.visit_time,20);
          if (visit_time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(visit_time)) fail(400,'Bitte eine gültige Uhrzeit eingeben.');
          await api(b.id ? `/items/visitor_statistics/${uuid(b.id)}` : '/items/visitor_statistics',b.id ? 'PATCH' : 'POST',{visit_date:date(b.visit_date),...(b.visit_time !== undefined ? {visit_time:visit_time || null} : {}),age_group:b.age_group,gender:b.gender,quantity:integer(b.quantity,1,1000),note:text(b.note,1200)});
          return json(res,b.id ? 200 : 201,{ok:true});
        }
        if (p === '/api/staff/products') {
          if (req.method === 'GET') return json(res,200,await api('/items/products?filter[active][_eq]=true&sort=name&limit=-1'));
          const b = await body(req);
          if (typeof b.has_deposit !== 'boolean') fail(400,'Bitte die Pfandauswahl prüfen.');
          await api(`/items/products/${uuid(b.id)}`,'PATCH',{has_deposit:b.has_deposit,deposit_cents:integer(b.deposit_cents,1,100000)});
          return json(res,200,{ok:true});
        }
        if (p === '/api/staff/sales') {
          if (req.method === 'GET') return json(res,200,await api('/items/sales?sort=-created_at&limit=-1'));
          const b = await body(req), request_key = uuid(b.request_key);
          // Wiederholungen erzeugen keine zusätzlichen Waren- oder Pfandpositionen.
          const existing = await api(`/items/sales?filter[request_key][_eq]=${request_key}&limit=1`);
          if (existing.length) return json(res,201,{ok:true});
          const product = await api(`/items/products/${uuid(b.product)}`);
          if (!product.active || !Number.isInteger(product.price_cents) || product.price_cents < 0) fail(400,'Dieses Angebot ist nicht verkäuflich.');
          const quantity = integer(b.quantity,1,1000);
          const common = {product:product.id,quantity,staff:s.user.id};
          const positions = [{...common,kind:'sale',product_name:product.name,price_cents:product.price_cents,request_key}];
          if (product.has_deposit) positions.push({...common,kind:'deposit',product_name:`Pfand · ${product.name}`,price_cents:integer(product.deposit_cents,1,100000),request_key:`${request_key}:deposit`});
          // Directus speichert die Positionen in einer gemeinsamen Transaktion.
          try { await api('/items/sales','POST',positions); }
          catch(e) { if(e.code!=='RECORD_NOT_UNIQUE') throw e; }
          return json(res,201,{ok:true});
        }
        if (p === '/api/staff/deposit-returns' && req.method === 'POST') {
          const b = await body(req), request_key = uuid(b.request_key);
          const quantity = integer(b.quantity,1,1000), amount = integer(b.deposit_cents,1,100000);
          try { await api('/items/sales','POST',{kind:'deposit_return',product_name:'Pfandrückgabe',price_cents:-amount,quantity,staff:s.user.id,request_key}); }
          catch(e) { if(e.code!=='RECORD_NOT_UNIQUE') throw e; }
          return json(res,201,{ok:true});
        }
        if (p === '/api/staff/vote-codes' && req.method === 'GET') {
          const polls = await activePolls();
          voteCodes.retain(new Set(polls.map(poll => poll.id)));
          return json(res,200,polls.map(poll => ({poll:poll.id,...voteCodes.current(poll.id)})));
        }
        if (p === '/api/staff/polls') {
          const [polls,options,votes] = await Promise.all([api('/items/polls?sort=-created_at&limit=-1'),api('/items/poll_options?limit=-1'),api('/items/votes?fields=poll,option&limit=-1')]);
          return json(res,200,polls.map(p=>({...p,options:options.filter(o=>o.poll===p.id).map(o=>({...o,count:votes.filter(v=>v.poll===p.id&&v.option===o.id).length})),total:votes.filter(v=>v.poll===p.id).length})));
        }
        if (p === '/api/staff/links') {
          const bases = publicUrls(); return json(res,200,{bases,links:await Promise.all(bases.flatMap(base => ['/', '/abstimmung'].map(async route=>({label:route==='/'?'Raumeintragung':'Abstimmung',url:base+route,qr:await QRCode.toDataURL(base+route,{width:320,margin:2})}))))});
        }
      }
      // Alte Links bleiben nutzbar, alte Passwort- und Dateispeicher-APIs entfallen.
      if (p === '/team.html') { res.writeHead(303,{Location:'/team'}); return res.end(); }
      if (p === '/index.html') { res.writeHead(303,{Location:'/'}); return res.end(); }
      if (req.method === 'GET' && (pages.has(p) || assets.has(p))) {
        const file = pages.has(p) ? 'index.html' : p.slice(1);
        const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
        res.writeHead(200,{'Content-Type':mime[path.extname(file)]}); return res.end(await readFile(path.join(root,'public',file)));
      }
      fail(404,'Seite nicht gefunden.');
    } catch(e) { json(res,e.status || 500,{error:e.status ? e.message : 'Die Anfrage konnte nicht verarbeitet werden.'}); if (!e.status) console.error('Unerwarteter Serverfehler; keine Formulardaten protokolliert.'); }
  });
}
