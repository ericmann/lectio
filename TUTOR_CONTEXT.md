# Tutor context — Lectio

**Objective (verbatim):** Follow a sermon at church by spring.

## The learner
- Eric Mann. Experienced software engineer; comfortable with a terminal, scripts and static hosting.
- Had a few Romanian words. Found Duolingo frustrating: the diacritics were hard to read and he often
  can't listen or speak aloud.
- Studies 20–30 minutes a day before the household is up. The course is a surprise for his family, so
  keep page titles neutral and never assume he can play audio.
- Wants speed but accepts the work. Lighter tone; no lectures about time or workload.
- Later phase he mentioned: technical register, possibly translating his own writing into Romanian.

## Decisions and why
- **Reading first, listening last.** Weeks 1–5 build decoding, small words, church vocabulary, verbs and
  known Scripture in silence. Week 6 moves to sermon transcripts, then audio.
- **Church:** Romanian Baptist Church of Portland. Cornilescu translation assumed (not confirmed).
  The pastor sometimes mixes English and Romanian; week 6 should treat code-switching as normal.
- **Week 6 material:** his church streams on YouTube and he may extract a few sermons himself. Plan:
  he supplies audio/transcripts; glosses are written from the transcript. Nothing is downloaded for him.
- **Audio tiers:** device voice (default) → ElevenLabs files rendered once by `tools/render-audio.mjs`
  → real recordings in week 6.
- **Typography is the accessibility feature.** All Romanian is `lang="ro"` + class `ro`: hyperlegible
  sans, larger, with ă â î ș ț highlighted by script. Never set Romanian in the body serif.
- **Credit line:** "Designed for Eric Mann" (his choice), linking eamann.com.
- **Sourcing:** every factual claim links to a source or is marked as the author's own experience;
  each lesson ends with a Sources section and `credits.html` aggregates them.

## State of the build
- All 34 lessons exist. Weeks 1–5 are complete. Week 6: 6.1 and 6.2 use author-written practice text;
  6.3–6.5 are practice protocols (listening loop, word tally, Sunday notes sheet).
- Audio rendered 2026-11-12 with ElevenLabs voice "Claudiu – Professional Romanian" (HPdbgrGubKiBta6Pq21b).
  Hosting: Spacefast at lectio.eamann.com, published from `_site/` via `tools/build-site.mjs` so these
  notes stay private (README "Publish" has the steps).
- Outstanding: real sermon transcripts from his church for week 6; first Spacefast publish and DNS (his
  account); if wanted, server-backed progress.
- Scripture quoted in lessons and the reader was proofread against bible.com (VDC) at build time.
  Sounding-out guides and vocabulary glosses are the author's own and have not been checked by a native speaker.

## Building more
- Read `assets/theme.css` and `style-guide.html` first. Pages define no colours or fonts.
- Lesson shape: hero → short prose with callouts → an in-lesson drill (`Lectio.quiz`) or tap cards
  (`.pair`) → "Now read something real" with a Check-yourself reveal → complete button → Sources → pager.
- New passages go in `assets/passages.js`; open them with `tools/reader.html#<id>`.
- After adding lessons: update the lesson list in `index.html`, `curriculum.json`, `credits.html`, and
  remind him to re-run the audio script.
- One small joke per lesson, in a `.callout--narrator`. Avoid "not X but Y" constructions.
