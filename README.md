# Lectio

A reading-first Romanian course. Objective: **follow a sermon at church by spring.**

- **Rhythm:** 20–30 minutes a day, one lesson per sitting.
- **Length:** 6 weeks, 34 lessons, all built. Week 6 runs on a practice sermon until real sermon transcripts are added.
- **Cost:** free. Plain HTML, one stylesheet, one script, no accounts, no build step for the pages themselves.
- **Live:** https://lectio.eamann.com (Spacefast, public). Also at https://lectio.space.fast.

## Use it

Open `index.html` locally, or the live site. Progress is stored in the browser (`localStorage`, keys
prefixed `ro_`) through `Lectio.store` in `assets/app.js`, so it is per device and per browser. Swap that
one object for a server-backed store if you ever host it behind sign-in.

## Where everything lives

| What | Where |
| --- | --- |
| Source | `github.com/ericmann/lectio` (private), branch `main` |
| Hosting | Spacefast Space `lectio`, id `spc_143a2abafa694ca7866f731a5cd23c5c`, team `eric-team-2` |
| Domain | `lectio.eamann.com`: DNS at Cloudflare (eamann.com zone), primary domain of the Space |
| Audio | ElevenLabs (Starter plan); API key in `~/.config/news-blog/elevenlabs-key` |

## Day-to-day: change something and publish

```
# edit pages / assets/passages.js
node tools/render-audio.mjs --dry-run          # only if Romanian text changed: what's missing?
node tools/build-site.mjs && sf publish _site --wait
git add -A && git commit -m "..." && git push
```

- **Always publish `_site/`, never the project root.** The root also holds private notes
  (`TUTOR_CONTEXT.md`, `curriculum.json`, `progress/`, this README). `tools/build-site.mjs` copies only
  the public files into `_site/`: the root pages, `assets/`, `audio/`, every `module-*` folder, and
  `tools/reader.html`. It works from an **allow-list**. A new top-level file or folder is not published
  until you add it to `PUBLIC` in that script, so a new private file stays private by default.
