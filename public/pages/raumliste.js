import { api } from '../lib/api.js';
import { esc, dateText } from '../lib/format.js';
import { heading, cards, safe } from '../lib/ui.js';
import { dateInput, editEntry } from '../lib/forms.js';
import { filterControls, filter, exportCsv } from '../lib/lists.js';

export async function entriesPage(app) {
  let rows = await api('/api/staff/entries');
  const rooms = await api('/api/staff/rooms');
  app.innerHTML =
    heading(
      'Team · Räume',
      'Raumliste',
      'Die gespeicherten Eintragungen der Jugendlichen.',
    ) +
    filterControls() +
    /* HTML */ `
      <div id="entries" class="entry-list"></div>
    `;
  const render = () => {
    const filtered = filter(rows, 'visit_date');
    document.querySelector('#entries').innerHTML = cards(
      filtered,
      (r) => /* HTML */ `
        <div class="view-header">
          <h3>${esc(r.room_name)}</h3>
          <span>${esc(dateText(r.visit_date))} · ${esc(r.visit_time)}</span>
        </div>
        <strong>${esc(r.name)}</strong>
        <p>Weitere Gäste: ${esc(r.guests || '–')}</p>
        <button type="button" class="ghost-button" data-edit="${esc(r.id)}">
          Bearbeiten
        </button>
      `,
    );
    for (const button of document.querySelectorAll('#entries [data-edit]'))
      button.onclick = () => {
        const row = rows.find((r) => r.id === button.dataset.edit);
        editEntry(
          'Raumeintragung bearbeiten',
          /* HTML */ `
            ${dateInput()}
            <label>
              Uhrzeit
              <input type="time" name="visit_time" required />
            </label>
            <label>
              Raum
              <select name="room">
                <option value="">
                  ${esc(row.room_name)} (bisheriger Raum)
                </option>
                ${rooms
                  .map(
                    (r) => /* HTML */ `
                      <option value="${esc(r.id)}">
                        ${esc(r.name)}${r.active ? '' : ' (inaktiv)'}
                      </option>
                    `,
                  )
                  .join('')}
              </select>
            </label>
            <label>
              Name
              <input name="name" maxlength="120" required />
            </label>
            <label>
              Weitere Gäste
              <textarea name="guests" maxlength="1200" rows="3"></textarea>
            </label>
          `,
          row,
          '/api/staff/entries',
          async () => {
            rows = await api('/api/staff/entries');
            render();
          },
        );
      };
  };
  for (const id of ['from', 'to'])
    document.querySelector('#' + id).onchange = render;
  document.querySelector('#refresh').onclick = safe(async () => {
    rows = await api('/api/staff/entries');
    render();
  });
  document.querySelector('#export').onclick = () =>
    exportCsv('raumliste.csv', [
      ['Datum', 'Uhrzeit', 'Raum', 'Name', 'Gäste'],
      ...filter(rows, 'visit_date').map((r) => [
        r.visit_date,
        r.visit_time,
        r.room_name,
        r.name,
        r.guests,
      ]),
    ]);
  render();
}
