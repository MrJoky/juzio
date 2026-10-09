# Betrieb, Sicherung und Wartung

## Voraussetzungen und Start

Node.js ab 22, npm und Docker Compose oder Podman installieren. Node und Container-Engine regelmäßig mit Sicherheitsupdates versorgen. Im Projektverzeichnis `./start.sh` ausführen. Das Skript erzeugt beim ersten Start `.env.local` mit zufälligen Geheimnissen und Dateirechten 0600, startet Directus, installiert festgelegte npm-Pakete und richtet das Schema ein. Bei bestehenden Daten bleiben Inhalte erhalten.

Die App läuft standardmäßig auf `0.0.0.0:3000`, Directus nur auf `127.0.0.1:8055`. Das CMS ist also nur am Server erreichbar. Keine Router-Portfreigaben einrichten. Das WLAN muss Verbindungen zwischen Handy und Laptop zulassen. Firewall auf das benötigte Hausnetz begrenzen, Bildschirm sperren und nach Möglichkeit Festplattenverschlüsselung verwenden. Directus-Admins können alle Daten lesen; lokale Rechneradministratoren ebenfalls.

Im Oktober 2026 ist **Directus 11.12.0 nur ein vorläufiger Bestandsstand mit bekannten Sicherheitslücken**. Die Lizenz für das benötigte Rollenmodell in einer aktualisierten Version wird vom Betreiber später organisiert. Siehe [Sicherheitsbericht](SICHERHEIT.md). Die App wird dadurch nicht für einen Internetbetrieb freigegeben.

## Konfiguration

| Variable | Bedeutung |
| --- | --- |
| `PORT`, `HOST` | App-Port und Bindeadresse; Standard 3000 / alle Interfaces |
| `DIRECTUS_URL` | internes CMS-Ziel; Standard http://127.0.0.1:8055 |
| `DIRECTUS_ADMIN_EMAIL`, `DIRECTUS_ADMIN_PASSWORD` | Erstadmin; Passwort später im CMS verwalten |
| `DIRECTUS_ADMIN_TOKEN` | Setup-Schlüssel mit Adminrechten; ausschließlich serverseitig |
| `DIRECTUS_SECRET` | Directus-Signierung und geheime Ableitung der IP-Stimmsperren; sicher aufbewahren |
| `PUBLIC_SERVICE_TOKEN` | interner Formularservice; niemals an den Browser weitergeben |
| `PUBLIC_URL` | App-Adresse für QR-Codes und zugelassener Host; HTTP(S)-Origin ohne Pfad/Benutzerdaten |
| `APP_SECURE_COOKIES` | `true` nur bei geprüftem HTTPS-Zugang; dann Cookies nur verschlüsselt versenden |

`.env.local` nicht ins Repository oder ungeschützt in E-Mails kopieren. `npm start` und `npm run dev` verwenden jetzt dieselbe `.env.local` wie das Startskript. Die alte `.env` wird nicht verwendet. Die Geheimnisdatei selbst nicht in der App anzeigen. Bei Verlust aus geschützter Sicherung wiederherstellen; das bloße Erzeugen neuer Schlüssel kann Zugriffe und Stimmsperren ändern.

## Stoppen

App: Strg+C. Directus separat stoppen:

```bash
podman stop juze-directus
# oder bei Docker Compose:
docker compose --env-file .env.local stop
```

Neustart der App erfordert erneute Team-Anmeldung. Die Datenbank liegt in Volumes. **Nicht `docker compose down -v` verwenden**: Das löscht Datenvolumes.

## Backup und Wiederherstellung

Vor Änderungen am CMS und jeder Migration eine konsistente Sicherung machen. App beenden, Directus stoppen und das Datenbank-Volume sowie Uploads exportieren. Unter Podman beispielsweise:

```bash
mkdir -p backups
podman stop juze-directus
podman volume export juze-directus-database --output backups/database.tar
podman volume export juze-directus-uploads --output backups/uploads.tar
podman start juze-directus
```

Dateinamen vor neuen Sicherungen mit Datum versehen, damit bestehende Backups nicht überschrieben werden. Zusätzlich `.env.local` verschlüsselt sichern. Bei Docker die tatsächlichen Volumenamen mit `docker volume ls` bestimmen und nach dem Docker-Volume-Backupverfahren sichern; sie hängen vom Compose-Projektnamen ab.

Eine Wiederherstellung zuerst auf einem getrennten Testsystem üben: neue Volumes anlegen, gesicherte Dateien importieren, dieselbe Directus-Version und geschützte Konfiguration verwenden, danach Teamlogin, Daten und Verkäufe prüfen. Produktive Daten nicht ungeprüft überschreiben. Vor Rückkehr in den Betrieb zwischenzeitliche Löschungen berücksichtigen. SQLite-Datenbank nicht im laufenden Schreibbetrieb einfach kopieren.

## Späterer Directus-Wechsel mit Lizenz

Der isolierte Test von **12.5.0** scheitert ohne passende Lizenz beim Erstellen der benötigten Rechte mit `403 RESOURCE_RESTRICTED`. Das Rollenmodell darf nicht durch Adminrechte für alle Nutzer oder durch öffentliche Datenfreigaben „repariert“ werden. Der produktive Server wurde nicht migriert.

