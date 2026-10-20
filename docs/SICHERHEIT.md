# Sicherheit im Serverbetrieb

App und CMS sind im Hausnetz über getrennte HTTPS-Adressen erreichbar. Die Administration richtet DNS, Zertifikatsvertrauen und den Zugang aus Büro- und WLAN-Netz ein. Die Deployment-Anleitung steht unter [Serverbetrieb](BETRIEB.md).

## Zugang und Berechtigungen

Jede Mitarbeiterperson verwendet ein persönliches Konto. Die Rolle **JuZ.io Team** erlaubt die operative Arbeit und den Zugriff auf Dashboards; administrative Einstellungen bleiben berechtigten Administratoren vorbehalten. Für Admins Zwei-Faktor-Anmeldung einrichten. Ausgeschiedene Personen deaktivieren und Sitzungen beenden.

Jugendliche können öffentliche Formulare verwenden, aber keine gespeicherten Namen oder Teamdaten lesen. Der interne Formularservice erhält begrenzte Rechte. Seine Schlüssel und Directus-Adminrechte werden nicht an Browser weitergegeben.

## Schutz der Anwendung

- HTTPS und Secure-/HttpOnly-Sitzungscookies schützen den Teamzugang.
- Die App prüft Host, Herkunft, Eingabetypen und Eingabegrößen und begrenzt die Zahl der Anfragen.
- Client-IP-Header werden nur vom festgelegten Proxy übernommen; Caddy überschreibt den dafür verwendeten Header.
- Sicherheitsheader begrenzen eingebettete Inhalte, Skripte und Browserfunktionen.
- Mitarbeitercodes sind zehn Sekunden gültig und werden nach einer Verwendung gesperrt. Die persönliche Ausgabe organisiert das Team.
- App und Directus haben keinen direkt veröffentlichten Host-Port; der Zugriff erfolgt über Caddy.

## Aufgaben der Administration

Server und Container regelmäßig aktualisieren, Zugriffe beschränken und Sicherungen geschützt aufbewahren. Docker-Zugriff erlaubt Zugriff auf Daten und Geheimnisse. Netzwerkzugriff einschließlich Haus-WLAN und Zertifikaten vor Inbetriebnahme prüfen. Die Services nicht durch Router-Portfreigaben öffentlich machen.

Nur eine App-Instanz betreiben: Team-Sitzungen, Codes und Sperren werden im Arbeitsspeicher verwaltet. Ein Neustart beendet Sitzungen und Codes. Weitere Grenzen und die Sicherung sind in [Betrieb](BETRIEB.md) beschrieben.

Directus-Lizenzstatus und ausgehende Verbindungen überwachen. Bei Berechtigungsproblemen Lizenz und Konten prüfen; keine öffentlichen Datenrechte als Umgehung vergeben. Datenschutztexte, Aufbewahrung und Exporte organisatorisch pflegen, siehe [Datenschutzorganisation](DATENSCHUTZ.md).

## Prüfungen

`npm test` prüft unter anderem Zugriffsschutz, Eingabevalidierung, Hostprüfung, Proxy-Vertrauen und Mitarbeitercodes. Directus-Integrationstests benötigen eine gesonderte Testinstanz. Automatisierte Tests ersetzen keine Prüfung des tatsächlichen Servers, Netzwerks, Zertifikatseinsatzes oder Wiederherstellungsverfahrens.
