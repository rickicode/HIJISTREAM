import { gzipSync } from 'fflate';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  searchSubtitlesFromProviders,
  downloadSubtitleByProvider,
  encodeAiFileId,
} from '../src/utils/subtitle.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const EN_VTT = 'WEBVTT\n\n1\n00:00:01.000 --> 00:00:04.000\nHello world\n';
const LLM_SRT = '1\n00:00:01,000 --> 00:00:04,000\nHalo dunia\n';
// OS.org serves the file body gzipped with no Content-Encoding header, so the
// fetcher reads raw bytes and inflates them itself.
const gzBytes = (text) => gzipSync(new TextEncoder().encode(text));

const AI_ENV = {
  AXONROUTER_BASE_URL: 'https://llm.test',
  AXONROUTER_API_KEY: 'llm-key',
  AXONROUTER_MODEL: 'test-model',
  R2_ACCOUNT_ID: 'acct',
  R2_BUCKET_NAME: 'bucket',
  R2_ACCESS_KEY_ID: 'AK',
  R2_SECRET_ACCESS_KEY: 'SK',
  R2_PUBLIC_URL: 'https://pub.test',
};

function subdlSubs(subs) {

  return {
    ok: true,
    json: async () => ({ subtitles: subs }),
    text: async () => '',
  };
}

/** Network calls other than the provider-settings read that resolveProviderCredentials always does. */
function nonSettingsCalls() {
  return globalThis.fetch.mock.calls.filter(([url]) => !String(url).includes('subtitle-providers.json'));
}

const EMPTY_RESPONSE = { ok: false, json: async () => ({}), text: async () => '' };

// ─── Search: AI translation candidates ───────────────────────────────────────

describe('searchSubtitlesFromProviders AI candidates', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).includes('api.subdl.com')) {
        return subdlSubs([
          { lang: 'en', release_name: 'Movie.1080p', download_count: 50, url: '/dl/1.zip', format: 'srt' },
          { lang: 'en', release_name: 'Movie.720p', download_count: 10, url: '/dl/2.zip', format: 'srt' },
          { lang: 'id', release_name: 'Movie.ID', download_count: 99, url: '/dl/3.zip', format: 'srt' },
        ]);
      }
      return EMPTY_RESPONSE;
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('offers one EN→ID candidate per English result, encoding the source file', async () => {
    const { results } = await searchSubtitlesFromProviders(
      { ...AI_ENV, SUBDL_API_KEY: 'k' },
      'movie',
      550,
      {},
    );
    const ai = results.filter(r => r.provider === 'ai_translate');
    expect(ai).toHaveLength(2);
    for (const row of ai) {
      expect(row.lang).toBe('id');
      expect(row.canAI).toBe(true);
      expect(row.sourceLang).toBe('en');
      expect(row.title).toContain('AI EN');
    }
    expect(ai.map(r => JSON.parse(r.fileId))).toEqual([
      ['subdl', '/dl/1.zip'],
      ['subdl', '/dl/2.zip'],
    ]);
    // The translated rows are offered alongside — never instead of — the sources.
    expect(results.filter(r => r.lang === 'en')).toHaveLength(2);
  });

  it('omits candidates when AI is unconfigured or disabled, keeping EN results', async () => {
    const { results: unconfigured } = await searchSubtitlesFromProviders(
      { SUBDL_API_KEY: 'k' },
      'movie',
      550,
      {},
    );
    expect(unconfigured.some(r => r.provider === 'ai_translate')).toBe(false);

    const { results: disabled } = await searchSubtitlesFromProviders(
      { ...AI_ENV, SUBDL_API_KEY: 'k', AI_TRANSLATE_ENABLED: 'false' },
      'movie',
      550,
      {},
    );
    expect(disabled.some(r => r.provider === 'ai_translate')).toBe(false);
    expect(disabled.filter(r => r.lang === 'en')).toHaveLength(2);
  });
});

