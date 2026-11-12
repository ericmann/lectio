# Lectio

A reading-first Romanian course. Objective: **follow a sermon at church by spring.**

- **Rhythm:** 20–30 minutes a day, one lesson per sitting.
- **Length:** 6 weeks, 34 lessons, all built. Week 6 runs on a practice sermon until real sermon transcripts are added.
- **Cost:** free. Plain HTML, one stylesheet, one script, no accounts.

## Use it

Open `index.html`. It works from the file system and from any static host. Progress is stored in the
browser (`localStorage`, keys prefixed `ro_`) through `Lectio.store` in `assets/app.js`; swap that one
object for a server-backed store if you host it behind sign-in.

## Publish

Any static host works. Publish the staged copy in `_site/`, never this folder itself: the root also holds
`TUTOR_CONTEXT.md`, `curriculum.json` and `progress/`, which are private notes. `tools/build-site.mjs` copies
only the pages, `assets/`, `audio/` and the reader into `_site/`. Anything new has to be added to its list
before it is published.

### Spacefast, first time

```
sf login
node tools/build-site.mjs
sf publish _site --slug lectio --access public --wait
```

`--access public` matters: a new Space otherwise takes the team default, which may be private. The CLI
links `_site/` to the new Space (`_site/.spacefast/state.json`, kept by the build script). To make that link
survive a fresh clone, put the Space's slug or `spc_` id in `sf.jsonc` as `"space": "lectio"`.

### Point `lectio.eamann.com` at it

1. `sf domains add lectio.eamann.com --space lectio --role primary`. It prints the DNS records to create.
   They are generated per hostname (usually two `A` records), so copy them from that output, not from here.
2. In Cloudflare (eamann.com DNS), add each record with name `lectio`, and set **Proxy status: DNS only**
   (grey cloud). Spacefast issues the TLS certificate itself and has to see its own addresses. Nothing
   else exists at `lectio` today, and eamann.com has no CAA record, so nothing should block it.
3. `sf domains check lectio.eamann.com --space lectio`. Spacefast also polls on its own. If it stalls,
   run `sf domains diagnostics lectio.eamann.com --space lectio` to see the DNS, TXT and SSL state. A TXT
   record is only needed if the output asks for one.

### Every later publish

```
node tools/build-site.mjs && sf publish _site --wait
```

`sf rollback` returns to the previous version if a publish goes wrong.

## Audio (optional, one-time)

The Hear buttons use the device's Romanian voice. For better audio, render files once with ElevenLabs:

```
node tools/render-audio.mjs --dry-run      # lists every text and the character count
ELEVENLABS_API_KEY=... ELEVEN_VOICE_ID=... node tools/render-audio.mjs
```

It writes `audio/<hash>.mp3` for every word and line the course can speak and skips files that exist,
so re-run it after new lessons are added, then publish again.

The rendered set uses **Claudiu – Professional Romanian** (`ELEVEN_VOICE_ID=HPdbgrGubKiBta6Pq21b`), a
shared-library voice with a neutral Romanian accent. It works without being added to your voice library.
Lines use the default `eleven_multilingual_v2`. Some single short words (e.g. *cu*) come out sounding
English on that model. Those were checked with ElevenLabs speech-to-text forced to Romanian, deleted, and
re-rendered with `ELEVEN_MODEL=eleven_flash_v2_5 ELEVEN_LANG=ro`. Do the same for any new short word that
sounds wrong: delete its file (the hash is listed in `audio/index.json`) and re-run with those variables.

## Layout

- `index.html` — dashboard (entry page)
- `module-01-litere/` … `module-06-predica/` — the six weeks of lessons
- `tools/reader.html` — tap-to-gloss reader; passages and the shared glossary live in `assets/passages.js`
- `audio/` — rendered ElevenLabs files, `audio/index.json` maps each hash to its text
- `tools/build-site.mjs`, `sf.jsonc` — stage and configure the public copy for Spacefast

## Adding a sermon

Add an entry to `LECTIO_PASSAGES` in `assets/passages.js`: `title`, `ref`, `source`, `href`, `notice`, and
`lines` as `[label, text]` pairs. Words missing from `LECTIO_GLOSS` show as “not glossed yet”; add them to the
glossary, or put passage-specific meanings in the entry's `gloss` object. Then re-run the audio script.
- `assets/theme.css` — every colour, font and component; `style-guide.html` shows them
- `credits.html` — fonts, audio, and every source cited
- `curriculum.json`, `TUTOR_CONTEXT.md` — course state and notes for continuing the build
- `progress/` — your own notes

Designed for Eric Mann · https://eamann.com
