# Betrieb, Sicherung und Wartung

## Voraussetzungen und Start

Node.js ab 22, npm und Docker Compose oder Podman installieren. Node und Container-Engine regelmäßig mit Sicherheitsupdates versorgen. Im Projektverzeichnis `./start.sh` ausführen. Das Skript erzeugt beim ersten Start `.env.local` mit zufälligen Geheimnissen und Dateirechten 0600, startet Directus, installiert festgelegte npm-Pakete und richtet das Schema ein. Bei bestehenden Daten bleiben Inhalte erhalten.

Die App läuft standardmäßig auf `0.0.0.0:3000`, Directus nur auf `127.0.0.1:8056`. Das CMS ist also nur am Server erreichbar. Keine Router-Portfreigaben einrichten. Das WLAN muss Verbindungen zwischen Handy und Laptop zulassen. Firewall auf das benötigte Hausnetz begrenzen, Bildschirm sperren und nach Möglichkeit Festplattenverschlüsselung verwenden. Directus-Admins können alle Daten lesen; lokale Rechneradministratoren ebenfalls.

Seit 14. Oktober 2026 läuft **Directus 12.5.0 mit aktiver Open-Innovation-Grant-Lizenz**. Die Lizenz erfordert ausgehende Lizenz- und Telemetrieverbindungen. Die App bleibt für den lokalen Betrieb vorgesehen; eine Internetfreigabe erfolgt dadurch nicht.

## Produktname und bestehende Installationen

Das Produkt heißt **JuZ.io**, das npm-Paket `juzio`. Das Setup benennt die bisherigen Teamrollen, Policies, Standard-Dashboards und den Preis-Flow um und erhält dabei deren IDs und Rechte. Eigene Dashboardnamen bleiben erhalten. Der Directus-Projektname lautet ebenfalls JuZ.io.

Die internen Container-/Volumenamen `juze-directus*`, die Sitzungscookie-Kennung `juze_session` und bestehende Collection-Schlüssel `juze_*` bleiben aus Kompatibilitätsgründen erhalten. Ebenso bleibt der UUID-Namensraum der Dashboards unverändert; sonst würden neue Dashboards entstehen. Die Markenänderung ändert weder Geschäftsdaten noch die Lizenzbindung oder die lokale Serveradresse.

## Konfiguration

| Variable | Bedeutung |
| --- | --- |
| `PORT`, `HOST` | App-Port und Bindeadresse; Standard 3000 / alle Interfaces |
| `DIRECTUS_URL` | internes CMS-Ziel; Standard http://127.0.0.1:8056 |
| `DIRECTUS_ADMIN_EMAIL`, `DIRECTUS_ADMIN_PASSWORD` | Erstadmin; Passwort später im CMS verwalten |
| `DIRECTUS_ADMIN_TOKEN` | Setup-Schlüssel mit Adminrechten; ausschließlich serverseitig |
| `DIRECTUS_SECRET` | Directus-Signierung; sicher aufbewahren |
| `PUBLIC_SERVICE_TOKEN` | interner Formularservice; niemals an den Browser weitergeben |
| `PUBLIC_URL` | App-Adresse für QR-Codes und zugelassener Host; HTTP(S)-Origin ohne Pfad/Benutzerdaten |
| `APP_SECURE_COOKIES` | `true` nur bei geprüftem HTTPS-Zugang; dann Cookies nur verschlüsselt versenden |

`.env.local` nicht ins Repository oder ungeschützt in E-Mails kopieren. `npm start` und `npm run dev` verwenden jetzt dieselbe `.env.local` wie das Startskript. Die alte `.env` wird nicht verwendet. Die Geheimnisdatei selbst nicht in der App anzeigen. Bei Verlust aus geschützter Sicherung wiederherstellen; das bloße Erzeugen neuer Schlüssel kann Zugriffe und Stimmsperren ändern.

## Stoppen

App: Strg+C. Directus separat stoppen:

```bash
podman stop juze-directus-v12
# oder bei Docker Compose:
docker compose --env-file .env.local stop
```

