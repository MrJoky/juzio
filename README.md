# Juze · Lokal im Jugendzentrum

Raumeintragung, Besucherstatistik, Thekenverkauf und Angebotsabstimmung mit lokalem Directus-CMS. Der Laptop ist der Server; Handys greifen im Haus-WLAN darauf zu. Im vorgesehenen lokalen Betrieb ohne Cloud-Datenspeicherung und ohne externe Analyse-Dienste. Für spätere Directus-Lizenzierung die möglichen Netzwerkverbindungen prüfen.

## Dokumentation

- [Bedienung aller Bereiche](docs/BEDIENUNG.md): Raumliste, Statistik, Verkauf/Pfand, Abstimmung, QR-Codes und Datenschutzseite.
- [Betrieb und Wartung](docs/BETRIEB.md): Installation, Konfiguration, Backups und spätere Migration.
- [Datenschutzorganisation](docs/DATENSCHUTZ.md): Datenverzeichnis, Platzhalter, Speicherungen und Löschung.
- [Sicherheitsprüfung](docs/SICHERHEIT.md): behobene Punkte, Prüfungen und offene Risiken.
- [Privates Repository und Leserechte](docs/REPOSITORY.md): Push und Zugriff für Außenstehende.

**Offen vor einer Sicherheitsfreigabe:** Directus 11.12.0 hat bekannte Sicherheitslücken. Der isolierte Updateversuch auf 12.5.0 scheitert ohne passende Lizenz am benötigten Rechtekonzept. Der Betreiber kümmert sich später um die Lizenz; die Bestandsversion bleibt vorläufig erhalten. Die Datenschutzseite enthält absichtlich Platzhalter und bleibt ein Entwurf bis zur Freigabe durch den Träger.

## Starten

Voraussetzungen: **Node.js ab 22**, npm und ein für deinen Benutzer nutzbares **Docker mit Compose oder Podman**. Beim ersten Start braucht der Laptop Internet für Container und npm-Pakete.

```bash
./start.sh
```

Das Skript erzeugt beim ersten Start `.env.local` mit zufälligen Zugangsdaten, startet Directus, installiert die festgelegten npm-Abhängigkeiten und richtet Sammlungen und Rollen ein. Anschließend läuft die App im Vordergrund.

- App am Laptop: **http://localhost:3000**
- Directus-CMS am Laptop: **http://localhost:8055**
- Erster Admin: **admin@example.org**, Passwort steht unter `DIRECTUS_ADMIN_PASSWORD` in `.env.local`.
- Die WLAN-Adressen werden beim Start angezeigt.

Mit **Strg+C** die App beenden. Directus läuft weiter; zum vollständigen Stoppen bei Podman `podman stop juze-directus`, bei Docker `docker compose --env-file .env.local stop`. Erneuter Start wieder mit `./start.sh`. Bestehende Daten und CMS-Inhalte bleiben erhalten. Nach einem App-Neustart meldet sich das Team erneut an.

`.env.local` enthält echte Zugangsdaten und interne Schlüssel. Nicht veröffentlichen. Die alte `.env` wird beim Startskript nicht verwendet.

## Seiten und Zugriff

| Seite | URL | Zugriff |
| --- | --- | --- |
| Raumeintragung für Jugendliche | `/` | Öffentlich |
| Datenschutzhinweise | `/datenschutz` | Öffentlich, Text durch Admin im CMS bearbeitbar |
| Login | `/login` | Öffentlich |
| Angebotsabstimmung | `/abstimmung` | Öffentlich über eigenen Link/QR-Code |
| Teamübersicht | `/team` | Angemeldet |
| Gespeicherte Raumeintragungen | `/raumliste` | Angemeldet |
| Besucherstatistik | `/statistik` | Angemeldet |
| Thekenverkauf | `/theke` | Angemeldet |
| Abstimmungsergebnisse | `/abstimmung-team` | Angemeldet |
| QR-Codes mit Druckansicht | `/qr` | Angemeldet |

