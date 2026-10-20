# JuZ.io

**Mehr Zeit für Jugendarbeit.**

## Urheberrecht und Nutzungsrechte

**Copyright © 2026 Timo Dahlenburg und die jeweiligen weiteren Rechteinhaber. Alle Rechte vorbehalten.**

Der öffentlich einsehbare Quellcode ist **nicht unter einer Open-Source-Lizenz** freigegeben. Die Übernahme, Bearbeitung, Weiterveröffentlichung oder kommerzielle Verwertung geschützter Projektbestandteile erfordert die vorherige ausdrückliche schriftliche Zustimmung der jeweiligen Rechteinhaber. Eine Quellenangabe allein genügt nicht. Gesetzliche Erlaubnisse, Rechte aus den Bedingungen der Hosting-Plattform und die Lizenzen von Drittbestandteilen bleiben unberührt. Einzelheiten und Kontakt: [Rechtevorbehalt](LICENSE).

Der Rechtevorbehalt betrifft die konkrete geschützte Umsetzung. Abstrakte Ideen und allgemeine Konzepte werden dadurch nicht exklusiv geschützt.

Raumeintragung, Besucherstatistik, Thekenverkauf und Angebotsabstimmung mit selbst gehostetem Directus-CMS. JuZ.io läuft dauerhaft auf einem Server im Hausnetz. Handys greifen über das Haus-WLAN zu, Mitarbeitende über ihren Büro-PC oder andere verbundene Geräte. App und CMS sind jeweils über eine feste HTTPS-Adresse erreichbar.

## Dokumentation

- [Seitentexte und Frontend-Code](docs/FRONTEND.md): welche Seite in welcher Datei liegt und wo gemeinsame Bausteine bearbeitet werden.
- [Bedienung aller Bereiche](docs/BEDIENUNG.md): Raumliste, Statistik, Verkauf/Pfand, Abstimmung, QR-Codes und Datenschutzseite.
- [Betrieb und Wartung](docs/BETRIEB.md): Installation, Konfiguration, Backups und spätere Migration.
- [Datenschutzorganisation](docs/DATENSCHUTZ.md): Datenverzeichnis, Platzhalter, Speicherungen und Löschung.
- [Sicherheitsprüfung](docs/SICHERHEIT.md): behobene Punkte, Prüfungen und offene Risiken.
- [Privates Repository und Leserechte](docs/REPOSITORY.md): Push und Zugriff für Außenstehende.

## Einrichtung

Voraussetzungen: Linux-Server, Docker mit Compose v2, feste Server-IP und zwei DNS-Namen im Hausnetz für App und CMS.

1. `.env.server.example` als `.env.server` kopieren und Server-IP, beide HTTPS-Adressen, Admin-Zugang und Geheimnisse eintragen.
2. Directus und Caddy starten und das HTTPS-Vertrauen auf den Geräten einrichten.
3. Die CMS-Adresse am Büro-PC öffnen, als erster Admin anmelden und eine passende Directus-Lizenz aktivieren.
4. Mit `./start-server.sh` die automatische JuZ.io-Einrichtung ausführen.
5. Im CMS Teamkonten, Räume, Produkte, Abstimmungen und Datenschutzhinweise vorbereiten.

Die vollständigen Befehle, die Anleitung zum ersten CMS-Login und den Antrag für die kostenlose Directus-Lizenz enthält [Server einrichten und betreiben](docs/BETRIEB.md).

Der Server läuft im Hintergrund weiter und startet seine Dienste nach einem Neustart automatisch. Für die tägliche Nutzung genügt ein Browser im Hausnetz; Handys benötigen Zugang zum Haus-WLAN und zum Server. Es ist keine Internet-Portfreigabe vorgesehen.

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

1. Die bereitgestellte CMS-Adresse im Browser öffnen und als Admin anmelden.
2. Unter **Benutzerverwaltung** einen Benutzer mit gültiger E-Mail-Adresse und Passwort anlegen, Status **Aktiv**, Rolle **JuZ.io Team**. Eine echte zustellbare Adresse ist für den Passwortlogin nicht notwendig, das E-Mail-Format muss Directus akzeptieren. Die Anlage funktioniert ohne Mailversand.
3. Kollegen melden sich unter `/login` mit diesen persönlichen Daten an. Bei aktivierter Zwei-Faktor-Anmeldung zusätzlich den Einmalcode eingeben.

