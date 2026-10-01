# Subtitle UX Audit — HIJISTREAM web

**Date:** 2026-10-01
**Baseline:** `8750b82` (production alias `hijistream-kpkffzlpg`, Ready)
**Mode:** read-only audit. No source modified. Evidence: live HTTP probes + headless
Chromium against `https://hijistream-web.vercel.app`.

## Scope

User-facing subtitle flow in `apps/web`: `MovieDetail.jsx`, `TVDetail.jsx`,
`SubtitlePicker.jsx`, `SubtitleSearchModal.jsx`, `EpisodeList.jsx`, plus parity
notes for `apps/tv` / `apps/mobile`. Backend contract probed live
(`/api/subtitles`, `/api/subtitles/search`).

## Surfaces

| Surface | Entry | State handling |
|---|---|---|
| Detail page subtitle panel | always visible pre-play | none (no loading, no error) |
| `SubtitleSearchModal` | "Cari & Download" button | loading + error + retry present |
| `SubtitlePicker` | chips inside panel | disabled-while-playing only |
| `EpisodeList` `SubtitleBtn` | click per episode | idle/loading/ok/fail, resets 3s |
| TV `CustomPlayerOverlay` | in-player modal | off/on + cached badge |
| Mobile player | none — passes `ds_lang` only | auto-search inside embed |

## Findings

### F1 — Autoplay deep-link drops the selected subtitle (confirmed, movie & TV)

`?autoplay=true` mounts with `isPlaying=true` and captures the embed URL **once,
at mount**, before the subtitle fetch resolves.

- `MovieDetail.jsx:111-117` — `autoplayCaptured.current = true; captureEmbedUrl(selectedSubtitle)` runs with `selectedSubtitle === null` (fetch ~1s; capture at mount).
- `TVDetail.jsx:143-147` — identical pattern.
- `MovieDetail.jsx:26-31` — initial `availableSubtitles = []`, no loading flag.

Deep-link is a primary path: `HeroBanner.jsx:11`, `ContentCard.jsx:12`,
`Player.jsx:10-12` all emit `?autoplay=true`.

```
/movies/550?autoplay=true
  iframe src @2s  https://vaplayer.ru/embed/movie/550?skin=netflix    sub_url=null sub_lang=null
  iframe src @6s  https://vaplayer.ru/embed/movie/550?skin=netflix    sub_url=null sub_lang=null
  iframe src @12s https://vaplayer.ru/embed/movie/550?skin=netflix    sub_url=null sub_lang=null

/tv/1399?autoplay=true&s=1&e=1
  iframe src @9s  https://vaplayer.ru/embed/tv/1399/1/1?skin=netflix  sub_url=null sub_lang=null
```

Control (`/movies/550`, manual play path): 6 subtitles resolved; panel renders
`🇮🇩 Active | ✕ Off | 🇮🇩 ID | 🇺🇸 EN | 🇯🇵 JA | 🇰🇷 KO | 🇪🇸 ES | +1`.
Availability proven; the autoplay path simply never attaches it.

Consequence: every autoplay entry (hero play, resume, episode card) plays with
**no subtitle**, and the panel is unmounted during playback
(`{!isPlaying && ...}`, `MovieDetail.jsx:163`), so the user cannot attach one
without closing the player.

### F2 — Panel falsely reports "no subtitles" while loading (~4.2 s window)

No loading state exists for the subtitle fetch. `MovieDetail.jsx:183-195` renders
"Belum ada subtitle tersedia" whenever `availableSubtitles.length === 0`, which is
also the initial state during the fetch.

```
/movies/680 sampled every 450ms
t=969ms   panel absent (page skeleton)
t=1986ms  "Subtitle | Cari & Download | Belum ada subtitle tersedia | Cari sekarang"
t=6202ms  "Subtitle | 🇮🇩 Active | ... | 🇮🇩 ID"
```