Ohne Login enthält die Navigation nur Raumeintragung und Login. Die öffentliche Abstimmung ist trotzdem über ihren direkten QR-Link erreichbar. Jugendliche können Einträge speichern, aber keine gespeicherten Namen lesen. Alle Teamseiten verwenden dieselbe App-Sitzung mit persönlichem Directus-Konto.

## Kollegen und Inhalte in Directus

1. Am Laptop das CMS öffnen und als Admin anmelden.
2. Unter **Benutzerverwaltung** einen Benutzer mit gültiger E-Mail-Adresse und Passwort anlegen, Status **Aktiv**, Rolle **Juze Team**. Eine echte zustellbare Adresse ist für den lokalen Passwortlogin nicht notwendig, das E-Mail-Format muss Directus akzeptieren. Die Anlage funktioniert ohne Mailversand.
3. Kollegen melden sich unter `/login` mit diesen persönlichen Daten an. Bei aktivierter Zwei-Faktor-Anmeldung zusätzlich den Einmalcode eingeben.

Die automatisch erzeugte Formular-Servicekennung ist nur für die App bestimmt und erhält keinen Teamzugriff. Kollegen benötigen keine Administratorrechte. Directus selbst ist nur am Server-Laptop erreichbar.

| Sammlung im CMS | Zweck |
| --- | --- |
| `privacy_pages` | Öffentliche Datenschutzhinweise, Text und Freigabestatus nur durch Admin bearbeiten |
| `rooms` | Räume anlegen, benennen, über `active` anbieten |
| `room_entries` | Gespeicherte Raumeintragungen |
| `visitor_statistics` | Besuchszählung mit Datum, Alter, Geschlecht, Anzahl und Notiz |
| `products` | Thekenprodukte; `price_cents` ist der Preis in Cent, `active` steuert die Verkaufsauswahl |
| `sales` | Einzelne Buchungen mit synchronisiertem Warenpreis, Menge und Mitarbeiter-ID |
| `polls` | Titel, Beschreibung, gewünschte Woche und Zeitraum der Abstimmung |
| `poll_options` | Angebote einer Abstimmung zuordnen |
| `votes` | Gespeicherte Stimmen; Ergebnisse im Teambereich |

**Abstimmung erstellen:** In `polls` einen Titel eintragen, `week_of` auf den Montag der gewünschten Woche setzen und `active` aktivieren. `starts_at` und `ends_at` begrenzen optional den Abstimmungszeitraum. Dann in `poll_options` für jedes Angebot einen Namen vergeben, unter `poll` die Abstimmung auswählen und `active` aktivieren. Zum Schließen die Abstimmung deaktivieren oder ein Enddatum setzen. Für jede neue Woche eine neue Abstimmung anlegen, damit bisherige Stimmen erhalten bleiben.

Vor jeder Stimme ist ein sechsstelliger Mitarbeitercode erforderlich. Er wird ausschließlich angemeldeten Mitarbeitenden unter **Abstimmung** angezeigt, läuft nach zehn Sekunden ab und kann nur einmal benutzt werden. Nach Verwendung erscheint automatisch ein neuer Code. Jugendliche wählen zuerst ein Angebot, fragen das Team nach dem aktuellen Code und senden sofort ab. Alte Codes und Codes anderer Abstimmungen werden abgewiesen; bei einem App-Neustart verfallen alle Codes. Pro IP sind höchstens zehn Abstimmungsversuche pro Minute erlaubt. Das Team gibt den Code persönlich aus und achtet darauf, dass jede Person nur einmal teilnimmt. Codes allein identifizieren keine Personen: Wer erneut einen gültigen Code bekommt und zugleich Browserdaten und IP wechselt, kann erneut teilnehmen. Die Codes gelten für einen einzelnen laufenden App-Server.

Eine Stimme pro Abstimmung wird ohne Anmeldung über Cookie und Geräte-IP geprüft. Beide Kennungen haben einen eindeutigen Datenbankschlüssel, sodass auch gleichzeitige Versuche keine doppelten Stimmen speichern. Das Abstimmungs-Cookie wird für 30 Tage gesetzt; die LocalStorage-Markierung bleibt bis zur Löschung der Browserdaten. Beim Öffnen wird der Status vom Server geladen; LocalStorage sperrt zusätzlich andere offene Tabs. Die IP-Sperre bleibt bei neuem Browser, gelöschten Browserdaten, erneutem QR-Scan und App-Neustart erhalten, solange die Geräte-IP gleich bleibt. IP-Adressen werden nur als mit dem Servergeheimnis gehashte, pro Abstimmung unterschiedliche Kennung gespeichert. Weiterleitungsheader werden nicht als Geräte-IP übernommen.

