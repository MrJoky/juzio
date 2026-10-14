import { api } from '../lib/api.js';
import { esc } from '../lib/format.js';
import { heading, empty } from '../lib/ui.js';

export async function qrPage(app) {
  const data = await api('/api/staff/links');
  app.innerHTML =
    heading(
      'Im selben WLAN',
      'Scannen. Eintragen. Mitmachen.',
      'Jugendliche verbinden sich mit dem Haus-WLAN und scannen den passenden Code.',
    ) +
    /* HTML */ `
      <div class="cms-note no-print">
        <p>
          Wähle die Adresse des WLAN-Adapters. Für dauerhafte Ausdrucke
          empfiehlt sich eine feste Laptop-IP im Router. Bei mehreren Adressen
          kannst du PUBLIC_URL in .env.local setzen.
        </p>
        <p>
          Auch im gleichen WLAN muss der Router Verbindungen zwischen Geräten
          erlauben. Der Laptop muss eingeschaltet bleiben.
        </p>
        <button id="print" class="primary-button">QR-Codes drucken</button>
      </div>
      <div class="qr-grid">
        ${data.links
          .map(
            (l) => /* HTML */ `
              <article class="panel qr-card">
                <h2>${esc(l.label)}</h2>
                <img
                  src="${l.qr}"
                  alt="QR-Code für ${esc(l.label)}"
                  width="320"
                  height="320"
                />
                <a href="${esc(l.url)}">${esc(l.url)}</a>
                <p>Mit dem Haus-WLAN verbinden und scannen.</p>
              </article>
            `,
          )
          .join('') ||
        empty(
          'Keine Netzwerkadresse gefunden. WLAN verbinden oder PUBLIC_URL in .env.local setzen.',
        )}
      </div>
    `;
  document.querySelector('#print').onclick = () => window.print();
}