- `sf.jsonc` pins the Space id, so `sf publish _site` updates the live site from any clone. You need
  `sf login` once per machine (`sf status` shows whether you're logged in).
- Each publish is a new immutable version. `sf rollback` puts the previous one back live.
- The site uses clean URLs: `/credits.html` redirects to `/credits`. Relative links work either way, so
  keep writing `.html` links in the source. They also work from `file://`.
- To check that nothing private leaked after a publish:
  `curl -s -o /dev/null -w "%{http_code}\n" https://lectio.eamann.com/TUTOR_CONTEXT.md` should print `404`.

## Audio

The Hear buttons play `audio/<hash>.mp3` when one exists, and otherwise fall back to the device's
Romanian voice. The hash is FNV-1a of the lower-cased text, defined identically in `assets/app.js` and
`tools/render-audio.mjs`. Keep the two in sync, or every file stops being found. `audio/index.json` maps
each hash to its text, for humans; the page doesn't need it.

### Rendering new audio (after adding lessons or a sermon)

```
node tools/render-audio.mjs --dry-run          # lists texts still missing and their character count
ELEVENLABS_API_KEY=$(cat ~/.config/news-blog/elevenlabs-key) \
ELEVEN_VOICE_ID=HPdbgrGubKiBta6Pq21b \
node tools/render-audio.mjs
```

It finds every `data-speak="…"` in the HTML and every line and word in `assets/passages.js`, renders only
what's missing, and rewrites `audio/index.json`. Then rebuild, publish, and commit `audio/`. The files are
committed on purpose so they never have to be paid for twice.

- **Voice:** "Claudiu – Professional Romanian" (`HPdbgrGubKiBta6Pq21b`), a shared-library voice with a
  neutral Romanian accent. It works through the API without being added to your voice library. Keep using
  it so the course sounds like one speaker.
- **Model:** lines use the default `eleven_multilingual_v2`. Isolated short words sometimes come out
  sounding English on it (*cu* → "cool"). For those, delete the file and re-run with
  `ELEVEN_MODEL=eleven_flash_v2_5 ELEVEN_LANG=ro`, which renders only the missing ones. In the first
  render (2026-11-12), 39 words were swapped to flash this way after a speech-to-text check (ElevenLabs
  `scribe_v1`, forced to Romanian). All 72 full lines passed as rendered.
- **Find a word's file:** `grep -n '"cu"' audio/index.json` shows the hash, so the file is
  `audio/<hash>.mp3`.
- **Not yet spot-checked by ear:** *cu, în, pe, zis, le, a, i, cel*. Speech-to-text couldn't confirm them
  on either model; most likely that's the checker struggling with half-second clips, not bad audio.
- **Cost:** the full course is about 6,300 characters. Re-rendering everything isn't needed; new lessons
  only cost their new text.

## The domain (already set up; for reference if it ever breaks)

- Cloudflare has two `A` records for `lectio` → `192.0.79.132` and `192.0.79.184`, set to **DNS only**
  (grey cloud). Spacefast issues and renews the TLS certificate itself and needs to see its own addresses.
  Turning the Cloudflare proxy back on hides them (diagnostics report `proxyDetected`) and risks a failed
  renewal. Don't add `AAAA` records.
- Health check: `sf domains diagnostics lectio.eamann.com --space lectio` shows the DNS, verification and
  SSL state. `sf domains check lectio.eamann.com --space lectio` forces a re-check.
- If the Space is ever recreated, the IPs may differ. `sf domains add lectio.eamann.com --space <slug> --role primary`
  prints the records to use. Then update the Space id in `sf.jsonc`.
- If a certificate shows `broken`, the usual cause is a CAA record. eamann.com has none today.

## Next steps

1. **Real sermons for week 6.** Get transcripts (and optionally audio) of a few sermons from the church's
   YouTube stream. Add each as a passage (below), gloss the missing words, render audio, and publish.
   Lessons 6.3–6.5 are protocols that run on whichever passage is loaded.
2. **Spot-check the short words** listed under Audio, and re-render any that sound wrong.
3. **Native-speaker review.** The Scripture was proofread against bible.com (VDC). The sounding-out
   guides and vocabulary glosses are the author's own and haven't been checked by a native speaker.
4. **Optional:** server-backed progress (swap `Lectio.store`) so progress follows you across devices.
   Only worth it if the phone and desktop really diverge.
5. **Later phase:** technical register and translating your own writing (see `TUTOR_CONTEXT.md`).

`TUTOR_CONTEXT.md` and `curriculum.json` hold the course design decisions and state. Read them before
asking an assistant to build more lessons.

## Adding a sermon

Add an entry to `LECTIO_PASSAGES` in `assets/passages.js`: `title`, `ref`, `source`, `href`, `notice`, and
`lines` as `[label, text]` pairs. Words missing from `LECTIO_GLOSS` show as “not glossed yet”. Add them to the
glossary, or put passage-specific meanings in the entry's `gloss` object. Then render audio and publish, as
described above.

## Layout

- `index.html` — dashboard (entry page)
- `module-01-litere/` … `module-06-predica/` — the six weeks of lessons
- `tools/reader.html` — tap-to-gloss reader; passages and the shared glossary live in `assets/passages.js`
- `assets/theme.css` — every colour, font and component; `style-guide.html` shows them
- `assets/app.js` — shared behaviour: progress store, audio lookup, quizzes, diacritic highlighting
- `audio/` — rendered ElevenLabs files; `audio/index.json` maps each hash to its text
- `credits.html` — fonts, audio, and every source cited
- `tools/render-audio.mjs` — ElevenLabs render (not published)
- `tools/build-site.mjs` — stages the public copy into `_site/` (git-ignored)
- `sf.jsonc` — Spacefast config: Space id and name (read at publish, never served)
- `curriculum.json`, `TUTOR_CONTEXT.md` — course state and notes for continuing the build (private)
- `progress/` — your own notes (private)

Designed for Eric Mann · https://eamann.com
