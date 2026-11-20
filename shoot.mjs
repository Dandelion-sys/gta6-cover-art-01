// Screenshot runner for Neon Palm Cover Studio: reads shots.json, opens each
// scene in desktop Chromium, waits for window.__shotReady, and saves the
// screenshot. Also logs any console error and any non-local request.
import { createRequire } from "node:module";
const require = createRequire("/home/hatch/workspace/make-fun/best-game-01/node_modules/");
const { chromium } = require("playwright-core");
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const shots = JSON.parse(readFileSync(join(here, "shots.json"), "utf8"));
const outDir = join(here, "screenshots");
const base = process.env.SHOT_BASE ?? "http://localhost:8080/";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: ["--no-sandbox", "--force-device-scale-factor=1"],
});

let failures = 0;
for (const shot of shots) {
  const page = await browser.newPage({ viewport: { width: shot.w, height: shot.h } });
  const badRequests = [];
  page.on("request", (req) => {
    const url = req.url();
    if (!url.startsWith("http://localhost:8080") && !url.startsWith("data:")) badRequests.push(url);
  });
  page.on("pageerror", (err) => console.log(`[${shot.name}] PAGE ERROR:`, String(err).slice(0, 300)));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log(`[${shot.name}] CONSOLE ERROR:`, msg.text().slice(0, 300));
  });
  await page.goto(base + "index.html" + shot.query, { waitUntil: "load" });
  try {
    await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 15000 });
  } catch {
    console.log(`[${shot.name}] TIMEOUT waiting for __shotReady`);
    failures += 1;
  }
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(outDir, shot.name), type: "jpeg", quality: 80 });
  if (badRequests.length) console.log(`[${shot.name}] NON-LOCAL REQUESTS:`, badRequests);
  console.log(`[${shot.name}] saved ${shot.w}x${shot.h}`);
  await page.close();
}
await browser.close();
console.log(failures ? `DONE with ${failures} failure(s)` : "DONE all shots ready");
process.exit(failures ? 1 : 0);
