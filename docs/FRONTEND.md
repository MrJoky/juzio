# Seitentexte und Browsercode bearbeiten

Die App verwendet normale JavaScript-Module im Browser. Es gibt keinen Buildschritt und kein Frontend-Framework. `public/app.js` importiert die Seiten, lädt die Anmeldung und wählt anhand der URL die passende Seite aus.

## Texte einer Seite ändern

Öffne die passende Datei in `public/pages/`. Überschriften, Hinweise, Formularbeschriftungen und Buttons stehen zusammen mit der zugehörigen Seitenfunktion in dieser Datei. Die HTML-Vorlagen sind mehrzeilig eingerückt; `/* HTML */` kennzeichnet sie für den Editor bzw. Formatter und hat keine Funktion zur Laufzeit.

| Seite / URL | Datei |
| --- | --- |
| Raumeintragung `/` | [raumeintragung.js](../public/pages/raumeintragung.js) |
| Anmeldung `/login` | [login.js](../public/pages/login.js) |
| Teamübersicht `/team` | [team.js](../public/pages/team.js) |
| Raumliste `/raumliste` | [raumliste.js](../public/pages/raumliste.js) |
| Besucherstatistik `/statistik` | [statistik.js](../public/pages/statistik.js) |
| Verkauf und Pfand `/theke` | [theke.js](../public/pages/theke.js) |
| Öffentliche Abstimmung `/abstimmung` | [abstimmung.js](../public/pages/abstimmung.js) |
| Ergebnisse und Mitarbeitercodes `/abstimmung-team` | [abstimmung-team.js](../public/pages/abstimmung-team.js) |
| QR-Codes `/qr` | [qr.js](../public/pages/qr.js) |
| Datenschutzanzeige `/datenschutz` | [datenschutz.js](../public/pages/datenschutz.js) |

Beispielsweise stehen die Begrüßung „Willkommen im Juze“ und das Eintragungsformular in `pages/raumeintragung.js`. Die eigentlichen Datenschutzhinweise werden weiterhin in Directus gepflegt; `pages/datenschutz.js` enthält nur deren Darstellung und feste Hinweistexte.

Text zwischen HTML-Tags oder innerhalb von Anführungszeichen ändern. `${…}` fügt berechnete Werte ein; diese Ausdrücke sowie `id`, `name`, `data-*` und die Importpfade nur bei einer entsprechenden Funktionsänderung anpassen. Werte aus dem CMS oder Formulareingaben werden vor der HTML-Ausgabe mit `esc()` maskiert.

## Gemeinsame Bausteine

| Zuständigkeit | Datei |
| --- | --- |
| Initialisierung und Zuordnung URL → Seite | [app.js](../public/app.js) |
| Angemeldete Navigation und Abmelden | [lib/navigation.js](../public/lib/navigation.js) |
| API-Anfragen und Behandlung von Anmeldefehlern | [lib/api.js](../public/lib/api.js) |
| Datums- und Geldformatierung, HTML-Maskierung, Buchungskennungen | [lib/format.js](../public/lib/format.js) |
| Überschriften, Karten, Tabellen und Statusmeldungen | [lib/ui.js](../public/lib/ui.js) |
| Formularverarbeitung, Datum-/Auswahlfelder und Bearbeitungsdialog | [lib/forms.js](../public/lib/forms.js) |
| Zeitraumfilter und CSV-Export | [lib/lists.js](../public/lib/lists.js) |
| Browser-Titel, Logo-Schriftzug, öffentliche Navigation und Fußzeile | [index.html](../public/index.html) |
| Aussehen und Abstände | [styles.css](../public/styles.css) |

Nach Textänderungen genügt ein Neuladen der Browserseite. Bei neu angelegten Moduldateien die App einmal neu starten: Der Server ermittelt beim Start die erlaubten `.js`-Dateien in `public/pages/` und `public/lib/`. Andere Projektdateien werden darüber nicht ausgeliefert. Eine neue Seite zusätzlich in `app.js` und in der serverseitigen Seiten-/Rechtezuordnung registrieren.

## Prüfung

```bash
node --env-file=.env.local --test
```

Die Tests importieren Statistik- und Kassenberechnungen direkt aus den Seitenmodulen. Weitere Tests prüfen Formularverhalten, HTML-Maskierung und die vollständige Auslieferung aller Modul-Imports. Für Prüfungen mit dem laufenden CMS zusätzlich `DIRECTUS_INTEGRATION=1` setzen.
