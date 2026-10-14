import { today } from './format.js';

export function exportCsv(name, rows) {
  const cell = (v) => {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return `"${s.replaceAll('"', '""')}"`;
  };
  const url = URL.createObjectURL(
    new Blob(
      ['\uFEFF' + rows.map((row) => row.map(cell).join(';')).join('\r\n')],
      { type: 'text/csv;charset=utf-8' },
    ),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function filterControls() {
  return /* HTML */ `
    <div class="toolbar filter">
      <label>
        Von
        <input id="from" type="date" value="${today()}" />
      </label>
      <label>
        Bis
        <input id="to" type="date" value="${today()}" />
      </label>
      <button id="refresh" class="ghost-button">Aktualisieren</button>
      <button id="export" class="ghost-button">CSV exportieren</button>
    </div>
    <p id="viewStatus" role="status"></p>
  `;
}
export function filter(rows, key) {
  const from = document.querySelector('#from').value,
    to = document.querySelector('#to').value;
  return rows.filter((r) => {
    const d =
      key === 'created_at'
        ? new Intl.DateTimeFormat('sv-SE', {
            timeZone: 'Europe/Berlin',
          }).format(new Date(r[key]))
        : r[key]?.slice(0, 10);
    return (!from || d >= from) && (!to || d <= to);
  });
}
