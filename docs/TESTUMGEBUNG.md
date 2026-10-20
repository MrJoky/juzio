# Testumgebungen für den JuZ.io-Installer

Die Grundlage liegt auf dem Branch `juzio-installer`. Der geführte Installer und seine Windows-/macOS-Startdateien werden darauf erst entwickelt. Die vorhandenen Tests prüfen bereits App-Funktionen, Konfiguration, Prozessaufrufe, Fehlerbehandlung und eine echte frische Directus-Instanz.

## Schnell starten

Voraussetzung: Node.js ab 22 und npm. Im Projektordner:

```sh
npm ci
npm test
```

Das führt App-Tests und die neuen Installer-Grundlagentests aus. Kein Docker/Podman erforderlich. Einzelne App-Tests öffnen kurzzeitig einen zufällig zugewiesenen Loopback-Port; nach dem Test wird er geschlossen. Keine festen zusätzlichen Ports, keine Installation von Systempaketen.

Nur die Installer-Grundlagen prüfen:

```sh
npm run test:installer
```

Hier werden temporäre Verzeichnisse angelegt und anschließend entfernt, auch mit Leerzeichen und Umlauten im Pfad. Ein kleines Node-Testprogramm ersetzt externe Befehle. Damit prüfen wir Prozessfehler, fehlende Engines, Zeitlimits und Abbrüche ohne Container. Die Konfigurationserzeugung läuft ausschließlich in temporären Ordnern und muss vorhandene Einstellungen erhalten.

`npm test` und `npm run test:installer` übernehmen keine Directus-Adressen, Schlüssel, Lizenzwerte oder `NODE_OPTIONS` aus der aufrufenden Umgebung. Sie laden keine `.env.local`. Die vorhandenen Tests gegen ein vollständig eingerichtetes CMS bleiben dabei ausdrücklich übersprungen.

## Echte Directus-Sandbox

Zusätzlich benötigt: eine laufende Docker- oder Podman-Engine. Unter Windows/macOS Docker Desktop bzw. eine passende Podman Machine starten. Die Testskripte selbst brauchen weder Bash noch PowerShell.

```sh
npm run test:sandbox
```

Die automatische Auswahl versucht Docker und danach Podman. Gezielt auswählen:

```sh
npm run test:sandbox -- --engine=podman
npm run test:sandbox -- --engine=docker
```

Ein Lauf:

1. Erzeugt zufällige eigene Zugangsdaten, einen Container und ein internes Netzwerk mit eindeutiger Test-ID.
2. Legt neue SQLite- und Upload-Volumes an. Beide gehören nur diesem Lauf.
3. Startet Directus **12.5.0**, passend zur derzeitigen Projektversion.
4. Prüft über die Container-Engine, dass keine Hostports veröffentlicht sind und das Netzwerk intern ist.
5. Meldet den frischen Testadmin an, legt eine Sammlung und einen Datensatz an und prüft die eigene Lauf-ID.
6. Startet Directus neu und liest dieselben Daten erneut.
7. Entfernt Container, beide Volumes, Netzwerk und den temporären Konfigurationsordner.

Die API-Prüfung läuft mit dem im Directus-Image enthaltenen Node direkt im Testcontainer. Dadurch braucht es keinen erreichbaren Hostport und kein zusätzliches Runner-Image. Es werden weder das Repository noch `.env.local`, Produktivdaten oder der Container-Socket in den Container eingebunden. Das interne Netzwerk bietet dem Testcontainer keinen normalen Internetzugang.

Beim ersten Lauf lädt die Engine das Directus-Image, falls es fehlt. Das Image bleibt als wiederverwendbarer Cache erhalten. Laufende Directus-Instanzen und vorhandene Produktiv-Volumes bleiben unberührt. Es werden keine systemweiten Pakete installiert.

## Aufräumen und Abbrechen

Normale Fehler sowie `Strg+C` und `SIGTERM` lösen das Aufräumen aus. Bei einem Rechnerabsturz, `SIGKILL` oder einer unerreichbaren Container-Engine kann das nicht garantiert werden. Zurückgebliebene Testressourcen lassen sich gezielt entfernen:

```sh
npm run test:sandbox -- --engine=podman --cleanup
```

