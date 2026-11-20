// Neon Palms Cover Studio — entrypoint (Node 22, standard library only).
// Copies app/ and screenshots/ into the output directory and writes
// dossier.json with buildDossier from vendor/makefun-app.ts, the kit's own
// library, copied unchanged. Run: MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function countTree(dir) {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = countTree(path);
      files += sub.files;
      bytes += sub.bytes;
    } else if (entry.isFile()) {
      files += 1;
      bytes += statSync(path).size;
    }
  }
  return { files, bytes };
}

function copyTree(name) {
  const from = join(ROOT, name);
  const to = join(OUT, name);
  if (!existsSync(from)) throw new Error(`missing ${name}/ in ${ROOT}`);
  cpSync(from, to, { recursive: true });
  return countTree(to);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const appStats = copyTree('app');
const shotStats = copyTree('screenshots');
if (shotStats.files < 3 || shotStats.files > 4) {
  throw new Error(`screenshots/ must hold 3 or 4 images, found ${shotStats.files}`);
}

const dossier = buildDossier(OUT, CAPS);
const dossierPath = join(OUT, 'dossier.json');
writeFileSync(dossierPath, dossier);

// Read it back and confirm it is the dossier we meant to write.
const parsed = JSON.parse(readFileSync(dossierPath, 'utf-8'));
if (parsed.schema !== 'makefun/dossier/v1') {
  throw new Error(`dossier.json has unexpected schema ${parsed.schema}`);
}
console.log(`app/: ${appStats.files} files, ${appStats.bytes} bytes`);
console.log(`screenshots/: ${shotStats.files} files, ${shotStats.bytes} bytes`);
console.log(`dossier written: ${dossier.length} bytes -> ${dossierPath}`);