Die automatisch erzeugte Formular-Servicekennung ist nur für die App bestimmt und erhält keinen Teamzugriff. Kollegen benötigen keine Administratorrechte. Das CMS ist für berechtigte Mitarbeitende direkt im Hausnetz erreichbar.

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

Vor jeder Stimme ist ein sechsstelliger Mitarbeitercode erforderlich. Er wird ausschließlich angemeldeten Mitarbeitenden unter **Abstimmung** angezeigt, läuft nach zehn Sekunden ab und kann nur einmal benutzt werden. Nach Verwendung erscheint automatisch ein neuer Code. Jugendliche wählen zuerst ein Angebot, fragen das Team nach dem aktuellen Code und senden sofort ab. Alte Codes und Codes anderer Abstimmungen werden abgewiesen; bei einem App-Neustart verfallen alle Codes. Das Team gibt den Code persönlich aus und achtet darauf, dass jede Person nur einmal teilnimmt. Codes allein identifizieren keine Personen: Wer erneut einen gültigen Code bekommt, kann erneut teilnehmen – auch am selben Gerät und im selben WLAN. Die Codes gelten für einen einzelnen laufenden App-Server.

Es gibt keine LocalStorage-, Cookie- oder IP-Sperre für Abstimmungen. Jeder neue gültige Mitarbeitercode erlaubt eine Stimme; gleichzeitige Versuche mit demselben Code speichern nur eine Stimme. Neue Stimmen speichern keine Browser- oder Netzwerkkennung. Historische Kennungen bleiben als Bestandsdaten erhalten und werden nicht mehr verwendet. Der Formularservice hat keinen Lesezugriff auf Stimmen. Allgemeine Anfragelimits bleiben aktiv.

In der **Raumliste** öffnet „Bearbeiten“ ein Formular für Datum, Uhrzeit, Raum, Name und weitere Gäste. In der **Besucherstatistik** werden Einträge pro Tag, Altersgruppe und Geschlecht zusammengefasst. Die Uhrzeitspalte zeigt die erfassten Uhrzeiten der Gruppe. Mit ▲/▼ lässt sich die Anzahl direkt um eins erhöhen oder verringern; jeder Klick wird sofort gespeichert. Beim Verringern bleibt ein Eintrag mit null Besuchen erhalten. Das Formular oben dient weiterhin der Erfassung einschließlich Uhrzeit. Der CSV-Export enthält dieselben zusammengefassten Werte und Uhrzeiten. „Abbrechen“ verwirft Änderungen. Nach dem Speichern werden die Listen und Statistikwerte aktualisiert; CSV-Exporte berücksichtigen die Korrekturen. Bearbeiten ist ausschließlich für angemeldete Teammitglieder möglich.

**Produkte mit Pfand:** Unter **Theke → Pfand einstellen** am Produkt „Produkt mit Pfand“ aktivieren und den Betrag pro Stück in Euro setzen (z. B. 0,25 €). Alternativ in Directus `has_deposit` aktivieren und `deposit_cents` in Cent pflegen. Der Produktpreis ist ohne Pfand. Beim Verkauf werden Ware und Pfand automatisch als zwei Positionen gemeinsam gespeichert, jeweils für die verkaufte Menge. Warenpreisänderungen aktualisieren auch frühere Warenpositionen. Gebuchte Pfandbeträge bleiben erhalten.

**Pfandrückgabe:** In der Theke unter „Pfand zurückzahlen“ Pfandbetrag und Anzahl zurückgegebener Behälter eingeben. Die Auszahlung wird als eigene negative Position gebucht; es werden keine alten Verkaufspositionen gelöscht. Rückgaben funktionieren auch an einem späteren Tag oder nach einer Produktpreisänderung; den tatsächlich ausgezahlten Pfandbetrag eingeben. Nicht zurückgegebenes Pfand bleibt als Einnahme stehen. Die Übersicht und der CSV-Export trennen Ware, Pfand und Rückgaben. „Kassenbewegung“ ist Warenumsatz plus Pfandeinnahmen minus Rückzahlungen im gewählten Zeitraum. Ein anfänglicher Kassenbestand und sonstige Bargeldbewegungen werden bisher nicht erfasst; der Wert ist deshalb die Veränderung aus diesen Buchungen, kein vollständiger Bargeldbestand.

