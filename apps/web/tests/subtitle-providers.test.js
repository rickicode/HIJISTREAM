import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  srtToVtt,
  getR2PublicUrl,
  searchSubtitlesFromProviders,
} from '../src/utils/subtitle.js';
import {
  computeScore,
  rankSubtitles,
  OpenSubtitlesComProvider,
  SubdlProvider,
  providerRegistry,
} from '../src/utils/subtitle-providers.js';

// ─── SRT to VTT ──────────────────────────────────────────────────────────────

describe('srtToVtt', () => {
  it('converts SRT timestamps to VTT format', () => {
    const srt = '1\n00:00:01,000 --> 00:00:04,000\nHello World';
    const vtt = srtToVtt(srt);
    expect(vtt).toContain('WEBVTT');
    expect(vtt).toContain('00:00:01.000 --> 00:00:04.000');
    expect(vtt).toContain('Hello World');
  });

  it('handles empty input', () => {
    expect(srtToVtt('')).toBe('');
    expect(srtToVtt(null)).toBe('');
  });

  it('strips BOM', () => {
    const srt = '\uFEFF1\n00:00:01,000 --> 00:00:04,000\nTest';
    const vtt = srtToVtt(srt);
    expect(vtt).not.toContain('\uFEFF');
  });

  it('preserves existing WEBVTT header', () => {
    const vtt = 'WEBVTT\n\n1\n00:00:01.000 --> 00:00:04.000\nTest';
    const result = srtToVtt(vtt);
    expect(result).toContain('WEBVTT');
  });
});

// ─── R2 Public URL ────────────────────────────────────────────────────────────

describe('getR2PublicUrl', () => {
  it('constructs correct URL', () => {
    const env = { R2_PUBLIC_URL: 'https://cdn.example.com' };
    expect(getR2PublicUrl(env, 'subtitles/movie/123/en.vtt')).toBe('https://cdn.example.com/subtitles/movie/123/en.vtt');
  });

  it('handles trailing slashes', () => {
    const env = { R2_PUBLIC_URL: 'https://cdn.example.com/' };
    expect(getR2PublicUrl(env, 'test.vtt')).toBe('https://cdn.example.com/test.vtt');
  });
});

// ─── Scoring Algorithm ────────────────────────────────────────────────────────

describe('computeScore', () => {
  it('gives high score for matching title', () => {
    const subtitle = { title: 'The.Matrix.1999.720p.BluRay.x264.mkv' };
    const video = { title: 'The Matrix', type: 'movie', year: '1999' };
    const { score } = computeScore(subtitle, video);
    expect(score).toBeGreaterThan(50);
  });

  it('gives score for year match', () => {
    const subtitle = { title: 'Movie.1999.srt' };
    const video = { title: 'Movie', type: 'movie', year: '1999' };
    const { score } = computeScore(subtitle, video);
    expect(score).toBeGreaterThan(0);
  });

  it('gives zero for no match', () => {
    const subtitle = { title: 'Completely.Different.srt' };
    const video = { title: 'The Matrix', type: 'movie', year: '1999' };
    const { score } = computeScore(subtitle, video);
    expect(score).toBe(0);
  });
});

describe('rankSubtitles', () => {
  it('sorts by score descending', () => {
    const subtitles = [
      { title: 'random.srt' },
      { title: 'The.Matrix.1999.srt' },
      { title: 'Matrix.1999.720p.srt' },
    ];
    const video = { title: 'The Matrix', type: 'movie', year: '1999' };
    const ranked = rankSubtitles(subtitles, video);
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
  });
});

// ─── Provider Registry ────────────────────────────────────────────────────────

describe('ProviderRegistry', () => {
  it('has all providers registered', () => {
    expect(providerRegistry.get('opensubtitles_com')).toBeDefined();
    expect(providerRegistry.get('subdl')).toBeDefined();
    expect(providerRegistry.get('subtitlecat')).toBeDefined();
    expect(providerRegistry.get('ai_translate')).toBeDefined();
  });

  it('returns all providers', () => {
    const all = providerRegistry.getAll();
    expect(all.length).toBe(4);
  });
});

// ─── OpenSubtitlesComProvider ─────────────────────────────────────────────────

