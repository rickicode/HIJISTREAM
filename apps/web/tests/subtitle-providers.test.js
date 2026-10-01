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
    expect(providerRegistry.get('yify')).toBeDefined();
    expect(providerRegistry.get('subtitlecat')).toBeDefined();
    expect(providerRegistry.get('ai_translate')).toBeDefined();
  });

  it('returns all providers', () => {
    const all = providerRegistry.getAll();
    expect(all.length).toBe(5);
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

describe('API subtitle methods', () => {
  it('searchSubtitlesFromProviders returns results plus per-provider diagnostics', async () => {
    // Mock env with no credentials
    const env = {
      R2_ACCOUNT_ID: 'test',
      R2_ACCESS_KEY_ID: 'test',
      R2_SECRET_ACCESS_KEY: 'test',
      R2_BUCKET_NAME: 'test',
      R2_PUBLIC_URL: 'https://test.com',
      TMDB_API_KEY: 'test',
    };
    const { results, diagnostics } = await searchSubtitlesFromProviders(env, 'movie', 27205, {});
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
    // YIFY is movie-capable but has no imdb_id here — it must say so rather
    // than vanish.
    expect(diagnostics.find(d => d.provider === 'yify')?.status).toBe('skipped');
    expect(diagnostics.find(d => d.provider === 'yify')?.message).toBe('butuh imdb_id');
  });
});

describe('YifyProvider', () => {
  it('has correct identity', () => {
    const provider = providerRegistry.get('yify');
    expect(provider.name).toBe('yify');
    expect(provider.displayName).toBe('YIFY Subtitles');
  });

  it('rejects tv shows', async () => {
    const provider = providerRegistry.get('yify');
    const res = await provider.search({ type: 'tv', id: 1399, imdbId: 'tt0944947' }, ['en']);
    expect(res).toEqual([]);
  });

  it('rejects missing imdbId', async () => {
    const provider = providerRegistry.get('yify');
    const res = await provider.search({ type: 'movie', id: 27205 }, ['en']);
    expect(res).toEqual([]);
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
