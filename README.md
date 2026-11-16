# ELRICO – Website-Vorschau

Öffentliche Vorschau der Webseite für **elrico.de**. Das unveränderte Logo **FINAL Version 1.0** wird aus `logo/elrico-final.svg` eingebunden.

## GitHub Pages aktivieren

1. Öffne [Settings → Pages](https://github.com/ricommender/elrico_review/settings/pages).
2. Wähle unter **Build and deployment → Source** die Option **GitHub Actions**.
3. Starte auf [Actions → Publish elrico preview](https://github.com/ricommender/elrico_review/actions/workflows/deploy-pages.yml) den Workflow über **Run workflow**.
4. Prüfe anschließend die Vorschau unter https://ricommender.github.io/elrico_review/ .

Die Testseite ist öffentlich und mit `noindex` gekennzeichnet. Das private Entwicklungsrepository bleibt getrennt.

## Preview v1.1

- Animiertes Logo-Intro mit rotem Cut/Scan, drei Phasen **IDEE → KI → CODE**, Skip und Replay.
- Neue Einblendungen für Hero und Leistungsbereiche, Fortschrittsbalken und animierte Mikrointeraktionen.
- Respektiert `prefers-reduced-motion` und lässt das Original-Logo FINAL v1.0 unverändert.
- Die Vorschau nutzt nur statische Dateien und lädt keine externen Tracking-Skripte.

## Website Intro — Cinematic Preview 1.2

- **Film:** `assets/elrico-orb-intro.mp4` – 5 Sekunden, bei Magnific mit Kling 3.0 erzeugt: 3D-artige Drehung des metallischen ELRICO-Emblems vor rot pulsierendem Orb.
- **Metalllogo:** `assets/elrico-metallic.png` – freigestellte, silber-rote Logo-Variante ohne weißen Hintergrund.
- **Darstellung:** Video im Intro mit CSS-Orb/3D-Fallback; Skip und Replay vorhanden. Die Hauptseite zeigt das metallische Logo frei vor dem Orb.
- **Originalmarke:** `logo/elrico-final.svg` bleibt unverändert; das private Original-Repository `ricommender/elrico` bleibt Referenz.
- **Performance / Bedienung:** Film stumm, auf Mobilgeräten `playsinline`; bei reduzierter Bewegung wird das Intro übersprungen.

Live-Test: https://ricommender.github.io/elrico_review/

## Cinematic Intro — Preview v1.3

- Metalllogo und der ursprüngliche Magnific-Film bleiben unverändert gespeichert.
- Komprimierte Webversion: [`assets/elrico-orb-intro-web.mp4`](assets/elrico-orb-intro-web.mp4) – **1,82 MiB** statt 9,71 MiB (1080 × 1080, H.264, ca. 5 Sekunden).
- Sofort sichtbarer CSS-Orb mit Metalllogo während der Videovorbereitung, ohne künstlichen Prozent-Ladebalken.
- Start des Films erst bei Ladebereitschaft; bei langsamer Verbindung oder gesperrtem Autoplay läuft eine kurze CSS-Fallback-Sequenz und die Webseite öffnet sich automatisch.
- Intro kann jederzeit übersprungen und auf Wunsch erneut gestartet werden. Bei `prefers-reduced-motion` startet die Seite ohne Intro.
- `logo/elrico-final.svg` bleibt der unveränderte Logo-Referenzstand v1.0.

## Cinematic Intro — iPhone/Safari Stabilisierung v1.4

- Fehlerursache aus dem bisherigen Code: 1,85 Sekunden Video-Ladefrist und Abbruch schon nach 1,5 Sekunden Buffering.
- Der Film wird nun unmittelbar über `video.play()` angefordert; die Wiedergabe-Promise entscheidet, ob das Autoplay erfolgreich ist. Die harte Startfrist ist auf 3,6 Sekunden erhöht.
- Bei blockiertem Autoplay erscheint **Film auf diesem Gerät starten**. Der Button löst `play()` direkt durch eine Nutzerinteraktion aus, was unter Safari/Low-Power-Mode zuverlässiger ist.
- Ohne Eingabe wird die Homepage nach kurzer Schonfrist automatisch geöffnet; auch bei Abspiel- oder Bufferingfehlern bleibt die Seite erreichbar.
- `playsinline`, `webkit-playsinline` und `muted` sind gesetzt; der Originalfilm und das FINAL-v1.0-Logo bleiben unverändert.
- Repository nach Umbenennung: https://github.com/ricommender/elrico_review
- GitHub-Pages-Vorschau: https://ricommender.github.io/elrico_review/

## iPhone-Stabilisierung v1.5

- iPhone-Video: `assets/elrico-orb-intro-mobile.mp4` (720×720, H.264 Baseline, ca. 0,96 MiB).
- Kein hartes 5-/6-Sekunden-Limit mehr: Die Sequenz endet regulär mit dem tatsächlichen `ended`-Event, nicht durch einen Timer oder `visibilitychange`.
- Kein Abbruch nach kurzem Puffern; bei sehr langer Unterbrechung erscheint eine manuelle Fortsetzen-Funktion.
- Wenn Autoplay blockiert wird, kann das Video direkt per Button gestartet werden. Intro überspringen bleibt möglich.
- Visuelle Safari-GPU-Effekte sind reduziert. Die Original-Magnific-Sequenz und das finale v1.0-Logo bleiben unangetastet.
- Diagnosemodus ausschließlich lokal im Browser: `https://ricommender.github.io/elrico_review/?debug=1` zeigt Videoereignisse und MediaError-Codes an; keine Übertragung an einen Server.
