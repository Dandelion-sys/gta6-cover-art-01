// Neon Palms Cover Studio — cover render engine.
// Vanilla 2D canvas, no libraries. Everything the app draws goes through
// drawCover: panels, colour grades, lettering, grain and frame.
// Place and character names here are invented; nothing is Rockstar artwork.

export const SIZES = {
  square: { label: 'Square 1080 x 1080', width: 1080, height: 1080 },
  portrait: { label: 'Portrait 1080 x 1350', width: 1080, height: 1350 },
  wide: { label: 'Wide 1920 x 1080', width: 1920, height: 1080 },
};

export const LAYOUTS = [
  { id: 'hero3', name: 'Hero + Three', hint: 'One big hero panel, three small ones' },
  { id: 'grid4', name: 'Four Panel', hint: 'Classic two-by-two poster grid' },
  { id: 'nine', name: 'Nine Panel', hint: 'Three-by-three cover grid' },
  { id: 'fullbleed', name: 'Full Bleed', hint: 'One photo edge to edge' },
  { id: 'tilted', name: 'Tilted Snaps', hint: 'Three tilted snapshot frames' },
  { id: 'triptych', name: 'Triptych', hint: 'Three tall strips side by side' },
];

export const GRADES = [
  {
    id: 'vice-sunset',
    name: 'Vice Sunset',
    filter: 'saturate(1.35) contrast(1.1) brightness(1.03) sepia(0.22) hue-rotate(-12deg)',
    top: '#ff9a3d',
    bottom: '#e83e8c',
    blend: 'soft-light',
    band: ['rgba(20,8,32,0)', 'rgba(20,8,32,0.82)'],
  },
  {
    id: 'neon-night',
    name: 'Neon Night',
    filter: 'saturate(1.3) contrast(1.16) brightness(0.96) hue-rotate(8deg)',
    top: '#2de2c5',
    bottom: '#ff2e88',
    blend: 'overlay',
    band: ['rgba(6,10,28,0)', 'rgba(6,10,28,0.86)'],
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    filter: 'saturate(1.28) contrast(1.06) brightness(1.07) sepia(0.38) hue-rotate(-6deg)',
    top: '#ffd166',
    bottom: '#f4842c',
    blend: 'soft-light',
    band: ['rgba(28,14,4,0)', 'rgba(28,14,4,0.78)'],
  },
  {
    id: 'mono-noir',
    name: 'Mono Noir',
    filter: 'grayscale(1) contrast(1.22) brightness(1.02)',
    top: '#ffffff',
    bottom: '#111111',
    blend: 'soft-light',
    band: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)'],
  },
  {
    id: 'palm-teal',
    name: 'Palm Teal',
    filter: 'saturate(1.2) contrast(1.08) brightness(1.0) hue-rotate(24deg)',
    top: '#7ef0c1',
    bottom: '#0b5e6e',
    blend: 'overlay',
    band: ['rgba(2,26,24,0)', 'rgba(2,26,24,0.8)'],
  },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

