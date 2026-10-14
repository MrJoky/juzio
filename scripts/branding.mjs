// Sichtbare Namen ändern, bestehende Datensatz-IDs und Berechtigungen erhalten.
export async function findOrRename(api, endpoint, name, previousName) {
  const current = (await api(`${endpoint}?filter[name][_eq]=${encodeURIComponent(name)}`))[0];
  if (current) return current;
  const previous = (await api(`${endpoint}?filter[name][_eq]=${encodeURIComponent(previousName)}`))[0];
  if (!previous) return;
  return api(`${endpoint}/${previous.id}`, 'PATCH', { name });
}

export async function setupBranding(api) {
  const settings = await api('/settings?fields=project_name,project_descriptor');
  if ([null, 'Directus', 'Juze', 'Juze · Lokal im Jugendzentrum', 'JuZ.io'].includes(settings.project_name)) {
    await api('/settings', 'PATCH', {
      project_name: 'JuZ.io',
      project_descriptor: 'Mehr Zeit für Jugendarbeit.'
    });
  }
  for (const collection of await api('/collections')) {
    if (collection.meta?.note === 'Juze · lokal') {
      await api(`/collections/${collection.collection}`, 'PATCH', { meta: { note: 'JuZ.io · lokal' } });
    }
  }
}
