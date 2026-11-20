// Neon Palms Cover Studio — editor.
// Wires the controls to the cover engine, holds the undo stack, exports PNGs
// and runs the ?shot= scenes the screenshots are taken from. No network:
// photos come from the machine or from app/samples; lettering uses
// system fonts, so no font files ship with the app.

import {
  SIZES,
  LAYOUTS,
  GRADES,
  gradeById,
  layoutPanels,
  drawCover,
  panelAt,
} from './cover.js';

export const SAMPLES = [
  { src: 'samples/boulevard.jpg', name: 'Boulevard' },
  { src: 'samples/rooftop.jpg', name: 'Rooftop' },
  { src: 'samples/neon.jpg', name: 'Neon Night' },
];

const TITLE_COLORS = ['#ffffff', '#f5c542', '#ff7ab8', '#14060f'];

function defaultState() {
  return {
    layout: 'hero3',
    grade: 'vice-sunset',
    size: 'portrait',
    title: 'NEON PALMS',
    tagline: 'a sunset story in three acts',
    titleColor: '#ffffff',
    titleSize: 1,
    outline: true,
    grain: true,
    vignette: true,
    frame: true,
    badge: true,
    selected: 0,
    panels: [
      { src: 'samples/boulevard.jpg', zoom: 1, ox: 0, oy: 0 },
      { src: 'samples/rooftop.jpg', zoom: 1, ox: 0, oy: 0 },
      { src: 'samples/neon.jpg', zoom: 1, ox: 0, oy: 0 },
      { src: 'samples/boulevard.jpg', zoom: 1.15, ox: 0, oy: 0 },
    ],
  };
}

let state = defaultState();
const images = new Map();
const uploaded = [];
const history = [];
let historyIndex = -1;
let drag = null;
let wheelBurst = false;

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const pctx = preview.getContext('2d');

function panelCount() {
  const size = SIZES[state.size];
  return layoutPanels(state.layout, size.width, size.height).length;
}

function ensurePanels() {
  const n = panelCount();
  while (state.panels.length < n) {
    const src = SAMPLES[state.panels.length % SAMPLES.length].src;
    state.panels.push({ src, zoom: 1, ox: 0, oy: 0 });
  }
  state.panels.length = n;
  if (state.selected >= n) state.selected = 0;
}

function loadImage(src) {
  if (images.has(src)) return images.get(src);
  const p = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
  images.set(src, p);
  return p;
}

async function loadAllPhotos() {
  const srcs = new Set(SAMPLES.map((s) => s.src));
  state.panels.forEach((p) => srcs.add(p.src));
  uploaded.forEach((u) => srcs.add(u.src));
  const loaded = new Map();
  for (const src of srcs) {
    const img = await loadImage(src);
    if (img) loaded.set(src, img);
  }
  return loaded;
}

function previewSize() {
  const size = SIZES[state.size];
  const scale = Math.min(1, 860 / Math.max(size.width, size.height));
  return {
    width: Math.round(size.width * scale),
    height: Math.round(size.height * scale),
  };
}

async function render() {
  ensurePanels();
  const { width, height } = previewSize();
  if (preview.width !== width || preview.height !== height) {
    preview.width = width;
    preview.height = height;
  }
  const loaded = await loadAllPhotos();
  drawCover(pctx, width, height, state, loaded);
  syncPanelHint();
}

function snapshot() {
  const { selected, ...rest } = state;
  return JSON.stringify(rest);
}

function pushHistory() {
  history.length = historyIndex + 1;
  history.push(snapshot());
  if (history.length > 60) history.shift();
  historyIndex = history.length - 1;
  syncUndoButtons();
}

function restoreHistory(json) {
  const saved = JSON.parse(json);
  const selected = state.selected;
  state = { ...defaultState(), ...saved, selected };
  ensurePanels();
  syncControls();
  render();
}

function undo() {
  if (historyIndex <= 0) return;
  historyIndex -= 1;
  restoreHistory(history[historyIndex]);
  syncUndoButtons();
  setStatus('Undid that change.');
}

function redo() {
  if (historyIndex >= history.length - 1) return;
  historyIndex += 1;
  restoreHistory(history[historyIndex]);
  syncUndoButtons();
  setStatus('Redid that change.');
}

function syncUndoButtons() {
  $('undoBtn').disabled = historyIndex <= 0;
  $('redoBtn').disabled = historyIndex >= history.length - 1;
}

function setStatus(text) {
  const el = $('statusLine');
  if (el) el.textContent = text;
}

function syncPanelHint() {
  const el = $('panelLabel');
  if (!el) return;
  const n = panelCount();
  const p = state.panels[state.selected];
  const name = p ? panelName(p.src) : '—';
  el.textContent = `Panel ${state.selected + 1} of ${n} — ${name}. Drag the photo on the canvas to move it, scroll to zoom.`;
}

