export const privacyTemplate = `Datenschutzhinweise für JuZ.io im Jugendzentrum

ENTWURF – Angaben des Trägers und Freigabe fehlen noch.

1. Wer ist verantwortlich?
[Name und Anschrift des Trägers ergänzen]
Kontakt für Datenschutz und Anfragen: [Kontakt ergänzen]
Datenschutzbeauftragte Person, falls bestellt: [Kontakt ergänzen]

2. Was speichern wir und warum?
Raumeintragung: Vorname oder Spitzname, gegebenenfalls weitere Gäste, Raum, Datum und Uhrzeit. Das Team nutzt diese Angaben zur Organisation der Raumnutzung. Bitte keine Nachnamen, Kontaktdaten oder vertraulichen Angaben eintragen. Trage andere Personen nur nach Rücksprache ein.
Besucherstatistik: Datum, optional Uhrzeit, Altersgruppe, Geschlechtsangabe, Anzahl und optional eine Notiz. Wir zählen Besuche und werten sie zusammengefasst aus. Namen werden dafür nicht benötigt. Kleine Gruppen, Uhrzeiten und Notizen können trotzdem Rückschlüsse auf Personen erlauben. Bitte keine persönlichen oder gesundheitlichen Informationen in Notizen schreiben.
Theke: Produkt, Menge, Preis, Zeitpunkt und Kennung der buchenden Mitarbeiterperson. Pfand und Rückzahlungen sind eigene Buchungen. Kundennamen werden dafür nicht benötigt.
Abstimmung: Auswahl, Abstimmung und Zeitpunkt. Mitarbeitercodes laufen nach zehn Sekunden ab, gelten einmal und werden nicht dauerhaft gespeichert. Stimmen enthalten keine Browser- oder Netzwerkkennung. Es gibt keine Cookie-, LocalStorage- oder IP-Sperre für die Stimmabgabe.
Teamkonto: E-Mail-Adresse, gegebenenfalls Vorname, Rolle und Anmeldeinformationen. Directus speichert Passwörter als Hash und verwaltet Sitzungen.

3. Auf welcher Grundlage verarbeiten wir Daten?
[Der Träger ergänzt hier für jeden Zweck die zutreffende Rechtsgrundlage nach Art. 6 DSGVO und gegebenenfalls zusätzliche fachgesetzliche Regelungen. Bei berechtigtem Interesse auch die Interessen benennen. Keine pauschale Einwilligung voraussetzen.]
[Ergänzen: Welche Angaben sind erforderlich oder freiwillig, was passiert bei Nichtangabe?]

4. Wer kann Daten sehen?
Berechtigte Teammitglieder können Raumlisten, Statistik und Kassenbuchungen sehen. Administrierende Personen verwalten Konten, Inhalte und Daten. Jugendliche können die eigenen Formulare nutzen, aber keine gespeicherten Namen oder Teamdaten abrufen.
Die Anwendung läuft auf einem Server im Hausnetz. [Standort und Zuständigkeiten ergänzen.] Die eingesetzte Directus-Lizenz kann externe Lizenzprüfungen und Telemetrieverbindungen zu Directus. [Empfänger, Datenumfang und Rechtsgrundlagen vor Freigabe prüfen und ergänzen.] [Weitere Empfänger, IT-Dienstleister und gegebenenfalls Auftragsverarbeiter ergänzen. Tatsächliche Betriebsumgebung prüfen.]
[Etwaige Übermittlungen außerhalb des Europäischen Wirtschaftsraums und Garantien ergänzen oder nach Prüfung ausschließen.]

5. Wie lange bleiben Daten gespeichert?
[Verbindliche Fristen oder Kriterien je Bereich ergänzen: Raumliste, Statistik, Stimmen, Mitarbeiterkonten, Kassenbuchungen, Directus-Aktivitäten/Revisionen, technische Logs, Exporte und Backups.]
Es gibt derzeit keine automatische Löschung der Geschäftsdaten. Die verantwortliche Person muss die beschlossenen Fristen organisatorisch umsetzen. Backups, CSV-Dateien und Directus-Änderungsverläufe können zusätzliche Kopien enthalten.

6. Cookies und technische Daten
Für Team-Anmeldungen wird juze_session verwendet (höchstens acht Stunden). Die Abstimmung setzt keine Cookies oder LocalStorage-Markierungen. [Erforderlichkeit und rechtliche Einordnung nach § 25 TDDDG durch den Träger prüfen.]
Die Serverkommunikation benötigt die Geräte-IP. Die App hält sie zur Begrenzung von Anfragen vorübergehend im Arbeitsspeicher (etwa eine Minute); Directus kann außerdem IP-Adressen, Zugriffe und Änderungen in technischen Logs, Aktivitäten und Revisionen speichern. Router und Betriebssystem können eigene Protokolle führen.
Die Anwendung ist im Hausnetz über HTTPS erreichbar. Handys benötigen Zugang zum Haus-WLAN. [Die tatsächliche Betriebsumgebung und technische Protokolle ergänzen.]

7. Deine Rechte
Du kannst dich an den genannten Datenschutzkontakt wenden und nach den Voraussetzungen der DSGVO Auskunft, Berichtigung, Löschung, Einschränkung oder Datenübertragbarkeit verlangen. Soweit die Verarbeitung auf einer Einwilligung beruht, kannst du sie für die Zukunft widerrufen. Bei bestimmten Rechtsgrundlagen steht dir ein Widerspruchsrecht zu. Du kannst dich bei einer Datenschutzaufsichtsbehörde beschweren: [zuständige Behörde und Kontakt ergänzen].
Wenn du Fragen hast oder einen Eintrag korrigieren möchtest, hilft dir auch das Team vor Ort.

8. Automatisierte Entscheidungen
Die App trifft keine automatisierten Entscheidungen über Personen mit rechtlicher oder ähnlich erheblicher Wirkung. Für die Stimmabgabe prüft sie kurzlebige, einmal verwendbare Mitarbeitercodes.

Stand: [Datum der Prüfung und Freigabe ergänzen]`;
