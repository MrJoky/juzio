# Datenschutzorganisation und Datenverzeichnis

Prüfstand: 9. Oktober 2026. Die technische Umsetzung ist eine Grundlage für den Betrieb, keine rechtliche Freigabe. Der konkrete Träger, sein Auftrag und seine verbindlichen Speicherfristen sind noch nicht bekannt. Die mitgelieferte öffentliche Erklärung ist deshalb ausdrücklich ein Entwurf.

## Welche Daten wo liegen

| Bereich | Gespeicherte Informationen | Zweck / Zugriff |
| --- | --- | --- |
| Raumliste | Vorname/Spitzname, weitere Gäste, Datum, Uhrzeit, Raum | Raumnutzung; Team und Admin |
| Statistik | Datum, optionale Uhrzeit, Alter, Geschlecht, Anzahl, Notiz | Besuchszählung; Team und Admin |
| Theke | Produkt, Menge, rückwirkend synchronisierter Warenpreis bzw. gebuchter Pfandbetrag, Zeitpunkt, buchende Mitarbeiter-ID, Wiederholungsschlüssel, Art der Position | Waren-, Pfand- und Rückzahlungsbuchung; Team und Admin |
| Abstimmung | Poll, Auswahl, Zeitpunkt, SHA-256-Browserkennung, mit geheimem Schlüssel abgeleitete IP-Kennung | Abstimmung und Mehrfachstimmensperre; Team sieht Ergebnisse, App-Service nur Kennungen |
| Teamkonto | E-Mail, Vorname, Passwort-Hash, Rolle, Directus-Sitzungen | Anmeldung und Berechtigungen; Admin und jeweiliges Konto |
| Datenschutzhinweise | Freigegebener Text, Titel, Status, Änderungszeit | Information; öffentlich lesbar, Admin bearbeitet |
| Betriebsdaten | Directus-Aktivitäten/Revisionen, möglicherweise IP und Änderungen; technische Logs | Administration; Admin/Systemverantwortliche |

Geschäftsdaten liegen in Directus/SQLite in lokalen Container-Volumes. Exporte liegen zusätzlich im Downloadordner der verwendeten Geräte. Backups enthalten Datenbank, Benutzer, Geheimnisse und gegebenenfalls Änderungsverläufe. Pseudonyme Stimmen sind nicht als anonym anzusehen. Kleine Statistikgruppen und Notizen können Personenbezug herstellen. Es gibt keine automatische Verknüpfung zwischen Raumliste und Besucherstatistik.

## Browser und kurzfristige Daten

| Speicherung | Dauer | Inhalt |
| --- | --- | --- |
| `juze_session`, HttpOnly/SameSite=Strict | höchstens 8 Stunden | zufällige Team-Sitzungskennung; Server verliert Sitzungen beim Neustart |
| `juze_voter`, HttpOnly/SameSite=Strict | 30 Tage ab Ausgabe | zufällige Abstimmungskennung |
| LocalStorage `juze-voted:<ID>` | bis Browserdaten gelöscht werden | Markierung „bereits abgestimmt“; kein Ablauf implementiert |
| Anfragebegrenzung im App-RAM | etwa 1 Minute, Bereinigung alle 60 Sekunden | IP, Kategorie, Anzahl |
| Mitarbeitercode im App-RAM | 10 Sekunden Gültigkeit; nach Ablauf erneuert, bis Bereinigung/Neustart ggf. im RAM | zufälliger Code je Poll; keine dauerhafte Speicherung |

Cookies erhalten `Secure` nur bei `APP_SECURE_COOKIES=true`; das erfordert funktionierenden HTTPS-Zugang. Lokales HTTP schützt Übertragungen nicht vor Mitlesen. Die App lädt keine externen Fonts, Tracker oder CDNs. Die aktive Directus-Open-Innovation-Grant-Lizenz erfordert Lizenzprüfungen und Telemetrieverbindungen; `TELEMETRY=false` garantiert hier keine Abschaltung. Empfänger und Umfang sind vor Freigabe der Datenschutzhinweise zu prüfen. Paket- und Containerdownloads sowie die Entwicklung finden außerhalb dieses lokalen Datenflusses statt. Das Repository enthält Code, keine Geschäftsdaten.

