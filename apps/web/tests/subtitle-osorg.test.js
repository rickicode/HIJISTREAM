import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { gzipSync } from 'fflate';
import { parseXmlRpcResponse, downloadSubtitleByProvider } from '../src/utils/subtitle.js';

// Captured from api.opensubtitles.org on 2026-10-01. Shapes verified against
// the live endpoint so the parser fixtures cannot drift into something easy.
const LOGIN_OK = `<?xml version="1.0" encoding="utf-8"?><methodResponse><params><param><value><struct><member><name>token</name><value><string>abc123</string></value></member><member><name>status</name><value><string>200 OK</string></value></member><member><name>seconds</name><value><double>0.004</double></value></member></struct></value></param></params></methodResponse>`;

const LOGIN_401 = `<?xml version="1.0" encoding="utf-8"?><methodResponse><params><param><value><struct><member><name>token</name><value><string>abc123</string></value></member><member><name>status</name><value><string>401 Unauthorized</string></value></member></struct></value></param></params></methodResponse>`;

const SEARCH_ROWS = `<?xml version="1.0" encoding="utf-8"?><methodResponse><params><param><value><struct><member><name>status</name><value><string>200 OK</string></value></member><member><name>data</name><value><array><data><value><struct><member><name>SubFileName</name><value><string>Inception.2010.id.srt</string></value></member><member><name>SubDownloadsCnt</name><value><int>82016</int></value></member><member><name>SubFormat</name><value><string>SRT</string></value></member><member><name>SubDownloadLink</name><value><string>https://dl.opensubtitles.org/en/download/src-api/vrf-19c10c5b/sid-vb8r3BYO1FrroTYk9HCAPPrypKb/filead/1952382875.gz</string></value></member></struct></value><value><struct><member><name>SubFileName</name><value><string>Inception.2010.en.srt</string></value></member><member><name>SubDownloadsCnt</name><value><int>10</int></value></member></struct></value></data></array></value></member><member><name>seconds</name><value><double>0.006</double></value></member></struct></value></param></params></methodResponse>`;

// Self-closing <data/> — the empty result shape that crashed the old parser.
const SEARCH_EMPTY = `<?xml version="1.0" encoding="utf-8"?><methodResponse><params><param><value><struct><member><name>status</name><value><string>200 OK</string></value></member><member><name>data</name><value><array><data/></array></value></member><member><name>seconds</name><value><double>0.006</double></value></member></struct></value></param></params></methodResponse>`;

const gz = (text) => gzipSync(new TextEncoder().encode(text));
const asBuffer = (bytes) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

// The plain route serves the original file: for this search row an SRT, gzipped
// with no Content-Encoding header (verified live 2026-10-01). Keeping it SRT
// means the test also proves the SRT→VTT conversion still runs downstream.
const REAL_SRT = '1\n00:00:06,000 --> 00:00:12,074\nDukun itu menyamar\n\n';

// The 104-byte payload OS.org serves on the src-api route for free sessions.
const VIP_STUB = '1\n00:00:00,001 --> 04:00:00,002\nBecome OpenSubtitles.org VIP member \nto get subt\n';

const ENV = {
  R2_ACCOUNT_ID: 'acct', R2_BUCKET_NAME: 'bucket',
  R2_ACCESS_KEY_ID: 'AK', R2_SECRET_ACCESS_KEY: 'SK',
  R2_PUBLIC_URL: 'https://pub.test',
};

// ─── parseXmlRpcResponse ─────────────────────────────────────────────────────

describe('parseXmlRpcResponse', () => {
  it('parses the LogIn struct', () => {
    const v = parseXmlRpcResponse(LOGIN_OK);
    expect(v).toMatchObject({ token: 'abc123', status: '200 OK', seconds: 0.004 });
  });

  it('parses an array of structs from SearchSubtitles', () => {
    const v = parseXmlRpcResponse(SEARCH_ROWS);
    expect(Array.isArray(v.data)).toBe(true);
    expect(v.data).toHaveLength(2);
    expect(v.data[0].SubFileName).toBe('Inception.2010.id.srt');
    expect(v.data[0].SubDownloadsCnt).toBe(82016);
    expect(v.data[0].SubDownloadLink).toContain('dl.opensubtitles.org');
  });

  it('terminates on a self-closing <data/> instead of recursing forever', () => {
    // The old parser called parseXmlValue on the same empty node indefinitely.
    expect(parseXmlRpcResponse(SEARCH_EMPTY)).toMatchObject({ data: [], status: '200 OK' });
  });

  it('returns null for an unparsable body and reports a fault', () => {
    expect(parseXmlRpcResponse('')).toBeNull();
    expect(parseXmlRpcResponse('<html>gateway error</html>')).toBeNull();
    const fault = '<?xml version="1.0"?><methodResponse><fault><value><struct><member><name>faultString</name><value><string>Bad &amp; wrong</string></value></member></struct></value></fault></methodResponse>';
    expect(parseXmlRpcResponse(fault).fault).toBe('Bad & wrong');
  });

  it('decodes XML entities in string values', () => {
    const xml = '<?xml version="1.0"?><methodResponse><params><param><value><struct><member><name>t</name><value><string>a &lt;b&gt; &amp; c</string></value></member></struct></value></param></params></methodResponse>';
    expect(parseXmlRpcResponse(xml).t).toBe('a <b> & c');
  });
});