Die App muss wie vorgesehen direkt im Haus-WLAN erreichbar sein: Geräte mit derselben IP teilen die Sperre, bei einer neuen IP und neuen Browserdaten ist erneute Teilnahme möglich. Das Servergeheimnis `DIRECTUS_SECRET` muss erhalten bleiben. Ältere Stimmen haben keine IP-Kennung und können nachträglich keiner Geräte-IP zugeordnet werden; die zusätzliche Sperre gilt für ab ihrer Einführung gespeicherte Stimmen.


In der **Raumliste** öffnet „Bearbeiten“ ein Formular für Datum, Uhrzeit, Raum, Name und weitere Gäste. In der **Besucherstatistik** werden Einträge pro Tag, Altersgruppe und Geschlecht zusammengefasst. Die Uhrzeitspalte zeigt die erfassten Uhrzeiten der Gruppe. Mit ▲/▼ lässt sich die Anzahl direkt um eins erhöhen oder verringern; jeder Klick wird sofort gespeichert. Beim Verringern bleibt ein Eintrag mit null Besuchen erhalten. Das Formular oben dient weiterhin der Erfassung einschließlich Uhrzeit. Der CSV-Export enthält dieselben zusammengefassten Werte und Uhrzeiten. „Abbrechen“ verwirft Änderungen. Nach dem Speichern werden die Listen und Statistikwerte aktualisiert; CSV-Exporte berücksichtigen die Korrekturen. Bearbeiten ist ausschließlich für angemeldete Teammitglieder möglich.

**Produkte mit Pfand:** Unter **Theke → Pfand einstellen** am Produkt „Produkt mit Pfand“ aktivieren und den Betrag pro Stück in Euro setzen (z. B. 0,25 €). Alternativ in Directus `has_deposit` aktivieren und `deposit_cents` in Cent pflegen. Der Produktpreis ist ohne Pfand. Beim Verkauf werden Ware und Pfand automatisch als zwei Positionen gemeinsam gespeichert, jeweils für die verkaufte Menge. Warenpreisänderungen aktualisieren auch frühere Warenpositionen. Gebuchte Pfandbeträge bleiben erhalten.

**Pfandrückgabe:** In der Theke unter „Pfand zurückzahlen“ Pfandbetrag und Anzahl zurückgegebener Behälter eingeben. Die Auszahlung wird als eigene negative Position gebucht; es werden keine alten Verkaufspositionen gelöscht. Rückgaben funktionieren auch an einem späteren Tag oder nach einer Produktpreisänderung; den tatsächlich ausgezahlten Pfandbetrag eingeben. Nicht zurückgegebenes Pfand bleibt als Einnahme stehen. Die Übersicht und der CSV-Export trennen Ware, Pfand und Rückgaben. „Kassenbewegung“ ist Warenumsatz plus Pfandeinnahmen minus Rückzahlungen im gewählten Zeitraum. Ein anfänglicher Kassenbestand und sonstige Bargeldbewegungen werden bisher nicht erfasst; der Wert ist deshalb die Veränderung aus diesen Buchungen, kein vollständiger Bargeldbestand.

Änderungen an `products.price_cents` aktualisieren über einen Directus-Flow alle verknüpften Waren-Verkaufseinträge, auch rückwirkend. Einzelbeträge, Warenumsatz, Kassenbewegung und CSV-Summen verwenden diese aktualisierten Preise. In der Theke nach einer CMS-Änderung **Aktualisieren** wählen. Pfandpositionen und Rückgaben behalten ihren gebuchten Betrag; Einträge ohne Produktverknüpfung bleiben unverändert. Es gibt keinen täglichen Zählerreset; der Zeitraumfilter zeigt Tagesumsätze und frühere Verkäufe. Besucherstatistik zählt erfasste Besuche, keine eindeutig identifizierten Personen. Raumeintragungen und Besucherstatistik werden getrennt erfasst. CSV-Exporte stehen auf den jeweiligen Teamseiten zur Verfügung.

