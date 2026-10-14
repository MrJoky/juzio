# Bedienung im Jugendzentrum

## Start und Tagesablauf

Am Server-Laptop `./start.sh` starten. Der Laptop bleibt eingeschaltet und mit dem Haus-WLAN verbunden. Die App öffnet ihr unter `http://localhost:3000`; Jugendliche verwenden die WLAN-Adresse, die beim Start ausgegeben wird. Die App muss im Terminal weiterlaufen. Vor der ersten Nutzung die Datenschutzhinweise im CMS vervollständigen.

Zu Beginn meldet sich jede Mitarbeiterperson mit ihrem eigenen Konto unter **Team-Login** an. Am Ende **Abmelden** wählen, CSV-Dateien sicher ablegen und die App mit Strg+C beenden. Directus läuft anschließend weiter; zum Stoppen siehe [Betrieb](BETRIEB.md).

## Raumeintragung und Raumliste

Jugendliche wählen einen Raum und tragen Datum, Uhrzeit und einen Vornamen oder Spitznamen ein. Weitere Gäste nur nach Rücksprache eintragen. Keine Nachnamen, Kontaktdaten oder vertraulichen Informationen erfassen. Öffentliche Nutzer können gespeicherte Namen nicht lesen.

Das Team sieht unter **Raumliste** die Einträge im gewählten Zeitraum. Standardmäßig wird heute angezeigt. **Bearbeiten** öffnet Datum, Uhrzeit, Raum, Name und weitere Gäste. **Änderungen speichern** übernimmt die Korrektur; **Abbrechen** verwirft sie. Inaktive Räume bleiben für Korrekturen auswählbar. **Aktualisieren** lädt die Liste neu, **CSV exportieren** exportiert den gewählten Zeitraum. Löschen erfolgt bei Bedarf durch berechtigte Personen in Directus, einschließlich einer Prüfung der Änderungsverläufe.

## Besucherstatistik

Im Formular Datum, Uhrzeit, Altersgruppe, Geschlecht und Anzahl eintragen. Uhrzeit ist optional; aktuelle Uhrzeit ist vorbelegt. Für Alter und Geschlecht gibt es **keine Angabe**. Die Statistik zählt Besuche, nicht eindeutig identifizierte Personen. Namen gehören nicht in die Notiz.

Die Liste fasst nach Tag, Alter und Geschlecht zusammen; verschiedene Uhrzeiten stehen gemeinsam in einer Zeile. ▲ erhöht die Anzahl um eins, ▼ verringert sie um eins. Jeder Klick speichert sofort. Bei null ist ▼ gesperrt; die Buchung bleibt erhalten. Wenn eine Gruppe mehrere Einzelbuchungen enthält, ändert die App eine passende Einzelbuchung dieser Gruppe. Die Gruppenanzahl und Summen werden aktualisiert. Bei mehreren Teamgeräten bei Bedarf **Aktualisieren** wählen.

Datum und Zeitraumfilter gelten auch für die Summen und den CSV-Export. Vollständige Einzelkorrekturen können berechtigte Personen in der Sammlung `visitor_statistics` in Directus vornehmen.

## Auswertungsgrafiken in Directus

Unter **Insights** auf http://localhost:8056 stehen dem Team vier Dashboards zur Verfügung:

- **Juze · Besucher:** erfasste Besuchsmengen insgesamt und in den letzten 30 Tagen, Anzahl der Statistikeinträge mit Besuchern, Tagesverlauf über drei Monate sowie Alters- und Geschlechtsverteilung.
- **Juze · Raumnutzung:** Anzahl der Raumeintragungen insgesamt, in den letzten 30 Tagen, pro Tag und pro Raum. Das sind Eintragungen, keine Personen oder Nutzungsstunden.
- **Juze · Theke:** verkaufte Artikel und ausgegebenes/zurückgenommenes Pfand in Stück, Tagesverlauf und Produktvergleich. Geldbeträge und Kassenbewegung stehen weiterhin in der Thekenübersicht der App.
- **Juze · Abstimmungen:** Stimmen insgesamt und in den letzten 30 Tagen, Verlauf, Vergleich je Abstimmung und Angebote aus als aktiv markierten Abstimmungen.

Kennzahlen und Balkendiagramme beziehen sich auf den gesamten gespeicherten Bestand, sofern im Titel kein anderer Zeitraum steht. Besuchs- und Verkaufsmengen werden summiert; Abstimmungen zählen gespeicherte Stimmen. Lücken im Tagesverlauf bedeuten fehlende Einträge. Das Team darf die Dashboards ansehen; Bearbeitung erfolgt durch den Admin. Das Setup ergänzt fehlende Vorlagen und legt keine Duplikate an. Die ursprünglich fehlerhaften Rasterpositionen ab 0 werden einmalig auf das Directus-Raster ab 1 mit lesbaren Größen und Abständen korrigiert. Eigene Layouts und Paneloptionen bleiben erhalten. Die frühere Besuchstage-Kachel wird wegen einer Directus-Datumsformatierung durch die numerisch korrekte Anzahl der Statistikeinträge mit Besuchern ersetzt.

## Theke, Verkauf und Pfand

