export const base = process.env.DIRECTUS_URL || 'http://127.0.0.1:8056';
export async function directus(endpoint, { token, method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`${base}${endpoint}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) });
  } catch { throw Object.assign(new Error('Directus ist gerade nicht erreichbar.'), { status: 503 }); }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = result.errors?.[0]?.extensions?.code;
    throw Object.assign(new Error(response.status === 401 || response.status === 403 ? 'Anmeldung oder Berechtigung fehlt.' : 'Directus konnte die Anfrage nicht speichern.'), { status: response.status, code });
  }
  return result.data;
}