Änderungen an `products.price_cents` aktualisieren über einen Directus-Flow alle verknüpften Waren-Verkaufseinträge, auch rückwirkend. Einzelbeträge, Warenumsatz, Kassenbewegung und CSV-Summen verwenden diese aktualisierten Preise. In der Theke nach einer CMS-Änderung **Aktualisieren** wählen. Pfandpositionen und Rückgaben behalten ihren gebuchten Betrag; Einträge ohne Produktverknüpfung bleiben unverändert. Es gibt keinen täglichen Zählerreset; der Zeitraumfilter zeigt Tagesumsätze und frühere Verkäufe. Besucherstatistik zählt erfasste Besuche, keine eindeutig identifizierten Personen. Raumeintragungen und Besucherstatistik werden getrennt erfasst. CSV-Exporte stehen auf den jeweiligen Teamseiten zur Verfügung.

## Insights in Directus

Unter **Insights** im CMS stehen vier Team-Dashboards mit 22 Kennzahlen und Diagrammen bereit: **Besucher**, **Raumnutzung**, **Theke** und **Abstimmungen**. Besuchs- und Verkaufsmengen werden summiert; Raumeintragungen und Stimmen werden gezählt. Die Thekencharts zeigen Stückzahlen; Geldbeträge bleiben in der App. Zeiträume stehen in den Paneltiteln. Das Setup ergänzt fehlende Panels und erhält eigene Einstellungen; die fehlerhafte ursprüngliche Rasteranordnung wird automatisch repariert. Details: [Bedienung](docs/BEDIENUNG.md).

## Adresse und QR-Codes

Unter **QR-Codes** die Links zur Raumeintragung und Abstimmung drucken. Im Serverbetrieb verwenden alle Links die feste HTTPS-Adresse aus `.env.server`. Nach einem Domainwechsel `PUBLIC_URL` anpassen, `./start-server.sh` erneut ausführen und Ausdrucke erneuern. Handy und Server müssen sich über diese Adresse erreichen können.

## Daten und Sicherung

Die Daten liegen im persistenten Container-Volume, nicht im Container-Dateisystem:

- Server: `juzio-server_directus_database` und `juzio-server_directus_uploads`

Vor Änderungen den Stack stoppen und Datenbank, Uploads, `.env.server` sowie Caddy-Zertifikatsdaten geschützt sichern. Wiederherstellung und Wartung sind in [Serverbetrieb](docs/BETRIEB.md) beschrieben. Container-Volumes nicht löschen; `down -v` entfernt Daten.

## Prüfungen

```bash
npm test
# Nur auf separater Testinstanz mit passend gesetzten Directus-Variablen:
DIRECTUS_INTEGRATION=1 node --test tests/directus.test.mjs
```

Die Integrationstests benötigen laufendes, eingerichtetes Directus. Sie prüfen echte CRUD-Vorgänge, Teamrechte, doppelte Verkäufe, doppelte Stimmen und QR-Codes. Testdaten und Testbenutzer werden anschließend gelöscht.

Technischer Aufbau: Node.js als Webserver und API, Directus mit SQLite als CMS. Persönliche Directus-Tokens bleiben auf dem Server; der Browser erhält eine HttpOnly-Sitzung. Der Formularservice hat nur Lesezugriff auf aktive Räume und Abstimmungen sowie Schreibzugriff auf Raumeintragungen und Stimmen. Der Formularservice kann gespeicherte Stimmen nicht lesen. Die öffentliche Directus-Rolle hat keine Datenrechte. Servervalidierung, Anfragelimits und Herkunftsprüfung schützen die Schreibendpunkte.

Directus-Grundlagen: [lokale Bereitstellung und persistente Volumes](https://directus.com/docs/self-hosting/deploying), [Benutzer, Rollen und Zugriffsrichtlinien](https://docs.directus.io/user-guide/user-management/users-roles-permissions).
