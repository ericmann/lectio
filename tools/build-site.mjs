#!/usr/bin/env node
// Lectio — stage the public site into _site/ for `sf publish _site`.
// Copies only what visitors need, so course notes (TUTOR_CONTEXT.md, curriculum.json, progress/,
// README.md) and build tools stay off the web. Anything new must be added here to be published,
// which keeps private files private by default.
//
//   node tools/build-site.mjs && sf publish _site
//
// _site/.spacefast/ (the CLI's local link to the Space) is kept between runs. No dependencies.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "_site");

const PUBLIC = [
  "index.html",
  "credits.html",
  "style-guide.html",
  "sf.jsonc",            // Spacefast config: read at publish, never served
  "assets",
  "audio",               // optional; present once tools/render-audio.mjs has run
  "tools/reader.html",
  ...readdirSync(ROOT).filter((n) => /^module-\d+/.test(n) && statSync(join(ROOT, n)).isDirectory()),
];

mkdirSync(OUT, { recursive: true });
for (const name of readdirSync(OUT)) if (name !== ".spacefast") rmSync(join(OUT, name), { recursive: true, force: true });

let files = 0;
const count = (p) => (statSync(p).isDirectory() ? readdirSync(p).reduce((n, c) => n + count(join(p, c)), 0) : 1);
for (const rel of PUBLIC) {
  const src = join(ROOT, rel);
  if (!existsSync(src)) { console.log(`skip ${rel} (not present)`); continue; }
  cpSync(src, join(OUT, rel), { recursive: true });
  files += count(src);
}
console.log(`Staged ${files} files in _site/.`);