Produkte und Warenpreise werden in Directus in `products` gepflegt. `price_cents` ist der Warenpreis in Cent: 150 bedeutet 1,50 €. `active` zeigt das Produkt in der Theke an. Menge auswählen und **Verkauf buchen** wählen. Eine Warenpreisänderung aktualisiert auch alle früheren Waren-Verkaufseinträge dieses Produkts und die darauf beruhenden Summen und CSV-Exporte. In der Theke anschließend **Aktualisieren** wählen. Pfand und Rückzahlungen behalten ihre gebuchten Beträge.

Bei **Pfand einstellen** am Produkt **Produkt mit Pfand** anhaken und den Pfandbetrag pro Stück in Euro eingeben. Der Warenpreis enthält kein Pfand. Beispiel: Zwei Getränke zu 1,50 € mit je 0,25 € Pfand ergeben zwei Positionen: Ware 3,00 € und Pfand 0,50 €, zusammen 3,50 €. Beide Positionen werden gemeinsam gespeichert.

Bei **Pfand zurückzahlen** den tatsächlich ausgezahlten Pfandbetrag pro Stück und die Anzahl der Behälter eingeben. Eine Rückgabe von 0,25 € erzeugt eine eigene Position mit −0,25 €. Rückgaben sind auch an späteren Tagen und unabhängig vom damaligen Produkt möglich. Nicht zurückgegebenes Pfand bleibt als eingenommenes Pfand erfasst. Es gibt keine automatische Prüfung, ob ein konkreter Behälter zuvor bei euch verkauft wurde; das kontrolliert das Team.

Die Übersicht trennt Warenumsatz, Pfandeinnahmen, Pfandrückzahlungen und Artikelanzahl. **Kassenbewegung = Warenumsatz + Pfandeinnahmen − Pfandrückzahlungen** im Zeitraum. Ein Anfangsbestand, Entnahmen außerhalb des Pfands und sonstige Einzahlungen werden bisher nicht erfasst. Die Anzeige ist daher kein vollständiger Bargeldbestand. Rückgaben können einen negativen Tageswert ergeben. CSV enthält alle Positionen mit Vorzeichen. Buchungskorrekturen sind derzeit nur im CMS möglich und sollten organisatorisch nachvollziehbar bleiben; die App ist kein zertifiziertes Kassensystem.

## Abstimmung

In Directus eine Abstimmung unter `polls` anlegen: Titel, Beschreibung, Woche, `active`, optional Start und Ende. Angebote unter `poll_options` anlegen, der Abstimmung zuordnen und aktivieren. Für eine neue Woche eine neue Abstimmung anlegen.

Jugendliche öffnen den QR-Link, wählen ein Angebot und fragen euch direkt vor dem Absenden nach dem sechsstelligen Code. Unter **Abstimmung** sieht das Team Ergebnisse und Code mit Countdown. Ein Code gilt zehn Sekunden und nur für eine Stimme. Danach erscheint ein neuer Code. Gebt einer Person nur einmal einen Code. Es gibt keine zusätzliche Browser- oder IP-Sperre; mit einem neuen gültigen Code kann auch dasselbe Gerät wieder abstimmen. Ein Neustart verwirft die Codes und Team-Sitzungen, gespeicherte Stimmen bleiben bestehen.

## QR-Codes

Unter **QR-Codes** stehen Links zur Raumeintragung und Abstimmung. Den WLAN-Adapter des Laptops wählen, Codes drucken und im Haus aufhängen. Handy und Laptop müssen im erreichbaren Hausnetz sein. Gastnetz-Isolation kann den Zugriff verhindern. Für dauerhafte Ausdrucke eine feste DHCP-Adresse im Router und `PUBLIC_URL` konfigurieren.

## Datenschutzseite

Der Link **Datenschutz** ist auf jeder Seite im Fußbereich und ohne Anmeldung erreichbar. Am Server `http://localhost:8055` als Admin öffnen, Sammlung **privacy_pages** wählen, Eintrag mit `slug = datenschutz` öffnen. Titel und Text bearbeiten. Der Text ist Klartext; Absätze bleiben erhalten, HTML wird nicht ausgeführt. `slug` unverändert lassen. `status = draft` zeigt eine Entwurfswarnung; erst nach Prüfung und Vervollständigung `published` setzen. Speichern und `/datenschutz` neu laden. Erneutes Setup überschreibt eigene Texte nicht.

Der Träger muss Namen, Anschrift, Kontakt, Rechtsgrundlagen, Speicherfristen, Empfänger und zuständige Aufsicht ergänzen. Bei geänderten Datenflüssen die Erklärung anpassen. [Datenschutzorganisation](DATENSCHUTZ.md) beschreibt die weiteren Aufgaben.

## Persönliche Konten

Ein Admin legt im CMS eine Mitarbeiterperson mit gültiger E-Mail-Adresse, Passwort, Status **Aktiv** und Rolle **Juze Team** an. Es ist keine Bestätigungsmail erforderlich. Konten nicht teilen. Zwei-Faktor-Anmeldung für Admins und möglichst auch für das Team aktivieren. Ein ausgeschiedenes Teammitglied deaktivieren und offene Sitzungen beenden. Nur Admins ändern die Datenschutzseite; die Teamrolle kann operative Daten bearbeiten.
