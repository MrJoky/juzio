import { api } from './api.js';
import { esc } from './format.js';
import { empty } from './ui.js';

export function renderNavigation(app, user, route) {
  if (!user) return;
  document.querySelector('#nav').innerHTML =
    [
      ['/', 'Eintragen'],
      ['/team', 'Team'],
      ['/raumliste', 'Raumliste'],
      ['/statistik', 'Statistik'],
      ['/theke', 'Theke'],
      ['/abstimmung-team', 'Abstimmung'],
      ['/qr', 'QR-Codes'],
    ]
      .map(
        ([href, label]) => /* HTML */ `
          <a href="${href}" ${route === href ? 'aria-current="page"' : ''}>
            ${label}
          </a>
        `,
      )
      .join('') + '<button id="logout" class="ghost-button">Abmelden</button>';
  document.querySelector('#logout').onclick = async () => {
    try {
      await api('/api/logout', {});
      location.assign('/');
    } catch (e) {
      app.innerHTML = empty(e.message);
    }
  };
}