describe('OpenSubtitlesComProvider', () => {
  const provider = new OpenSubtitlesComProvider();

  it('has correct name', () => {
    expect(provider.name).toBe('opensubtitles_com');
    expect(provider.displayName).toBe('OpenSubtitles.com');
  });

  it('returns empty array without credentials', async () => {
    const result = await provider.search(
      { tmdbId: 27205, type: 'movie' },
      ['en'],
      null
    );
    expect(result).toEqual([]);
  });

  it('normalizes language codes', () => {
    expect(provider._normalizeLang('id')).toBe('id');
    expect(provider._normalizeLang('ind')).toBe('id');
    expect(provider._normalizeLang('Indonesian')).toBe('id');
  });
});

// ─── SubdlProvider ────────────────────────────────────────────────────────────

describe('SubdlProvider', () => {
  const provider = new SubdlProvider();

  it('has correct name', () => {
    expect(provider.name).toBe('subdl');
    expect(provider.displayName).toBe('Subdl');
  });

  it('returns empty array without credentials', async () => {
    const result = await provider.search(
      { tmdbId: 27205, type: 'movie' },
      ['en'],
      null
    );
    expect(result).toEqual([]);
  });

  it('normalizes language codes', () => {
    expect(provider._normalizeLang('id')).toBe('id');
    expect(provider._normalizeLang('indonesian')).toBe('id');
    expect(provider._normalizeLang('english')).toBe('en');
  });
});

// ─── Provider Throttling ──────────────────────────────────────────────────────

describe('Provider Throttling', () => {
  it('provider can be throttled', () => {
    const provider = new OpenSubtitlesComProvider();
    provider.throttle(60000);
    expect(provider.checkThrottle()).toBe(true);
  });

  it('provider unthrottles after timeout', () => {
    const provider = new OpenSubtitlesComProvider();
    provider.throttle(1); // 1ms
    // Wait a bit
    setTimeout(() => {
      expect(provider.checkThrottle()).toBe(false);
    }, 10);
  });
});

// ─── API Methods ──────────────────────────────────────────────────────────────

// Env with R2 configured but no provider credentials — no live network calls
// may escape these tests, so callers stub fetch themselves.
const EMPTY_ENV = {
  R2_ACCOUNT_ID: 'test',
  R2_ACCESS_KEY_ID: 'test',
  R2_SECRET_ACCESS_KEY: 'test',
  R2_BUCKET_NAME: 'test',
  R2_PUBLIC_URL: 'https://test.com',
};