## WLAN und QR-Codes

Im Team unter **QR-Codes** die Links für Raumeintragung und Abstimmung anzeigen und ausdrucken. Container-Bridges und bekannte VPN-Schnittstellen werden ausgeblendet. Bei mehreren Netzwerkschnittstellen entstehen Codes für mehrere IP-Adressen: die WLAN-Adresse wählen. Optional in `.env.local` die feste Adresse konfigurieren:

```dotenv
PUBLIC_URL=http://192.168.1.50:3000
```

Danach App neu starten. `PUBLIC_URL` legt nur das Ziel der QR-Codes fest; die App lauscht standardmäßig auf allen Netzwerkadressen. Eine feste DHCP-Zuweisung im Router verhindert, dass Ausdrucke nach einer IP-Änderung unbrauchbar werden.

Handy und Laptop müssen sich erreichen können. Gastnetz-Isolation oder eine Firewall können das trotz gleichem WLAN verhindern. Port **3000/TCP** muss im lokalen Netz erreichbar sein. Der Laptop muss eingeschaltet sein und darf während der Nutzung nicht schlafen. Das System verwendet lokales HTTP; für Zugriff über das Internet ist es nicht konfiguriert.

## Daten und Sicherung

Die Daten liegen im persistenten Container-Volume, nicht im Container-Dateisystem:

- Podman: `juze-directus-database` und `juze-directus-uploads`
- Docker Compose: die Volumes `directus_database` und `directus_uploads` des Projekts

Die alten Dateien in `data/` bleiben unverändert erhalten, werden von der neuen App aber nicht mehr genutzt. Beim Umbau waren die bisherigen Raum- und Statistikeinträge leer und alle Verkaufszähler null; es mussten keine Bestandsdaten übernommen werden.

Für ein konsistentes Podman-Backup die App beenden und dann beispielsweise:

```bash
mkdir -p backups
podman stop juze-directus
podman volume export juze-directus-database --output backups/database.tar
podman volume export juze-directus-uploads --output backups/uploads.tar
podman start juze-directus
```

Zusätzlich `.env.local` sicher aufbewahren. Backups enthalten personenbezogene Eintragungen. Container-Volumes nicht löschen; `docker compose down -v` entfernt die Daten. Die Directus-Version ist in `compose.yaml` und `scripts/podman.mjs` festgelegt; vor einem Versionswechsel Daten sichern und beide Stellen gemeinsam anpassen.

## Prüfungen

```bash
npm test
DIRECTUS_INTEGRATION=1 node --env-file=.env.local --test tests/directus.test.mjs
```

Die Integrationstests benötigen laufendes, eingerichtetes Directus. Sie prüfen echte CRUD-Vorgänge, Teamrechte, doppelte Verkäufe, doppelte Stimmen und QR-Codes. Testdaten und Testbenutzer werden anschließend gelöscht.

Technischer Aufbau: Node.js als Webserver und API, Directus mit SQLite als CMS. Persönliche Directus-Tokens bleiben auf dem Server; der Browser erhält eine HttpOnly-Sitzung. Der Formularservice hat nur Lesezugriff auf aktive Räume und Abstimmungen sowie Schreibzugriff auf Raumeintragungen und Stimmen. Für den eigenen Abstimmungsstatus darf er ausschließlich gehashte Browser- und IP-Kennungen lesen; der Browser erhält nur den Status seiner eigenen Abstimmungen. Die öffentliche Directus-Rolle hat keine Datenrechte. Servervalidierung, Anfragelimits und Herkunftsprüfung schützen die Schreibendpunkte.

Directus-Grundlagen: [lokale Bereitstellung und persistente Volumes](https://directus.com/docs/self-hosting/deploying), [Benutzer, Rollen und Zugriffsrichtlinien](https://docs.directus.io/user-guide/user-management/users-roles-permissions).