Neustart der App erfordert erneute Team-Anmeldung. Die Datenbank liegt in Volumes. **Nicht `docker compose down -v` verwenden**: Das löscht Datenvolumes.

## Backup und Wiederherstellung

Vor Änderungen am CMS und jeder Migration eine konsistente Sicherung machen. App beenden, Directus stoppen und das Datenbank-Volume sowie Uploads exportieren. Unter Podman beispielsweise:

```bash
mkdir -p backups
podman stop juze-directus-v12
podman volume export juze-directus-v12-database --output backups/database.tar
podman volume export juze-directus-v12-uploads --output backups/uploads.tar
podman start juze-directus-v12
```

Dateinamen vor neuen Sicherungen mit Datum versehen, damit bestehende Backups nicht überschrieben werden. Zusätzlich `.env.local` verschlüsselt sichern. Bei Docker die tatsächlichen Volumenamen mit `docker volume ls` bestimmen und nach dem Docker-Volume-Backupverfahren sichern; sie hängen vom Compose-Projektnamen ab.

Eine Wiederherstellung zuerst auf einem getrennten Testsystem üben: neue Volumes anlegen, gesicherte Dateien importieren, dieselbe Directus-Version und geschützte Konfiguration verwenden, danach Teamlogin, Daten und Verkäufe prüfen. Produktive Daten nicht ungeprüft überschreiben. Vor Rückkehr in den Betrieb zwischenzeitliche Löschungen berücksichtigen. SQLite-Datenbank nicht im laufenden Schreibbetrieb einfach kopieren.

## Directus 12 und Lizenz

Die produktive Instanz läuft seit 14. Oktober 2026 als `juze-directus-v12` unter **http://localhost:8056**. `./start.sh` startet diese Instanz und verbindet die App mit ihr. Die Volumes heißen `juze-directus-v12-database` und `juze-directus-v12-uploads`. Der frühere Container `juze-directus` bleibt gestoppt als Rückfallbestand erhalten und wird vom Startskript nicht gestartet.

Vor der Übernahme wurden beide Instanzen konsistent unter `backups/directus-cutover-v12-1791972389937/` gesichert. Übernommen wurden der aktuelle Stand aller neun Fachsammlungen, die Aktivitäts-/Änderungshistorie und die bestehenden Benutzer einschließlich Passwort-Hashes. Rollen, Policies und Zugriffe waren identisch. Die lizenzierte v12-Projektkonfiguration blieb erhalten. Es gab keine hochgeladenen Dateien. Nach der Übernahme wurden Setup und Integrationstests ausgeführt.

Die Lizenz wird unter **Einstellungen → Lizenz** verwaltet und bleibt in der Datenbank; kein Schlüssel liegt im Repository. Die Directus-`PUBLIC_URL` bleibt `http://localhost:8056`, damit die bestehende Lizenzbindung gültig bleibt. Für neue Container kann sie über `DIRECTUS_PUBLIC_URL` gesetzt werden; diese Variable betrifft Directus, während `PUBLIC_URL` die App-Adresse steuert. Ein Adresswechsel erfordert die geordnete Deaktivierung und erneute Aktivierung der Lizenz. Die Lizenz erfordert Telemetrie; `TELEMETRY=false` allein garantiert bei dieser Lizenz keine Abschaltung. Lizenzverlust kann Team- und Formularberechtigungen einschränken. Bei Problemen keine öffentlichen Rechte oder Adminrechte als Ersatz vergeben.

Sicherung mit den aktuellen Volumes:

```bash
podman stop juze-directus-v12
podman volume export juze-directus-v12-database --output backups/v12-database.tar
podman volume export juze-directus-v12-uploads --output backups/v12-uploads.tar
podman start juze-directus-v12
```

