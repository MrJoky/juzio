import { api } from '../lib/api.js';
import { esc, dateText } from '../lib/format.js';
import { heading, cards } from '../lib/ui.js';

export async function pollTeamPage(app) {
  const polls = await api('/api/staff/polls');
  app.innerHTML =
    heading(
      'Team · Wünsche',
      'Abstimmung & Ergebnisse',
      'Titel, Zeitraum, Angebote und die nächste Woche werden in Directus gepflegt.',
    ) +
    /* HTML */ `
      <div class="cms-note">
        <p>
          Sammlung
          <strong>polls</strong>
          : Abstimmung anlegen und „active“ aktivieren. „starts_at“ und
          „ends_at“ sind optional. Sammlung
          <strong>poll_options</strong>
          : Angebote anlegen und unter „poll“ die Abstimmung auswählen.
        </p>
        <p>
          <a href="/abstimmung">Öffentliche Abstimmung öffnen ↗</a>
        </p>
      </div>
    ` +
    cards(
      polls,
      (p) => /* HTML */ `
        <div class="view-header">
          <h2>${esc(p.title)}</h2>
          <span class="badge">${p.active ? 'Aktiv' : 'Inaktiv'}</span>
        </div>
        <p>
          Woche ab ${esc(dateText(p.week_of))} · ${p.total} Stimmen insgesamt
        </p>
        <div class="vote-code" data-code-poll="${esc(p.id)}">
          <span>Mitarbeitercode</span>
          <strong>–</strong>
          <small>Wird geladen …</small>
        </div>
        ${p.options
          .map(
            (o) => /* HTML */ `
              <div class="result-row">
                <span>${esc(o.name)}${o.active ? '' : ' (inaktiv)'}</span>
                <meter
                  min="0"
                  max="${Math.max(p.total, 1)}"
                  value="${o.count}"
                ></meter>
                <strong>${o.count}</strong>
              </div>
            `,
          )
          .join('')}
      `,
      'Noch keine Abstimmungen angelegt.',
    );
  let refreshRunning = false;
  const refreshCodes = async () => {
    if (refreshRunning) return;
    refreshRunning = true;
    try {
      const codes = await api('/api/staff/vote-codes');
      const received = Date.now();
      for (const panel of document.querySelectorAll('[data-code-poll]')) {
        const entry = codes.find((c) => c.poll === panel.dataset.codePoll);
        panel.dataset.deadline = entry ? received + entry.remaining_ms : '';
        panel.querySelector('strong').textContent = entry?.code || '–';
        panel.querySelector('small').textContent = entry
          ? ''
          : 'Abstimmung geschlossen';
      }
    } catch (e) {
      for (const panel of document.querySelectorAll('[data-code-poll]')) {
        panel.dataset.deadline = '';
        panel.querySelector('strong').textContent = '–';
        panel.querySelector('small').textContent = e.message;
      }
    } finally {
      refreshRunning = false;
    }
  };
  const tick = () => {
    for (const panel of document.querySelectorAll('[data-code-poll]')) {
      if (!panel.dataset.deadline) continue;
      const remaining = Math.max(
        0,
        Math.ceil((Number(panel.dataset.deadline) - Date.now()) / 1000),
      );
      panel.querySelector('small').textContent = remaining
        ? `Noch ${remaining} Sekunden · nur einmal verwendbar`
        : 'Neuer Code wird geladen …';
      if (!remaining) panel.querySelector('strong').textContent = '–';
    }
  };
  await refreshCodes();
  tick();
  const refreshTimer = setInterval(refreshCodes, 1000),
    countdownTimer = setInterval(tick, 200);
  window.addEventListener('pagehide', () => {
    clearInterval(refreshTimer);
    clearInterval(countdownTimer);
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) location.reload();
  });
}
