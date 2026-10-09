import { privacyTemplate } from './privacy-template.mjs';
import { directus } from './directus.mjs';
let token = process.env.DIRECTUS_ADMIN_TOKEN;
if (!token || !process.env.PUBLIC_SERVICE_TOKEN) throw new Error('Bitte ./start.sh verwenden.');
const api = (url, method = 'GET', body) => directus(url, { token, method, body });
let ready = false;
for (let i = 0; i < 90; i++) {
  try {
    try { await api('/users/me'); } catch {
      const auth = await directus('/auth/login', { method: 'POST', body: { email: process.env.DIRECTUS_ADMIN_EMAIL, password: process.env.DIRECTUS_ADMIN_PASSWORD, mode: 'json' } });
      token = auth.access_token;
      const user = await api('/users/me');
      await api(`/users/${user.id}`, 'PATCH', { token: process.env.DIRECTUS_ADMIN_TOKEN });
      token = process.env.DIRECTUS_ADMIN_TOKEN;
      await directus('/auth/logout', { method: 'POST', body: { refresh_token: auth.refresh_token } });
    }
    ready = true; break;
  } catch { if (i % 10 === 0) console.log('Warte auf Directus …'); await new Promise(r => setTimeout(r, 2000)); }
}
if (!ready) throw new Error('Directus startet nicht oder ADMIN_TOKEN passt nicht. Container-Logs prüfen.');
const field = (name, type = 'string', extra = {}) => ({ field: name, type, meta: { interface: type === 'boolean' ? 'boolean' : type === 'text' ? 'input-multiline' : type === 'date' ? 'datetime' : 'input' }, schema: { ...extra } });
const id = { field: 'id', type: 'uuid', meta: { hidden: true, special: ['uuid'], interface: 'input' }, schema: { is_primary_key: true } };
const created = { field: 'created_at', type: 'timestamp', meta: { special: ['date-created'], readonly: true, interface: 'datetime' }, schema: {} };
const schemas = {
  privacy_pages: [field('slug','string',{is_unique:true}),field('title'),field('content','text'),field('status','string',{default_value:'draft'}),{field:'updated_at',type:'timestamp',meta:{special:['date-updated'],readonly:true},schema:{}}],
  rooms: [field('name', 'string', { is_nullable: false }), field('active', 'boolean', { default_value: true })],
  room_entries: [field('visit_date', 'date'), field('visit_time'), field('room', 'uuid'), field('room_name'), field('name'), field('guests', 'text')],
  visitor_statistics: [field('visit_date', 'date'), field('visit_time'), field('age_group'), field('gender'), field('quantity', 'integer'), field('note', 'text')],
  products: [field('name'), field('price_cents', 'integer'), field('has_deposit', 'boolean', { default_value: false }), field('deposit_cents', 'integer', { default_value: 25 }), field('active', 'boolean', { default_value: true })],
  sales: [field('kind', 'string', { default_value: 'sale' }), field('product', 'uuid'), field('product_name'), field('price_cents', 'integer'), field('quantity', 'integer'), field('staff', 'uuid'), field('request_key', 'string', { is_unique: true })],
  polls: [field('title'), field('description', 'text'), field('starts_at', 'timestamp'), field('ends_at', 'timestamp'), field('week_of', 'date'), field('active', 'boolean', { default_value: false })],
  poll_options: [field('poll', 'uuid'), field('name'), field('description', 'text'), field('active', 'boolean', { default_value: true })],
  votes: [field('poll', 'uuid'), field('option', 'uuid'), field('voter_key', 'string', { is_unique: true }), field('network_key', 'string', { is_unique: true, is_nullable: true })]
};
const existing = new Set((await api('/collections')).map(c => c.collection));
for (const [collection, fields] of Object.entries(schemas)) {
  if (!existing.has(collection)) await api('/collections', 'POST', { collection, meta: { icon: 'folder', note: 'Juze · lokal' }, schema: {}, fields: [id, ...fields, created] });
  const present = new Set((await api(`/fields/${collection}`)).map(f => f.field));
  for (const f of [id, ...fields, created]) if (!present.has(f.field)) await api(`/fields/${collection}`, 'POST', f);
}
await api('/fields/privacy_pages/status','PATCH',{meta:{interface:'select-dropdown',options:{choices:[{text:'Entwurf',value:'draft'},{text:'Veröffentlicht',value:'published'}]}}});
await api('/fields/privacy_pages/content','PATCH',{meta:{note:'Klartext mit Absätzen. Platzhalter ergänzen und erst nach Freigabe veröffentlichen.'}});
await api('/fields/products/has_deposit','PATCH',{meta:{interface:'boolean',options:{label:'Produkt mit Pfand'}}});
await api('/fields/products/deposit_cents','PATCH',{meta:{note:'Pfand pro Stück in Cent, zusätzlich zum Produktpreis.'}});
// Directus zeigt verknüpfte Angebote als Auswahl statt als manuelle UUID-Eingabe.
const relations = await api('/relations');
for (const [collection, fieldName, related] of [['poll_options','poll','polls'],['votes','poll','polls'],['votes','option','poll_options'],['room_entries','room','rooms'],['sales','product','products']]) {
  if (!relations.some(r => r.collection === collection && r.field === fieldName)) await api('/relations','POST',{ collection, field: fieldName, related_collection: related, schema: { on_delete: 'SET NULL' } });
  await api(`/fields/${collection}/${fieldName}`,'PATCH',{ meta: { interface: 'select-dropdown-m2o', special: ['m2o'], options: { template: related === 'polls' ? '{{title}}' : '{{name}}' } } });
}
async function policy(name, appAccess) {
  let p = (await api(`/policies?filter[name][_eq]=${encodeURIComponent(name)}`))[0];
  if (!p) p = await api('/policies', 'POST', { name, admin_access: false, app_access: appAccess });
  return p.id;
}
async function permission(policyId, collection, action, fields = ['*'], filter = {}) {
  const found = await api(`/permissions?filter[policy][_eq]=${policyId}&filter[collection][_eq]=${collection}&filter[action][_eq]=${action}`);
  if (!found.length) await api('/permissions', 'POST', { policy: policyId, collection, action, fields, permissions: filter });
  else if (collection === 'votes' && action === 'read' && !fields.every(f => found[0].fields.includes(f))) await api(`/permissions/${found[0].id}`, 'PATCH', { fields });
}
const staffPolicy = await policy('Juze Team', true);
for (const c of Object.keys(schemas)) {
  await permission(staffPolicy, c, 'read', c === 'votes' ? ['id', 'poll', 'option', 'created_at'] : ['*']);
  if (!['votes','privacy_pages'].includes(c)) for (const a of ['create', 'update', 'delete']) await permission(staffPolicy, c, a);
}
let role = (await api('/roles?filter[name][_eq]=Juze%20Team'))[0];
if (!role) role = await api('/roles', 'POST', { name: 'Juze Team', description: 'Kollegen: Raumliste, Statistik, Verkauf und Abstimmungen' });
const access = await api(`/access?filter[role][_eq]=${role.id}&filter[policy][_eq]=${staffPolicy}`);
if (!access.length) await api('/access', 'POST', { role: role.id, policy: staffPolicy });
if (!(await api('/items/privacy_pages?filter[slug][_eq]=datenschutz&limit=1')).length) await api('/items/privacy_pages','POST',{slug:'datenschutz',title:'Datenschutz',content:privacyTemplate,status:'draft'});
const publicPolicy = await policy('Juze Formular-Service', false);
for (const c of ['rooms', 'polls', 'poll_options']) await permission(publicPolicy, c, 'read', ['*'], { active: { _eq: true } });
await permission(publicPolicy,'privacy_pages','read',['slug','title','content','status','updated_at'],{slug:{_eq:'datenschutz'}});
for (const c of ['room_entries', 'votes']) await permission(publicPolicy, c, 'create');
// Der App-Server liest gehashte Kennungen für den eigenen Browserstatus.
await permission(publicPolicy, 'votes', 'read', ['voter_key', 'network_key']);
let service = (await api('/users?filter[email][_eq]=formular%40example.org'))[0];
if (!service) service = await api('/users', 'POST', { email: 'formular@example.org', first_name: 'Formular-Service', token: process.env.PUBLIC_SERVICE_TOKEN, status: 'active' });
else await api(`/users/${service.id}`, 'PATCH', { token: process.env.PUBLIC_SERVICE_TOKEN });
if (!(await api(`/access?filter[user][_eq]=${service.id}&filter[policy][_eq]=${publicPolicy}`)).length) await api('/access', 'POST', { user: service.id, policy: publicPolicy });
// Beispieldaten nur beim ersten Einrichten; gelöschte CMS-Inhalte bleiben gelöscht.
if (!existing.has('rooms')) for (const name of ['Gaming', 'Chill', 'Mädchenraum', 'Tonstudio', 'Fitnessraum', 'Küche']) await api('/items/rooms', 'POST', { name, active: true });
if (!existing.has('products')) for (const [name, price_cents] of [['Wasser',100],['Snack',200],['Kaffee',150]]) await api('/items/products', 'POST', { name, price_cents, active: true });
if (!existing.has('polls')) {
  const nextMonday = new Date(); nextMonday.setDate(nextMonday.getDate() + ((8 - nextMonday.getDay()) % 7 || 7));
  const poll = await api('/items/polls', 'POST', { title: 'Was wünscht ihr euch nächste Woche?', description: 'Wähle dein Lieblingsangebot für die Theke. Eine Stimme pro Gerät.', week_of: nextMonday.toISOString().slice(0,10), active: true });
  for (const name of ['Pizza-Toast', 'Obstbecher', 'Waffeln']) await api('/items/poll_options', 'POST', { poll: poll.id, name, active: true });
}
console.log('Directus eingerichtet. Kollegen unter Benutzerverwaltung mit Rolle „Juze Team“ anlegen.');