Vorher die App beenden und eindeutige Dateinamen verwenden. Für einen Rückfall den gesicherten v11-Bestand separat starten und die App-Verbindung ausdrücklich zurückstellen. Seit dem Wechsel neu entstandene Daten werden dabei nicht automatisch zurückübertragen. Keine v12-Datenbank mit v11 starten. Den lizenzierten Projektbestand nicht ohne Lizenzdeaktivierung löschen.

Bei Docker Compose bleibt der Versionsvergleich als Schutz vor einer ungeprüften Migration erhalten. Ein alter Compose-Container wird nicht automatisch migriert. Podman legt bei erkanntem v11-Container ohne vorbereiteten v12-Container ebenfalls keinen leeren Ersatz an.

## Prüfungen

```bash
npm test
npm run test:installer
npm run test:sandbox
npm audit
```

Die normalen Tests sind vom produktiven CMS getrennt. Die Sandbox erzeugt eine eigene frische Directus-Instanz und räumt sie wieder auf. Betriebssystemmatrix, Befehle und Lizenzgrenzen stehen in [Testumgebungen](TESTUMGEBUNG.md).

Die vollständigen App-/Insights-Integrationstests benötigen ein bewusst ausgewähltes, separat eingerichtetes und passend lizenziertes Test-CMS. Dafür eine eigene, nicht versionierte `.env.integration` mit dessen `DIRECTUS_URL`, `DIRECTUS_ADMIN_TOKEN`, `PUBLIC_SERVICE_TOKEN` und `DIRECTUS_INTEGRATION=1` anlegen. Keine produktive `.env.local` übernehmen. Dann plattformübergreifend:

```sh
node --env-file=.env.integration --test --test-concurrency=1 tests/directus.test.mjs tests/insights.test.mjs
```

Diese Integrationstests erstellen Konten und Datensätze und entfernen sie anschließend. Nicht parallel mit einer Datenbereinigung laufen lassen. `npm audit` prüft nur die npm-Abhängigkeiten der App, nicht alle Containerpakete, Systempakete oder künftigen Schwachstellen.

## Häufige Probleme

- **Port bereits belegt / address already in use:** Die App läuft möglicherweise bereits. `http://localhost:3000` öffnen oder die laufende Instanz mit Strg+C in ihrem Terminal beenden und anschließend `./start.sh` erneut ausführen. Bei abweichendem `PORT` die konfigurierte Portnummer verwenden.
- **Handy erreicht die App nicht:** WLAN, Server-IP, Firewall, Port 3000 und Router-Isolation prüfen. Bei neuer IP QR-Codes neu drucken.
- **Serveradresse nicht freigegeben:** tatsächliche Adresse in `PUBLIC_URL` setzen; DNS-Aliasse werden nicht automatisch akzeptiert.
- **Login funktioniert nicht:** Konto aktiv, Rolle JuZ.io Team, richtiges Passwort/OTP; `.env.local` und CMS prüfen. Ein Rollenwechsel oder entzogenes Statistik-Leserecht beendet auch die App-Sitzung.
- **Cookies fehlen:** Bei lokalem HTTP `APP_SECURE_COOKIES=false`; im Browser Cookies zulassen. Für HTTPS eine geprüfte Konfiguration verwenden.
- **Directus nicht erreichbar:** Containerstatus und lokale Portbindung prüfen. Logs nur intern ansehen; sie können technische Daten enthalten.
- **Abstimmung mehrfach/gar nicht möglich:** Öffnungszeit, aktives Angebot und aktuellen Mitarbeitercode prüfen. Ein Code gilt zehn Sekunden und einmal; Browser und IP sperren keine weiteren Stimmen mit neuen Codes.

## Grenzen

Ein einzelner lokaler App-Prozess ist vorgesehen. Mehrere App-Prozesse teilen weder Team-Sitzungen noch Mitarbeitercodes oder die Sperre paralleler Statistikänderungen. Kein Internetbetrieb ohne separate HTTPS-, Proxy-, Firewall- und Datenschutzplanung. Durch einen unverschlüsselten Proxy werden Geräte-IP und allgemeine Anfragelimits anders bewertet; Weiterleitungsheader werden absichtlich nicht vertraut.
