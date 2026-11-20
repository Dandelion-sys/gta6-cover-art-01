// Neon Palm Cover Studio wiring: panels, dragging, zoom, layout/grade/word
// controls, preview sizing and PNG export. `?shot=` scenes live in shots.js.
// Plain classic scripts (no modules) so the app also opens from file://.
const stage = document.getElementById("stage");
const statusEl = document.getElementById("status");
const captionEl = document.getElementById("caption");
const taglineEl = document.getElementById("tagline");
const zoomEl = document.getElementById("zoom");
const zoomVal = document.getElementById("zoomVal");
const panelNameEl = document.getElementById("panelName");

const SAMPLES = ["portrait", "pier", "boulevard"];
const state = {
  layout: "hero",
  grade: "sunset",
  caption: captionEl.value,
  tagline: taglineEl.value,
  titlePos: "bottom",
  panels: [null, null, null, null],
};
let selected = 0;
let previewSize = "square";

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function say(msg) { statusEl.textContent = msg; }
function redraw() { drawCover(stage, state); }

function panelCount() { return LAYOUTS[state.layout]; }

function ensurePanels() {
  const n = panelCount();
  while (state.panels.length < n) state.panels.push(null);
  state.panels.length = n;
  if (selected >= n) selected = 0;
}

function syncPanelUI() {
  const p = state.panels[selected];
  panelNameEl.textContent = `Panel ${selected + 1} — ${p ? p.name : "empty"}`;
  zoomEl.value = p ? Math.round(p.zoom * 100) : 100;
  zoomVal.textContent = `${zoomEl.value}%`;
}

function selectPanel(i) {
  selected = i;
  syncPanelUI();
  redraw();
}

async function putPhotoInPanel(index, img, name) {
  state.panels[index] = { img, zoom: 1, ox: 0, oy: 0, name };
  selectPanel(index);
}

async function loadSample(name, index = selected) {
  const img = await loadImage(`samples/${name}.jpg`);
  await putPhotoInPanel(index, img, name);
}

async function loadDemo() {
  const demo = ["portrait", "pier", "boulevard", "portrait"];
  for (let i = 0; i < panelCount(); i++) {
    try {
      const img = await loadImage(`samples/${demo[i % demo.length]}.jpg`);
      state.panels[i] = { img, zoom: 1, ox: 0, oy: 0, name: demo[i % demo.length] };
    } catch { /* a missing sample just leaves the slot empty */ }
  }
  syncPanelUI();
  redraw();
}

// Fills a demo scene for screenshots and for the review harness: the named
// samples cycle across the panels, then words/layout/grade/size are applied.
async function setupScene(opts = {}) {
  const names = opts.photos && opts.photos.length ? opts.photos : SAMPLES;
  if (opts.layout) state.layout = opts.layout;
  if (opts.grade) state.grade = opts.grade;
  if (opts.titlePos) state.titlePos = opts.titlePos;
  if (opts.caption !== undefined) { state.caption = opts.caption; captionEl.value = opts.caption; }
  if (opts.tagline !== undefined) { state.tagline = opts.tagline; taglineEl.value = opts.tagline; }
  if (opts.size && SIZES[opts.size]) setPreviewSize(opts.size);
  markPressed("layout", state.layout);
  markPressed("grade", state.grade);
  markPressed("titlepos", state.titlePos);
  ensurePanels();
  for (let i = 0; i < panelCount(); i++) {
    const img = await loadImage(`samples/${names[i % names.length]}.jpg`);
    state.panels[i] = { img, zoom: 1, ox: 0, oy: 0, name: names[i % names.length] };
  }
  selectPanel(0);
}

function markPressed(group, value) {
  document.querySelectorAll(`[data-${group}]`).forEach((b) => {
    const on = b.dataset[group] === value;
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", String(on));
  });
}

function setPreviewSize(size) {
  previewSize = size;
  const [w, h] = SIZES[size];
  stage.width = w;
  stage.height = h;
  markPressed("size", size);
  redraw();
}

function setLayout(layout) {
  state.layout = layout;
  ensurePanels();
  markPressed("layout", layout);
  syncPanelUI();
  redraw();
}

function setGrade(grade) {
  state.grade = grade;
  markPressed("grade", grade);
  redraw();
}

function setTitlePos(pos) {
  state.titlePos = pos;
  markPressed("titlepos", pos);
  redraw();
}

function download(canvas, filename) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve();
    }, "image/png");
  });
}

async function exportSize(label) {
  const [w, h] = label.split("x").map(Number);
  const canvas = renderCover(state, w, h);
  await download(canvas, `neon-palm-cover-${w}x${h}.png`);
  say(`Saved neon-palm-cover-${w}x${h}.png`);
}

