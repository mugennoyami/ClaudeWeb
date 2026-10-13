# COLDSTART – Website

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
| `assets/img/logo-coldstart.webp` | COLDSTART-Logo mit transparentem Hintergrund (Header, Hero, Footer) |
| `assets/img/wheel-coldstart.webp` | Felgen-Designstudie, rote Akzente auf Türkis umgefärbt (Hero) |
| `assets/img/barbed-wire.svg` | Stacheldraht-Trenner (Hintergrund-Kachel) |
| `assets/img/favicon.svg` | Favicon |

Icons liegen als SVG-Symbole im Sprite am Anfang von `index.html`.

Die Akzentfarbe ist Türkis (`--accent: #41c4d9` in `styles.css`), abgeleitet von den Blautönen im Logo.

## Vor dem Livegang

1. **Marke prüfen.** Vor dem Livegang Marke (DPMA), Domain und Social-Handles für COLDSTART prüfen.
2. **Kontakt-E-Mail eintragen.** `kontakt@example.com` steht in `index.html` (Kontaktliste und `data-email` am Formular), `impressum.html` und `datenschutz.html`.
3. **Standort eintragen.** Platzhalter `[Ort einfügen]` in `index.html`.
4. **Impressum und Datenschutz ausfüllen.** Alle rot markierten Stellen ersetzen und rechtlich prüfen lassen.
5. **Hosting-Anbieter in der Datenschutzerklärung nennen.**
6. **Track-Hinweise prüfen lassen.** Wortlaut auf der Startseite und im Impressum (Haftungshinweis).

## Hinweise

- **Kontaktformular:** Es öffnet das E-Mail-Programm der Besucher, auf dem Server wird nichts gespeichert. Für ein Formular mit Speicherung braucht es einen Formular-Dienst oder ein Backend.
- **Felge:** dreht sich in 3D wie auf einem Drehteller (CSS-Animation `turntable`) und zusätzlich mit dem Scrollen (`--turn`, `assets/js/main.js`). Bei `prefers-reduced-motion` bleibt sie still.
- **Stacheldraht:** Trenner und Seitenstränge sind SVG-Kacheln in `assets/img/`. Die Seitenstränge sind auf Handys ausgeblendet.
- **Schriften:** Lokal gehostet, damit beim Aufruf keine Verbindung zu Google-Servern entsteht.
- **Custom-Parts-Shop (später):** Dafür werden Widerrufsbelehrung, AGB und ein Zahlungsanbieter nötig. Das ist bewusst noch nicht enthalten.
- **Barrierefreiheit:** Reduzierte Bewegung wird respektiert (`prefers-reduced-motion`), Fokuszustände sind sichtbar, das Menü schließt mit Escape.
