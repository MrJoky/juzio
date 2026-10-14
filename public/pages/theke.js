import { api } from '../lib/api.js';
import { esc, money, uid } from '../lib/format.js';
import { heading, table, empty, safe } from '../lib/ui.js';
import { bindForm } from '../lib/forms.js';
import { filterControls, filter, exportCsv } from '../lib/lists.js';

export function salesSummary(rows) {
  return rows.reduce(
    (totals, r) => {
      const amount = r.quantity * r.price_cents;
      totals.cash += amount;
      if (r.kind === 'deposit') totals.deposit += amount;
      else if (r.kind === 'deposit_return') totals.returns -= amount;
      else {
        totals.revenue += amount;
        totals.count += r.quantity;
      }
      return totals;
    },
    { cash: 0, revenue: 0, deposit: 0, returns: 0, count: 0 },
  );
}
const saleKind = (r) =>
  r.kind === 'deposit'
    ? 'Pfand'
    : r.kind === 'deposit_return'
      ? 'Pfandrückgabe'
      : 'Verkauf';
export async function salesPage(app) {
  let products = await api('/api/staff/products'),
    rows = await api('/api/staff/sales');
  app.innerHTML =
    heading(
      'Team · Theke',
      'Verkauf & Pfand',
      'Pfand wird beim Verkauf zusätzlich gebucht. Rückgaben ziehen den ausgezahlten Betrag von der Kasse ab.',
    ) +
    /* HTML */ `
      <div id="productCards" class="dashboard-grid"></div>
      <form id="depositReturn" class="panel form-panel stats-entry">
        <h2>Pfand zurückzahlen</h2>
        <label>
          Pfand pro Stück (€)
          <input
            name="amount"
            type="number"
            min="0.01"
            max="1000"
            step="0.01"
            value="0.25"
            required
          />
        </label>
        <label>
          Anzahl zurückgegebener Behälter
          <input
            name="quantity"
            type="number"
            min="1"
            max="1000"
            value="1"
            required
          />
        </label>
        <button type="submit" class="primary-button">
          Pfandrückgabe buchen
        </button>
        <p role="status"></p>
      </form>
    ` +
    filterControls() +
    /* HTML */ `
      <div id="salesSummary" class="summary-grid"></div>
      <div id="salesRows"></div>
    `;
  const render = () => {
    const f = filter(rows, 'created_at'),
      sum = salesSummary(f);
    document.querySelector('#salesSummary').innerHTML = [
      ['Kassenbewegung', money(sum.cash)],
      ['Warenumsatz', money(sum.revenue)],
      ['Pfand eingenommen', money(sum.deposit)],
      ['Pfand zurückgezahlt', money(sum.returns)],
      ['Pfand verbleibend im Zeitraum', money(sum.deposit - sum.returns)],
      ['Verkaufte Artikel', sum.count],
    ]
      .map(
        ([label, value]) => /* HTML */ `
          <div class="panel metric">
            <strong>${value}</strong>
            <span>${label}</span>
          </div>
        `,
      )
      .join('');
    document.querySelector('#salesRows').innerHTML = f.length
      ? table(
          ['Zeitpunkt', 'Position', 'Art', 'Menge', 'Einzelbetrag', 'Summe'],
          f.map((r) => [
            new Date(r.created_at).toLocaleString('de-DE'),
            r.product_name,
            saleKind(r),
            r.quantity,
            money(r.price_cents),
            money(r.quantity * r.price_cents),
          ]),
        )
      : empty('Noch keine Buchungen in diesem Zeitraum.');
  };
  const renderProducts = () => {
    document.querySelector('#productCards').innerHTML =
      products
        .map(
          (p) => /* HTML */ `
            <form class="panel form-panel product" data-product="${esc(p.id)}">
              <h2>${esc(p.name)}</h2>
              <strong>${money(p.price_cents)}</strong>
              <p>
                ${p.has_deposit
                  ? `+ ${money(p.deposit_cents)} Pfand pro Stück · zusammen ${money(p.price_cents + p.deposit_cents)}`
                  : 'Ohne Pfand'}
              </p>
              <button
                type="button"
                class="ghost-button"
                data-deposit="${esc(p.id)}"
              >
                Pfand einstellen
              </button>
              <label>
                Menge
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  max="1000"
                  value="1"
                  required
                />
              </label>
              <button type="submit" class="primary-button">
                Verkauf buchen
              </button>
              <p role="status"></p>
            </form>
          `,
        )
        .join('') ||
      empty('Keine aktiven Produkte. Bitte in Directus anlegen.');
    for (const form of document.querySelectorAll('.product')) {
      let requestKey = null;
      form.onsubmit = async (event) => {
        event.preventDefault();
        const button = form.querySelector('button[type=submit]'),
          status = form.querySelector('[role=status]');
        if (button.disabled) return;
        button.disabled = true;
        requestKey ||= uid();
        try {
          await api('/api/staff/sales', {
            product: form.dataset.product,
            quantity: form.elements.quantity.value,
            request_key: requestKey,
          });
          requestKey = null;
          status.textContent = 'Verkauf gebucht.';
          rows = await api('/api/staff/sales');
          render();
        } catch (e) {
          status.textContent = e.message;
        } finally {
          button.disabled = false;
        }
      };
    }
    for (const button of document.querySelectorAll('[data-deposit]'))
      button.onclick = () => {
        const p = products.find((p) => p.id === button.dataset.deposit),
          dialog = document.createElement('dialog');
        dialog.className = 'entry-editor';
        dialog.innerHTML = /* HTML */ `
          <form id="depositSettings" class="form-panel">
            <h2>Pfand für ${esc(p.name)}</h2>
            <label class="deposit-checkbox">
              <input
                name="has_deposit"
                type="checkbox"
                ${p.has_deposit ? 'checked' : ''}
              />
              Produkt mit Pfand
            </label>
            <label>
              Pfand pro Stück (€)
              <input
                name="amount"
                type="number"
                min="0.01"
                max="1000"
                step="0.01"
                value="${(p.deposit_cents || 25) / 100}"
                required
              />
            </label>
            <p>
              Der Produktpreis enthält kein Pfand. Bei jedem Verkauf wird Pfand
              als eigene Position hinzugefügt.
            </p>
            <button type="submit" class="primary-button">Speichern</button>
            <button id="cancelDeposit" type="button" class="ghost-button">
              Abbrechen
            </button>
            <p role="status"></p>
          </form>
        `;
        document.body.append(dialog);
        dialog.querySelector('#cancelDeposit').onclick = () => dialog.close();
        dialog.addEventListener('close', () => dialog.remove());
        bindForm('depositSettings', async (b, form) => {
          await api('/api/staff/products', {
            id: p.id,
            has_deposit: form.elements.has_deposit.checked,
            deposit_cents: Math.round(Number(b.amount) * 100),
          });
          products = await api('/api/staff/products');
          renderProducts();
          dialog.close();
        });
        dialog.showModal();
      };
  };
  let returnKey = null;
  bindForm('depositReturn', async (b, form) => {
    returnKey ||= uid();
    await api('/api/staff/deposit-returns', {
      quantity: b.quantity,
      deposit_cents: Math.round(Number(b.amount) * 100),
      request_key: returnKey,
    });
    returnKey = null;
    form.querySelector('[role=status]').textContent =
      `${money(Math.round(Number(b.amount) * 100) * Number(b.quantity))} Pfandrückgabe gebucht.`;
    rows = await api('/api/staff/sales');
    render();
  });
  for (const id of ['from', 'to'])
    document.querySelector('#' + id).onchange = render;
  document.querySelector('#refresh').onclick = safe(async () => {
    products = await api('/api/staff/products');
    rows = await api('/api/staff/sales');
    renderProducts();
    render();
  });
  document.querySelector('#export').onclick = () =>
    exportCsv('thekenverkauf.csv', [
      [
        'Zeitpunkt',
        'Position',
        'Art',
        'Menge',
        'Einzelbetrag in Cent',
        'Summe in Cent',
      ],
      ...filter(rows, 'created_at').map((r) => [
        r.created_at,
        r.product_name,
        saleKind(r),
        r.quantity,
        r.price_cents,
        r.quantity * r.price_cents,
      ]),
    ]);
  renderProducts();
  render();
}
