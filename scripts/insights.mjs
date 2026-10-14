import { createHash } from 'node:crypto';

const idFor = key => {
  const h = createHash('sha256').update(`juze-insights-v1:${key}`).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
};
const recent = field => ({ [field]: { _gte: '$NOW(-30 days)', _lte: '$NOW' } });
const saleFilter = { _or: [{ kind: { _eq: 'sale' } }, { kind: { _null: true } }] };
const metric = (name, collection, field, fn, x, filter = {}) => ({
  name, type: 'metric', position_x: x, position_y: 0, width: 12, height: 8,
  options: { collection, field, function: fn, filter, numberStyle: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }
});
const bar = (name, collection, xAxis, yAxis, fn, x, y, extra = {}) => ({
  name, type: 'bar-chart', position_x: x, position_y: y, width: 18, height: 16,
  options: { collection, xAxis, yAxis, function: fn, decimals: 0, horizontal: true, showAxisLabels: 'both', showDataLabel: true, ...extra }
});
const series = (name, collection, dateField, valueField, fn, y, filter = {}) => ({
  name, type: 'time-series', position_x: 0, position_y: y, width: 36, height: 16,
  options: { collection, dateField, valueField, function: fn, precision: 'day', range: '3 months', filter,
    decimals: 0, min: 0, curveType: 'straight', fillType: 'gradient', missingData: 'null', showXAxis: true, showYAxis: true }
});

export const insightDashboards = [
  {
    key: 'visitors', name: 'Juze · Besucher', icon: 'groups', color: '#2196F3',
    note: 'Besuche, keine eindeutig identifizierten Personen. Mengen werden summiert. Kennzahlen und Balken: gesamter Bestand, außer ausdrücklich anders benannt.',
    panels: [
      metric('Erfasste Besuche · gesamt', 'visitor_statistics', 'quantity', 'sum', 0),
      metric('Besuche · letzte 30 Tage', 'visitor_statistics', 'quantity', 'sum', 12, recent('visit_date')),
      metric('Tage mit erfassten Besuchen', 'visitor_statistics', 'visit_date', 'countDistinct', 24, { quantity: { _gt: 0 } }),
      series('Besuche pro Tag · letzte 3 Monate', 'visitor_statistics', 'visit_date', 'quantity', 'sum', 8),
      bar('Besuche nach Altersgruppe · gesamt', 'visitor_statistics', 'age_group', 'quantity', 'sum', 0, 24),
      bar('Besuche nach Geschlechtsangabe · gesamt', 'visitor_statistics', 'gender', 'quantity', 'sum', 18, 24)
    ]
  },
  {
    key: 'rooms', name: 'Juze · Raumnutzung', icon: 'meeting_room', color: '#00A896',
    note: 'Gezählt werden Raumeintragungen, keine Personen, Gäste oder Nutzungsstunden. Keine Namen oder Gästelisten in den Diagrammen.',
    panels: [
      metric('Raumeintragungen · gesamt', 'room_entries', 'id', 'count', 0),
      metric('Eintragungen · letzte 30 Tage', 'room_entries', 'id', 'count', 12, recent('visit_date')),
      metric('Genutzte Räume · gesamt', 'room_entries', 'room_name', 'countDistinct', 24),
      series('Raumeintragungen pro Tag · letzte 3 Monate', 'room_entries', 'visit_date', 'id', 'count', 8),
      { ...bar('Raumeintragungen je Raum · gesamt', 'room_entries', 'room_name', 'id', 'count', 0, 24), width: 36 }
    ]
  },
  {
    key: 'counter', name: 'Juze · Theke', icon: 'point_of_sale', color: '#FF9800',
    note: 'Stückzahlen, keine Eurobeträge. Ware, ausgegebenes Pfand und Rückgaben werden getrennt gezählt. Geldbeträge und Kassenbewegung stehen in der Thekenübersicht der App.',
    panels: [
      metric('Verkaufte Artikel · gesamt', 'sales', 'quantity', 'sum', 0, saleFilter),
      metric('Pfand ausgegeben · Stück gesamt', 'sales', 'quantity', 'sum', 12, { kind: { _eq: 'deposit' } }),
      metric('Pfand zurückgenommen · Stück gesamt', 'sales', 'quantity', 'sum', 24, { kind: { _eq: 'deposit_return' } }),
      series('Verkaufte Artikel pro Tag · letzte 3 Monate', 'sales', 'created_at', 'quantity', 'sum', 8, saleFilter),
      { ...bar('Verkaufte Stück je Produkt · gesamt', 'sales', 'product_name', 'quantity', 'sum', 0, 24, { filter: saleFilter }), width: 36 }
    ]
  },
  {
    key: 'polls', name: 'Juze · Abstimmungen', icon: 'how_to_vote', color: '#9C27B0',
    note: 'Gezählt werden gespeicherte Stimmen, keine eindeutig identifizierten Personen. Die Angebotsgrafik zeigt Stimmen aus als aktiv markierten Abstimmungen; gleiche Angebotsnamen können zu verschiedenen Abstimmungen gehören.',
    panels: [
      metric('Abgegebene Stimmen · gesamt', 'votes', 'id', 'count', 0),
      metric('Stimmen · letzte 30 Tage', 'votes', 'id', 'count', 12, recent('created_at')),
      metric('Als aktiv markierte Abstimmungen', 'polls', 'id', 'count', 24, { active: { _eq: true } }),
      series('Stimmen pro Tag · letzte 3 Monate', 'votes', 'created_at', 'id', 'count', 8),
      bar('Stimmen je Abstimmung · gesamt', 'votes', 'poll', 'id', 'count', 0, 24, { xAxisDisplayField: 'title' }),
      bar('Angebotsstimmen · aktive Abstimmungen', 'votes', 'option', 'id', 'count', 18, 24, { xAxisDisplayField: 'name', filter: { poll: { active: { _eq: true } } } })
    ]
  }
].map(d => ({ ...d, id: idFor(d.key), panels: d.panels.map((p, i) => ({
  ...p, id: idFor(`${d.key}:${i}`), dashboard: idFor(d.key), icon: d.icon, color: d.color,
  show_header: true, options: { color: d.color, ...p.options }
})) }));

export async function setupInsights(api, staffPolicy) {
  const dashboards = new Set((await api('/dashboards?limit=-1')).map(d => d.id));
  const panels = new Set((await api('/panels?limit=-1')).map(p => p.id));
  for (const { key, panels: definitions, ...dashboard } of insightDashboards) {
    if (!dashboards.has(dashboard.id)) await api('/dashboards', 'POST', dashboard);
    const missing = definitions.filter(p => !panels.has(p.id));
    if (missing.length) await api('/panels', 'POST', missing);
  }
  for (const [collection, permissions] of [
    ['directus_dashboards', { id: { _in: insightDashboards.map(d => d.id) } }],
    ['directus_panels', { dashboard: { _in: insightDashboards.map(d => d.id) } }]
  ]) {
    const found = await api(`/permissions?filter[policy][_eq]=${staffPolicy}&filter[collection][_eq]=${collection}&filter[action][_eq]=read`);
    if (!found.length) await api('/permissions', 'POST', { policy: staffPolicy, collection, action: 'read', fields: ['*'], permissions });
  }
}