Empty state shown ~4.2 s before data arrives, indistinguishable from a real
not-found result. Same shape in `TVDetail.jsx:261-270`.

Latency is inherent: `/api/subtitles` 0.73–1.02 s + React Query resolution;
`/api/subtitles/search` 2.34 s.

### F3 — API never signals failure; UI cannot distinguish "none" from "broken"

```
GET /api/subtitles?type=movie&tmdb_id=550&lang=xx        -> 200 {"subtitles":[]}
GET /api/subtitles?type=movie&tmdb_id=999999999&lang=en  -> 200 {"subtitles":[]}
```

`api.getSubtitles` never rejects on bad provider/config state, so `catch`
branches in `MovieDetail.jsx:99` / `TVDetail.jsx:119` are dead for upstream
failures. Provider outage is rendered identically to "genuinely no subtitle".

### F4 — Modal loader copy lies about provider count/names

`SubtitleSearchModal.jsx:156-157`:

```
"Mencari dari 4 provider..."   /   "OS.com • OS.org • Subdl • Podnapisi"
```

Registry registers **6** (`subtitle-providers.js:691-696`): opensubtitles_com,
subdl, podnapisi, yify, subtitlecat, ai_translate. Live `tmdb_id=680` search
returned `["opensubtitles_com","subdl"]` — copy matches neither list nor count.
Footer (`:268`) derives from actual `providers` state; the loader does not.

### F5 — Duplicate language maps drift from the single source of truth

`subtitle-constants.js` is documented "single source of truth", but
`SubtitlePicker.jsx:4-14` re-declares `LANG_FLAGS`/`LANG_SHORT`/`LANG_FULL` for
**7** languages vs 40+ in the constants module. Any language beyond those 7 falls
back to `🌐` + `toUpperCase()` in the picker while the modal shows the correct
flag/label — same data, two renderings.

### F6 — Availability button is a dead-end for fixing missing subtitles

`EpisodeList.jsx:6-35` (`SubtitleBtn`): click reports `ok`/`fail` for 3 s then
resets. On `fail` ("Subtitle tidak ditemukan") there is no action to search or
download — the modal entry exists only on the detail page, not per-episode.
Status without remedy.

### F7 — API contract shape (verified; not a bug)

Client sends `tmdb_id` (`api.js:153-183`); server accepts it. Multi-language
`lang=id,en,es,ja` returns all requested languages. TV `season`/`episode` scoping
works (`tv/1396/s1e1 -> en.vtt`). No mismatch.

## Non-findings (hypotheses tested and rejected)

- **Modal re-search loop**: hypothesized the inline `item` object in
  `MovieDetail.jsx:203` would retrigger `SubtitleSearchModal.jsx:56-64`. Measured:
  opening the modal across the 1.5 s deferred-language window issued exactly **1**
  `/subtitles/search`. No loop.
- **In-player subtitle switching (web)**: not implemented, but the embed is
  cross-origin (`vaplayer.ru`) behind Cloudflare challenge frames; its own CC menu
  governs playback. Not auditable here, outside web app control.

## Severity & recommended order

| ID | Severity | Fix sketch |
|---|---|---|
| F1 | **High** — silent feature loss on main entry path | delay the autoplay capture until the first subtitle fetch settles (or fold the fetch result into the capture effect); re-capture once `selectedSubtitle` arrives and the player has not user-driven-played yet |
| F2 | **High** — actively false messaging | add `subtitleLoading` state; render a spinner/skeleton until the first fetch settles, then empty-state |
| F3 | Medium | have `/api/subtitles` return 5xx (or an `error` field) when all providers fail, and surface it distinctly |
| F4 | Low | drive the loader copy from the registry/`PROVIDER_LABELS` |
| F5 | Low | import the picker's maps from `subtitle-constants.js`; delete the local copies |
| F6 | Low | make the `fail` badge clickable to open `SubtitleSearchModal` |

F1/F2 share one root cause: the panel has no loading model and the autoplay path
reads state before it is ever populated.
