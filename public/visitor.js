const customerForm = document.querySelector("#customerForm");
const customerStatus = document.querySelector("#customerStatus");
const visitDateInput = customerForm.querySelector("[name='visitDate']");

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
    visitDateInput.value = new Date().toISOString().slice(0, 10);
    customerStatus.textContent = "Danke, der Eintrag ist gespeichert.";
  } else {
    customerStatus.textContent = response.error || "Speichern hat nicht geklappt.";
  }
});

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