describe('API subtitle methods', () => {
  it('resolves the language vocabulary each provider actually sends', async () => {
    // Subdl answers ISO codes for its own uploads but plain English names for
    // its Subscene legacy archive. Truncating a name to two characters produced
    // fake codes (tu, ch, al) that reached the picker as unmapped chips and
    // split one language across two filter entries.
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).includes('api.subdl.com')) {
        return {
          ok: true,
          json: async () => ({
            subtitles: [
              { lang: 'Chinese Traditional', release_name: 'A.2026.1080p', url: '/dl/1.zip' },
              { lang: 'CH', release_name: 'B.2026.1080p', url: '/dl/2.zip' },
              { lang: 'Turkish', release_name: 'C.2026.1080p', url: '/dl/3.zip' },
              { lang: 'Albanian', release_name: 'D.2026.1080p', url: '/dl/4.zip' },
              { lang: 'zh-cn', release_name: 'E.2026.1080p', url: '/dl/5.zip' },
            ],
          }),
          text: async () => '',
        };
      }
      return { ok: false, json: async () => ({}), text: async () => '' };
    }));
    try {
      const { results } = await searchSubtitlesFromProviders(
        { ...EMPTY_ENV, SUBDL_API_KEY: 'k' }, 'movie', 27205, {},
      );
      const subdl = results.filter(r => r.provider === 'subdl');
      expect(subdl.map(r => r.lang)).toEqual(['zh', 'zh', 'tr', 'sq', 'zh']);
      // The label follows the resolved code, so two spellings of one language
      // no longer appear as two different languages.
      expect(new Set(subdl.map(r => r.langName))).toEqual(new Set(['Chinese', 'Turkish', 'Albanian']));
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('searchSubtitlesFromProviders returns results plus per-provider diagnostics', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}), text: async () => '' })));
    try {
      const { results, diagnostics } = await searchSubtitlesFromProviders(
        { ...EMPTY_ENV, TMDB_API_KEY: 'test' }, 'movie', 27205, {},
      );
      expect(Array.isArray(results)).toBe(true);
      expect(results).toEqual([]);
      // Every provider must account for itself: with no credentials configured
      // each one reports `skipped`, never a silent absence from the list.
      expect(diagnostics.length).toBeGreaterThan(0);
      for (const row of diagnostics) {
        expect(row).toHaveProperty('provider');
        expect(['ok', 'empty', 'skipped', 'error']).toContain(row.status);
        expect(typeof row.count).toBe('number');
      }
      expect(diagnostics.find(d => d.provider === 'opensubtitles_com')?.status).toBe('skipped');
      expect(diagnostics.find(d => d.provider === 'subdl')?.status).toBe('skipped');
      // SubtitleCat is keyed on a title, which neither the caller nor a
      // keyless TMDB can supply here — it must say so rather than vanish.
      expect(diagnostics.find(d => d.provider === 'subtitlecat')?.status).toBe('skipped');
    } finally {
      vi.unstubAllGlobals();
    }
  });


  it('reports the TMDB HTTP status when SubtitleCat cannot resolve a title', async () => {
    const fetchMock = vi.fn(async (url) => {
      const u = String(url);
      if (u.includes('api.themoviedb.org')) {
        // Body is single-use, like a real Response: reading it twice throws.
        let read = false;
        return {
          ok: false, status: 401,
          json: async () => { if (read) throw new Error('body already read'); read = true; return { status_code: 7 }; },
        };
      }
      return { ok: false, json: async () => ({}), text: async () => '' };
    });
    vi.stubGlobal('fetch', fetchMock);
    try {
      const { diagnostics } = await searchSubtitlesFromProviders(
        { ...EMPTY_ENV, TMDB_API_KEY: 'invalid' }, 'movie', 27205, {},
      );
      const cat = diagnostics.find(d => d.provider === 'subtitlecat');
      // SubtitleCat never ran — the title it is keyed on could not be resolved —
      // so the honest status is `skipped`, but the HTTP reason must still show.
      expect(cat.status).toBe('skipped');
      expect(cat.message).toBe('TMDB menolak lookup (HTTP 401)');
      // One lookup call — a double res.json() would have consumed the body.
      expect(fetchMock.mock.calls.filter(([u]) => String(u).includes('api.themoviedb.org'))).toHaveLength(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('reads the TMDB body once for TV (name-only payloads) and continues', async () => {
    const fetchMock = vi.fn(async (url) => {
      const u = String(url);
      if (u.includes('api.themoviedb.org')) {
        // TV detail carries `name`, never `title`. With a single-use body,
        // evaluating `(await json()).title || (await json()).name` reads twice.
        let read = false;
        return {
          ok: true, status: 200,
          json: async () => { if (read) throw new Error('body already read'); read = true; return { name: 'Breaking Bad' }; },
        };
      }
      // SubtitleCat's own search page answers nothing → `empty`, not `error`.
      return { ok: false, json: async () => ({}), text: async () => '' };
    });
    vi.stubGlobal('fetch', fetchMock);
    try {
      const { diagnostics } = await searchSubtitlesFromProviders(
        { ...EMPTY_ENV, TMDB_API_KEY: 'valid' }, 'tv', 1396, { season: 1, episode: 1 },
      );
      const cat = diagnostics.find(d => d.provider === 'subtitlecat');
      // A second json() read throws "body already read", which the old code
      // reported as `error` — the reason TV SubtitleCat looked broken.
      expect(cat.status).toBe('empty');
      // The message now names the title source; `null` was the pre-fix shape.
      expect(cat.message).toBe('judul dari TMDB');
      // The resolved title reached the SubtitleCat search (query built from it).
      const catSearches = fetchMock.mock.calls.filter(([u]) => String(u).includes('subtitlecat.com'));
      expect(catSearches.length).toBeGreaterThan(0);
      expect(decodeURIComponent(String(catSearches[0][0]))).toContain('Breaking Bad');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('SubtitleCatProvider', () => {
  it('has correct identity', () => {
    const provider = providerRegistry.get('subtitlecat');
    expect(provider.name).toBe('subtitlecat');
    expect(provider.displayName).toBe('SubtitleCat');
  });

  it('rejects empty title', async () => {
    const provider = providerRegistry.get('subtitlecat');
    const res = await provider.search({ type: 'movie', id: 27205, title: '' }, ['id']);
    expect(res).toEqual([]);
  });
});