async function exportAll() {
  for (const label of ["1080x1080", "1080x1350", "1920x1080"]) {
    await exportSize(label);
    await new Promise((r) => setTimeout(r, 200));
  }
  say("Saved all three sizes — 1080×1080, 1080×1350, 1920×1080.");
}

// ---- controls ----
document.getElementById("upload").addEventListener("change", async (e) => {
  const files = [...e.target.files];
  for (const file of files) {
    let index = state.panels.findIndex((p) => !p);
    if (index === -1) index = selected;
    try {
      const img = await loadImage(URL.createObjectURL(file));
      await putPhotoInPanel(index, img, file.name.replace(/\.[^.]+$/, ""));
    } catch { say(`Could not read ${file.name}.`); }
  }
  e.target.value = "";
});

document.querySelectorAll("[data-sample]").forEach((b) => {
  b.addEventListener("click", async () => {
    try { await loadSample(b.dataset.sample); }
    catch { say(`Sample ${b.dataset.sample} is missing.`); }
  });
});

document.querySelectorAll("[data-layout]").forEach((b) => {
  b.addEventListener("click", () => setLayout(b.dataset.layout));
});
document.querySelectorAll("[data-grade]").forEach((b) => {
  b.addEventListener("click", () => setGrade(b.dataset.grade));
});
document.querySelectorAll("[data-titlepos]").forEach((b) => {
  b.addEventListener("click", () => setTitlePos(b.dataset.titlepos));
});
document.querySelectorAll("[data-size]").forEach((b) => {
  b.addEventListener("click", () => setPreviewSize(b.dataset.size));
});
document.querySelectorAll("[data-export]").forEach((b) => {
  b.addEventListener("click", () => exportSize(b.dataset.export));
});
document.getElementById("exportAll").addEventListener("click", exportAll);

captionEl.addEventListener("input", () => { state.caption = captionEl.value; redraw(); });
taglineEl.addEventListener("input", () => { state.tagline = taglineEl.value; redraw(); });

zoomEl.addEventListener("input", () => {
  const p = state.panels[selected];
  if (!p) return;
  p.zoom = Number(zoomEl.value) / 100;
  zoomVal.textContent = `${zoomEl.value}%`;
  redraw();
});
document.getElementById("centerBtn").addEventListener("click", () => {
  const p = state.panels[selected];
  if (!p) return;
  p.zoom = 1; p.ox = 0; p.oy = 0;
  syncPanelUI();
  redraw();
});
document.getElementById("clearBtn").addEventListener("click", () => {
  state.panels[selected] = null;
  syncPanelUI();
  redraw();
});

// ---- canvas: click to select, drag to pan, wheel to zoom ----
function toCanvasPoint(e) {
  const r = stage.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (stage.width / r.width),
    y: (e.clientY - r.top) * (stage.height / r.height),
    rect: r,
  };
}
function hitPanel(x, y) {
  const rects = layoutRects(stage.width, stage.height, state.layout);
  return rects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
}

let drag = null;
stage.addEventListener("pointerdown", (e) => {
  const { x, y } = toCanvasPoint(e);
  const i = hitPanel(x, y);
  if (i === -1) return;
  const p = state.panels[i];
  selectPanel(i);
  if (!p) return;
  stage.setPointerCapture(e.pointerId);
  stage.classList.add("dragging");
  drag = { x, y, ox: p.ox, oy: p.oy, rect: layoutRects(stage.width, stage.height, state.layout)[i] };
});
stage.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const { x, y } = toCanvasPoint(e);
  const p = state.panels[selected];
  if (!p) return;
  p.ox = drag.ox + (x - drag.x) / drag.rect.w;
  p.oy = drag.oy + (y - drag.y) / drag.rect.h;
  redraw();
});
function endDrag() { drag = null; stage.classList.remove("dragging"); }
stage.addEventListener("pointerup", endDrag);
stage.addEventListener("pointercancel", endDrag);
stage.addEventListener("dblclick", () => {
  const p = state.panels[selected];
  if (!p) return;
  p.zoom = 1; p.ox = 0; p.oy = 0;
  syncPanelUI();
  redraw();
});
stage.addEventListener("wheel", (e) => {
  const p = state.panels[selected];
  if (!p) return;
  e.preventDefault();
  p.zoom = Math.max(1, Math.min(3, p.zoom * Math.exp(-e.deltaY * 0.0012)));
  syncPanelUI();
  redraw();
}, { passive: false });

// ---- boot ----
window.__coverStudio = { state, stage, setupScene, exportSize, exportAll, redraw, loadSample };

const params = new URLSearchParams(location.search);
const shot = params.get("shot");
if (shot) {
  runShot(shot, params, setupScene);
} else {
  redraw();
  syncPanelUI();
  loadDemo();
  if (document.fonts) {
    Promise.all([
      document.fonts.load('40px Anton'),
      document.fonts.load('20px Pacifico'),
    ]).then(redraw).catch(() => {});
  }
}
