import { api } from '../lib/api.js';
import { esc, dateText } from '../lib/format.js';
import { heading, empty, safe } from '../lib/ui.js';
import { dateInput, select, bindForm } from '../lib/forms.js';
import { filterControls, filter, exportCsv } from '../lib/lists.js';

function statsFields(editing = false) {
  return /* HTML */ `
    ${dateInput()}
    <label>
      Uhrzeit
      <input
        type="time"
        name="visit_time"
        value="${editing
          ? ''
          : new Intl.DateTimeFormat('de-DE', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Europe/Berlin',
            }).format(new Date())}"
      />
    </label>
    ${select('age_group', 'Altersgruppe', [
      'unter 12',
      '12–15',
      '16–18',
      '19–27',
      'über 27',
      'keine Angabe',
    ])}${select('gender', 'Geschlecht', [
      'weiblich',
      'männlich',
      'divers',
      'keine Angabe',
    ])}
    <label>
      Anzahl
      <input
        name="quantity"
        type="number"
        min="1"
        max="1000"
        value="1"
        required
      />
    </label>
    <label>
      Notiz (keine Namen oder vertraulichen Angaben)
      <textarea name="note" maxlength="1200" rows="2"></textarea>
    </label>
  `;
}
export function summarizeStatistics(rows) {
  const groups = new Map();
  for (const row of rows) {
    const visit_date = row.visit_date.slice(0, 10);
    const key = JSON.stringify([visit_date, row.age_group, row.gender]);
    if (!groups.has(key))
      groups.set(key, {
        visit_date,
        age_group: row.age_group,
        gender: row.gender,
        quantity: 0,
        notes: [],
        times: [],
        entries: [],
      });
    const group = groups.get(key);
    group.quantity += Number(row.quantity);
    group.entries.push(row);
    if (row.visit_time) group.times.push(row.visit_time);
    if (row.note) group.notes.push(row.note);
  }
  return [...groups.values()].map(({ notes, ...group }) => ({
    ...group,
    note: notes.join(' · '),
    visit_time: [...new Set(group.times)].sort().join(', '),
  }));
}
export async function statsPage(app) {
  let rows = await api('/api/staff/statistics');
  app.innerHTML =
    heading(
      'Team · Besucher',
      'Besucherstatistik',
      'Besuche zählen, nach Zeitraum filtern und als CSV mitnehmen.',
    ) +
    /* HTML */ `
      <form id="statsForm" class="panel form-panel stats-entry">
        ${statsFields()}
        <button type="submit" class="primary-button">Besuche erfassen</button>
        <p role="status"></p>
      </form>
    ` +
    filterControls() +
    /* HTML */ `
      <div id="statsSummary" class="summary-grid"></div>
      <h2>Besuche nach Tag, Alter und Geschlecht</h2>
      <p>
        Mit den Pfeilen passt du die Anzahl direkt an. Änderungen werden sofort
        gespeichert.
      </p>
      <div id="statsRows"></div>
    `;
  let adjusting = false;
  const render = () => {
    const groups = summarizeStatistics(filter(rows, 'visit_date'));
    const sum = groups.reduce((n, r) => n + r.quantity, 0);
    document.querySelector('#statsSummary').innerHTML = /* HTML */ `
      <div class="panel metric">
        <strong>${sum}</strong>
        <span>Erfasste Besuche</span>
      </div>
      <div class="panel metric">
        <strong>${new Set(groups.map((r) => r.visit_date)).size}</strong>
        <span>Tage mit Einträgen</span>
      </div>
    `;
    document.querySelector('#statsRows').innerHTML = groups.length
      ? /* HTML */ `
          <div class="table-scroll">
            <table class="stats-table">
              <thead>
                <tr>
                  ${[
                    'Datum',
                    'Uhrzeit',
                    'Alter',
                    'Geschlecht',
                    'Anzahl',
                    'Notiz',
                  ]
                    .map(
                      (label) => /* HTML */ `
                        <th scope="col">${label}</th>
                      `,
                    )
                    .join('')}
                </tr>
              </thead>
              <tbody>
                ${groups
                  .map(
                    (r, i) => /* HTML */ `
                      <tr>
                        ${[
                          dateText(r.visit_date),
                          r.visit_time || '–',
                          r.age_group,
                          r.gender,
                        ]
                          .map(
                            (value) => /* HTML */ `
                              <td>${esc(value)}</td>
                            `,
                          )
                          .join('')}
                        <td>
                          <div class="quantity-controls">
                            <strong>${r.quantity}</strong>
                            <div>
                              <button
                                type="button"
                                class="ghost-button"
                                data-group="${i}"
                                data-delta="1"
                                aria-label="Anzahl erhöhen"
                                ${r.entries.some((e) => e.quantity < 1000)
                                  ? ''
                                  : 'disabled'}
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                class="ghost-button"
                                data-group="${i}"
                                data-delta="-1"
                                aria-label="Anzahl verringern"
                                ${r.quantity > 0 ? '' : 'disabled'}
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        </td>
                        <td>${esc(r.note || '–')}</td>
                      </tr>
                    `,
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `
      : empty('Für diesen Zeitraum sind keine Besuche erfasst.');
    for (const button of document.querySelectorAll('#statsRows [data-delta]'))
      button.onclick = async () => {
        if (adjusting) return;
        const delta = Number(button.dataset.delta),
          group = groups[Number(button.dataset.group)];
        const entry = group.entries.find((r) =>
          delta > 0 ? r.quantity < 1000 : r.quantity > 0,
        );
        if (!entry) return;
        adjusting = true;
        document.querySelectorAll('#statsRows button').forEach((b) => {
          b.disabled = true;
        });
        const status = document.querySelector('#viewStatus');
        status.textContent = 'Anzahl wird gespeichert …';
        try {
          const result = await api('/api/staff/statistics/quantity', {
            id: entry.id,
            delta,
          });
          rows = rows.map((r) =>
            r.id === result.id ? { ...r, quantity: result.quantity } : r,
          );
          status.textContent = 'Anzahl gespeichert.';
        } catch (e) {
          status.textContent = e.message;
        } finally {
          adjusting = false;
          render();
        }
      };
  };
  bindForm('statsForm', async (b, f) => {
    await api('/api/staff/statistics', b);
    rows = await api('/api/staff/statistics');
    render();
    f.querySelector('[role=status]').textContent = 'Besuche gespeichert.';
  });
  for (const id of ['from', 'to'])
    document.querySelector('#' + id).onchange = render;
  document.querySelector('#refresh').onclick = safe(async () => {
    rows = await api('/api/staff/statistics');
    render();
  });
  document.querySelector('#export').onclick = () =>
    exportCsv('besucherstatistik.csv', [
      ['Datum', 'Uhrzeit', 'Alter', 'Geschlecht', 'Anzahl', 'Notiz'],
      ...summarizeStatistics(filter(rows, 'visit_date')).map((r) => [
        r.visit_date,
        r.visit_time || '',
        r.age_group,
        r.gender,
        r.quantity,
        r.note,
      ]),
    ]);
  render();
}
