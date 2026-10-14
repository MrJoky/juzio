import { api } from './lib/api.js';
import { esc } from './lib/format.js';
import { heading, empty } from './lib/ui.js';
import { renderNavigation } from './lib/navigation.js';
import { roomPage } from './pages/raumeintragung.js';
import { loginPage } from './pages/login.js';
import { teamPage } from './pages/team.js';
import { entriesPage } from './pages/raumliste.js';
import { statsPage } from './pages/statistik.js';
import { salesPage } from './pages/theke.js';
import { votePage } from './pages/abstimmung.js';
import { pollTeamPage } from './pages/abstimmung-team.js';
import { qrPage } from './pages/qr.js';
import { privacyPage } from './pages/datenschutz.js';

const app = document.querySelector('#app');
const route = location.pathname;

const routes = {
  '/': roomPage,
  '/login': loginPage,
  '/team': teamPage,
  '/raumliste': entriesPage,
  '/statistik': statsPage,
  '/theke': salesPage,
  '/abstimmung': votePage,
  '/abstimmung-team': pollTeamPage,
  '/qr': qrPage,
};

async function init() {
  if (route === '/datenschutz') {
    await privacyPage(app);
    return;
  }
  const { user } = await api('/api/me');
  renderNavigation(app, user, route);
  if (!user && !['/', '/login', '/abstimmung'].includes(route)) {
    location.assign('/login');
    return;
  }
  await routes[route]?.(app, user);
}

window.addEventListener('pageshow', (event) => {
  if (event.persisted && route === '/abstimmung') {
    votePage(app).catch((error) => {
      app.innerHTML = empty(error.message);
    });
  }
});

init().catch((error) => {
  app.innerHTML =
    heading('JuZ.io', 'Gerade nicht erreichbar', error.message) +
    `<a class="primary-button" href="${esc(route)}">Erneut versuchen</a>`;
});
