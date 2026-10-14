export async function api(url, body) {
  const response = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) {
    if (
      response.status === 401 &&
      location.pathname !== '/login' &&
      url.startsWith('/api/staff/')
    )
      location.assign('/login');
    throw Object.assign(new Error(data.error || 'Anfrage fehlgeschlagen.'), {
      status: response.status,
    });
  }
  return data;
}