// A tiny deterministic generator so the grain looks the same every render.
export function seededRandom(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const grainTiles = new Map();

export function grainTile(seed) {
  if (grainTiles.has(seed)) return grainTiles.get(seed);
  const tile = document.createElement('canvas');
  tile.width = 140;
  tile.height = 140;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(140, 140);
  const rnd = seededRandom(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  grainTiles.set(seed, tile);
  return tile;
}

// Panel rectangles for a layout, in cover pixels. rot is degrees, border
// asks for a white snapshot frame around the photo.
export function layoutPanels(layoutId, W, H) {
  const g = Math.max(6, Math.round(Math.min(W, H) * 0.012));
  switch (layoutId) {
    case 'grid4': {
      const w = (W - g * 3) / 2;
      const h = (H - g * 3) / 2;
      return [
        { x: g, y: g, w, h, rot: 0 },
        { x: g * 2 + w, y: g, w, h, rot: 0 },
        { x: g, y: g * 2 + h, w, h, rot: 0 },
        { x: g * 2 + w, y: g * 2 + h, w, h, rot: 0 },
      ];
    }
    case 'nine': {
      const w = (W - g * 4) / 3;
      const h = (H - g * 4) / 3;
      const out = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          out.push({ x: g + c * (w + g), y: g + r * (h + g), w, h, rot: 0 });
        }
      }
      return out;
    }
    case 'fullbleed':
      return [{ x: 0, y: 0, w: W, h: H, rot: 0 }];
    case 'tilted': {
      const w = W * 0.56;
      const h = H * 0.52;
      return [
        { x: W * 0.05, y: H * 0.05, w, h, rot: -5, border: true },
        { x: W * 0.39, y: H * 0.2, w, h, rot: 4, border: true },
        { x: W * 0.1, y: H * 0.4, w: W * 0.5, h: H * 0.46, rot: -2, border: true },
      ];
    }
    case 'triptych': {
      const w = (W - g * 4) / 3;
      return [
        { x: g, y: g, w, h: H - g * 2, rot: 0 },
        { x: g * 2 + w, y: g, w, h: H - g * 2, rot: 0 },
        { x: g * 3 + w * 2, y: g, w, h: H - g * 2, rot: 0 },
      ];
    }
    case 'hero3':
    default: {
      const heroW = W * 0.62;
      const sideW = W - heroW - g * 3;
      const sideH = (H - g * 4) / 3;
      return [
        { x: g, y: g, w: heroW, h: H - g * 2, rot: 0 },
        { x: heroW + g * 2, y: g, w: sideW, h: sideH, rot: 0 },
        { x: heroW + g * 2, y: g * 2 + sideH, w: sideW, h: sideH, rot: 0 },
        { x: heroW + g * 2, y: g * 3 + sideH * 2, w: sideW, h: sideH, rot: 0 },
      ];
    }
  }
}

