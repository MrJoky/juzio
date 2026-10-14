import { api } from '../lib/api.js';
import { esc } from '../lib/format.js';
import { heading } from '../lib/ui.js';

export async function privacyPage(app) {
  try {
    const page = await api('/api/datenschutz');
    app.innerHTML =
      heading('Deine Daten', page.title || 'Datenschutz') +
      (page.status === 'published'
        ? ''
        : /* HTML */ `
            <p class="cms-note" role="status">
              Entwurf: Der Träger muss die fehlenden Angaben ergänzen und die
              Hinweise freigeben. Bei Fragen wende dich an das Team.
            </p>
          `) +
      /* HTML */ `
        <article class="panel privacy-content">${esc(page.content)}</article>
      `;
  } catch {
    app.innerHTML = heading(
      'Deine Daten',
      'Datenschutz',
      'Die Datenschutzhinweise sind gerade nicht erreichbar. Bitte frage das Team vor Ort, bevor du personenbezogene Angaben einträgst.',
    );
  }
}
