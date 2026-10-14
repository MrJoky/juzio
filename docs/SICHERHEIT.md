# Sicherheitsprüfung

**Nachtrag 14. Oktober 2026:** Produktiver Wechsel auf Directus 12.5.0 mit aktiver Open-Innovation-Grant-Lizenz abgeschlossen. Aktuelle Daten und Benutzer wurden nach Sicherung übernommen; alle 16 Tests bestanden vor dem Wechsel auf der lizenzierten Instanz. Der folgende Bericht beschreibt die historische Prüfung vom 9. Oktober; der damalige Updateblocker ist durch die Lizenzaktivierung aufgelöst. Lizenz und Telemetrie erfordern externe Verbindungen. Aktueller Betrieb: [Betriebsdokumentation](BETRIEB.md).

Stand: 9. Oktober 2026. Geprüft wurden App-Code, Browserausgabe, Directus-Schema-/Rechteeinrichtung, Containerdefinitionen, Abhängigkeiten und Git-Dateien. Das ist eine nachvollziehbare Code- und Konfigurationsprüfung mit Tests, kein vollständiger Penetrationstest oder Nachweis, dass alle möglichen Risiken ausgeschlossen sind. Eine Internetfreigabe erfolgt nicht.

## Befunde und Maßnahmen

| Priorität | Befund | Maßnahme / verbleibendes Risiko |
| --- | --- | --- |
| Hoch, offen | Directus 11.12.0 liegt in veröffentlichten betroffenen Versionsbereichen | 12.5.0 separat getestet; Setup ohne passende Lizenz scheitert mit RESOURCE_RESTRICTED. Betreiber organisiert Lizenz später. Kein ungeprüftes Update; CMS bleibt an Loopback gebunden. Update bleibt erforderlich. |
| Hoch im untrusted Netzwerk, offen | Lokales HTTP überträgt Formulare und Teamzugang unverschlüsselt | Kein Internetzugang/Portforwarding; vertrauenswürdiges Hausnetz und ggf. HTTPS planen. Option für Secure-Cookies ergänzt, deaktiviert bei lokalem HTTP. |
| Datenschutz, offen | Trägerdaten, Rechtsgrundlagen und Fristen fehlen | Öffentliche editierbare Seite als markierter Entwurf; Betreiber ergänzt Platzhalter. Keine erfundenen Löschfristen. |
| Datenschutz, offen | Daten, Revisionen, Exporte und Backups bleiben ohne automatische Löschung bestehen | Datenverzeichnis und vollständiges Lösch-/Backupverfahren dokumentiert; Fristen müssen organisatorisch umgesetzt werden. |
| Mittel, behoben in App | Manipulierte Host-Header / DNS-Rebinding auf App-Port | Host nur für Loopback, eigene Interfaces und konfigurierte PUBLIC_URL akzeptieren. Fremde Hosts und URL-Tricks werden abgewiesen. Schutz betrifft App, nicht beliebige andere lokale Dienste. |
| Mittel, behoben | Null/Array als JSON-Body, lockere UUID-Prüfung | Objektprüfung, striktes UUID-Format, JSON-Content-Type, Body- und Headerlimits. Keine weitergeleiteten IP-Header übernehmen. |
| Mittel, reduziert | Last durch beliebig viele Leseanfragen / langsame Requests | App-Leserate pro IP, Schreib-/Loginlimits, Header- und Requesttimeouts; Directus-Limiter vorbereitet. Kein vollständiger DoS-Schutz. |
| Mittel, behoben | Datenschutztext könnte fremdes HTML/JS einbetten | Nur Klartext, HTML-Escaping und CSP. Admin bearbeitet; öffentliche Servicekennung darf ausschließlich festgelegten Datensatz lesen. |
| Mittel, behoben | App-Sitzung blieb bei entzogenem Teamrecht prinzipiell erhalten | Jede Sitzungsprüfung vergleicht die aktuelle Rolle und den Kontostatus mit der Anmeldung und prüft Statistik-Leseberechtigung. Rollenwechsel beendet die Sitzung auch bei noch gültigem JWT; 401/403 beendet sie ebenfalls. |
| Niedrig, reduziert | Fehler könnten in Zukunft Formulardaten protokollieren | Unbekannte App-Fehler nur mit allgemeinem Text protokollieren; keine Requestinhalte. Directus-/OS-Logs separat kontrollieren. |
| Datenschutz, reduziert | Abstimmungs-Cookie ein Jahr gültig | Neue Cookies 30 Tage. Bereits ausgestellte Cookies können bis zu ihrem bisherigen Ablauf bestehen bleiben. LocalStorage-Markierungen bleiben bis zum Löschen der Browserdaten. |
| Repository, reduziert | Versehentlicher Commit von Daten/Geheimnissen | Ignore-Regeln für Umgebungsdateien, Datenbanken, Backups, CSV und Schlüssel erweitert; aktuelle Geheimniswerte gegen getrackte Dateien und Git-Historie geprüft. |

## Directus-Hinweise

Die recherchierten Herstellerhinweise enthalten unter anderem:

