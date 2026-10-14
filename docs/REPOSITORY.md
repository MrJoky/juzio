# Repository vorbereiten und privat teilen

## Was ins Repository gehört

Quellcode, Schema-/Setup-Skripte, Tests, Dokumentation, `package-lock.json` und `.env.example` ohne echte Werte. `.env.local`, `.env`, Datenbanken, Backups, private Schlüssel und CSV-Exporte gehören nicht hinein. `.gitignore` schützt typische Dateien, ersetzt aber keine Prüfung vor dem Commit. Auch im privaten Repository keine Passwörter oder Besucherlisten speichern.

Für ein neues Projekt vor dem Push im gewünschten Hosting ein **privates** Repository anlegen. Bei GitHub keine README automatisch erzeugen, wenn ihr den vorhandenen Verlauf übernehmen wollt. Danach lokal:

```bash
git remote add origin <SSH-URL-des-privaten-Repositories>
git log --oneline -3
git status --short
git push -u origin main
```

Die tatsächliche URL einsetzen. Keine Tokens in die URL schreiben. Vorher Repository-Sichtbarkeit und Zugriffsliste prüfen. Diese Arbeit setzt keine Hosting-Rechte und pusht nicht automatisch.

Nach einer Umbenennung auf GitHub die lokale Verbindung auf die neue Repository-URL setzen:

```bash
git remote set-url origin <NEUE-REPOSITORY-URL>
git remote -v
git push
```

## Leserechte für Außenstehende

Ein privates GitHub-Repository ist nicht allein durch einen Link zugänglich. Personen brauchen ein GitHub-Konto und ausdrücklich eingerichtete Berechtigungen. Für abgestufte Rollen empfiehlt sich ein Repository in einer **GitHub-Organisation**: Außenstehende gezielt als **Outside collaborator** mit Rolle **Read** einladen. Teams bekommen ebenfalls nur die notwendige Rolle. Read erlaubt Lesen und Herunterladen/Klonen, aber kein Pushen auf euer Repository.

Bei einem privaten Repository eines persönlichen Accounts erhalten normale Collaborators nach GitHub-Dokumentation auch Schreibrechte; das passt nicht zum gewünschten Modell. Eine Organisation ermöglicht die passende Read-Rolle. Ein Link ersetzt diese Einladung nicht. Zugangstokens oder euer eigenes Konto niemals als „Leselink“ verteilen. Wenn jemand ohne Hosting-Konto nur die Dokumentation lesen soll, separat eine bereinigte Dokumentkopie teilen; das ist kein Zugriff auf das private Repository.

Für Besitzer und Schreibberechtigte Zwei-Faktor-Anmeldung aktivieren. Änderungen über Pull Requests prüfen; einen geschützten Hauptbranch einrichten, soweit der gewählte Tarif es unterstützt. Zugriffe regelmäßig kontrollieren und beim Ausscheiden entfernen. Bereits heruntergeladene Kopien lassen sich damit nicht zurückholen.

## Wenn ein Geheimnis doch veröffentlicht wurde

Betroffenen Schlüssel sofort widerrufen/erneuern; Löschen aus der aktuellen Datei allein genügt nicht. Git-Verlauf und bereits verteilte Kopien berücksichtigen. Eine Verlaufbereinigung mit allen Mitwirkenden planen, nicht ungefragt force-pushen. `DIRECTUS_SECRET` nicht ohne Folgenprüfung ändern: Directus verwendet es zur Signierung.

## Quellen

- [GitHub: Sichtbarkeit](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)
- [GitHub: persönliche Repository-Rechte](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/permission-levels-for-a-personal-account-repository)
- [GitHub: Organisationsrollen](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization)