1. Beim Träger Lizenz/Berechtigung für benutzerdefinierte Rechte und benötigte Benutzer/Collections klären. Den aktuellen Directus-Sicherheitsstand und Releasehinweise erneut prüfen. 12.5.0 ist der recherchierte Kandidat vom 9. Oktober, kein ungeprüfter Standard für alle zukünftigen Updates.
2. Datenbank, Uploads und `.env.local` sichern und eine Kopie in einem getrennten Testsystem verwenden.
3. Auf diesem Testsystem Image-Version in `compose.yaml` und `scripts/podman.mjs` gemeinsam anpassen. Die Vergleichsversion in `start.sh` ebenfalls anpassen. Die Startskripte blockieren einen abweichenden Bestandscontainer, um keine stille Migration durchzuführen.
4. In Directus 12 eine absolute Directus-`PUBLIC_URL` konfigurieren (nicht mit der App-`PUBLIC_URL` verwechseln). Lizenz über das CMS oder die Container-Variable `LICENSE_KEY` einrichten. Schlüssel nicht in Git speichern. Bei Container-Konfiguration `.env.local` verwenden und explizit an Directus durchreichen. Kein Schlüssel wurde in diesem Projekt hinterlegt.
5. Lizenzierung kann ausgehende Verbindungen zum Directus-Lizenzdienst verursachen. Der bisherige Satz „keine externen Dienste im Betrieb“ muss dann überprüft und in der Datenschutzseite entsprechend aktualisiert werden. Offline-Lizenzbedingungen separat prüfen.
6. Setup erneut ausführen und vollständige Tests gegen die Testinstanz laufen lassen. Besonders öffentliche Rechte, Teamrechte und Service-Filter auf aktive Daten prüfen; Lizenzverlust darf diese Grenzen nicht unwirksam machen. Wiederherstellung testen.
7. Erst danach in einem Wartungsfenster den bestehenden Container mit gleichem Datenvolume ersetzt starten. Unter Podman den alten Container nach Stoppen gezielt entfernen, **nicht die Volumes**; das Startskript kann den neuen Container erstellen. Unter Docker nach angepasster Konfiguration den Dienst neu erstellen. Bei Problemen aus der vor der Migration erstellten Sicherung wiederherstellen; kein blindes Downgrade auf eine bereits migrierte Datenbank.

Directus-Rate-Limiter, deaktivierte WebSockets, deaktivierte öffentliche Registrierung und reduzierte Logs sind in den Containerdefinitionen vorbereitet. Beim bestehenden Podman-Container werden geänderte Umgebungsvariablen durch bloßes Starten nicht übernommen; sie gelten erst nach bewusster Neuerstellung. Der App-Schutz gilt nach App-Neustart unabhängig davon.

## Prüfungen

```bash
npm test
DIRECTUS_INTEGRATION=1 node --env-file=.env.local --test
npm audit
```

Integrationstests erstellen Testkonten und Datensätze und entfernen sie anschließend. Nicht parallel mit einer Datenbereinigung laufen lassen. Sie benötigen ein eingerichtetes, erreichbares CMS und `.env.local`. `npm audit` prüft nur die npm-Abhängigkeiten der App, nicht alle Containerpakete, Systempakete oder künftigen Schwachstellen.

## Häufige Probleme

- **Handy erreicht die App nicht:** WLAN, Server-IP, Firewall, Port 3000 und Router-Isolation prüfen. Bei neuer IP QR-Codes neu drucken.
- **Serveradresse nicht freigegeben:** tatsächliche Adresse in `PUBLIC_URL` setzen; DNS-Aliasse werden nicht automatisch akzeptiert.
- **Login funktioniert nicht:** Konto aktiv, Rolle Juze Team, richtiges Passwort/OTP; `.env.local` und CMS prüfen. Ein Rollenwechsel oder entzogenes Statistik-Leserecht beendet auch die App-Sitzung.
- **Cookies fehlen:** Bei lokalem HTTP `APP_SECURE_COOKIES=false`; im Browser Cookies zulassen. Für HTTPS eine geprüfte Konfiguration verwenden.
- **Directus nicht erreichbar:** Containerstatus und lokale Portbindung prüfen. Logs nur intern ansehen; sie können technische Daten enthalten.
- **Abstimmung mehrfach/gar nicht möglich:** Netzwerk-IP, Cookies, bereits abgegebenen Status und Mitarbeitercode prüfen. Hinter NAT teilen Geräte möglicherweise eine Sperre; Proxybetrieb ist dafür nicht vorbereitet.

## Grenzen

Ein einzelner lokaler App-Prozess ist vorgesehen. Mehrere App-Prozesse teilen weder Team-Sitzungen noch Mitarbeitercodes oder die Sperre paralleler Statistikänderungen. Kein Internetbetrieb ohne separate HTTPS-, Proxy-, Firewall- und Datenschutzplanung. Durch einen unverschlüsselten Proxy werden Geräte-IP und Sperren anders bewertet; Weiterleitungsheader werden absichtlich nicht vertraut.
