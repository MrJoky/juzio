# Server einrichten und betreiben

## Hausnetz vorbereiten

JuZ.io läuft dauerhaft auf einem Linux-Server mit Docker Engine und Compose v2. Die App und das CMS (Directus zur Verwaltung der Inhalte) werden direkt im Browser geöffnet. Büro-PCs sind über das Hausnetz verbunden, Handys über das Haus-WLAN. Der Server läuft unabhängig davon, welche Geräte gerade eingeschaltet sind.

Die Administration richtet eine feste Server-IP und zwei DNS-Namen im Hausnetz ein, beispielsweise:

| Dienst | Beispieladresse |
| --- | --- |
| App und QR-Codes | `https://juzio.home.arpa` |
| CMS für Mitarbeitende und Administration | `https://cms.juzio.home.arpa` |

Beide Namen müssen von den Büro-PCs und im Haus-WLAN auf dieselbe Server-IP aufgelöst werden. WLAN-Isolation, getrennte Netzbereiche und Firewallregeln müssen den Zugriff auf den Server erlauben. Die Ports 80 und 443 werden an dessen Hausnetz-IP gebunden. Keine Router-Portfreigabe ins Internet einrichten. Der Server benötigt ausgehenden Internetzugang für Paketdownloads sowie Directus-Lizenzprüfung und Telemetrie.

Docker beim Booten starten lassen. Die App, Directus und Caddy starten dann nach einem Serverneustart automatisch. Node.js und npm laufen im App-Container und müssen auf dem Server nicht separat installiert sein.

## Konfiguration anlegen

Im Projektverzeichnis:

```bash
cp .env.server.example .env.server
chmod 600 .env.server
```

In `.env.server` folgende Werte eintragen:

| Variable | Bedeutung |
| --- | --- |
| `SERVER_LAN_IP` | Feste IPv4-Adresse des Servers im Hausnetz |
| `PUBLIC_URL` | HTTPS-Adresse der App ohne weiteren Pfad |
| `DIRECTUS_PUBLIC_URL` | Eigene HTTPS-Adresse des CMS ohne weiteren Pfad |
| `DIRECTUS_ADMIN_EMAIL` | E-Mail-Adresse für den ersten Administrator |
| `DIRECTUS_ADMIN_PASSWORD` | Passwort für dessen erste Anmeldung |
| `DIRECTUS_ADMIN_TOKEN` | Schlüssel für die automatische Einrichtung |
| `DIRECTUS_SECRET` | Signierungsschlüssel von Directus |
| `PUBLIC_SERVICE_TOKEN` | Schlüssel für den internen Formularservice |

App- und CMS-Adresse müssen verschieden sein. Für die vier Geheimnisse jeweils einen eigenen Wert mit `openssl rand -hex 32` erzeugen. Zugangsdaten geschützt aufbewahren; Zugriff auf Docker und Server-Backups erlaubt auch Zugriff auf diese Werte.

## CMS zum ersten Mal öffnen

Zunächst nur Directus und den HTTPS-Zugang starten:

```bash
docker compose -f compose.server.yaml --env-file .env.server up -d directus proxy
```

Der erste Start kann wegen des Containerdownloads etwas dauern. Das CMS ist anschließend unter der eingetragenen `DIRECTUS_PUBLIC_URL` erreichbar. Die App wird erst nach Lizenzaktivierung und Einrichtung gestartet.

### HTTPS im Hausnetz einrichten

Die mitgelieferte Konfiguration nutzt Caddys interne Zertifizierungsstelle. Dadurch ist kein öffentlich erreichbarer Server nötig. Damit Browser den Zertifikaten vertrauen, muss die Administration das öffentliche Stammzertifikat auf den verwendeten Büro-PCs und Handys als vertrauenswürdig einrichten. Eine WLAN-Verbindung allein installiert dieses Vertrauen nicht.

Stammzertifikat auf dem Server exportieren:

```bash
docker compose -f compose.server.yaml --env-file .env.server cp proxy:/data/caddy/pki/authorities/local/root.crt /tmp/juzio-root.crt
```

Nur diese öffentliche Zertifikatsdatei über einen vertrauenswürdigen Weg an die Geräte verteilen. Die Installation hängt von Betriebssystem und Geräteverwaltung ab; bei iOS muss das Stammzertifikat zusätzlich ausdrücklich für SSL als vertrauenswürdig aktiviert werden. Zertifikatswarnungen vor dem Login beheben.

