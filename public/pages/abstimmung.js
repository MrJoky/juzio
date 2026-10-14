import { api } from '../lib/api.js';
import { esc, dateText } from '../lib/format.js';
import { heading, empty } from '../lib/ui.js';
import { bindForm } from '../lib/forms.js';

export async function votePage(app) {
  const polls = await api('/api/polls');
  app.innerHTML =
    heading(
      'Deine Stimme zählt',
      'Nächste Woche an der Theke',
      'Was wünschst du dir? Die Datenschutzhinweise findest du unten. Frage das Team direkt vor dem Absenden nach dem aktuellen Mitarbeitercode.',
    ) +
    polls
      .map(
        (p, i) => /* HTML */ `
          <form id="poll${i}" class="panel form-panel poll">
            <p class="eyebrow">
              ${p.week_of
                ? 'Woche ab ' + esc(dateText(p.week_of))
                : 'Nächste Woche'}
            </p>
            <h2>${esc(p.title)}</h2>
            <p>${esc(p.description)}</p>
            ${p.options
              .map(
                (o) => /* HTML */ `
                  <label class="vote-option">
                    <input
                      type="radio"
                      name="option"
                      value="${esc(o.id)}"
                      required
                    />
                    <span>
                      <strong>${esc(o.name)}</strong>
                      <span class="option-description">
                        ${esc(o.description)}
                      </span>
                    </span>
                  </label>
                `,
              )
              .join('')}
            <label>
              Mitarbeitercode
              <input
                name="code"
                type="text"
                inputmode="numeric"
                pattern="[0-9]{6}"
                minlength="6"
                maxlength="6"
                autocomplete="off"
                placeholder="6-stelliger Code"
                required
              />
            </label>
            <p>Der Code gilt zehn Sekunden und nur für eine Stimme.</p>
            <button
              type="submit"
              class="primary-button"
              ${p.options.length ? '' : 'disabled'}
            >
              Meine Stimme abgeben
            </button>
            <p role="status">
              ${p.options.length ? '' : 'Noch keine Angebote verfügbar.'}
            </p>
          </form>
        `,
      )
      .join('');
  if (!polls.length)
    app.innerHTML += empty(
      'Momentan läuft keine Abstimmung. Schau später wieder vorbei.',
    );
  polls.forEach((p, i) => {
    const form = document.querySelector('#poll' + i);
    let submitting = false;
    bindForm('poll' + i, async (b) => {
      if (submitting) return;
      submitting = true;
      try {
        await api('/api/vote', { poll: p.id, option: b.option, code: b.code });
        form.elements.code.value = '';
        form.querySelector('[role=status]').textContent =
          'Danke! Deine Stimme ist gespeichert.';
      } finally {
        submitting = false;
      }
    });
  });
}
