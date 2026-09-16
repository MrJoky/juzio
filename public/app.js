const customerForm = document.querySelector("#customerForm");
const customerStatus = document.querySelector("#customerStatus");
const loginForm = document.querySelector("#loginForm");
const loginStatus = document.querySelector("#loginStatus");
const staffApp = document.querySelector("#staffApp");
const logoutButton = document.querySelector("#logoutButton");
const submissionsList = document.querySelector("#submissionsList");
const refreshSubmissions = document.querySelector("#refreshSubmissions");
const cashierList = document.querySelector("#cashierList");
const cashierTotal = document.querySelector("#cashierTotal");
const offerForm = document.querySelector("#offerForm");
const exportCashier = document.querySelector("#exportCashier");
const resetCashier = document.querySelector("#resetCashier");
const submissionsView = document.querySelector("#submissionsView");
const cashierView = document.querySelector("#cashierView");
const visitDateInput = customerForm.querySelector("[name='visitDate']");

let cashier = { offers: [] };

visitDateInput.value = new Date().toISOString().slice(0, 10);

customerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  customerStatus.textContent = "Speichere...";

  const response = await api("/api/customer-submissions", {
    method: "POST",
    body: formJson(customerForm)
  });

  if (response.ok) {
    customerForm.reset();
    customerStatus.textContent = "Danke, der Eintrag ist gespeichert.";
  } else {
    customerStatus.textContent = response.error || "Speichern hat nicht geklappt.";
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginStatus.textContent = "Pruefe...";

  const response = await api("/api/login", {
    method: "POST",
    body: formJson(loginForm)
  });

  if (response.ok) {
    loginForm.hidden = true;
    staffApp.hidden = false;
    loginStatus.textContent = "";
    await Promise.all([loadSubmissions(), loadCashier()]);
  } else {
    loginStatus.textContent = response.error || "Anmeldung fehlgeschlagen.";
  }
});

logoutButton.addEventListener("click", async () => {
  await api("/api/logout", { method: "POST" });
  staffApp.hidden = true;
  loginForm.hidden = false;
  loginForm.reset();
});

refreshSubmissions.addEventListener("click", loadSubmissions);

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("is-active"));
    button.classList.add("is-active");
    const showCashier = button.dataset.tab === "cashier";
    submissionsView.hidden = showCashier;
    cashierView.hidden = !showCashier;
  });
});

offerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(offerForm);
  const name = String(data.get("name") || "").trim();
  const priceCents = euroToCents(String(data.get("price") || ""));

  if (!name || priceCents < 0) return;
  cashier.offers.push({
    id: crypto.randomUUID(),
    name,
    priceCents,
    sold: 0
  });
  offerForm.reset();
  await saveCashier();
});

exportCashier.addEventListener("click", () => {
  const rows = [["Angebot", "Preis", "Verkauft", "Summe"]];
  cashier.offers.forEach((offer) => {
    rows.push([
      offer.name,
      centsToEuroNumber(offer.priceCents),
      offer.sold,
      centsToEuroNumber(offer.priceCents * offer.sold)
    ]);
  });
  downloadCsv(`juze-theke-${new Date().toISOString().slice(0, 10)}.csv`, rows);
});

resetCashier.addEventListener("click", async () => {
  if (!confirm("Alle Verkaufszaehler auf 0 setzen?")) return;
  cashier = await api("/api/staff/cashier/reset", { method: "POST" });
  renderCashier();
});

async function loadSubmissions() {
  const submissions = await api("/api/staff/submissions");
  if (!Array.isArray(submissions)) return;

  submissionsList.innerHTML = submissions.length
    ? submissions.map(renderSubmission).join("")
    : `<div class="entry-card"><strong>Noch keine Eintraege.</strong></div>`;
}

async function loadCashier() {
  cashier = await api("/api/staff/cashier");
  renderCashier();
}

async function saveCashier() {
  cashier = await api("/api/staff/cashier", {
    method: "POST",
    body: cashier
  });
  renderCashier();
}

function renderSubmission(entry) {
  const guestText = entry.guests ? escapeHtml(entry.guests).replaceAll("\n", "<br>") : "Keine Gaeste eingetragen";
  return `
    <article class="entry-card">
      <strong>${escapeHtml(entry.roomType)}</strong>
      <span class="entry-meta">${formatVisit(entry.visitDate, entry.visitTime)} · gespeichert ${formatDate(entry.createdAt)}</span>
      <span>Hauptbesucher: <strong>${escapeHtml(entry.mainVisitor)}</strong></span>
      <p>Gaeste:<br>${guestText}</p>
    </article>
  `;
}

function renderCashier() {
  const offers = Array.isArray(cashier.offers) ? cashier.offers : [];
  cashierList.innerHTML = offers.length
    ? offers.map(renderOffer).join("")
    : `<div class="cashier-item"><strong>Noch keine Angebote.</strong></div>`;
  cashierTotal.textContent = formatCents(totalCents());

  cashierList.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const offer = cashier.offers.find((item) => item.id === button.dataset.id);
      if (!offer) return;

      if (button.dataset.action === "minus") offer.sold = Math.max(0, offer.sold - 1);
      if (button.dataset.action === "plus") offer.sold += 1;
      if (button.dataset.action === "delete") {
        cashier.offers = cashier.offers.filter((item) => item.id !== offer.id);
      }

      await saveCashier();
    });
  });
}

function renderOffer(offer) {
  const subtotal = offer.priceCents * offer.sold;
  return `
    <article class="cashier-item">
      <div>
        <div class="cashier-title">${escapeHtml(offer.name)}</div>
        <div class="cashier-meta">${formatCents(offer.priceCents)} pro Stueck · ${formatCents(subtotal)}</div>
      </div>
      <div class="stepper" aria-label="${escapeHtml(offer.name)} verkauft">
        <button class="icon-button" type="button" data-action="minus" data-id="${offer.id}" aria-label="Weniger">-</button>
        <span class="sold-count">${offer.sold}</span>
        <button class="icon-button" type="button" data-action="plus" data-id="${offer.id}" aria-label="Mehr">+</button>
      </div>
      <strong>${formatCents(subtotal)}</strong>
      <button class="danger-button" type="button" data-action="delete" data-id="${offer.id}">Loeschen</button>
    </article>
  `;
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, ...data };
  return data;
}

function formJson(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function totalCents() {
  return cashier.offers.reduce((sum, offer) => sum + offer.priceCents * offer.sold, 0);
}

function formatCents(cents) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
  }).format(cents / 100);
}

function centsToEuroNumber(cents) {
  return String((cents / 100).toFixed(2)).replace(".", ",");
}

function euroToCents(value) {
  const normalized = value.replace(",", ".").replace(/[^0-9.]/g, "");
  return Math.round(Number(normalized || 0) * 100);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatVisit(date, time) {
  if (!date && !time) return "Kein Datum";
  const formattedDate = date
    ? new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(new Date(`${date}T00:00:00`))
    : "Kein Datum";
  return `${formattedDate}${time ? ` um ${time} Uhr` : ""}`;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(csvCell).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
