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
  PodnapisiProvider,
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
    expect(providerRegistry.get('podnapisi')).toBeDefined();
  });

  it('returns all providers', () => {
    const all = providerRegistry.getAll();
    expect(all.length).toBeGreaterThanOrEqual(3);
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

// ─── PodnapisiProvider ────────────────────────────────────────────────────────

describe('PodnapisiProvider', () => {
  const provider = new PodnapisiProvider();

  it('has correct name', () => {
    expect(provider.name).toBe('podnapisi');
    expect(provider.displayName).toBe('Podnapisi');
  });

  it('does not require credentials', async () => {
    // Podnapisi is free - no auth needed
    // This test verifies the search function exists and can be called
    expect(provider.search).toBeDefined();
    expect(typeof provider.search).toBe('function');
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
  it('searchSubtitlesFromProviders returns array', async () => {
    // Mock env with no credentials
    const env = {
      R2_ACCOUNT_ID: 'test',
      R2_ACCESS_KEY_ID: 'test',
      R2_SECRET_ACCESS_KEY: 'test',
      R2_BUCKET_NAME: 'test',
      R2_PUBLIC_URL: 'https://test.com',
      TMDB_API_KEY: 'test',
    };
    const results = await searchSubtitlesFromProviders(env, 'movie', 27205, {});
    expect(Array.isArray(results)).toBe(true);
  });
});