function panelName(src) {
  const s = SAMPLES.find((x) => x.src === src);
  if (s) return s.name;
  const u = uploaded.find((x) => x.src === src);
  if (u) return u.name;
  return 'Photo';
}

function syncControls() {
  document.querySelectorAll('#layoutRow button').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('#gradeRow button').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  });
  document.querySelectorAll('#sizeRow button').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === state.size);
  });
  document.querySelectorAll('#titleColorRow button').forEach((b) => {
    b.classList.toggle('active', b.dataset.color === state.titleColor);
  });
  document.querySelectorAll('#sampleRow button').forEach((b) => {
    const p = state.panels[state.selected];
    b.classList.toggle('active', !!p && b.dataset.sample === p.src);
  });
  $('titleInput').value = state.title;
  $('taglineInput').value = state.tagline;
  $('titleSizeRange').value = String(state.titleSize);
  $('zoomRange').value = String(state.panels[state.selected]?.zoom || 1);
  $('outlineCheck').checked = state.outline;
  $('grainCheck').checked = state.grain;
  $('vignetteCheck').checked = state.vignette;
  $('frameCheck').checked = state.frame;
  $('badgeCheck').checked = state.badge;
  syncPanelHint();
}

function change(mutator, label) {
  pushHistory();
  mutator();
  ensurePanels();
  syncControls();
  render();
  if (label) setStatus(label);
}

function buildButtonRow(container, items, key, onPick) {
  const row = $(container);
  row.innerHTML = '';
  items.forEach((item) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset[key] = item.id;
    b.textContent = item.name;
    if (item.swatch) b.style.setProperty('--swatch', item.swatch);
    b.addEventListener('click', () => onPick(item.id));
    row.appendChild(b);
  });
}

function buildControls() {
  buildButtonRow('layoutRow', LAYOUTS, 'layout', (id) => {
    change(() => {
      state.layout = id;
      state.selected = 0;
    }, `Layout: ${LAYOUTS.find((l) => l.id === id).name}.`);
  });
  buildButtonRow(
    'gradeRow',
    GRADES.map((g) => ({ id: g.id, name: g.name, swatch: `linear-gradient(135deg, ${g.top}, ${g.bottom})` })),
    'grade',
    (id) => change(() => { state.grade = id; }, `Grade: ${gradeById(id).name}.`),
  );
  buildButtonRow(
    'sizeRow',
    Object.entries(SIZES).map(([id, s]) => ({ id, name: s.label })),
    'size',
    (id) => change(() => { state.size = id; }, `Size: ${SIZES[id].label}.`),
  );
  buildButtonRow(
    'titleColorRow',
    TITLE_COLORS.map((c) => ({ id: c, name: '', swatch: c })),
    'color',
    (c) => change(() => { state.titleColor = c; }, 'Title colour changed.'),
  );
  buildButtonRow(
    'sampleRow',
    SAMPLES.map((s) => ({ id: s.src, name: s.name })),
    'sample',
    (src) => change(() => { state.panels[state.selected].src = src; }, 'Panel photo changed.'),
  );
}

function bindInputs() {
  $('titleInput').addEventListener('input', (e) => {
    state.title = e.target.value;
    render();
  });
  $('titleInput').addEventListener('change', () => pushHistory());
  $('taglineInput').addEventListener('input', (e) => {
    state.tagline = e.target.value;
    render();
  });
  $('taglineInput').addEventListener('change', () => pushHistory());
  $('titleSizeRange').addEventListener('input', (e) => {
    state.titleSize = Number(e.target.value);
    render();
  });
  $('titleSizeRange').addEventListener('change', () => pushHistory());
  $('zoomRange').addEventListener('input', (e) => {
    const p = state.panels[state.selected];
    if (p) {
      p.zoom = Number(e.target.value);
      render();
    }
  });
  $('zoomRange').addEventListener('change', () => pushHistory());
  const toggle = (id, key, label) => {
    $(id).addEventListener('change', (e) => {
      change(() => { state[key] = e.target.checked; }, label);
    });
  };
  toggle('outlineCheck', 'outline', 'Title outline toggled.');
  toggle('grainCheck', 'grain', 'Film grain toggled.');
  toggle('vignetteCheck', 'vignette', 'Vignette toggled.');
  toggle('frameCheck', 'frame', 'Frame toggled.');
  toggle('badgeCheck', 'badge', 'Badge toggled.');
  $('undoBtn').addEventListener('click', undo);
  $('redoBtn').addEventListener('click', redo);
  $('fillAllBtn').addEventListener('click', () => {
    change(() => {
      const src = state.panels[state.selected].src;
      state.panels.forEach((p) => { p.src = src; });
    }, 'Every panel now uses the same photo.');
  });
  $('uploadInput').addEventListener('change', (e) => {
    const files = [...e.target.files];
    if (!files.length) return;
    files.forEach((file, i) => {
      const src = URL.createObjectURL(file);
      uploaded.push({ src, name: file.name });
      const target = i === 0 ? state.selected : state.panels.findIndex((p) => !p.src);
      if (target >= 0) state.panels[target].src = src;
    });
    pushHistory();
    syncControls();
    render();
    setStatus(`${files.length} photo${files.length > 1 ? 's' : ''} loaded from your machine.`);
    e.target.value = '';
  });
  $('exportSquare').addEventListener('click', () => exportSize('square', true));
  $('exportPortrait').addEventListener('click', () => exportSize('portrait', true));
  $('exportWide').addEventListener('click', () => exportSize('wide', true));
  $('exportAllBtn').addEventListener('click', exportAll);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
    }
  });
}