// Draw one photo into a panel rect, cover-fit, with zoom and pan.
// ox/oy are fractions of the panel size, -0.5 to 0.5.
export function drawPhotoInto(ctx, img, rect, zoom, ox, oy) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(rect.w / iw, rect.h / ih) * (zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = rect.x + (rect.w - dw) / 2 + (ox || 0) * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + (oy || 0) * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawPanel(ctx, img, rect, panelState) {
  const border = Math.max(4, Math.round(Math.min(rect.w, rect.h) * 0.035));
  ctx.save();
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  ctx.translate(cx, cy);
  ctx.rotate(((rect.rot || 0) * Math.PI) / 180);
  ctx.translate(-cx, -cy);
  if (rect.border) {
    ctx.fillStyle = '#fdf8ef';
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = Math.round(Math.min(rect.w, rect.h) * 0.04);
    ctx.shadowOffsetY = Math.round(Math.min(rect.w, rect.h) * 0.015);
    ctx.fillRect(rect.x - border, rect.y - border, rect.w + border * 2, rect.h + border * 2);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  if (img) drawPhotoInto(ctx, img, rect, panelState.zoom, panelState.ox, panelState.oy);
  ctx.restore();
}

function drawGradeWash(ctx, W, H, grade) {
  ctx.save();
  const wash = ctx.createLinearGradient(0, 0, W * 0.25, H);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(1, grade.bottom);
  ctx.globalCompositeOperation = grade.blend;
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawVignette(ctx, W, H) {
  const r = Math.max(W, H) * 0.75;
  const v = ctx.createRadialGradient(W / 2, H / 2, r * 0.45, W / 2, H / 2, r);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.save();
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawGrain(ctx, W, H, strength) {
  const tile = grainTile(20261119);
  ctx.save();
  ctx.globalAlpha = strength;
  ctx.globalCompositeOperation = 'overlay';
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// Lettering stacks, system fonts only — no font files ship with the app.
const TITLE_FACE = `'Arial Narrow', 'Helvetica Neue Condensed', 'Roboto Condensed', 'Noto Sans Condensed', Arial, sans-serif`;
const TAGLINE_FACE = `'Segoe Script', 'Lucida Handwriting', 'Brush Script MT', 'Snell Roundhand', 'Bradley Hand', cursive`;

function fitFont(ctx, text, fontFamily, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `bold ${size}px ${fontFamily}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size *= 0.92;
    ctx.font = `bold ${size}px ${fontFamily}`;
  }
  return size;
}

function drawTitleBlock(ctx, W, H, state, grade) {
  const bandH = H * 0.21;
  const bandY = H - bandH;
  const band = ctx.createLinearGradient(0, bandY - bandH * 0.6, 0, H);
  band.addColorStop(0, grade.band[0]);
  band.addColorStop(1, grade.band[1]);
  ctx.save();
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY - bandH * 0.6, W, H - bandY + bandH * 0.6);
  const title = (state.title || '').toUpperCase();
  const maxW = W * 0.88;
  const baseSize = H * 0.082 * (state.titleSize || 1);
  const size = fitFont(ctx, title || ' ', TITLE_FACE, maxW, baseSize);
  const tag = (state.tagline || '').trim();
  const tagSize = Math.max(14, H * 0.03);
  // Anchor from the bottom so the tagline can never slip past the edge.
  const tagY = H - bandH * 0.22;
  const titleY = tag ? tagY - size * 0.62 - tagSize * 0.4 : H - bandH * 0.42;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = Math.round(size * 0.12);
  ctx.shadowOffsetY = Math.round(size * 0.04);
  if (state.outline) {
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.strokeStyle = '#14060f';
    ctx.strokeText(title, W / 2, titleY);
  }
  ctx.fillStyle = state.titleColor || '#ffffff';
  ctx.fillText(title, W / 2, titleY);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  if (tag) {
    ctx.font = `${tagSize}px ${TAGLINE_FACE}`;
    const tw = ctx.measureText(tag).width;
    if (tw > maxW) {
      ctx.font = `${Math.max(12, (tagSize * maxW) / tw)}px ${TAGLINE_FACE}`;
    }
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(tag, W / 2, tagY);
  }
  ctx.restore();
}

function drawBadge(ctx, W, H) {
  const s = Math.max(64, Math.min(W, H) * 0.11);
  const cx = W - s * 0.72;
  const cy = s * 0.72;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-8 * Math.PI) / 180);
  ctx.fillStyle = '#f5c542';
  ctx.strokeStyle = '#14060f';
  ctx.lineWidth = Math.max(2, s * 0.03);
  const r = s / 2;
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const ang = (i * Math.PI) / 8;
    const rad = i % 2 === 0 ? r : r * 0.86;
    const x = Math.cos(ang) * rad;
    const y = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#14060f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(s * 0.16)}px ${TITLE_FACE}`;
  ctx.fillText('EST. 2026', 0, -s * 0.08);
  ctx.font = `bold ${Math.round(s * 0.13)}px ${TITLE_FACE}`;
  ctx.fillText('★ NEON ★', 0, s * 0.14);
  ctx.restore();
}

// The whole cover. state: { layout, grade, title, tagline, titleColor,
// titleSize, outline, grain, vignette, frame, badge, panels: [{src, zoom,
// ox, oy}] }. images: Map from panel src string to an HTMLImageElement.
export function drawCover(ctx, W, H, state, images) {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, W, H);
  const grade = gradeById(state.grade);
  const panels = layoutPanels(state.layout, W, H);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, grade.top);
  sky.addColorStop(1, grade.bottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  panels.forEach((rect, i) => {
    const p = state.panels[i] || { src: '', zoom: 1, ox: 0, oy: 0 };
    ctx.save();
    ctx.filter = grade.filter;
    drawPanel(ctx, images.get(p.src) || null, rect, p);
    ctx.restore();
  });
  ctx.filter = 'none';
  drawGradeWash(ctx, W, H, grade);
  if (state.vignette) drawVignette(ctx, W, H);
  drawTitleBlock(ctx, W, H, state, grade);
  if (state.grain) drawGrain(ctx, W, H, 0.16);
  if (state.frame) {
    const inset = Math.max(4, Math.round(Math.min(W, H) * 0.014));
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(2, Math.round(Math.min(W, H) * 0.004));
    ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
  }
  if (state.badge) drawBadge(ctx, W, H);
  ctx.restore();
}

// Panel hit test for the editor, in preview-canvas pixels.
export function panelAt(layoutId, W, H, x, y) {
  const panels = layoutPanels(layoutId, W, H);
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
  }
  return -1;
}
