import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import middleware from '../middleware.js';

const R2_VARS = {
  R2_ACCOUNT_ID: 'acct',
  R2_ACCESS_KEY_ID: 'AK',
  R2_SECRET_ACCESS_KEY: 'SK',
  R2_BUCKET_NAME: 'bucket',
  R2_PUBLIC_URL: 'https://pub.test',
};

// /api/subtitles/search on production is served by middleware.js, not by the
// Pages Function. Both hand the search to searchSubtitlesFromProviders, which
// resolves the title/imdb_id a caller omitted from a single TMDB call; the
// title is what SubtitleCat is keyed on.
function stubFetch() {
  const calls = [];
  globalThis.fetch = vi.fn(async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.includes('themoviedb.org')) {
      // The deployment carries a v3 key, which TMDB only honours through
      // api_key=. Answering 401 to the Bearer-only form is what production
      // does, and is the regression this exercises.
      if (!u.includes('api_key=')) {
        return new Response(JSON.stringify({ status_code: 7, status_message: 'Invalid API key' }), { status: 401 });
      }
      return new Response(JSON.stringify({
        title: 'Inception',
        external_ids: { imdb_id: 'tt1375666' },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    // Every subtitle provider: no rows. The assertions are about the requests.
    return new Response('', { status: 404 });
  });
  return calls;
}

function search(params) {
  return middleware(new Request(`https://app.test/api/subtitles/search?${params}`));
}

describe('middleware /subtitles/search metadata resolution', () => {
  const savedEnv = {};

  beforeEach(() => {
    for (const [k, v] of Object.entries({ ...R2_VARS, TMDB_API_KEY: 'test-key' })) {
      savedEnv[k] = globalThis.process.env[k];
      globalThis.process.env[k] = v;
    }
  });

  afterEach(() => {
    for (const k of Object.keys(savedEnv)) {
      if (savedEnv[k] === undefined) delete globalThis.process.env[k];
      else globalThis.process.env[k] = savedEnv[k];
    }
    vi.restoreAllMocks();
  });

  it('resolves the title when the caller omits it, and queries SubtitleCat with it', async () => {
    const calls = stubFetch();
    const res = await search('type=movie&tmdb_id=27205&lang=id');
    expect(res.status).toBe(200);

    const detail = calls.filter((u) => u.includes('append_to_response=external_ids'));
    expect(detail).toHaveLength(1);
    // Without external_ids the payload carries no imdb_id at all.
    expect(detail[0]).toContain('append_to_response=external_ids');
    // The resolved title reached the provider that is keyed on it.
    const cat = calls.filter((u) => u.includes('subtitlecat.com'));
    expect(cat).toHaveLength(1);
    expect(decodeURIComponent(cat[0])).toContain('Inception');
  });

  it('does not spend a TMDB call when the client sent both title and imdb_id', async () => {
    const calls = stubFetch();
    const res = await search('type=movie&tmdb_id=27205&lang=id&imdb_id=tt1375666&title=Inception');
    expect(res.status).toBe(200);
    expect(calls.filter((u) => u.includes('append_to_response=external_ids'))).toHaveLength(0);
    expect(calls.filter((u) => u.includes('subtitlecat.com'))).toHaveLength(1);
  });

  it('keeps a client-supplied title when TMDB is unreachable', async () => {
    globalThis.fetch = vi.fn(async (url) => {
      if (String(url).includes('themoviedb.org')) throw new Error('offline');
      return new Response('', { status: 404 });
    });
    const res = await search('type=movie&tmdb_id=27205&lang=id&title=Inception');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(0);
    // The search still answered; the failure only cost the provider rows.
    expect(Array.isArray(body.diagnostics)).toBe(true);
  });
});