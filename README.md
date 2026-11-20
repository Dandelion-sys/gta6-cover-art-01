# Neon Palms Cover Studio

Turn any photo into GTA-style multi-panel cover art, offline in your browser.
No upload, no account, no server: your photos never leave your machine.
Pick a layout, a sunset grade, write your title, drag each photo into place,
and export a PNG in Square (1080 × 1080), Portrait (1080 × 1350) or Wide
(1920 × 1080) — one at a time, or all three at once.

Built for the make.fun competition **gta6-cover-art-01** ("Make GTA 6 Cover
Art"). All art, lettering, place and character names are original inventions
— no Rockstar Games logos, artwork, characters or fonts.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

## What it does

- **6 layouts** — Hero + Three, Four Panel, Nine Panel, Full Bleed,
  Tilted Snaps (rotated snapshot frames) and Triptych.
- **5 sunset grades** — Vice Sunset, Neon Night, Golden Hour, Mono Noir and
  Palm Teal. Each grade re-lights the photos with a canvas filter plus a
  two-colour wash, so the whole cover feels graded, not just tinted.
- **Per-panel crop and position** — click a panel to select it, drag the
  photo to pan, scroll (or use the zoom slider) to zoom. Fill every panel
  with one photo, or give each panel its own.
- **Your photos or the samples** — load images from your machine, or use
  the three AI-made sample photos in `app/samples/` (boulevard, rooftop,
  neon street). No real people, no logos, no text baked in.
- **Editable lettering** — title in Anton (bold condensed capitals) with an
  optional outline, tagline in Pacifico script, four title colours, title
  size slider, plus a star badge, film grain, vignette and a white frame.
- **Undo / redo** — Ctrl+Z / Ctrl+Y, or the buttons in the header.
- **Export PNG** — 1080 × 1080, 1080 × 1350 and 1920 × 1080, each exactly
  those pixels, or all three with one click.

## Files

- `main.ts` — the entrypoint. Copies `app/` and `screenshots/` to the
  output directory and writes `dossier.json` with `buildDossier` from
  `vendor/makefun-app.ts`. Run it with
  `MAKEFUN_OUTPUT_DIR=out node main.ts`.
- `serve.ts` — the local static server used while developing.
- `shoot.mjs` + `shots.json` — takes the 4 screenshots in `screenshots/`,
  clicks every export button and checks the real PNG downloads (signature
  and IHDR size), and fails if the app makes any non-local request.
  Run: `node shoot.mjs` (needs the Playwright Chromium build in
  `~/.cache/ms-playwright`, as the kit's browser-automation setup does).
- `app/index.html` — the editor page.
- `app/style.css` — the editor chrome (dark UI, neon accents).
- `app/src/cover.js` — the cover engine: layouts, grades, panel drawing,
  title block, grain, badge. Vanilla 2D canvas, no libraries.
- `app/src/main.js` — the editor: controls, drag/zoom, history, export,
  and the `?shot=cover` scene used for screenshots.
- `app/fonts/` — Anton and Pacifico (SIL Open Font License, texts beside
  them), fetched from the Google Fonts repository.
- `app/samples/` — three AI-generated sample photos made for this entry.
- `vendor/makefun-app.ts` — the kit's dossier library, copied unchanged.

## Offline

The app makes no network request. Every script, style, font and sample
photo is a file under `app/`, loaded by relative path. Open
`app/index.html` from any static server — or straight from disk — and it
works.

## Verified (playtest, 2026-11-20)

`node shoot.mjs` drives the app in headless Chromium and checks it end to
end; all checks passed:

- Screenshots: `1-cover.jpg` 1280 × 720 / 201 KiB, `2-editor.jpg`
  1280 × 800 / 138 KiB, `3-cover-portrait.jpg` 1024 × 1280 / 213 KiB,
  `4-cover-square.jpg` 1024 × 1024 / 185 KiB — all inside the gate limits
  (long side ≤ 1280, short side ≥ 480, ≤ 256 KiB each).
- Exports: clicking each export button downloads a real PNG whose IHDR
  reads exactly 1080 × 1080, 1080 × 1350 and 1920 × 1080.
- Upload: choosing a photo from disk lands it in the selected panel
  (blob URL, read locally, never sent anywhere).
- Fonts: `document.fonts.check` confirms Anton and Pacifico load from
  `app/fonts/`.
- Network: zero non-local requests while using the app (the only URLs
  seen were the local server and same-origin blob URLs for uploads).
- Dossier: `MAKEFUN_OUTPUT_DIR=out node main.ts` builds cleanly and the
  run is byte-identical when repeated.

One bug found in the playtest and fixed: the tagline used to sit past the
bottom edge of the cover and render half-clipped. The title block now
anchors its text from the bottom of the cover, so the tagline always
lands fully inside the frame at every export size.

## License

MIT — see `LICENSE`. Fonts under `app/fonts/` are under the SIL Open Font
License 1.1 (texts included). Sample photos were generated for this entry
and are free to use.