function canvasPoint(e) {
  const rect = preview.getBoundingClientRect();
  const scaleX = preview.width / rect.width;
  const scaleY = preview.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

function bindCanvas() {
  preview.addEventListener('pointerdown', (e) => {
    const { x, y } = canvasPoint(e);
    const idx = panelAt(state.layout, preview.width, preview.height, x, y);
    if (idx < 0) return;
    pushHistory();
    state.selected = idx;
    syncControls();
    drag = { x, y, moved: false };
    preview.setPointerCapture(e.pointerId);
  });
  preview.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const { x, y } = canvasPoint(e);
    const p = state.panels[state.selected];
    if (!p) return;
    const size = SIZES[state.size];
    const panels = layoutPanels(state.layout, preview.width, preview.height);
    const rect = panels[state.selected];
    if (!rect) return;
    p.ox += (x - drag.x) / rect.w;
    p.oy += (y - drag.y) / rect.h;
    p.ox = Math.max(-0.6, Math.min(0.6, p.ox));
    p.oy = Math.max(-0.6, Math.min(0.6, p.oy));
    drag.x = x;
    drag.y = y;
    drag.moved = true;
    render();
  });
  preview.addEventListener('pointerup', () => {
    if (drag && drag.moved) setStatus('Photo repositioned.');
    drag = null;
  });
  preview.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = state.panels[state.selected];
    if (!p) return;
    if (!wheelBurst) {
      pushHistory();
      wheelBurst = true;
      setTimeout(() => { wheelBurst = false; }, 350);
    }
    p.zoom = Math.max(1, Math.min(3, p.zoom * (1 - e.deltaY * 0.0012)));
    $('zoomRange').value = String(p.zoom);
    render();
  }, { passive: false });
}

// Render one cover offscreen at its true export size and hand back the PNG.
export async function exportSize(sizeId, download) {
  const size = SIZES[sizeId];
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  const loaded = await loadAllPhotos();
  drawCover(ctx, size.width, size.height, state, loaded);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  const info = { size: sizeId, width: size.width, height: size.height, bytes: blob.size, type: blob.type };
  if (download) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-palms-${sizeId}-${size.width}x${size.height}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Exported ${size.label} PNG (${Math.round(blob.size / 1024)} KB).`);
  }
  return info;
}

async function exportAll() {
  const results = [];
  for (const id of Object.keys(SIZES)) results.push(await exportSize(id, true));
  setStatus(`Exported all three sizes: ${results.map((r) => r.label || r.size).join(', ')}.`);
  return results;
}

// A full-frame cover scene for screenshots: ?shot=cover&size=1080x1350
// &layout=grid4&grade=neon-night&title=HELLO&tagline=script line
async function runShotCover(params) {
  document.body.classList.add('shot-cover');
  const sizeParam = params.get('size') || '1920x1080';
  const [w, h] = sizeParam.split('x').map(Number);
  const size = { width: w || 1920, height: h || 1080 };
  if (params.get('layout')) state.layout = params.get('layout');
  if (params.get('grade')) state.grade = params.get('grade');
  if (params.get('title')) state.title = params.get('title');
  if (params.get('tagline') !== null) state.tagline = params.get('tagline');
  ensurePanels();
  const scale = Math.min(1, 1280 / Math.max(size.width, size.height));
  const cw = Math.round(size.width * scale);
  const ch = Math.round(size.height * scale);
  preview.width = cw;
  preview.height = ch;
  const loaded = await loadAllPhotos();
  await document.fonts.ready;
  drawCover(pctx, cw, ch, state, loaded);
  window.__shotReady = true;
}

async function start() {
  const params = new URLSearchParams(window.location.search);
  buildControls();
  bindInputs();
  bindCanvas();
  pushHistory();
  syncControls();
  if (params.get('shot') === 'cover') {
    await runShotCover(params);
    return;
  }
  await document.fonts.ready;
  await render();
  window.__studioReady = true;
}

window.__coverStudio = {
  getState: () => JSON.parse(JSON.stringify(state)),
  setState: (next) => { state = { ...defaultState(), ...next }; ensurePanels(); syncControls(); render(); },
  exportSize,
  exportAll,
  render,
  undo,
  redo,
  sizes: SIZES,
};

start();
