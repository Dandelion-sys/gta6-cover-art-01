// Fixed scenes for screenshots and the review harness.
//   ?shot=editor — the full editor with a sample photo loaded.
//   ?shot=cover  — the cover alone, edge to edge.
// Params: photo (one sample name, or a comma list cycled across panels),
// caption, tagline, layout, grade, size (square|portrait|wide), titlepos.
// window.__shotReady is set once the cover is painted with its fonts.
async function runShot(shot, query, setupScene) {
  if (shot === "cover") document.body.classList.add("shot-cover");
  const photos = (query.get("photo") ?? "pier").split(",").map((s) => s.trim()).filter(Boolean);
  await setupScene({
    photos,
    caption: query.get("caption") ?? "Sunset Heist",
    tagline: query.get("tagline") ?? "one last ride down Ocean Drive",
    layout: query.get("layout") ?? "hero",
    grade: query.get("grade") ?? "sunset",
    size: query.get("size") ?? "square",
    titlePos: query.get("titlepos") ?? "bottom",
  });
  if (document.fonts) {
    try {
      await Promise.all([
        document.fonts.load('40px Anton'),
        document.fonts.load('20px Pacifico'),
      ]);
    } catch { /* fall back to system fonts */ }
  }
  if (window.__coverStudio) window.__coverStudio.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
