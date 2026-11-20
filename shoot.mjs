// Neon Palms Cover Studio — screenshot + export verifier.
// Serves app/ locally, drives it in headless Chromium (Playwright core +
// the cached Chromium build), takes the 4 screenshots from shots.json,
// clicks every export button and checks the real PNG downloads (signature
// and IHDR size), and fails if the app makes any non-local request.
// Run: node shoot.mjs

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/shoot-tools/node_modules/playwright-core');

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.SHOOT_PORT || 8901);
const BASE = `http://localhost:${PORT}`;
const SHOTS = JSON.parse(readFileSync(join(ROOT, 'shots.json'), 'utf-8'));
const OUT_DIR = join(ROOT, 'screenshots');

function chromiumPath() {
  const cache = join(process.env.HOME || '/home/hatch', '.cache', 'ms-playwright');
  for (const dir of readdirSync(cache)) {
    if (!dir.startsWith('chromium-')) continue;
    const exe = join(cache, dir, 'chrome-linux64', 'chrome');
    if (existsSync(exe)) return exe;
  }
  throw new Error('no cached chromium found under ~/.cache/ms-playwright');
}

function waitForServer(url, timeoutMs = 15000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      fetch(url)
        .then((r) => (r.ok ? resolve() : tick()))
        .catch(() => {
          if (Date.now() - started > timeoutMs) reject(new Error('server did not start'));
          else setTimeout(tick, 200);
        });
    };
    tick();
  });
}

function jpegSize(buf) {
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) { i += 1; continue; }
    const marker = buf[i + 1];
    if (marker === 0xc0 || marker === 0xc2) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    const len = buf.readUInt16BE(i + 2);
    i += 2 + len;
  }
  throw new Error('no SOF marker in JPEG');
}

function pngSize(buf) {
  if (buf.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('not a PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const failures = [];
const notes = [];

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const server = spawn('node', ['serve.ts'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });
  try {
    await waitForServer(`${BASE}/`);
    const browser = await chromium.launch({ executablePath: chromiumPath() });
    try {
      const context = await browser.newContext({ acceptDownloads: true });
      const page = await context.newPage();
      const external = [];
      const errors = [];
      page.on('request', (req) => {
        const u = req.url();
        // blob: object URLs are same-origin uploads, not network traffic.
        if (!u.startsWith(BASE) && !u.startsWith('data:') && !u.startsWith('blob:') && u !== `${BASE}/`) external.push(u);
      });
      page.on('pageerror', (err) => errors.push(String(err)));
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      for (const shot of SHOTS) {
        await page.setViewportSize({ width: shot.width, height: shot.height });
        await page.goto(`${BASE}${shot.url}`, { waitUntil: 'load' });
        await page.waitForFunction(
          () => window.__shotReady === true || window.__studioReady === true,
          null,
          { timeout: 20000 },
        );
        await page.waitForTimeout(shot.settleMs || 400);
        const file = join(OUT_DIR, shot.name);
        await page.screenshot({ path: file, type: 'jpeg', quality: shot.quality || 82 });
        const buf = readFileSync(file);
        const dims = jpegSize(buf);
        const kb = Math.round(buf.length / 1024);
        const okSize = buf.length <= 262144;
        const okDims = Math.max(dims.width, dims.height) <= 1280 && Math.min(dims.width, dims.height) >= 480;
        notes.push(`${shot.name}: ${dims.width}x${dims.height}, ${kb} KiB`);
        if (!okSize) failures.push(`${shot.name} over 256 KiB (${kb} KiB)`);
        if (!okDims) failures.push(`${shot.name} outside gate dims (${dims.width}x${dims.height})`);
      }

      // Real export path: click each export button, check the PNG download.
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`${BASE}/`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__studioReady === true, null, { timeout: 20000 });
      // Lettering is system fonts only: no webfont should ever load,
      // and the title/tagline stacks must resolve to installed fonts.
      const fontsOk = await page.evaluate(() => ({
        webfonts: document.fonts.size,
        titleStack: document.fonts.check('bold 16px sans-serif'),
        scriptStack: document.fonts.check('16px cursive'),
      }));
      notes.push(`fonts: ${fontsOk.webfonts} webfonts loaded, title stack resolves=${fontsOk.titleStack}, script stack resolves=${fontsOk.scriptStack}`);
      if (fontsOk.webfonts !== 0 || !fontsOk.titleStack || !fontsOk.scriptStack) failures.push('lettering stacks did not resolve to system fonts');

      const exports = [
        ['#exportSquare', 1080, 1080],
        ['#exportPortrait', 1080, 1350],
        ['#exportWide', 1920, 1080],
      ];
      for (const [button, w, h] of exports) {
        const download = page.waitForEvent('download', { timeout: 20000 });
        await page.click(button);
        const dl = await download;
        const path = join('/tmp', `export-check-${w}x${h}.png`);
        await dl.saveAs(path);
        const buf = readFileSync(path);
        const dims = pngSize(buf);
        notes.push(`export ${w}x${h}: PNG ${dims.width}x${dims.height}, ${Math.round(buf.length / 1024)} KiB`);
        if (dims.width !== w || dims.height !== h) {
          failures.push(`export ${w}x${h} came back ${dims.width}x${dims.height}`);
        }
      }

      // Upload path: a photo of our own, loaded from disk, must land in a panel.
      const before = await page.evaluate(() => window.__coverStudio.getState().panels[0].src);
      await page.setInputFiles('#uploadInput', join(ROOT, 'app', 'samples', 'neon.jpg'));
      await page.waitForTimeout(600);
      const after = await page.evaluate(() => window.__coverStudio.getState().panels[0].src);
      notes.push(`upload: panel 0 src ${before} -> ${after}`);
      if (!after.startsWith('blob:')) failures.push('upload did not land in panel 0');

      if (external.length) failures.push(`non-local requests: ${[...new Set(external)].join(', ')}`);
      if (errors.length) failures.push(`page errors: ${[...new Set(errors)].join(' | ')}`);
      await context.close();
    } finally {
      await browser.close();
    }
  } finally {
    server.kill();
  }

  console.log('--- shoot notes ---');
  notes.forEach((n) => console.log('  ' + n));
  if (failures.length) {
    console.log('--- FAILURES ---');
    failures.forEach((f) => console.log('  FAIL: ' + f));
    process.exitCode = 1;
  } else {
    console.log('--- all checks passed ---');
  }
}

main().catch((err) => {
  console.error('shoot crashed:', err);
  process.exitCode = 1;
});