## Vor der Freigabe durch den Träger

1. Verantwortlichen mit Anschrift und Datenschutzkontakt in `privacy_pages` ergänzen; Datenschutzbeauftragte nennen, falls bestellt.
2. Jeden Zweck und die passende Rechtsgrundlage prüfen. Insbesondere klären, ob personenbezogene Raumlisten erforderlich sind und ob weitere Gäste statt durch Dritte selbst erfasst werden sollen. Art. 14 DSGVO kann bei Angaben über andere Personen relevant sein.
3. Erforderliche und freiwillige Felder sowie Folgen einer Nichtangabe erklären. Die App erzwingt keinen pauschalen Einwilligungshaken. Keine Diagnose-, Religions- oder anderen sensiblen Informationen in Freitexten sammeln.
4. Konkrete Löschfristen oder Kriterien für jedes Datengebiet beschließen; gesetzliche Pflichten für Buchungen mit der Buchhaltung klären. Keine willkürliche einheitliche Frist für alle Daten setzen.
5. Zuständige Landesaufsicht, Empfänger, IT-Dienstleister und tatsächliche Betriebsumgebung ergänzen. Etwaige externe Sicherungen und Auftragsverarbeitung berücksichtigen.
6. Browser-Speicherungen auf ihre Erforderlichkeit nach § 25 TDDDG prüfen. Die technische Funktion allein ist keine abschließende rechtliche Bewertung.
7. Den Text freigeben, Stand ergänzen und `status = published` setzen. Ein veröffentlichter Status validiert den Inhalt nicht automatisch.

## Löschen, Anfragen und Datensicherung

Es gibt aktuell keine automatische Löschung der Geschäftsdatensätze. Eine verantwortliche Person sollte in festen Abständen die beschlossenen Fristen umsetzen. In Directus nach Datum filtern, Datensätze prüfen und gezielt löschen. Stimmen nach Ablauf ihrer vorgesehenen Aufbewahrung löschen; historische Polls können, je nach beschlossenem Zweck, mit ausschließlich aggregierten Ergebnissen dokumentiert werden. Beim Löschen von Buchungen nicht ungeprüft gesetzlich relevante Nachweise entfernen.

Das Löschen eines Datensatzes entfernt nicht automatisch CSV-Dateien, Backups oder Directus-Aktivitäten/Revisionen. Deren Speicherfristen und sichere Bereinigung separat festlegen. Vor einer Bereinigung prüfen, welche Historieneinträge Namen, IPs oder vollständige alte Formulardaten enthalten. Der Text der Datenschutzerklärung muss das tatsächliche Verfahren beschreiben.

Auskunfts- oder Korrekturanfragen an den Datenschutzkontakt weitergeben. Identität angemessen prüfen, ohne unnötig weitere Daten zu sammeln. Vorname und Spitzname können mehrdeutig sein; Raum und Datum können bei der Zuordnung helfen. Bei pseudonymen Stimmen ist eine sichere Zuordnung zu einer Person möglicherweise nicht verfügbar. Anfragen nicht in öffentlichen Notizfeldern dokumentieren.

Backups verschlüsselt und mit beschränktem Zugriff aufbewahren. Ein Wiederherstellungsverfahren muss nach einer Wiederherstellung bereits umgesetzte Löschungen erneut berücksichtigen. Bei einem Datenverlust oder unbefugtem Zugriff Vorfall dokumentieren, Zugriff stoppen, Verantwortlichen informieren und gesetzliche Meldepflichten prüfen.

## Rechtsquellen für die Prüfung

- [DSGVO im amtlichen EUR-Lex](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679): besonders Grundsätze, Rechtsgrundlagen, Informationspflichten, Betroffenenrechte und Sicherheit der Verarbeitung.
- [§ 25 TDDDG](https://www.gesetze-im-internet.de/ttdsg/__25.html): Speicherung und Zugriff auf Informationen im Endgerät sowie Ausnahmen.

Die Seitenvorlage ist anhand des tatsächlichen Codes erstellt. Ob die Verarbeitung im konkreten Jugendzentrum zulässig ist, entscheidet sich zusätzlich nach Auftrag und Organisation des Trägers.
