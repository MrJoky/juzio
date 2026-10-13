// Reine Studio-Metadaten: Ordner haben keine Datenbanktabellen.
const groups = [
  ['juze_visits', 'Räume & Besuche', 'meeting_room', '#2196F3', [
    ['rooms', 'Räume', 'meeting_room'],
    ['room_entries', 'Raumeintragungen', 'assignment'],
    ['visitor_statistics', 'Besucherstatistik', 'bar_chart']
  ]],
  ['juze_counter', 'Theke', 'point_of_sale', '#FF9800', [
    ['products', 'Produkte', 'local_cafe'],
    ['sales', 'Verkäufe & Pfand', 'receipt_long']
  ]],
  ['juze_polls', 'Abstimmungen', 'how_to_vote', '#9C27B0', [
    ['polls', 'Abstimmungen', 'how_to_vote'],
    ['poll_options', 'Angebote zur Auswahl', 'list_alt'],
    ['votes', 'Stimmen', 'ballot']
  ]],
  ['juze_content', 'Inhalte & Datenschutz', 'article', '#607D8B', [
    ['privacy_pages', 'Datenschutzseiten', 'privacy_tip']
  ]]
];

const translations = name => ['de-DE', 'en-US'].map(language => ({ language, translation: name }));

export async function organizeCollections(api) {
  const existing = new Map((await api('/collections')).map(c => [c.collection, c]));
  for (const [index, [collection, name, icon, color, children]] of groups.entries()) {
    if (existing.get(collection)?.schema) throw new Error(`Navigationsordner ${collection} ist bereits eine Datentabelle.`);
    const meta = { icon, color, sort: index + 1, group: null, collapse: 'open', translations: translations(name) };
    if (!existing.has(collection)) await api('/collections', 'POST', { collection, schema: null, meta });
    else await api(`/collections/${collection}`, 'PATCH', { meta });
    for (const [childIndex, [child, childName, childIcon]] of children.entries()) {
      if (!existing.has(child)) continue;
      await api(`/collections/${child}`, 'PATCH', { meta: {
        group: collection, sort: childIndex + 1, icon: childIcon, color, translations: translations(childName)
      } });
    }
  }
}
