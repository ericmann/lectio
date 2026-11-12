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

Any static host works. On Spacefast: `sf publish .` from this folder.

## Audio (optional, one-time)

The Hear buttons use the device's Romanian voice. For better audio, render files once with ElevenLabs:

```
node tools/render-audio.mjs --dry-run      # lists every text and the character count
ELEVENLABS_API_KEY=... ELEVEN_VOICE_ID=... node tools/render-audio.mjs
```

It writes `audio/<hash>.mp3` for every word and line the course can speak and skips files that exist,
so re-run it after new lessons are added. Pick a voice that handles Romanian well. If single words come
out in the wrong language, try `ELEVEN_MODEL=eleven_flash_v2_5 ELEVEN_LANG=ro`. This script has not been
run against the live API.

## Layout

- `index.html` — dashboard (entry page)
- `module-01-litere/` … `module-06-predica/` — the six weeks of lessons
- `tools/reader.html` — tap-to-gloss reader; passages and the shared glossary live in `assets/passages.js`

## Adding a sermon

Add an entry to `LECTIO_PASSAGES` in `assets/passages.js`: `title`, `ref`, `source`, `href`, `notice`, and
`lines` as `[label, text]` pairs. Words missing from `LECTIO_GLOSS` show as “not glossed yet”; add them to the
glossary, or put passage-specific meanings in the entry's `gloss` object. Then re-run the audio script.
- `assets/theme.css` — every colour, font and component; `style-guide.html` shows them
- `credits.html` — fonts, audio, and every source cited
- `curriculum.json`, `TUTOR_CONTEXT.md` — course state and notes for continuing the build
- `progress/` — your own notes

Designed for Eric Mann · https://eamann.com