// ─── Provider: anonymous fallback + VIP-gated download route ─────────────────

describe('OpenSubtitles.org provider', () => {
  let puts;
  let requested;

  beforeEach(() => {
    puts = [];
    requested = [];
    vi.stubGlobal('fetch', vi.fn(async (url, init = {}) => {
      const u = String(url);
      requested.push(u);
      if (u.includes('r2.cloudflarestorage.com')) {
        if (init.method === 'PUT') {
          puts.push({ path: u, body: new TextDecoder().decode(init.body) });
          return { ok: true, json: async () => ({}), text: async () => '' };
        }
        return { ok: false, json: async () => ({}), text: async () => '' };
      }
      if (u.includes('api.opensubtitles.org/xml-rpc')) {
        const body = String(init.body || '');
        if (body.includes('<methodName>LogIn</methodName>')) {
          // Reject configured creds, then accept the anonymous retry.
          return {
            ok: true,
            text: async () => (body.includes('<string>baduser</string>') ? LOGIN_401 : LOGIN_OK),
            json: async () => ({}),
          };
        }
        if (body.includes('<methodName>SearchSubtitles</methodName>')) {
          return { ok: true, text: async () => SEARCH_ROWS, json: async () => ({}) };
        }
        return { ok: true, text: async () => LOGIN_OK, json: async () => ({}) };
      }
      if (u.includes('dl.opensubtitles.org')) {
        // subformat-vtt 500s on the plain route; src-api serves the VIP stub.
        if (u.includes('subformat-vtt')) return { ok: false, status: 500, arrayBuffer: async () => new ArrayBuffer(0), text: async () => '' };
        const bytes = gz(u.includes('/src-api/') ? VIP_STUB : REAL_SRT);
        return { ok: true, arrayBuffer: async () => asBuffer(bytes), text: async () => '' };
      }
      return { ok: false, json: async () => ({}), text: async () => '' };
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  const badCredsEnv = { ...ENV, OPENSUBTITLES_ORG_USERNAME: 'baduser', OPENSUBTITLES_ORG_PASSWORD: 'badpass' };

  it('falls back to an anonymous session when the stored credentials are rejected', async () => {
    const { searchSubtitlesFromProviders } = await import('../src/utils/subtitle.js');
    const { results, diagnostics } = await searchSubtitlesFromProviders(
      badCredsEnv, 'movie', 27205, { lang: 'id', title: 'Inception' },
    );
    const org = diagnostics.find(d => d.provider === 'opensubtitles_org');
    expect(org.status).toBe('ok');
    // The rejection stays visible in diagnostics: the operator can see the
    // stored pair is wrong while the provider keeps working anonymously.
    expect(org.message).toBe('sesi anonim (401 Unauthorized)');
    expect(results.some(r => r.provider === 'opensubtitles_org' && r.fileId.includes('src-api'))).toBe(true);
    const logins = globalThis.fetch.mock.calls
      .filter(([, init]) => String(init?.body || '').includes('<methodName>LogIn</methodName>'));
    // One attempt with the stored pair, one anonymous retry.
    expect(logins).toHaveLength(2);
    expect(String(logins[0][1].body)).toContain('<string>baduser</string>');
  });

  it('contributes with no stored credentials at all (the production state)', async () => {
    const { searchSubtitlesFromProviders } = await import('../src/utils/subtitle.js');
    // No OPENSUBTITLES_ORG_* vars: production never had a usable pair, and the
    // old code gated the whole branch on them, so the provider returned nothing.
    const { results, diagnostics } = await searchSubtitlesFromProviders(
      ENV, 'movie', 27205, { lang: 'id', title: 'Inception', imdbId: 'tt1375666' },
    );
    const org = diagnostics.find(d => d.provider === 'opensubtitles_org');
    expect(org.status).toBe('ok');
    expect(org.message).toBeNull();
    expect(results.filter(r => r.provider === 'opensubtitles_org').length).toBeGreaterThan(0);
    const logins = globalThis.fetch.mock.calls
      .filter(([, init]) => String(init?.body || '').includes('<methodName>LogIn</methodName>'));
    // Exactly one login, straight to the anonymous session.
    expect(logins).toHaveLength(1);
    expect(String(logins[0][1].body)).toContain('<string></string>');
  });

  it('downloads via the plain route and inflates the raw gzip body', async () => {
    const res = await downloadSubtitleByProvider(
      badCredsEnv, 'opensubtitles_org',
      'https://dl.opensubtitles.org/en/download/src-api/vrf-abc/sid-def/filead/123.gz',
      'movie', 27205, 'id', { title: 'Inception' },
    );
    expect(res).toMatchObject({ lang: 'id', format: 'vtt' });
    const dlUrl = requested.find(u => u.includes('dl.opensubtitles.org'));
    // The src-api/vrf/sid route serves the VIP advertisement, never the file,
    // and /subformat-vtt/ 500s on the plain route.
    expect(dlUrl).not.toContain('/src-api/');
    expect(dlUrl).not.toContain('subformat-vtt');
    const stored = puts.find(p => p.path.includes('/subtitles/movie/27205/id.vtt'));
    expect(stored.body).toContain('WEBVTT');
    expect(stored.body).not.toContain('VIP member');
    // SRT comma timestamps must have been rewritten to VTT dots.
    expect(stored.body).toMatch(/00:00:06\.000 --> 00:00:12\.074/);
  });
});