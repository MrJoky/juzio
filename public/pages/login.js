import { api } from '../lib/api.js';
import { esc } from '../lib/format.js';
import { heading } from '../lib/ui.js';
import { bindForm } from '../lib/forms.js';

export function loginPage(app, user) {
  app.innerHTML =
    heading(
      'Für das Team',
      'Einmal anmelden.',
      'Dein persönlicher Directus-Account öffnet alle Teambereiche.',
    ) +
    (user
      ? /* HTML */ `
          <div class="panel form-panel">
            <p>Du bist als ${esc(user.first_name || user.email)} angemeldet.</p>
            <a class="primary-button" href="/team">Zum Teambereich</a>
          </div>
        `
      : /* HTML */ `
          <form id="loginForm" class="panel login-panel">
            <label>
              E-Mail
              <input
                type="email"
                name="email"
                autocomplete="username"
                required
              />
            </label>
            <label>
              Passwort
              <input
                type="password"
                name="password"
                autocomplete="current-password"
                required
              />
            </label>
            <label>
              Einmalcode (nur bei aktivierter Zwei-Faktor-Anmeldung)
              <input
                name="otp"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="10"
              />
            </label>
            <button type="submit" class="primary-button">Anmelden</button>
            <p role="status"></p>
          </form>
        `);
  if (!user)
    bindForm('loginForm', async (b) => {
      await api('/api/login', b);
      location.assign('/team');
    });
}
