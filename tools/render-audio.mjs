#!/usr/bin/env node
// Lectio — one-time audio render with ElevenLabs.
// Finds every piece of Romanian the course can speak (data-speak attributes in the HTML,
// plus every word and line in assets/passages.js) and writes audio/<hash>.mp3 for each.
// The pages look for those files first and fall back to the device voice when one is missing.
//
//   ELEVENLABS_API_KEY=...  ELEVEN_VOICE_ID=...  node tools/render-audio.mjs
//   node tools/render-audio.mjs --dry-run        # list texts and total characters, call nothing
//
// Optional: ELEVEN_MODEL (default eleven_multilingual_v2), ELEVEN_LANG (e.g. ro; sent as
// language_code only when set, since not every model accepts it), ELEVEN_FORMAT (default mp3_44100_128).
// Safe to re-run: existing files are skipped. Requires Node 18+. No dependencies.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "audio");
const DRY = process.argv.includes("--dry-run");

// Must match hash() in assets/app.js exactly.
function hash(text) {
  const bytes = Buffer.from(text.normalize("NFC").trim().toLowerCase(), "utf8");
  let h = 0x811c9dc5;
  for (const b of bytes) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
  return ("0000000" + h.toString(16)).slice(-8);
}

function htmlFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === "audio" || name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) htmlFiles(p, acc);
    else if (name.endsWith(".html")) acc.push(p);
  }
  return acc;
}

const texts = new Map(); // hash -> text
const add = (t) => { t = t.trim(); if (t) texts.set(hash(t), t); };

for (const f of htmlFiles(ROOT)) {
  for (const m of readFileSync(f, "utf8").matchAll(/data-speak="([^"]+)"/g)) add(m[1]);
}
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(join(ROOT, "assets", "passages.js"), "utf8"), sandbox);
const strip = (w) => w.toLowerCase().replace(/[.,;:!?„”«»"()]/g, "");
for (const p of Object.values(sandbox.window.LECTIO_PASSAGES || {})) {
  for (const [, text] of p.lines) {
    add(text);
    for (const w of text.split(/\s+/)) { const k = strip(w); if (/[a-zăâîșț]/.test(k)) add(k); }
  }
}

const todo = [...texts].filter(([h]) => !existsSync(join(OUT, h + ".mp3")));
const chars = todo.reduce((n, [, t]) => n + t.length, 0);
console.log(`${texts.size} texts in the course, ${todo.length} still to render, ${chars} characters.`);
if (DRY) { for (const [h, t] of todo) console.log(h, t); process.exit(0); }

const KEY = process.env.ELEVENLABS_API_KEY, VOICE = process.env.ELEVEN_VOICE_ID;
if (!KEY || !VOICE) { console.error("Set ELEVENLABS_API_KEY and ELEVEN_VOICE_ID."); process.exit(1); }
const MODEL = process.env.ELEVEN_MODEL || "eleven_multilingual_v2";
const FORMAT = process.env.ELEVEN_FORMAT || "mp3_44100_128";
mkdirSync(OUT, { recursive: true });

let failed = 0;
for (const [h, text] of todo) {
  const body = { text, model_id: MODEL };
  if (process.env.ELEVEN_LANG) body.language_code = process.env.ELEVEN_LANG;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=${FORMAT}`, {
    method: "POST",
    headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) { failed++; console.error(`FAILED ${res.status} "${text}": ${(await res.text()).slice(0, 200)}`); if (res.status === 401) break; continue; }
  writeFileSync(join(OUT, h + ".mp3"), Buffer.from(await res.arrayBuffer()));
  console.log("ok", h, text);
  await new Promise((r) => setTimeout(r, 250));
}
const index = Object.fromEntries([...texts].filter(([h]) => existsSync(join(OUT, h + ".mp3"))));
writeFileSync(join(OUT, "index.json"), JSON.stringify(index, null, 2));
console.log(failed ? `${failed} failed; re-run to retry.` : "Done.");
