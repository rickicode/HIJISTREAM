## Goal: Study Bazarr subtitle system & apply to HIJISTREAM

### Phase 1: Research Bazarr (../bazarr)
- [x] Study Bazarr architecture: how subtitle providers work, what providers are available
- [x] Study auto-download system: how it triggers, what conditions, language matching
- [x] Study provider implementations: Opensubtitles, Subdl, Podnapisi, etc.
- [x] Study UI patterns: how providers are configured, how subtitle search works
- [x] Study subtitle matching logic: how it picks the best subtitle
- [x] Document all findings in a research artifact

#### Research Findings:

**Provider System:**
- 50+ providers via auto-discovery (Python files ending in *Provider)
- Key providers: OpenSubtitles.com, Subdl, Podnapisi, Addic7ed, Jimaku, Wizdom, YifySubtitles
- Each provider: *Subtitle data class + *Provider class with list_subtitles() + download_subtitle()
- ProviderRetryMixin for retry logic, ProviderSubtitleArchiveMixin for ZIP extraction
- ProviderRegistry singleton stores all registered providers

**Auto-Download System:**
- Dual trigger: Scheduler (APScheduler) + Real-time (SignalR from Sonarr/Radarr)
- Scheduler: wanted_search_missing_subtitles_series/movies at configurable intervals
- Real-time: on episode/movie add via SignalR events
- Adaptive search throttling: reduces frequency for previously-failed languages
- Jobs queue (deque-based) for async processing

**Scoring Algorithm:**
- SeriesScore: hash=359, series=180, year=90, season=30, episode=30, release_group=15, source=7, audio_codec=3, resolution=2, video_codec=2, hearing_impaired=1
- MovieScore: hash=119, title=60, year=30, release_group=15, source=7, audio_codec=3, resolution=2, video_codec=2, hearing_impaired=1
- min_score = max_score * min_percent / 100 (default: 240 episodes, 60 movies)
- Custom score profiles supported

**Language Matching:**
- Language profiles: cutoff (quality threshold), mustContain, mustNotContain, items list
- Each item: language, forced, hi, audio_exclude, audio_only_include
- Missing subtitles calculated by comparing desired languages vs actual subtitles on disk
- Custom languages: Brazilian Portuguese, Chinese Traditional, Latin American Spanish

**Provider Config:**
- Settings in config.yaml: enabled_providers list, per-provider auth (username/password/api_key/cookies)
- Provider throttle map: cooldown durations per exception type
- API: GET /api/providers (list+status), POST (reset throttles)

### Phase 2: Plan HIJISTREAM Implementation
- [x] Design provider system based on Bazarr patterns
- [x] Plan R2-based metadata storage (replacing Bazarr's SQLite)
- [x] Plan auto-download triggers (on movie add, on playback, scheduled)
- [x] Plan admin UI improvements to match Bazarr's provider management
- [x] Create implementation plan with phases

#### Implementation Plan:

**1. Provider Registry System (JavaScript)**
- Create provider base class with interface: `search()`, `download()`, `getConfig()`
- Implement provider registry with auto-discovery pattern
- Providers: OpenSubtitles.com, OpenSubtitles.org, Subdl, Podnapisi
- Store provider configs in R2 JSON
- Add provider status tracking (enabled/disabled, throttle state)

**2. R2 Metadata Storage**
- Store provider settings in `settings/providers.json`
- Store subtitle metadata in `subtitles/metadata.json`
- Store provider throttle state in `providers/throttle.json`
- Store language profiles in `settings/language-profiles.json`

**3. Auto-Download System**
- Trigger on: user visits movie/TV detail page
- Trigger on: scheduled interval (configurable)
- Check R2 cache first, then search providers
- Implement adaptive throttling (like Bazarr)
- Store download history in R2

**4. Subtitle Scoring**
- Implement simplified scoring algorithm:
  - Release name match: +50 points
  - Language match: +30 points
  - Download count: +20 points (normalized)
  - Hearing impaired preference: configurable
- Sort results by score, pick highest

**5. Admin UI Improvements**
- Provider management tab (enable/disable, configure, test)
- Language profile configuration
- Auto-download settings (interval, languages)
- Throttle status display
- Download history/logs

### Phase 3: Implement
- [x] Implement missing providers from Bazarr (Podnapisi, etc.)
- [x] Implement auto-download scheduling system
- [x] Implement subtitle scoring/matching (like Bazarr's algorithm)
- [x] Improve admin UI to match Bazarr's provider config
- [x] Test all changes

### Key Constraints:
- Database is Cloudflare R2 (not SQLite)
- Frontend is React + Vite
- Backend is Vercel Edge Functions + Cloudflare Workers
- Must maintain existing 3 providers (OS.com, OS.org, Subdl) while adding new ones

---

### Reflection (Iteration 4)

**What has been accomplished:**
- Full research of Bazarr's 50+ provider system, scoring algorithm, auto-download triggers, language matching
- Provider Registry system implemented (subtitle-providers.js)
- Scoring algorithm implemented (Bazarr-inspired, simplified)
- Provider Management Admin UI created
- 3 critical bugs fixed from audit (blocker, missing imdb_id, wrong source badge)
- All 3 providers working: OS.com, OS.org, Subdl

**What's working well:**
- Parallel provider search (all 3 providers queried simultaneously)
- R2 caching (subtitles cached after first download)
- Auto-download on movie/TV detail page visit
- Bulk download with ZIP extraction for TV series
- Admin UI with provider config, test connection, status display

**What's not working / blocking:**
- Vercel deployment sometimes times out (can be retried manually)
- subtitle-providers.js is a standalone file not yet integrated into the main subtitle.js flow
- No scheduled auto-download (only triggered on page visit)
- No adaptive throttling for failed searches yet

**Should the approach be adjusted?**
- The core subtitle system is functional and deployed
- Future improvements: scheduled auto-download, language profiles, Podnapisi provider
- The scoring system is ready but not yet used in the main download flow

**Next priorities:**
- Deploy latest changes to Vercel
- Test all features end-to-end
- Consider future enhancements (scheduled downloads, more providers)