Für Docker entsprechend `--engine=docker`. Der Befehl entfernt alle JuZ.io-Sandboxläufe dieser Engine, auch einen eventuell noch laufenden Test. Deshalb erst nach Ende anderer Sandboxläufe verwenden.

Gelöscht werden ausschließlich Ressourcen mit dem Label `io.juzio.test=installer-v1` und einem passenden Namen `juzio-test-<UUID>`. Normale Testläufe filtern zusätzlich nach ihrer eigenen Lauf-ID. Es gibt keinen globalen `prune` und keine Bereinigung fremder Images oder Volumes.

Nach einem harten Prozessabbruch kann außerdem ein kleiner Ordner `juzio-test-*` im temporären Betriebssystemverzeichnis bleiben. Der Engine-Aufräumbefehl entfernt diese Ordner nicht. Sie enthalten ausschließlich eigens erzeugte Testzugänge und können nach Prüfung manuell gelöscht werden. Normale Läufe entfernen ihren Ordner automatisch.

## Betriebssysteme und CI

Die Datei [test-environments.yml](../.github/workflows/test-environments.yml) startet bei Push, Pull Request und manuell:

| Prüfung | Systeme | Node.js |
| --- | --- | --- |
| App- und Installer-Grundlagentests | Linux, Windows, macOS | 22 und 24 |
| Frisches Directus, Datenbank, Neustart, Isolation, Aufräumen | Linux mit Docker | 24 |

Jeder CI-Job nutzt eine neue gehostete Umgebung. Die Jobs verwenden keine Repository-Secrets und keine Directus-Lizenz. Der Sandbox-Job hat zusätzlich einen abschließenden Aufräumschritt, der auch bei fehlgeschlagenen Tests ausgeführt wird.

Die Betriebssystemmatrix prüft native Node-Aufrufe und Dateipfade. Sie ersetzt keinen vollständigen Installer-Test mit Docker Desktop unter Windows/macOS. Sobald die eigentlichen Installationsassistenten existieren, ergänzen wir die entsprechenden Fälle. Echte Erstinstallationen mit Docker Desktop, Windows-Rechten/WSL, macOS Apple Silicon/Intel, Pfaden, Abbruch und erneutem Start müssen zusätzlich auf passenden Rechnern oder separaten VMs geprüft werden. Solche VMs werden hier nicht dauerhaft auf dem Laptop eingerichtet.

## Lizenz und vollständige App-Integration

Die Sandbox nutzt ausdrücklich keine Lizenz der laufenden Instanz und aktiviert keinen Schlüssel. Ihr erfolgreicher Abschluss belegt frischen CMS-Start, Adminzugriff, isolierte Datenhaltung und Neustartfestigkeit. Er belegt keine vollständige JuZ.io-Einrichtung mit den benötigten Team-/Formularrechten unter Directus 12.

Die vorhandenen Integrationstests `tests/directus.test.mjs` und `tests/insights.test.mjs` benötigen weiterhin ein bewusst ausgewähltes, vollständig eingerichtetes und passend lizenziertes Test-CMS. Sie erzeugen und löschen Konten sowie Daten. Sie werden weder von den normalen Testbefehlen noch von dieser Sandbox aktiviert.

Für den zukünftigen Installer ergänzen wir Tests für fehlende/ungültige Lizenz und den Fortsetzungsablauf mit simulierten Antworten. Einen echten Lizenztest führen wir kontrolliert auf einer dafür vorgesehenen Instanz aus; keine automatische neue Aktivierung pro CI-Lauf.

## Dateien erweitern

| Ort | Zweck |
| --- | --- |
| `scripts/test.mjs` | Sichere Auswahl und Start der Tests |
| `tests/installer/` | Plattformübergreifende Installer-Grundlagentests |
| `tests/fixtures/` | Externe Prozesse simulieren |
| `tests/integration/directus-smoke.mjs` | Echte API-Prüfung im Wegwerfcontainer |
| `test-environment/process.mjs` | Prozessadapter ohne Shell und bereinigte Testumgebung |
| `test-environment/sandbox.mjs` | Ressourcen, Isolation und begrenztes Aufräumen |
| `scripts/test-sandbox.mjs` | Bedienbarer Sandbox-Testbefehl |