Falls beliebige private Handys ohne Zertifikatsinstallation zugreifen sollen, muss die Haus-IT stattdessen öffentlich vertrauenswürdige Zertifikate für eigene Domainnamen bereitstellen, etwa über DNS-Validierung. Die interne Erreichbarkeit kann dabei erhalten bleiben. Dafür `tls internal` in beiden Blöcken von `Caddyfile.server` durch die zur vorhandenen Zertifikatsverwaltung passende Konfiguration ersetzen; der unveränderte Standard übernimmt das nicht. [Caddy: TLS-Konfiguration](https://caddyserver.com/docs/caddyfile/directives/tls).

### Als Administrator anmelden

1. Am Büro-PC die konfigurierte CMS-Adresse öffnen, beispielsweise `https://cms.juzio.home.arpa`.
2. Mit `DIRECTUS_ADMIN_EMAIL` und `DIRECTUS_ADMIN_PASSWORD` aus `.env.server` anmelden. Diese Angaben legen den ersten Admin bei einer leeren Datenbank an.
3. Im eigenen Profil Zwei-Faktor-Anmeldung einrichten und Wiederherstellungsinformationen geschützt ablegen.
4. Die Lizenz wie im nächsten Abschnitt aktivieren. Sammlungen und Teamrolle werden anschließend automatisch angelegt.

Ein später geändertes Admin-Passwort wird in Directus verwaltet. Das Ändern der Konfigurationsdatei allein setzt kein bestehendes Passwort zurück.

## Kostenlose Directus-Lizenz beantragen und aktivieren

Für die in JuZ.io verwendeten eigenen Zugriffsregeln ist eine passende Directus-Lizenz erforderlich. Der kostenlose **Open Innovation Grant (OIG)** stellt diese Funktionen für berechtigte Organisationen bereit. Der kostenlose Core-Tarif ist funktional begrenzt. [Directus: Lizenzübersicht](https://directus.com/docs/licensing/overview).

1. Den Antrag auf [directus.com/oig](https://directus.com/oig) öffnen.
2. Den tatsächlichen Betreiber angeben, der das CMS nutzt, und dessen Organisations- und Kontaktdaten eintragen.
3. Voraussetzungen und Bedingungen prüfen und den Antrag absenden. Laut [OIG-FAQ](https://directus.com/oig/faq) gelten für gemeinnützige Organisationen weniger als 50 Beschäftigte und weniger als 5 Millionen US-Dollar jährliche Umsätze; unbezahlte Ehrenamtliche zählen dabei nicht als Beschäftigte. Für öffentliche Träger gilt der Grant laut FAQ nicht. Bei unklarer Trägerschaft oder Berechtigung direkt bei Directus nachfragen.
4. Den erhaltenen Lizenzschlüssel im CMS unter **Einstellungen → Lizenz** eintragen und aktivieren.
5. Auf derselben Seite den aktiven Status und die freigeschalteten Funktionen prüfen.

Der Grant verlangt Telemetrie und ausgehenden Internetzugang. Er ist kein vollständig offline nutzbarer Tarif. Die jeweils aktuellen Bedingungen stehen in der [OIG-FAQ](https://directus.com/oig/faq).

Die Aktivierung ist an Datenbank und CMS-Adresse gebunden. `DIRECTUS_PUBLIC_URL` deshalb vorab festlegen. Bei einem späteren Adresswechsel zuerst die Lizenz unter der bisherigen Adresse deaktivieren, dann die Adresse ändern, Directus neu starten und die Lizenz erneut aktivieren. [Directus: Lizenzverwaltung und Adresswechsel](https://directus.com/docs/licensing/overview#moving-an-instance-to-a-new-url).

## JuZ.io einrichten und Inhalte vorbereiten

Nach erfolgreicher Lizenzaktivierung:

```bash
./start-server.sh
docker compose -f compose.server.yaml --env-file .env.server ps -a
```

Das Setup legt Sammlungen, Rollen, Berechtigungen, Auswertungen und Beispielinhalte an. Der Setup-Container muss mit Exitcode 0 enden; danach startet die App. Bei Fehlern die Meldungen prüfen:

```bash
docker compose -f compose.server.yaml --env-file .env.server logs --tail=100 setup directus app proxy
```

Dann im CMS:

1. **Benutzerverwaltung:** Für jede Mitarbeiterperson ein eigenes Konto mit E-Mail-Adresse, Passwort, Status **Aktiv** und Rolle **JuZ.io Team** anlegen. Nur Personen, die administrieren sollen, erhalten Adminrechte. Ohne konfigurierten Mailversand Konten direkt mit Passwort anlegen und die Zugangsdaten persönlich übergeben.
2. **Räume (`rooms`):** Beispielräume an die tatsächlichen Räume anpassen und nur nutzbare Räume aktivieren.
3. **Produkte (`products`):** Beispielprodukte prüfen, Namen und Preise in Cent eintragen und gegebenenfalls Pfand konfigurieren. Achtung: Warenpreisänderungen aktualisieren auch frühere Warenbuchungen dieses Produkts.
4. **Abstimmungen (`polls`, `poll_options`):** Beispielabstimmung deaktivieren oder anpassen und die gewünschten Angebote zuordnen.
5. **Datenschutzhinweise (`privacy_pages`):** Den Eintrag `datenschutz` vervollständigen und nach Prüfung auf **Veröffentlicht** setzen.
6. Die App am Büro-PC öffnen, mit einem Teamkonto anmelden und Raumliste, Statistik, Theke und Abstimmung prüfen. Das CMS ebenfalls mit dem Teamkonto öffnen und die Dashboards prüfen.
7. Mit einem Handy im Haus-WLAN die öffentlichen Formulare testen und erst danach unter **QR-Codes** die Ausdrucke erstellen.

Das Setup erhält eigene Inhalte und ergänzt fehlende Strukturen. Die Administration muss den Server nicht täglich neu starten. Mitarbeitende öffnen App oder CMS direkt an ihrem jeweiligen Gerät.

## Laufender Betrieb

```bash
# App neu starten
docker compose -f compose.server.yaml --env-file .env.server restart app

# Alle Dienste stoppen
docker compose -f compose.server.yaml --env-file .env.server stop

# Starten oder geänderte Konfiguration übernehmen
./start-server.sh
```

Ein App-Neustart beendet Team-Sitzungen und verwirft Mitarbeitercodes; gespeicherte Geschäftsdaten bleiben erhalten. `restart` allein übernimmt keine geänderten Umgebungsvariablen. Nach Konfigurationsänderungen das Startskript verwenden.

Vor Updates eine Sicherung erstellen und die Kompatibilität prüfen. Directus ist auf Version 12.5.0 festgelegt. Node- und Caddy-Images regelmäßig geplant aktualisieren und die verwendeten Image-Versionen beziehungsweise Digests für eine Wiederherstellung festhalten.

## Sicherung und Wiederherstellung

Vor einer Sicherung den gesamten Stack stoppen, damit Datenbank und Uploads konsistent sind. Folgende Bestände geschützt sichern:

- `juzio-server_directus_database`: Datenbank einschließlich Konten, Inhalten und CMS-Konfiguration.
- `juzio-server_directus_uploads`: Hochgeladene Dateien.
- `juzio-server_caddy_data` und `juzio-server_caddy_config`: Zertifikate und Proxy-Konfiguration. Die Caddy-Daten enthalten auch private Schlüssel der internen Zertifizierungsstelle.
- `.env.server`, Deploymentdateien und die verwendeten Image-Versionen.

Die Volume-Pfade lassen sich mit `docker volume inspect <Volumename>` ermitteln. Bei gestoppten Diensten mit Host-Administrationsrechten vollständig und unter Erhalt der Besitzrechte sichern. Datierte Backups verschlüsselt außerhalb des Servers aufbewahren. Danach mit `./start-server.sh` weiterarbeiten. **Nicht `down -v` verwenden:** Dieser Befehl löscht die Datenvolumes.

Eine Wiederherstellung auf einem getrennten Testsystem üben: Zielvolumes anlegen, Sicherungen bei gestoppten Diensten importieren und mit gleicher Directus-Version sowie passenden Geheimnissen starten. Inhalte, Login, Berechtigungen und Buchungen prüfen. Bei einer Wiederherstellung bereits umgesetzte Löschungen berücksichtigen.

## Technischer Aufbau und Grenzen

`compose.server.yaml` betreibt Directus, Setup, App und Caddy als Projekt `juzio-server`. `app.server.js` startet die App; `server.js` enthält die gemeinsamen Fachfunktionen. Der App-Port und Directus-Port werden nicht direkt am Host veröffentlicht. Caddy stellt beide HTTPS-Adressen bereit.

Der Container-Adressbereich `172.30.56.0/24` darf sich nicht mit bestehenden Netzen überschneiden. Bei Änderungen die feste Proxy-IP und `TRUSTED_PROXY_IP` gemeinsam anpassen. Die App vertraut der von Caddy gesetzten Client-IP nur für diesen Proxy. HTTPS und Secure-Cookies sind für die App erforderlich.

Genau eine App- und eine Directus-Instanz betreiben. Sitzungen, Mitarbeitercodes, Anfragelimits und Statistik-Sperren liegen im Arbeitsspeicher. Mehrere Replikate benötigen eine gesonderte Implementierung. SQLite verwendet persistenten lokalen Speicher des Servers. Der Healthcheck `/api/health` prüft die Verbindung zu Directus; Docker startet einen lediglich als ungesund markierten Container nicht automatisch neu.

Die Tests lassen sich mit `npm ci` und `npm test` auf einem Entwicklungs- oder Testsystem ausführen. Directus-Integrationstests nur gegen eine getrennte eingerichtete Testinstanz ausführen. Zur Betriebsprüfung gehören außerdem ein Serverneustart, Zugriff von Büro-PC und Handy sowie ein geübter Backup-Restore.
