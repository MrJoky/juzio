import { esc } from './format.js';

export function heading(eyebrow, title, description = '') {
  return /* HTML */ `
    <div class="section-heading">
      <p class="eyebrow">${esc(eyebrow)}</p>
      <h1>${esc(title)}</h1>
      <p class="lead">${esc(description)}</p>
    </div>
  `;
}
export function empty(message) {
  return /* HTML */ `
    <p class="empty">${esc(message)}</p>
  `;
}
export function cards(
  rows,
  render,
  message = 'Noch keine Einträge vorhanden.',
) {
  return rows.length
    ? rows
        .map(
          (r) => /* HTML */ `
            <article class="entry-card">${render(r)}</article>
          `,
        )
        .join('')
    : empty(message);
}
export function table(headers, rows) {
  return /* HTML */ `
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            ${headers
              .map(
                (h) => /* HTML */ `
                  <th>${esc(h)}</th>
                `,
              )
              .join('')}
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => /* HTML */ `
                <tr>
                  ${row
                    .map(
                      (c) => /* HTML */ `
                        <td>${esc(c)}</td>
                      `,
                    )
                    .join('')}
                </tr>
              `,
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}
export function safe(action) {
  return async () => {
    try {
      await action();
    } catch (e) {
      const status = document.querySelector('#viewStatus');
      if (status) status.textContent = e.message;
    }
  };
}
