# GRENZWERT – Website

Landing Page für legales Tuning (Straße mit ABE / Teilegutachten) und Track-Setups, Schwerpunkt BMW E36 & E46. Eigene CNC- und 3D-Druck-Teile sind als "In Planung" angekündigt.

Reine HTML/CSS/JS-Seite ohne Build-Schritt und ohne Abhängigkeiten.

## Lokal ansehen

```bash
python3 -m http.server 8000
```

Dann `http://localhost:8000` im Browser öffnen. Alternativ reicht ein Doppelklick auf `index.html`.

## Struktur

| Datei | Zweck |
| --- | --- |
| `index.html` | Startseite (Hero, Straße, Track, Modelle, Custom Parts, Ablauf, Kontakt) |
| `impressum.html` | Impressum mit Platzhaltern |
| `datenschutz.html` | Datenschutzerklärung mit Platzhaltern |
| `assets/css/styles.css` | Design. Farben und Schriften stehen in `:root` ganz oben |
| `assets/css/fonts.css` | `@font-face`-Regeln, zeigen auf die lokalen Dateien |
| `assets/fonts/` | Schriften selbst gehostet (Metal Mania, Barlow, Barlow Condensed, UnifrakturMaguntia, Google Fonts / SIL OFL) |
| `assets/js/main.js` | Mobiles Menü, Scroll-Einblendungen, Kontaktformular (öffnet ein `mailto:`) |
| `assets/img/favicon.svg` | Favicon |

Das Logo ist ein SVG-Symbol (`id="mark"`) in `index.html`. Icons liegen im selben Sprite.

## Vor dem Livegang

1. **Name prüfen.** "GRENZWERT" ist ein Vorschlag. Vor der Übernahme Marke (DPMA), Domain und Social-Handles prüfen. Zum Umbenennen: `grep -rn GRENZWERT .`
2. **Kontakt-E-Mail eintragen.** `kontakt@example.com` steht in `index.html` (Kontaktliste und `data-email` am Formular), `impressum.html` und `datenschutz.html`.
3. **Standort eintragen.** Platzhalter `[Ort einfügen]` in `index.html`.
4. **Impressum und Datenschutz ausfüllen.** Alle rot markierten Stellen ersetzen und rechtlich prüfen lassen.
5. **Hosting-Anbieter in der Datenschutzerklärung nennen.**
6. **Track-Hinweise prüfen lassen.** Wortlaut auf der Startseite und im Impressum (Haftungshinweis).

## Hinweise

- **Kontaktformular:** Es öffnet das E-Mail-Programm der Besucher, auf dem Server wird nichts gespeichert. Für ein Formular mit Speicherung braucht es einen Formular-Dienst oder ein Backend.
- **Schriften:** Lokal gehostet, damit beim Aufruf keine Verbindung zu Google-Servern entsteht.
- **Custom-Parts-Shop (später):** Dafür werden Widerrufsbelehrung, AGB und ein Zahlungsanbieter nötig. Das ist bewusst noch nicht enthalten.
- **Barrierefreiheit:** Reduzierte Bewegung wird respektiert (`prefers-reduced-motion`), Fokuszustände sind sichtbar, das Menü schließt mit Escape.