- [GHSA-gwvv-rr68-cmv6](https://github.com/directus/directus/security/advisories/GHSA-gwvv-rr68-cmv6): nicht authentifizierter DoS, betroffen vor 12.2.0; Rechte allein verhindern den Fehler nicht.
- [GHSA-97xr-jchp-xm3c](https://github.com/directus/directus/security/advisories/GHSA-97xr-jchp-xm3c): Rechteumgehung bei öffentlicher WebSocket-REST-Konfiguration vor 12.1.0. Unsere Containerdefinition aktiviert diese Konfiguration nicht; WebSockets sind ausdrücklich deaktiviert.
- [GHSA-7h45-q5jx-7r87](https://github.com/directus/directus/security/advisories/GHSA-7h45-q5jx-7r87): manipulierbare Share-Berechtigungen. Die App richtet keine Schreibrechte auf `directus_shares` ein.
- [GHSA-8xp8-xrh2-88vr](https://github.com/directus/directus/security/advisories/GHSA-8xp8-xrh2-88vr): Registrierung/Adressabgleich; die beschriebene Datenbankkonstellation ist nicht unsere SQLite-Konfiguration. Öffentliche Registrierung wird nicht benötigt.

Diese Eingrenzung ersetzt das Sicherheitsupdate nicht. [Herstellerübersicht](https://github.com/directus/directus/security/advisories) regelmäßig erneut prüfen. [Directus-12-Releasehinweise](https://github.com/directus/directus/releases/tag/v12.0.0) und [Lizenzdokumentation](https://directus.com/docs/licensing/overview) beschreiben die Änderungen, die den Upgradeversuch blockieren. Wir haben keine Lizenzbegrenzung umgangen und keine Sicherheitsrechte dafür aufgeweicht.

## Bereits bestehende Schutzmaßnahmen

- Teamseiten und Team-APIs brauchen eine serverseitige Sitzung; persönliche Directus-Tokens bleiben auf dem Server.
- Formularservice hat getrennte Rechte; keine öffentliche Namensliste. Die öffentliche Directus-Rolle erhält durch Setup keine Geschäftsrechte. Bestehende manuell hinzugefügte Rollen/Policies sind vom Admin zusätzlich zu prüfen.
- Schreiben erfordert passende Origin. Keine CORS-Freigabe, keine Weiterleitung fremder Requests.
- HttpOnly/SameSite=Strict, Cache-Control no-store, CSP, nosniff, Frame-Sperre und Permissions-Policy.
- Browserwerte und Backendinhalte werden bei der HTML-Ausgabe escaped; CSV-Formeln werden vor dem Export entschärft.
- Verkäufe haben eindeutige Wiederholungsschlüssel; Ware/Pfand werden gemeinsam in einer Transaktion gespeichert. Pfandrückgaben sind negative Buchungen und ebenfalls gegen wiederholte Requests geschützt.
- Stimmen haben eindeutige Browser-/IP-Kennungen sowie kurzlebige Einmalcodes. Änderungen an Mengen werden im einzelnen App-Prozess nacheinander verarbeitet.

## Verbleibende Betriebs- und Fachrisiken

Teammitglieder sind vertrauenswürdige Bearbeiter und können im CMS operative Daten verändern/löschen. Das ist kein manipulationssicheres Kassenjournal. Pfandrückgaben prüfen keine vorherige konkrete Ausgabe. Mengenänderungen und Mitarbeitercodes sind nur für einen App-Prozess ausgelegt. Shared-IP, neue IP oder gelöschte Browserdaten beeinträchtigen die Stimmerkennung; Codes ersetzen keine Personenidentifikation.

Das Admin-Token und der Formularservice-Token sind lokale Geheimnisse. Rechnerzugriff, Container-Engine und Datenbankkopien können diese schützen oder kompromittieren. Schwache Team-Passwörter, geteilte Konten, verlorene Laptops, unsichere CSV-Dateien und ungeschützte Backups sind durch App-Code nicht ausgeschlossen. Admins sollten 2FA nutzen. Ein lokaler Dienst an 127.0.0.1 kann von anderen Programmen am Rechner erreicht werden; Loopback ersetzt keine Updates.

Nicht durchgeführt: zerstörende Angriffstests gegen Bestandsdaten, vollständiger Container-/OS-CVE-Scan, Router-/WLAN-Audit, rechtliche Freigabe oder Audit beliebiger manuell ergänzter Directus-Erweiterungen. Npm-Audit findet am Prüfdatum **0 bekannte Lücken in den App-Abhängigkeiten**; es bewertet nicht den Directus-Container.

## Nachweise

Tests prüfen insbesondere Login und Rollen, Nichtzugriff auf Teamdaten, Datenschutz-Lesefilter, verweigerte Datenschutzänderungen durch Service und Team, Klartext-/XSS-Ausgabe, Hostprüfung, JSON-Validierung, Herkunftsprüfung, Dateisperren, Pfand-Transaktionen und Doppelbuchungsschutz. Die aktualisierte Version wurde separat getestet und als nicht betriebsbereit ohne Lizenz dokumentiert. Testdaten werden anschließend entfernt.

Ein privates Repository begrenzt den Quellcodezugriff, schützt aber weder öffentliche App-Endpunkte noch laufende Datenbanken. Für Repository-Rechte siehe [Repository](REPOSITORY.md).

Abschließender Lauf: **16 von 16 Tests bestanden**, einschließlich der Integration gegen den unveränderten Bestandsserver. `git diff --check` ist ohne Befund. In den vorgesehenen Commit-Dateien und im vorhandenen Git-Verlauf wurden keine Übereinstimmungen mit den aktuellen echten Konfigurationsgeheimnissen gefunden. Das ist keine Garantie, dass jedes unbekannte historische Geheimnis erkannt wurde. Der isolierte Directus-12.5-Container wurde nach der Prüfung beendet.
