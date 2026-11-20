// Neon Palm cover engine: draws a multi-panel GTA-style poster cover onto any
// 2D canvas. Pure vanilla canvas, no libraries. A cover state is:
//   { layout, grade, caption, tagline, titlePos, panels }
// where panels[i] is null (empty slot) or { img, zoom, ox, oy, name }.
// zoom is 1..3 (1 = cover-fit), ox/oy are pan offsets as a fraction of the
// panel's own width/height. Everything is drawn from the state, so the
// preview canvas and the exported PNGs are the same picture at any size.

const LAYOUTS = { hero: 4, grid: 4, trio: 3, solo: 1 };
const GRADES = ["sunset", "neon", "teal", "noir"];
const SIZES = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  wide: [1920, 1080],
};

// Panel rectangles for a layout, inside a white poster frame with gutters.
function layoutRects(w, h, layout) {
  const frame = Math.round(Math.min(w, h) * 0.016);
  const gut = Math.max(2, Math.round(Math.min(w, h) * 0.008));
  const x = frame, y = frame, iw = w - frame * 2, ih = h - frame * 2;
  if (layout === "grid") {
    const cw = (iw - gut) / 2, ch = (ih - gut) / 2;
    return [
      { x, y, w: cw, h: ch },
      { x: x + cw + gut, y, w: cw, h: ch },
      { x, y: y + ch + gut, w: cw, h: ch },
      { x: x + cw + gut, y: y + ch + gut, w: cw, h: ch },
    ];
  }
  if (layout === "trio") {
    const cw = (iw - gut * 2) / 3;
    return [0, 1, 2].map((i) => ({ x: x + i * (cw + gut), y, w: cw, h: ih }));
  }
  if (layout === "solo") return [{ x, y, w: iw, h: ih }];
  // hero: one big panel left, three stacked on the right.
  const heroW = Math.round(iw * 0.6);
  const rx = x + heroW + gut, rw = iw - heroW - gut;
  const rh = (ih - gut * 2) / 3;
  return [
    { x, y, w: heroW, h: ih },
    { x: rx, y, w: rw, h: rh },
    { x: rx, y: y + rh + gut, w: rw, h: rh },
    { x: rx, y: y + (rh + gut) * 2, w: rw, h: rh },
  ];
}

const GRADE_FILTER = {
  sunset: "saturate(1.28) contrast(1.06) brightness(1.02)",
  neon: "saturate(1.45) contrast(1.12)",
  teal: "saturate(1.18) contrast(1.05)",
  noir: "grayscale(1) contrast(1.15) brightness(1.06)",
};
const GRADE_TINT = {
  sunset: ["rgba(255,122,60,0.12)", "rgba(255,46,136,0.40)"],
  neon: ["rgba(55,224,216,0.18)", "rgba(255,46,136,0.44)"],
  teal: ["rgba(55,224,216,0.16)", "rgba(255,160,40,0.30)"],
  noir: ["rgba(255,255,255,0.06)", "rgba(0,0,0,0.38)"],
};

function clampPan(panel, rect) {
  if (!panel || !panel.img) return { ox: 0, oy: 0 };
  const iw = panel.img.naturalWidth, ih = panel.img.naturalHeight;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const dw = iw * base * panel.zoom, dh = ih * base * panel.zoom;
  const mx = Math.max(0, (dw - rect.w) / 2 / rect.w);
  const my = Math.max(0, (dh - rect.h) / 2 / rect.h);
  return {
    ox: Math.max(-mx, Math.min(mx, panel.ox || 0)),
    oy: Math.max(-my, Math.min(my, panel.oy || 0)),
  };
}

