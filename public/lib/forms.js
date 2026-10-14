import { api } from './api.js';
import { esc, today } from './format.js';

export function select(name, label, values) {
  return /* HTML */ `
    <label>
      ${esc(label)}
      <select name="${name}" required>
        <option value="">Bitte wählen</option>
        ${values
          .map(
            (v) => /* HTML */ `
              <option>${esc(v)}</option>
            `,
          )
          .join('')}
      </select>
    </label>
  `;
}
export function dateInput() {
  return /* HTML */ `
    <label>
      Datum
      <input type="date" name="visit_date" value="${today()}" required />
    </label>
  `;
}
export function bindForm(id, action) {
  const form = document.querySelector(`#${id}`);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type=submit]');
    const status = form.querySelector('[role=status]');
    button.disabled = true;
    status.textContent = 'Wird gespeichert …';
    try {
      await action(Object.fromEntries(new FormData(form)), form);
    } catch (e) {
      status.textContent = e.message;
    } finally {
      button.disabled = false;
    }
  });
}
export function editEntry(title, fields, row, endpoint, saved) {
  const dialog = document.createElement('dialog');
  dialog.className = 'entry-editor';
  dialog.innerHTML = /* HTML */ `
    <form id="editEntryForm" class="form-panel">
      <h2>${esc(title)}</h2>
      ${fields}
      <div class="view-header">
        <button type="submit" class="primary-button">
          Änderungen speichern
        </button>
        <button type="button" class="ghost-button" id="cancelEdit">
          Abbrechen
        </button>
      </div>
      <p role="status"></p>
    </form>
  `;
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  for (const [name, value] of Object.entries(row)) {
    const input = form.elements.namedItem(name);
    if (input) input.value = value ?? '';
  }
  dialog.querySelector('#cancelEdit').onclick = () => dialog.close();
  dialog.addEventListener('close', () => dialog.remove());
  bindForm('editEntryForm', async (b) => {
    await api(endpoint, { ...b, id: row.id });
    dialog.close();
    await saved();
  });
  dialog.showModal();
}