describe('searchSubtitlesFromProviders AI candidate cap', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('caps candidates at 5 when more English results exist', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).includes('api.subdl.com')) {
        return subdlSubs(
          Array.from({ length: 7 }, (_, i) => ({
            lang: 'en', release_name: `Movie.${i}`, download_count: i, url: `/dl/${i}.zip`,
          })),
        );
      }
      return EMPTY_RESPONSE;
    }));
    const { results } = await searchSubtitlesFromProviders(
      { ...AI_ENV, SUBDL_API_KEY: 'k' },
      'movie',
      550,
      {},
    );
    expect(results.filter(r => r.lang === 'en')).toHaveLength(7);
    expect(results.filter(r => r.provider === 'ai_translate')).toHaveLength(5);
  });
});

// ─── Download: ai_translate branch ───────────────────────────────────────────

describe('downloadSubtitleByProvider ai_translate branch', () => {
  let puts;

  beforeEach(() => {
    puts = [];
    vi.stubGlobal('fetch', vi.fn(async (url, init = {}) => {
      const u = String(url);
      if (u.includes('r2.cloudflarestorage.com')) {
        if (init.method === 'PUT') {
          puts.push({ path: u, body: new TextDecoder().decode(init.body) });
          return { ok: true, json: async () => ({}) , text: async () => '' };
        }
        return { ok: false, json: async () => ({}), text: async () => '' }; // no stored metadata
      }
      if (u.includes('llm.test/chat/completions')) {
        return { ok: true, json: async () => ({ choices: [{ message: { content: LLM_SRT } }] }), text: async () => '' };
      }
      if (u.includes('dl.opensubtitles.org')) {
        const bytes = gzBytes(EN_VTT);
        return { ok: true, json: async () => ({}), text: async () => EN_VTT, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
      }
      return EMPTY_RESPONSE;
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  const srcFileId = encodeAiFileId('opensubtitles_org', 'https://dl.opensubtitles.org/download/abc');

  it('translates the encoded EN source and stores Indonesian VTT in R2', async () => {
    const res = await downloadSubtitleByProvider(
      AI_ENV, 'ai_translate', srcFileId, 'movie', 550, 'id',
    );
    expect(res).toMatchObject({ lang: 'id', format: 'vtt', cached: false });

    // The LLM was fed the English source cues.
    const llmCall = [...globalThis.fetch.mock.calls]
      .map(([url, init]) => ({ url: String(url), init }))
      .find(c => c.url.includes('llm.test/chat/completions'));
    expect(JSON.parse(llmCall.init.body).messages[1].content).toContain('Hello world');

    // The stored track is the translation, under the requested language key.
    const subPut = puts.find(p => p.path.includes('/subtitles/movie/550/id.vtt'));
    expect(subPut).toBeTruthy();
    expect(subPut.body).toContain('WEBVTT');
    expect(subPut.body).toContain('Halo dunia');
    expect(subPut.body).not.toContain('Hello world');

    // Metadata records which provider actually produced the track.
    const metaPut = puts.find(p => p.path.includes('subtitles/metadata.json'));
    expect(metaPut).toBeTruthy();
    expect(metaPut.body).toContain('ai-translate:opensubtitles_org');
    expect(metaPut.body).toContain('"lang": "id"');
  });

  it('returns null for a fileId that is not an encoded source', async () => {
    const res = await downloadSubtitleByProvider(
      AI_ENV, 'ai_translate', 'garbage-not-json', 'movie', 550, 'id',
    );
    expect(res).toBeNull();
    expect(nonSettingsCalls()).toHaveLength(0);
    expect(puts).toHaveLength(0);
  });

  it('returns null without touching the network when AI is unconfigured', async () => {
    const { AXONROUTER_BASE_URL, ...noAi } = AI_ENV;
    const res = await downloadSubtitleByProvider(
      noAi, 'ai_translate', srcFileId, 'movie', 550, 'id',
    );
    expect(res).toBeNull();
    expect(nonSettingsCalls()).toHaveLength(0);
  });
});