function drawPhotoPanel(ctx, rect, panel, grade) {
  const img = panel.img;
  const { ox, oy } = clampPan(panel, rect);
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const dw = img.naturalWidth * base * panel.zoom;
  const dh = img.naturalHeight * base * panel.zoom;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.filter = GRADE_FILTER[grade] || GRADE_FILTER.sunset;
  ctx.drawImage(img, rect.x + (rect.w - dw) / 2 + ox * rect.w, rect.y + (rect.h - dh) / 2 + oy * rect.h, dw, dh);
  ctx.filter = "none";
  const [top, bottom] = GRADE_TINT[grade] || GRADE_TINT.sunset;
  const tint = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  tint.addColorStop(0, top);
  tint.addColorStop(1, bottom);
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = tint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = "source-over";
  const vig = ctx.createRadialGradient(
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.min(rect.w, rect.h) * 0.35,
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.max(rect.w, rect.h) * 0.75,
  );
  vig.addColorStop(0, "rgba(16,4,32,0)");
  vig.addColorStop(1, "rgba(16,4,32,0.32)");
  ctx.fillStyle = vig;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

function drawEmptyPanel(ctx, rect) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  g.addColorStop(0, "#3b1155");
  g.addColorStop(1, "#8a1d5e");
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `${Math.round(Math.min(rect.w, rect.h) * 0.28)}px Anton, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("+", rect.x + rect.w / 2, rect.y + rect.h / 2 - rect.h * 0.08);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `${Math.max(10, Math.round(Math.min(rect.w, rect.h) * 0.055))}px Anton, sans-serif`;
  ctx.fillText("ADD A PHOTO", rect.x + rect.w / 2, rect.y + rect.h / 2 + rect.h * 0.16);
  ctx.textBaseline = "alphabetic";
}

function fitFont(ctx, text, family, start, maxWidth) {
  let size = start;
  ctx.font = `${size}px ${family}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

function drawTitleBlock(ctx, w, h, state) {
  const atTop = state.titlePos === "top";
  const bh = Math.round(h * 0.27);
  const by = atTop ? 0 : h - bh;
  const band = ctx.createLinearGradient(0, by, 0, by + bh);
  if (atTop) {
    band.addColorStop(0, "rgba(18,4,32,0.92)");
    band.addColorStop(1, "rgba(18,4,32,0)");
  } else {
    band.addColorStop(0, "rgba(18,4,32,0)");
    band.addColorStop(0.45, "rgba(18,4,32,0.72)");
    band.addColorStop(1, "rgba(18,4,32,0.94)");
  }
  ctx.fillStyle = band;
  ctx.fillRect(0, by, w, bh);

  // Halftone dots fading across the band.
  const step = Math.max(11, Math.round(w / 88));
  ctx.fillStyle = "rgba(255,255,255,0.09)";
  for (let yy = by + step / 2; yy < by + bh; yy += step) {
    for (let xx = step / 2; xx < w; xx += step) {
      ctx.beginPath();
      ctx.arc(xx, yy, step * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const cx = w / 2;
  const title = (state.caption || "").trim().toUpperCase();
  const tag = (state.tagline || "").trim();
  // Keep both lines fully inside the band: title baseline near the band's
  // lower edge (bottom) or upper half (top), tagline on the other side.
  const titleY = atTop ? by + bh * 0.52 : by + bh * 0.82;
  const tagY = atTop ? by + bh * 0.86 : by + bh * 0.38;
  ctx.textAlign = "center";

  if (tag) {
    const tSize = fitFont(ctx, tag, "Pacifico, cursive", Math.round(h * 0.042), w * 0.8);
    const grad = ctx.createLinearGradient(cx - w * 0.3, 0, cx + w * 0.3, 0);
    grad.addColorStop(0, "#ff9a3d");
    grad.addColorStop(0.5, "#ffd166");
    grad.addColorStop(1, "#ff2e88");
    ctx.fillStyle = grad;
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = Math.round(h * 0.008);
    ctx.fillText(tag, cx, tagY);
    ctx.shadowBlur = 0;
  }
  if (title) {
    const size = fitFont(ctx, title, "Anton, sans-serif", Math.round(h * 0.115), w * 0.88);
    ctx.font = `${size}px Anton, sans-serif`;
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(2, size * 0.14);
    ctx.strokeStyle = "#1a0526";
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = Math.round(size * 0.12);
    ctx.shadowOffsetY = Math.round(size * 0.04);
    ctx.strokeText(title, cx, titleY);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(title, cx, titleY);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
}

function drawMark(ctx, w, h, state) {
  const size = Math.max(11, Math.round(h * 0.017));
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = Math.round(size * 0.3);
  const y = state.titlePos === "top" ? h - size * 1.6 : size * 1.9;
  ctx.fillText("NEON PALM  ★★★★★", Math.round(w * 0.03), y);
  ctx.shadowBlur = 0;
  ctx.textAlign = "center";
}

/** Draws the whole cover onto `canvas` (its own width/height) from `state`. */
function drawCover(canvas, state) {
  const ctx = canvas.getContext("2d");
  const { width: w, height: h } = canvas;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  const rects = layoutRects(w, h, state.layout);
  rects.forEach((rect, i) => {
    const panel = state.panels[i];
    if (panel && panel.img) drawPhotoPanel(ctx, rect, panel, state.grade);
    else drawEmptyPanel(ctx, rect);
  });
  drawTitleBlock(ctx, w, h, state);
  drawMark(ctx, w, h, state);
}

/** Renders the cover at an exact export size and returns a fresh canvas. */
function renderCover(state, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas, state);
  return canvas;
}
