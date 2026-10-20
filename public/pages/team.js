import { api } from '../lib/api.js';
import { esc } from '../lib/format.js';
import { heading } from '../lib/ui.js';

export async function teamPage(app, user) {
  const { cmsUrl } = await api('/api/staff/config');
  const links = [
    ['/raumliste', 'Raumliste', 'Alle Raumeintragungen ansehen.'],
    ['/statistik', 'Besucherstatistik', 'Besuche erfassen und auswerten.'],
    ['/theke', 'Thekenverkauf', 'Angebote buchen und Umsatz sehen.'],
    ['/abstimmung-team', 'Abstimmung', 'Wünsche für nächste Woche auswerten.'],
    ['/qr', 'QR-Codes', 'Links für Jugendliche ausdrucken.'],
  ];
  app.innerHTML =
    heading(
      'Team',
      `Hallo ${user.first_name || 'Team'}.`,
      'Alles für euren Alltag an einem Ort.',
    ) +
    /* HTML */ `
      <div class="dashboard-grid">
        ${links
          .map(
            ([href, title, description]) => /* HTML */ `
              <a class="panel dashboard-card" href="${href}">
                <h2>${title} ↗</h2>
                <p>${description}</p>
              </a>
            `,
          )
          .join('')}
      </div>
      <div class="cms-note">
        <strong>Inhalte und Kollegen verwalten</strong>
        <p>
          Directus im Hausnetz öffnen:
          <a href="${esc(cmsUrl)}" target="_blank" rel="noopener">
            CMS öffnen
          </a>
          . Hier bearbeitet ihr Räume, Produkte und Abstimmungen. Benutzerkonten
          legt ein Administrator an.
        </p>
      </div>
    `;
}
