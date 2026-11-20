# gta6-cover-art-01

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Dandelion-sys/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Dandelion-sys/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Neon Palm Cover Studio is an offline web app that turns your own photos and a caption into a GTA-style multi-panel cover: pick a layout (hero + three, 2×2 grid, trio strip, or full bleed), drop a photo into each panel and drag it into place, choose a Vice City sunset grade, letter the title in bold condensed type with a script tagline, then export the cover as a PNG in 1080×1080, 1080×1350, and 1920×1080 — all in the browser, with no upload, no account, and no network request.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

Or just open `app/index.html` directly in desktop Chrome — it is plain static files. Add your photos with the upload button (or click a sample), click a panel on the cover to select it, drag to move its photo, scroll to zoom, type your title and tagline, and hit **Export all three sizes**.

## Notes

- Everything is original: the layout engine, the grades, and the lettering are drawn with vanilla canvas. No Rockstar artwork, logos, or fonts are used.
- Fonts are vendored under `app/fonts/` under the SIL Open Font License (Anton for titles, Pacifico for the tagline); the license texts sit beside them.
- The three sample photos in `app/samples/` are free to use; the portrait was made for this entry with an image model.

---

<sub>Entered on [make.fun](https://make.fun/?ref=9y382syd&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
