# COLDSTART Teileatlas – Datenstand und Rechte

Stand: 30.10.2026. Dieser Prototyp ist eine **eigenständige Ergänzung im Repository** `mugennoyami/ClaudeWeb`. Er ist **nicht** automatisch die unter `coldstart-pro-garage-atlas.solarcedar22.chatgpt.site` veröffentlichte Cloud-Work-Seite.

## Nachprüfbarer Stand

- BMW E36 und E46 sind als auswählbare Baureihen vorhanden, mit eigenständig gezeichneten SVG-Frontansichten, Zoom, Verschieben, Modell-/Karosserieauswahl und Such-/Gruppennavigation.
- 30 Hauptgruppen pro Baureihe sind als **Navigationsstruktur** angelegt. Das ist **keine** Aussage über 30 vollständig importierte Gruppen mit Teilepositionen.
- Ausgewählte Unterbaugruppen sind als redaktionelle Stichworte angelegt, **keine** fahrzeugspezifisch geprüften BMW-Bildtafeln.
- Die in einer vorherigen Sitzung genannten 702 (E36) bzw. 915 (E46) Bildtafeln sind **nicht** im Repository enthalten und wurden hier **nicht verifiziert oder importiert**.
- Ausgenommen: 01 Technische Literatur, 36 Räder, 83 Hilfs- und Betriebsstoffe, 85 Kompletträder/Felgen/Reifen, 88 Value Line Service/Reparatur, 91 Individual-Ausstattung.
- Leebmann24 ist nur als **externe Quelle** verlinkt. Es werden weder Bilder noch Scraping-Daten eingebettet.

## Rechte

Ein Zugriff auf die Leebmann24-Katalogseite lieferte beim Rechercheversuch HTTP 403. Eine ausdrückliche Lizenz zur Übernahme von Explosionszeichnungen, Positionskoordinaten oder vollständigen Datenbanken konnte nicht nachgewiesen werden. Aus diesem Grund **keine** Übernahme der fremden Zeichnungen oder systematische Spiegelung des Katalogs.

Vor einer produktiven Übernahme: schriftliche Freigabe von den jeweiligen Rechteinhabern einholen (Leebmann24/BMW bzw. Daten-/Bildlieferant), Umfang (Abbildungen, Daten, Hosting, kommerzielle Nutzung, Aktualisierung) dokumentieren und eine autorisierte Schnittstelle oder Datenlieferung nutzen. Alternativ: eigene Zeichnungen und unabhängig erfasste, geprüfte Daten.

## Technische Fortsetzung

1. Freigegebenes Datenformat einführen: `vehicle -> group -> subgroup -> diagram -> positions -> part variants`, inklusive Quellen-/Lizenz-/Versionsfeld und Fahrzeug-Gültigkeit.
2. BMW-Fahrzeugidentifikation (VIN/Typcode, Produktionsmonat, Motor, Getriebe, LHD/RHD, SA-Codes) vor Teilenummernauflösung.
3. Bei vorhandener Bildlizenz Originalgeometrie und nummerierte Positions-Hotspots verlustfrei rendern; Zoom/Drag auf dem Diagramm statt bloßer Bildskalierung.
4. Datenimport als idempotenten Prozess mit Prüfsummen, Änderungsprotokoll, Rate-Limits und Tests umsetzen.
5. UI mit Mobil- und Tastaturbedienung testen, Rechtehinweise und Quellennachweise ergänzen.
6. Separates Cloud-Work-Projekt auf den GitHub-Stand abgleichen; eine automatische Fortsetzung der früheren Work-Sitzung ist hier nicht möglich.

## Quellen

- Hauptgruppenstruktur: öffentlich sichtbare BMW-Ersatzteil-Hauptgruppen, mit den vom Nutzer gewünschten Ausschlüssen.
- Primärer Katalog: https://www.leebmann24.com/de/de/collection/bmw-ersatzteile-10004
- Keine Drittanbieter-Grafiken, -Fotos oder OEM-Teilenummern übernommen.
