import { api } from '../lib/api.js';
import { esc } from '../lib/format.js';
import { heading } from '../lib/ui.js';
import { dateInput, bindForm } from '../lib/forms.js';

export async function roomPage(app) {
  const rooms = await api('/api/rooms');
  app.innerHTML =
    heading(
      'Willkommen im Juze',
      'Welchen Raum nutzt du?',
      'Trage dich und deine Freunde ein.',
    ) +
    /* HTML */ `
      <div class="section-grid">
        <div class="intro-panel">
          <span class="big-symbol">↗</span>
          <h2>Platz für euch.</h2>
          <p>Raum auswählen, Namen eintragen und los geht’s.</p>
          <p>Bitte verwende nur deinen Vornamen.</p>
        </div>
        <form id="roomForm" class="panel form-panel">
          ${dateInput()}
          <label>
            Uhrzeit
            <input
              type="time"
              name="visit_time"
              value="${new Intl.DateTimeFormat('de-DE', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Berlin',
              }).format(new Date())}"
              required
            />
          </label>
          <label>
            Raum
            <select name="room" required>
              <option value="">Bitte wählen</option>
              ${rooms
                .map(
                  (r) => /* HTML */ `
                    <option value="${esc(r.id)}">${esc(r.name)}</option>
                  `,
                )
                .join('')}
            </select>
          </label>
          <label>
            Dein Vorname oder Spitzname
            <input name="name" maxlength="120" autocomplete="off" required />
          </label>
          <label>
            Wer ist noch dabei?
            <textarea
              name="guests"
              maxlength="1200"
              rows="3"
              placeholder="Weitere Vornamen oder Spitznamen"
            ></textarea>
          </label>
          <p>
            Verwende nur Vornamen oder Spitznamen. Weitere Gäste bitte nur nach
            Rücksprache eintragen.
            <a href="/datenschutz">Datenschutzhinweise</a>
          </p>
          <button
            type="submit"
            class="primary-button"
            ${rooms.length ? '' : 'disabled'}
          >
            Eintragen
          </button>
          <p role="status">
            ${rooms.length ? '' : 'Aktuell sind keine Räume verfügbar.'}
          </p>
        </form>
      </div>
    `;
  bindForm('roomForm', async (b, f) => {
    await api('/api/room-entries', b);
    f.querySelector('[name=name]').value = '';
    f.querySelector('[name=guests]').value = '';
    f.querySelector('[role=status]').textContent =
      'Danke! Dein Eintrag ist gespeichert.';
  });
}
