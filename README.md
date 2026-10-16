# COLDSTART – Website, Shop und Admin

Landing Page, Shop und Verwaltungsbereich für legales Tuning (ABE / Teilegutachten), Track-Setups, CNC-Teile, 3D-Druck und Sticker. Schwerpunkt BMW E36 und E46.

Die Seite ist ein kleiner Node-Server (Express) mit SQLite-Datenbank. Es gibt keinen Build-Schritt und kein Frontend-Framework, nur zwei Abhängigkeiten: `express` und `multer`.

## Schnellstart

Voraussetzung: Node.js 22.13 oder neuer.

```bash
npm install
ADMIN_PASSWORD='mindestens-12-zeichen' npm run admin:create -- du@example.de
npm run demo:seed        # optional: Beispielprodukte zum Ausprobieren
npm start                # http://localhost:3000
```

- Shop: `http://localhost:3000/shop`
- Admin: `http://localhost:3000/admin`

Die Beispielprodukte aus `demo:seed` im Admin löschen oder überschreiben, bevor die Seite live geht.

## Der Admin-Bereich

Anmeldung mit der E-Mail und dem Passwort aus `admin:create`. Die Sitzung hält 8 Stunden. Nach 8 Fehlversuchen pro E-Mail (bzw. 40 pro IP) in 15 Minuten wird der Login für 15 Minuten gesperrt.

| Bereich | Was du dort machst |
| --- | --- |
| Übersicht | Neue und offene Bestellungen, Umsatz, Kontaktanfragen, Produkte mit knappem Bestand |
| Produkte | Anlegen und bearbeiten: Name, Beschreibung, Preis, Vorher-Preis, Bestand, Versandkosten, Zulassung, Badge, Bilder |
| Kategorien | Filter im Shop anlegen, umbenennen, sortieren |
| Bestellungen | Details ansehen, Status setzen, Zahlung als eingegangen markieren, stornieren (der Bestand wird dabei zurückgebucht) |
| Nachrichten | Kontaktanfragen aus dem Formular beantworten und abhaken |
| Einstellungen | Shop öffnen oder schließen, Standard-Versand, Gratis-Versand ab, Liefer-Länder, Rückgabefrist, Bankdaten, Versandzeit |

### Produkte richtig anlegen

- **Preis** immer inkl. MwSt. eingeben, z. B. `12,90`.
- **Vorher-Preis** optional. Ist er höher als der Preis, zeigt der Shop den Rabatt in Prozent.
- **Bestand** leer lassen für „unbegrenzt“ (z. B. Sticker). Bei einer Zahl sinkt er mit jeder Bestellung. Unter der Warnschwelle (Einstellungen) zeigt der Shop „Nur noch X da“.
- **Versand** optional. Ohne Angabe gilt der Standard-Versand. Mit `0` ist der Versand für dieses Produkt kostenlos. Im Warenkorb gilt immer der höchste Versandpreis.
- **Zulassung**: „ABE vorhanden“, „Teilegutachten“ oder „Nur Rennstrecke“. Bei „Nur Rennstrecke“ erscheint der Track-Hinweis auf der Produktseite.
- **Bilder** hochladen: JPG, PNG oder WebP, je bis 6 MB, bis zu 8 auf einmal. Das erste Bild ist das Hauptbild, andere kannst du als Hauptbild setzen oder löschen. Ohne Bild zeigt der Shop ein Platzhalter-Motiv.
- Ein Produkt, das schon in einer Bestellung vorkommt, lässt sich nicht löschen, sondern nur deaktivieren. So bleiben alte Bestellungen vollständig.

## Zahlung später anbinden

Heute ist **Vorkasse per Überweisung** aktiv. Die Kunden bekommen nach der Bestellung die Bankdaten aus den Einstellungen und den Verwendungszweck (Bestellnummer).

Für Stripe, PayPal oder einen anderen Anbieter:

1. In `server/payments.js` einen Eintrag ergänzen. Die Methode `start(order)` liefert eine URL, zu der der Kunde weitergeleitet wird.
2. Den Wert `payment_provider` in der Tabelle `settings` auf den neuen Namen setzen. Eine Auswahl im Admin folgt mit dem ersten zusätzlichen Anbieter.
3. Einen Webhook einrichten, der nach erfolgreicher Zahlung `payment_status = 'bezahlt'` setzt.
4. Bei Zahlungspflicht den Bestell-Button rechtlich korrekt beschriften (Button-Lösung, z. B. „zahlungspflichtig bestellen“). Der Text steht in `public/assets/js/checkout.js`.

## Konfiguration

Alles über Umgebungsvariablen, alle optional:

| Variable | Bedeutung |
| --- | --- |
| `PORT` | Port, Standard `3000` |
| `DATA_DIR` | Ordner für Datenbank und Uploads, Standard `./data` |
| `NODE_ENV=production` | Aktiviert sichere Cookies (nur über HTTPS) |
| `COOKIE_SECURE=1` | Sichere Cookies auch ohne `NODE_ENV` |
| `TRUST_PROXY=1` | Hinter einem Reverse-Proxy oder Hoster setzen, damit die echte IP für das Login-Limit erkannt wird |
| `ADMIN_PASSWORD` | Nur für `npm run admin:create` nötig |

## Deployment

Die Seite braucht einen Node-Server, reines statisches Hosting reicht nicht mehr. Geeignet sind z. B. Render, Railway, Fly.io oder ein eigener Server.

- Start-Befehl: `npm start`
- **Persistenter Speicher** für `DATA_DIR` (Datenbank und Uploads). Ohne Speicher gehen Bestellungen und Bilder beim Neustart verloren.
- HTTPS verwenden und `NODE_ENV=production` setzen.
- Backup: den Ordner `DATA_DIR` regelmäßig sichern, am besten täglich.

## Tests

```bash
npm test
```

Die Tests prüfen Preisberechnung und Versand, Lagerbestand und Rückbuchung, Login, Schutz vor fremden Anfragen (CSRF), Bild-Uploads und den Login-Limiter.

## Struktur

```
server/
  app.js            Express-App, Routen, Fehlerbehandlung
  config.js         Umgebungsvariablen und Pfade
  db.js             Datenbankschema, Startwerte, Hilfsfunktionen
  auth.js           Passwort-Hashing, Sessions, Cookies
  security.js       Sicherheits-Header, CSRF-Schutz, Rate-Limit
  catalog.js        Produkte, Kategorien, Bilder
  shop.js           Warenkorb-Angebot, Versand, Bestellungen, Nachrichten
  payments.js       Zahlungsanbieter (aktuell: Vorkasse)
  settings.js       Shop-Einstellungen
  uploads.js        Bild-Upload, Dateiprüfung
  routes-public.js  API für Shop und Website
  routes-admin.js   API für den Admin-Bereich
  scripts/          Admin anlegen, Demo-Produkte
public/
  index.html        Startseite
  shop.html         Shop
  produkt.html      Produktseite (/produkt/:slug)
  warenkorb.html    Warenkorb
  kasse.html        Kasse
  bestellung.html   Bestätigung (/bestellung/:nummer)
  admin.html        Admin-Bereich
  versand.html, widerruf.html, agb.html, impressum.html, datenschutz.html
  assets/           CSS, JavaScript, Schriften, Bilder
test/api.test.js    API-Tests
```

Die Bestellbestätigung per E-Mail ist noch nicht eingebaut. Die Bestätigungsseite zeigt alles an, du meldest dich bisher manuell per E-Mail.

## Rechtliches vor dem Livegang

Die Rechtstexte sind Vorlagen mit markierten Platzhaltern. Vor dem Start unbedingt von einem Anwalt prüfen lassen:

- **Impressum** (§ 5 DDG) und **Datenschutzerklärung** (Hosting, Zahlungsdienst, Aufbewahrung)
- **AGB** und **Widerrufsbelehrung** (das gesetzliche Muster einfügen)
- **Ausnahme vom Widerruf** für individuell angefertigte Teile (z. B. nach Maß gefräste oder gedruckte Sonderanfertigungen). Der Text steht in `widerruf.html`.
- **Preisangaben**: Preise inkl. MwSt. und Versandkosten vor der Bestellung (PAngV). Der Shop zeigt beides.
- **Button-Lösung** bei Zahlungspflicht (siehe oben)
- **Track-Hinweise**: Die Hinweise auf „nicht für den Straßenverkehr“ sollten rechtlich geprüft sein.
- **Versandzeit** und Rückgabefrist: Die Standardwerte („2–4 Werktage“, „14 Tage“) bitte im Admin mit der Realität abgleichen.

## Bekannte Grenzen

- Eine Instanz, eine SQLite-Datenbank. Für viele gleichzeitige Bestellungen später auf PostgreSQL umstellen.
- Login-Limit und Warenkorb-Speicher laufen im Arbeitsspeicher bzw. im Browser, nicht über mehrere Server verteilt.
- Keine Bildkomprimierung. Große Fotos vorher verkleinern, dann laden sich Seiten schneller.
- Keine Varianten (Größen, Farben). Jede Variante ist ein eigenes Produkt.
- Kein E-Mail-Versand (siehe oben).
