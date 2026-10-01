/**
 * Subtitle Service — Multi-provider
 *
 * Providers (tried in order until one succeeds):
 *   1. opensubtitles_com  — REST API v1, needs apiKey + username + password
 *   2. subdl              — REST API, needs apiKey only
 *   3. subtitlecat        — scraped, keyed on the title
 *   4. ai_translate       — machine translation into Indonesian
 *
 * Credentials stored in R2: settings/subtitle-providers.json
 * Subtitles cached in R2 as WebVTT files.
 */

import { unzipSync, strFromU8 } from 'fflate';
import { translateSrtToIndonesian } from './ai-translate.js';
// subtitle-providers.js is a leaf (no imports) — pulling rankSubtitles here
// creates no cycle and keeps scoring in one place.
import { rankSubtitles } from './subtitle-providers.js';
// Language display names live in one place; subtitle-constants.js imports
// nothing, so pulling LANG_LABELS here cannot create a cycle.
import { LANG_LABELS } from './subtitle-constants.js';

// ─── Language maps ────────────────────────────────────────────────────────────

// app locale → ISO 639-1 (OS.com / Subdl)
const LANG_MAP = { id: 'id', en: 'en', es: 'es', pt: 'pt', hi: 'hi', ja: 'ja', ko: 'ko' };
// app locale → ISO 639-2 (Subdl / legacy provider codes)
const LANG_MAP_3 = { id: 'ind', en: 'eng', es: 'spa', pt: 'por', hi: 'hin', ja: 'jpn', ko: 'kor' };
const LANG_NAMES = LANG_LABELS;

/**
 * Language vocabularies differ per provider: OpenSubtitles.com answers ISO
 * 639-1 plus regional variants (zh-cn, pt-br), Subdl answers ISO codes for its
 * own uploads but English names ("Turkish", "Chinese", "Albanian") for its
 * Subscene legacy archive. Taking the first two characters of a name produced
 * fake codes ("tu", "ch", "al") that then surfaced as unmapped filter chips in
 * the subtitle picker, so names are resolved here. Table mirrors the published
 * OpenSubtitles.com language list.
 */
const LANG_NAME_TO_CODE = {
  abkhazian: 'ab', afrikaans: 'af', albanian: 'sq', amharic: 'am', arabic: 'ar',
  aragonese: 'an', armenian: 'hy', assamese: 'as', asturian: 'at', azerbaijani: 'az',
  basque: 'eu', belarusian: 'be', bengali: 'bn', bosnian: 'bs', breton: 'br',
  bulgarian: 'bg', burmese: 'my', catalan: 'ca', chinese: 'zh', croatian: 'hr',
  czech: 'cs', danish: 'da', dari: 'pr', dutch: 'nl', english: 'en',
  esperanto: 'eo', estonian: 'et', extremaduran: 'ex', finnish: 'fi', french: 'fr',
  gaelic: 'gd', galician: 'gl', georgian: 'ka', german: 'de', greek: 'el',
  hebrew: 'he', hindi: 'hi', hungarian: 'hu', icelandic: 'is', igbo: 'ig',
  indonesian: 'id', interlingua: 'ia', irish: 'ga', italian: 'it', japanese: 'ja',
  kannada: 'kn', kazakh: 'kk', khmer: 'km', korean: 'ko', kurdish: 'ku',
  latvian: 'lv', lithuanian: 'lt', luxembourgish: 'lb', macedonian: 'mk', malay: 'ms',
  malayalam: 'ml', manipuri: 'ma', marathi: 'mr', mongolian: 'mn', montenegrin: 'me',
  navajo: 'nv', nepali: 'ne', norwegian: 'no', occitan: 'oc', odia: 'or',
  persian: 'fa', polish: 'pl', portuguese: 'pt', pushto: 'ps', romanian: 'ro',
  russian: 'ru', santali: 'sx', serbian: 'sr', sindhi: 'sd', sinhalese: 'si',
  slovak: 'sk', slovenian: 'sl', somali: 'so', spanish: 'es', swahili: 'sw',
  swedish: 'sv', syriac: 'sy', tagalog: 'tl', tamil: 'ta', tatar: 'tt',
  telugu: 'te', thai: 'th', turkish: 'tr', turkmen: 'tk', ukrainian: 'uk',
  urdu: 'ur', uzbek: 'uz', vietnamese: 'vi', welsh: 'cy',
};

function normalizeLang(raw) {
  if (!raw) return null;
  let s = String(raw).trim().toLowerCase();
  // Regional variants collapse to their base language: zh-cn → zh, pt-br → pt.
  if (s.includes('-')) s = s.split('-')[0];
  // Names may carry a qualifier: "chinese (simplified)".
  const bare = s.replace(/\s*\(.*$/, '').trim();
  // Direct match
  if (LANG_MAP[s]) return s;
  // Provider language names
  if (LANG_NAME_TO_CODE[bare]) return LANG_NAME_TO_CODE[bare];
  // Qualifiers arrive loose as well as parenthesised: "Chinese Traditional",
  // "Portuguese Brazil". The leading word carries the language.
  const head = bare.split(/\s+/)[0];
  if (LANG_NAME_TO_CODE[head]) return LANG_NAME_TO_CODE[head];
  // Subdl's legacy archive tags some rows with two letters that are not ISO
  // 639-1 (Chinese ships as CH, Turkish as TU, Albanian as AL), and those
  // reached the picker as unmapped chips. Its own catalogue lists them under
  // these languages.
  const LEGACY_CODES = { ch: 'zh', tu: 'tr', al: 'sq' };
  if (LEGACY_CODES[s]) return LEGACY_CODES[s];
  // ISO 639-2 match
  const by639_2 = Object.entries(LANG_MAP_3).find(([, v]) => v === s);
  if (by639_2) return by639_2[0];
  // Full name match
  const byName = Object.entries(LANG_NAMES).find(([, v]) => v.toLowerCase() === bare);
  if (byName) return byName[0];
  // Partial matches
  if (s.startsWith('ind') || s.includes('indonesi')) return 'id';
  if (s.startsWith('eng') || s.includes('english')) return 'en';
  if (s.startsWith('spa') || s.includes('spanish') || s.includes('español')) return 'es';
  if (s.startsWith('por') || s.includes('portugu')) return 'pt';
  if (s.startsWith('hin') || s.includes('hindi')) return 'hi';
  if (s.startsWith('jpn') || s.includes('japanese') || s.includes('日本')) return 'ja';
  if (s.startsWith('kor') || s.includes('korean') || s.includes('한국')) return 'ko';
  // Try 2-letter match again
  if (s.length === 2 && LANG_MAP[s]) return s;
  return s.slice(0, 2); // fallback: take first 2 chars
}

/**
 * Detect language from subtitle filename/release name.
 * Many subtitles embed language info like: Movie.2024.Indonesian.srt, Movie.srt Indonesian, etc.
 */
function detectLangFromFilename(filename) {
  if (!filename) return null;
  const lower = filename.toLowerCase();
  // Check for known language keywords in filename
  const langPatterns = [
    ['id', /indonesi|\bid\b|bahasa/],
    ['en', /\beng(lish)?\b|\ben\b/],
    ['es', /\bespañ?ol\b|\besp\b|\bes\b/],
    ['pt', /portugu[eê]s|\bpt\b|\bpor\b/],
    ['hi', /\bhindi\b|\bhin\b/],
    ['ja', /\bjapanese?\b|\bjpn?\b|日本語/],
    ['ko', /\bkorean?\b|\bkor?\b|한국어/],
  ];
  for (const [code, pattern] of langPatterns) {
    if (pattern.test(lower)) return code;
  }
  return null;
}

// ─── AWS SigV4 signing ────────────────────────────────────────────────────────

async function sha256Hex(data) {
  const hash = await crypto.subtle.digest('SHA-256', typeof data === 'string' ? new TextEncoder().encode(data) : data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmac(key, data) {
  const k = await crypto.subtle.importKey('raw', typeof key === 'string' ? new TextEncoder().encode(key) : key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, typeof data === 'string' ? new TextEncoder().encode(data) : data);
}

function toHex(buf) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getSignatureKey(key, dateStamp, region, service) {
  return hmac(await hmac(await hmac(await hmac('AWS4' + key, dateStamp), region), service), 'aws4_request');
}

export async function signS3(method, path, headers, body, accessKeyId, secretAccessKey, region, service, dateStr) {
  const payloadHash = await sha256Hex(body || '');
  // dateStr can be YYYYMMDD or full ISO — extract both forms
  const dateOnly = dateStr.length > 8 ? dateStr.slice(0, 8) : dateStr;
  const dateTime = dateStr.length > 8 ? dateStr.replace(/[-:]/g, '').slice(0, 15) + 'Z' : dateStr + 'T000000Z';
  const allHeaders = { ...headers, 'x-amz-content-sha256': payloadHash, 'x-amz-date': dateTime };
  const host = path.startsWith('http') ? new URL(path).host : (headers.host || '');
  if (host) allHeaders.host = host;
  const canonicalUri = path.startsWith('http') ? new URL(path).pathname : path.split('?')[0];
  const canonicalQS = path.includes('?') ? path.split('?')[1] : '';
  const sortedKeys = Object.keys(allHeaders).sort();
  const canonicalHeaders = sortedKeys.map(k => `${k.toLowerCase()}:${allHeaders[k]}\n`).join('');
  const signedHeaders = sortedKeys.map(k => k.toLowerCase()).join(';');
  const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQS}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const credentialScope = `${dateOnly}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${dateTime}\n${credentialScope}\n${await sha256Hex(canonicalRequest)}`;
  const signature = toHex(await hmac(await getSignatureKey(secretAccessKey, dateOnly, region, service), stringToSign));
  return {
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    payloadHash,
  };
}

// ─── TMDB helper ──────────────────────────────────────────────────────────────
//
// TMDB accepts two credential kinds: a v4 read access token through the
// `Authorization: Bearer` header, and a v3 API key through the `api_key` query
// parameter. The deployment carries a v3 key, so the Bearer-only lookups all
// answered 401 and silently degraded — the TV season list, SubtitleCat's title
// fallback, the download-path metadata, and the imdb_id lookup. Sending the key both
// ways satisfies either kind; TMDB ignores the one that does not apply.
export function tmdbFetch(apiKey, path, queryParams = {}) {
  const params = new URLSearchParams({ api_key: apiKey, language: 'en-US', ...queryParams });
  return fetch(`https://api.themoviedb.org/3${path}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${apiKey}`, 'User-Agent': 'HIJISTREAM/1.0' },
  });
}

// ─── R2 helpers ───────────────────────────────────────────────────────────────

export function getR2PublicUrl(env, key) {
  return `${env.R2_PUBLIC_URL.replace(/\/+$/, '')}/${key}`;
}

export async function r2PutObject(env, key, body, contentType) {
  const now = new Date();
  const dateStr = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const dateOnly = dateStr.slice(0, 8);
  const endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const path = `/${env.R2_BUCKET_NAME}/${key}`;
  const bodyBytes = typeof body === 'string' ? new TextEncoder().encode(body) : body;
  const { authorization, payloadHash } = await signS3('PUT', path, { 'content-type': contentType, 'content-length': String(bodyBytes.byteLength || bodyBytes.length), host: new URL(endpoint).host }, bodyBytes, env.R2_ACCESS_KEY_ID, env.R2_SECRET_ACCESS_KEY, 'auto', 's3', dateStr);
  const res = await fetch(`${endpoint}${path}`, {
    method: 'PUT',
    headers: { Authorization: authorization, 'x-amz-content-sha256': payloadHash, 'x-amz-date': dateStr, 'content-type': contentType, 'content-length': String(bodyBytes.byteLength || bodyBytes.length) },
    body: bodyBytes,
  });
  return res.ok;
}

export async function deleteSubtitleFile(env, key) {
  const dateStr = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const path = `/${env.R2_BUCKET_NAME}/${key}`;
  const { authorization, payloadHash } = await signS3('DELETE', path, { host: new URL(endpoint).host }, null, env.R2_ACCESS_KEY_ID, env.R2_SECRET_ACCESS_KEY, 'auto', 's3', dateStr);
  const res = await fetch(`${endpoint}${path}`, { method: 'DELETE', headers: { Authorization: authorization, 'x-amz-content-sha256': payloadHash, 'x-amz-date': dateStr } });
  return res.ok || res.status === 204;
}

// ─── SRT → VTT conversion ────────────────────────────────────────────────────

export function srtToVtt(srt) {
  if (!srt || !srt.trim()) return '';
  let vtt = srt.replace(/^\uFEFF/, '').replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  if (!vtt.startsWith('WEBVTT')) vtt = 'WEBVTT\n\n' + vtt;
  return vtt;
}

// ─── R2 key helpers ───────────────────────────────────────────────────────────

function getSubtitleKey(type, id, lang, season, episode) {
  return type === 'tv' && season !== undefined && episode !== undefined
    ? `subtitles/tv/${id}/${season}/${episode}/${lang}.vtt`
    : `subtitles/movie/${id}/${lang}.vtt`;
}

function generateId(type, tmdbId, lang, season, episode) {
  const base = `${type}_${tmdbId}_${lang}`;
  return type === 'tv' && season !== undefined ? `${base}_s${season}e${episode}` : base;
}

// ─── Metadata (R2 JSON) ───────────────────────────────────────────────────────

const METADATA_KEY = 'subtitles/metadata.json';

export async function readMetadata(env) {
  try {
    const data = await r2GetObject(env, METADATA_KEY);
    if (!data) return { version: 1, updatedAt: null, subtitleCount: 0, subtitles: [] };
    return JSON.parse(data);
  } catch { return { version: 1, updatedAt: null, subtitleCount: 0, subtitles: [] }; }
}

export async function writeMetadata(env, metadata) {
  metadata.updatedAt = new Date().toISOString();
  metadata.subtitleCount = metadata.subtitles?.length || 0;
  return r2PutObject(env, METADATA_KEY, JSON.stringify(metadata, null, 2), 'application/json; charset=utf-8');
}

export async function addToMetadata(env, entry) {
  try {
    const metadata = await readMetadata(env);
    const idx = metadata.subtitles.findIndex(s => s.id === entry.id);
    if (idx >= 0) metadata.subtitles[idx] = { ...metadata.subtitles[idx], ...entry };
    else metadata.subtitles.push(entry);
    return writeMetadata(env, metadata);
  } catch (err) { console.error('[Metadata] addToMetadata failed:', err.message); return false; }
}

export async function removeFromMetadata(env, id) {
  try {
    const metadata = await readMetadata(env);
    metadata.subtitles = metadata.subtitles.filter(s => s.id !== id);
    return writeMetadata(env, metadata);
  } catch (err) { console.error('[Metadata] removeFromMetadata failed:', err.message); return false; }
}

export async function updateMetadataEntry(env, id, updates) {
  const metadata = await readMetadata(env);
  const idx = metadata.subtitles.findIndex(s => s.id === id);
  if (idx === -1) return false;
  metadata.subtitles[idx] = { ...metadata.subtitles[idx], ...updates };
  return writeMetadata(env, metadata);
}

// ─── Provider settings (R2) ───────────────────────────────────────────────────

export const PROVIDERS_SETTINGS_KEY = 'settings/subtitle-providers.json';

export async function readProviderSettings(env) {
  try {
    const data = await r2GetObject(env, PROVIDERS_SETTINGS_KEY);
    if (!data) return {};
    return JSON.parse(data);
  } catch { return {}; }
}

async function r2GetObject(env, key) {
  const dateStr = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const path = `/${env.R2_BUCKET_NAME}/${key}`;
  const { authorization, payloadHash } = await signS3('GET', path, { host: new URL(endpoint).host }, null, env.R2_ACCESS_KEY_ID, env.R2_SECRET_ACCESS_KEY, 'auto', 's3', dateStr);
  const res = await fetch(`${endpoint}${path}`, {
    headers: { Authorization: authorization, 'x-amz-content-sha256': payloadHash, 'x-amz-date': dateStr },
  });
  if (!res.ok) return null;
  return res.text();
}

export async function writeProviderSettings(env, settings) {
  return r2PutObject(env, PROVIDERS_SETTINGS_KEY, JSON.stringify(settings, null, 2), 'application/json; charset=utf-8');
}

/**
 * Resolve effective credentials for all providers.
 * Priority: env vars > stored R2 settings.
 */
export async function resolveProviderCredentials(env) {
  let stored = {};
  if (env.R2_PUBLIC_URL) {
    stored = await readProviderSettings(env).catch(() => ({}));
  }

  return {
    opensubtitles_com: {
      apiKey: env.OPENSUBTITLES_API_KEY || stored.opensubtitles_com?.apiKey || '',
      username: env.OPENSUBTITLES_USERNAME || stored.opensubtitles_com?.username || '',
      password: env.OPENSUBTITLES_PASSWORD || stored.opensubtitles_com?.password || '',
    },
    subdl: {
      apiKey: env.SUBDL_API_KEY || stored.subdl?.apiKey || '',
    },
    subtitlecat: {},
    ai_translate: {
      baseUrl: env.AXONROUTER_BASE_URL || env.AI_TRANSLATE_BASE_URL || stored.ai_translate?.baseUrl || '',
      apiKey: env.AXONROUTER_API_KEY || env.AI_TRANSLATE_API_KEY || stored.ai_translate?.apiKey || '',
      model: env.AXONROUTER_MODEL || env.AI_TRANSLATE_MODEL || stored.ai_translate?.model || 'auto/writing',
      enabled: env.AI_TRANSLATE_ENABLED !== 'false' && stored.ai_translate?.enabled !== false,
    },
  };
}

// ─── Provider: OpenSubtitles.com (REST v1) ────────────────────────────────────

const OS_COM_BASE = 'https://api.opensubtitles.com/api/v1';

/** Best-effort one-line message from a provider JSON error body. */
async function readApiError(res, prefix) {
  let detail = '';
  try {
    const data = await res.json();
    detail = data?.message || (Array.isArray(data?.errors) ? data.errors.join('; ') : '') || '';
  } catch { /* non-JSON body */ }
  return detail ? `${prefix}: ${detail}` : `${prefix}: HTTP ${res.status}`;
}

async function osComLogin(creds) {
  const res = await fetch(`${OS_COM_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Api-Key': creds.apiKey, 'User-Agent': 'HIJISTREAM/1.0' },
    body: JSON.stringify({ username: creds.username, password: creds.password }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.token) return null;
  // Free-tier quota lives on the login payload (`user.allowed_downloads`);
  // surface it in logs so operators see the budget before downloads start failing.
  const quota = typeof data.user?.allowed_downloads === 'number' ? data.user.allowed_downloads : null;
  if (quota !== null) console.log(`[Subtitle] OS.com kuota: ${quota} unduhan tersisa`);
  return { token: data.token, quota };
}

async function osComSearch(creds, token, tmdbId, type, lang, season, episode) {
  const params = new URLSearchParams({ tmdb_id: String(tmdbId), type: type === 'tv' ? 'episode' : 'movie', languages: LANG_MAP[lang] || lang });
  if (season !== undefined) params.set('season_number', String(season));
  if (episode !== undefined) params.set('episode_number', String(episode));
  const res = await fetch(`${OS_COM_BASE}/subtitles?${params}`, {
    headers: { 'Api-Key': creds.apiKey, Authorization: `Bearer ${token}`, 'User-Agent': 'HIJISTREAM/1.0' },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

async function osComDownload(creds, token, fileId) {
  const res = await fetch(`${OS_COM_BASE}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Api-Key': creds.apiKey, Authorization: `Bearer ${token}`, 'User-Agent': 'HIJISTREAM/1.0' },
    body: JSON.stringify({ file_id: fileId }),
  });
  // 406 here carries the documented free-tier quota message ("You have
  // downloaded your allowed 20 subtitles for 24h"); surfacing it beats a
  // generic "Download failed" that hides the real cause from the user.
  if (!res.ok) throw new Error(await readApiError(res, 'OpenSubtitles.com menolak unduhan'));
  const data = await res.json();
  if (!data.link) throw new Error('OpenSubtitles.com tidak mengembalikan tautan unduhan');
  const fileRes = await fetch(data.link);
  if (!fileRes.ok) throw new Error(`OpenSubtitles.com tautan unduhan gagal: HTTP ${fileRes.status}`);
  return fileRes.text();
}

async function fetchFromOsCom(creds, tmdbId, type, lang, season, episode, imdbId) {
  if (!creds.apiKey || !creds.username || !creds.password) return null;
  const login = await osComLogin(creds);
  if (!login) return null;

  let subs = await osComSearch(creds, login.token, tmdbId, type, lang, season, episode);

  // Fallback: search by IMDB ID
  if (!subs.length && imdbId) {
    const params = new URLSearchParams({ imdb_id: imdbId.replace(/^tt/, ''), type: type === 'tv' ? 'episode' : 'movie', languages: LANG_MAP[lang] || lang });
    if (season !== undefined) params.set('season_number', String(season));
    if (episode !== undefined) params.set('episode_number', String(episode));
    const res = await fetch(`${OS_COM_BASE}/subtitles?${params}`, {
      headers: { 'Api-Key': creds.apiKey, Authorization: `Bearer ${login.token}`, 'User-Agent': 'HIJISTREAM/1.0' },
    });
    if (res.ok) subs = (await res.json()).data || [];
  }

  if (!subs.length) return null;
  const best = subs.sort((a, b) => (b.attributes?.download_count || 0) - (a.attributes?.download_count || 0))[0];
  const fileId = best?.attributes?.files?.[0]?.file_id;
  if (!fileId) return null;
  const content = await osComDownload(creds, login.token, fileId);
  return content ? { content, source: 'opensubtitles_com' } : null;
}

// ─── Provider: Subdl ─────────────────────────────────────────────────────────

const SUBDL_BASE = 'https://api.subdl.com/api/v1';

async function fetchFromSubdl(creds, tmdbId, type, lang, season, episode) {
  if (!creds.apiKey) return null;

  const langCode = (LANG_MAP[lang] || lang).toUpperCase();
  const params = new URLSearchParams({ api_key: creds.apiKey, tmdb_id: String(tmdbId), type, languages: langCode });
  if (type === 'tv') {
    if (season !== undefined) params.set('season_number', String(season));
    if (episode !== undefined) params.set('episode_number', String(episode));
  }

  const res = await fetch(`${SUBDL_BASE}/subtitles?${params}`, { headers: { 'User-Agent': 'HIJISTREAM/1.0' } });
  if (!res.ok) return null;
  const data = await res.json();
  const subtitles = data.subtitles || [];
  if (!subtitles.length) return null;

  const best = subtitles[0];
  const dlUrl = `https://dl.subdl.com${best.url}`;
  const dlRes = await fetch(dlUrl, { headers: { 'User-Agent': 'HIJISTREAM/1.0' } });
  if (!dlRes.ok) return null;

  // Subdl returns zip files — extract the first .srt/.vtt inside
  const blob = await dlRes.arrayBuffer();
  const content = await extractSubtitleFromZip(blob);
  return content ? { content, source: 'subdl' } : null;
}

// ─── Provider: SubtitleCat (Free, Movie & TV, direct .srt) ─────────────────
const SUBTITLECAT_BASE = 'https://www.subtitlecat.com';

async function fetchFromSubtitleCat(tmdbId, type, lang, season, episode, title) {
  if (!title) return null;
  const want = lang.toLowerCase() === 'in' ? 'id' : lang.toLowerCase();
  try {
    let query = title;
    if (type === 'tv') {
      const s = String(season || 1).padStart(2, '0');
      const e = String(episode || 1).padStart(2, '0');
      query = `${title} S${s}E${e}`;
    }
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 15000) : null;
    const searchRes = await fetch(`${SUBTITLECAT_BASE}/index.php?search=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
      signal: controller?.signal,
    });
    clearTimeout(timer);
    if (!searchRes.ok) return null;
    const html = await searchRes.text();
    const detailMatches = Array.from(html.matchAll(/href="(subs\/\d+\/[^"]+\.html)"/g)).map(m => m[1]);
    if (detailMatches.length === 0) return null;

    const fileRe = new RegExp(`href="(/subs/\\d+/[^"]+-${want}\\.srt)"`, 'i');
    for (const detailPath of detailMatches.slice(0, 5)) {
      try {
        const dRes = await fetch(`${SUBTITLECAT_BASE}/${detailPath}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          },
        });
        if (!dRes.ok) continue;
        const dHtml = await dRes.text();
        const fMatch = dHtml.match(fileRe);
        if (fMatch) {
          const srtUrl = `${SUBTITLECAT_BASE}${fMatch[1]}`;
          const srtRes = await fetch(srtUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            },
          });
          if (srtRes.ok) {
            const srtText = await srtRes.text();
            if (srtText && srtText.includes('-->')) {
              return { content: srtText, source: 'subtitlecat' };
            }
          }
        }
      } catch { /* continue */ }
    }
    return null;
  } catch { return null; }
}

/**
 * Extract subtitle files from a ZIP archive (pure-JS inflate via fflate).
 * DecompressionStream is absent in the Vercel Edge runtime, so hand-rolled
 * "deflate-raw" decoding silently failed there. Returns {filename, content}[].
 */
export function extractSubtitlesFromZip(buffer) {
  const MAX_SIZE = 4 * 1024 * 1024;
  let archive;
  try {
    archive = unzipSync(new Uint8Array(buffer));
  } catch (err) {
    // Previously silent: the caller then returned null and the route answered a
    // generic error with no trace of the real cause.
    console.error('[Subtitle] ZIP inflate failed:', err.message);
    return [];
  }

  const entries = [];
  for (const [filename, data] of Object.entries(archive)) {
    if (!/\.(srt|vtt|ass|ssa)$/i.test(filename)) continue;
    if (data.length > MAX_SIZE) continue;
    const content = strFromU8(data);
    if (content.includes('-->')) entries.push({ filename, content });
  }
  return entries;
}

/** Extract the first subtitle file from a ZIP archive, or null. */
export function extractSubtitleFromZip(buffer) {
  const entries = extractSubtitlesFromZip(buffer);
  return entries.length > 0 ? entries[0].content : null;
}

/**
 * Extract ALL subtitle files from a ZIP archive.
 * Returns array of { filename, content } for each .srt/.vtt/.ass/.ssa file found.
 */
async function extractAllSubtitlesFromZip(buffer) {
  return extractSubtitlesFromZip(buffer);
}

/**
 * Guess season/episode numbers from a subtitle filename.
 * Supports patterns like: S01E05, s01e05, 1x05, - 1x05, E05, ep05, etc.
 */
function guessSeasonEpisode(filename) {
  const clean = filename.replace(/[\/_]/g, ' ');
  // Pattern: S01E05 or s01e05
  let m = clean.match(/[Ss](\d{1,2})[Ee](\d{1,3})/);
  if (m) return { season: parseInt(m[1], 10), episode: parseInt(m[2], 10) };
  // Pattern: 1x05 or 1X05
  m = clean.match(/(\d{1,2})[xX](\d{1,3})/);
  if (m) return { season: parseInt(m[1], 10), episode: parseInt(m[2], 10) };
  // Pattern: - 1x05 or .1x05.
  m = clean.match(/[\s.-](\d{1,2})[xX](\d{1,3})/);
  if (m) return { season: parseInt(m[1], 10), episode: parseInt(m[2], 10) };
  // Pattern: EP05 or ep05 (no season)
  m = clean.match(/[Ee][Pp]?(\d{1,3})/);
  if (m) return { season: 1, episode: parseInt(m[1], 10) };
  // Pattern: just a number like "05" or "5"
  m = clean.match(/(?:^|[\s.-])(\d{1,3})(?:[\s.-]|$)/);
  if (m) return { season: 1, episode: parseInt(m[1], 10) };
  return null;
}

/**
 * Download subtitles from a ZIP URL, extracting all entries and mapping to episodes.
 * Returns array of { season, episode, lang, content, filename }.
 */
async function downloadAndExtractZip(url, lang) {
  const res = await fetch(url, { headers: { 'User-Agent': 'HIJISTREAM/1.0' } });
  if (!res.ok) return [];
  const blob = await res.arrayBuffer();
  const entries = await extractAllSubtitlesFromZip(blob);
  const results = [];
  for (const entry of entries) {
    const guessed = guessSeasonEpisode(entry.filename);
    results.push({
      season: guessed?.season || 1,
      episode: guessed?.episode || 1,
      lang,
      content: entry.content,
      filename: entry.filename,
    });
  }
  return results;
}

// ─── Bulk Download ───────────────────────────────────────────────────────────

/**
 * Progress callback type.
 * @typedef {(progress: { phase: string, current: number, total: number, message: string }) => void} ProgressFn
 */

/**
 * Bulk download subtitles for a movie or TV series.
 *
 * For movies: downloads each language from providers.
 * For TV: fetches seasons/episodes from TMDB, then downloads per-episode or from ZIP packages.
 *
 * @param {object} env - Worker env with R2 + TMDB + provider credentials
 * @param {'movie'|'tv'} type
 * @param {string|number} tmdbId
 * @param {object} options
 * @param {string[]} options.languages - e.g. ['id', 'en']
 * @param {number} [options.seasons] - specific seasons to download (TV only)
 * @param {string} [options.imdbId]
 * @param {string} [options.title]
 * @param {number|string} [options.year] - release year, used for OS.org movie lookups
 * @param {ProgressFn} [options.onProgress]
 * @returns {Promise<{ total, success, fail, skipped, results }>
 */
export async function bulkDownloadSubtitles(env, type, tmdbId, options = {}) {
  const { languages = ['id', 'en'], imdbId, title, year, onProgress } = options;
  let seasonFilter = options.seasonFilter; // array of season numbers, or null = all
  const report = (phase, current, total, message) => {
    if (onProgress) onProgress({ phase, current, total, message });
  };

  const results = [];
  let success = 0, fail = 0, skipped = 0;

  // ── MOVIE ──
  if (type === 'movie') {
    report('movie', 0, languages.length, `Downloading ${languages.length} languages...`);
    for (let i = 0; i < languages.length; i++) {
      const lang = languages[i];
      report('movie', i, languages.length, `Movie · ${LANG_NAMES[lang] || lang}`);
      try {
        const existing = await getOrFetchSubtitle(env, type, tmdbId, lang, { imdbId, title });
        if (existing) {
          results.push({ lang, success: true, url: existing.url, cached: existing.cached });
          success++;
        } else {
          results.push({ lang, success: false, message: 'Not found' });
          fail++;
        }
      } catch (err) {
        results.push({ lang, success: false, message: err.message });
        fail++;
      }
    }
    report('done', languages.length, languages.length, `Done: ${success} ok, ${fail} fail`);
    return { total: languages.length, success, fail, skipped: 0, results };
  }

  // ── TV SERIES ──
  // 1. Fetch season data from TMDB
  report('seasons', 0, 1, 'Fetching seasons from TMDB...');
  let seasons = [];
  try {
    const tmdbKey = env.TMDB_API_KEY;
    if (!tmdbKey) throw new Error('TMDB_API_KEY tidak dikonfigurasi di environment');
    const tvRes = await tmdbFetch(tmdbKey, `/tv/${tmdbId}`);
    if (!tvRes.ok) {
      let detail = '';
      try { const errBody = await tvRes.json(); detail = errBody.status_message || JSON.stringify(errBody); } catch { detail = await tvRes.text().catch(() => ''); }
      throw new Error(`TMDB API error ${tvRes.status}: ${detail || tvRes.statusText}`);
    }
    const tvData = await tvRes.json();
    if (!tvData.seasons || tvData.seasons.length === 0) {
      throw new Error(`TMDB mengembalikan 0 season untuk ID ${tmdbId}. Pastikan ID benar dan bukan movie.`);
    }
    seasons = (tvData.seasons || [])
      .filter(s => s.season_number > 0) // skip specials
      .map(s => ({ number: s.season_number, episodeCount: s.episode_count || 0, name: s.name }));
    if (seasonFilter && seasonFilter.length > 0) {
      seasons = seasons.filter(s => seasonFilter.includes(s.number));
    }
  } catch (err) {
    report('error', 0, 0, `Failed to fetch seasons: ${err.message}`);
    return { total: 0, success: 0, fail: 0, skipped: 0, results: [], error: err.message };
  }

  if (seasons.length === 0) {
    report('done', 0, 0, 'No seasons found');
    return { total: 0, success: 0, fail: 0, skipped: 0, results: [] };
  }

  const totalEpisodes = seasons.reduce((sum, s) => sum + s.episodeCount, 0);
  report('seasons', 0, seasons.length, `${seasons.length} seasons, ~${totalEpisodes} episodes`);

  // 2. For each language, try to find bulk ZIP packages first
  const allJobs = []; // { season, episode, lang }
  for (const lang of languages) {
    for (const season of seasons) {
      for (let ep = 1; ep <= season.episodeCount; ep++) {
        allJobs.push({ season: season.number, episode: ep, lang });
      }
    }
  }

  // 3. Try to find ZIP packages from providers (Subdl often has full-season ZIPs)
  report('searching', 0, allJobs.length, 'Searching providers for bulk packages...');
  const creds = await resolveProviderCredentials(env);
  const seasonCache = {}; // key: `${lang}_s${season}` → ZIP results
  let jobsRemaining = [...allJobs];

  for (const lang of languages) {
    for (const season of seasons) {
      const cacheKey = `${lang}_s${season.number}`;
      if (seasonCache[cacheKey] !== undefined) continue;

      // Try Subdl first (known for full-season ZIPs)
      if (creds.subdl.apiKey) {
        try {
          const langCode = (LANG_MAP[lang] || lang).toUpperCase();
          const params = new URLSearchParams({
            api_key: creds.subdl.apiKey,
            tmdb_id: String(tmdbId),
            type: 'tv',
            languages: langCode,
            season_number: String(season.number),
          });
          const res = await fetch(`${SUBDL_BASE}/subtitles?${params}`, { headers: { 'User-Agent': 'HIJISTREAM/1.0' } });
          if (res.ok) {
            const data = await res.json();
            const subs = data.subtitles || [];
            // Check if any subtitle covers multiple episodes (ZIP package)
            for (const sub of subs) {
              const dlUrl = `https://dl.subdl.com${sub.url}`;
              // Download and try to extract all episodes from this ZIP
              const extracted = await downloadAndExtractZip(dlUrl, lang);
              if (extracted.length > 1) {
                // This is a bulk package!
                seasonCache[cacheKey] = extracted;
                // Remove jobs that are covered by this package
                jobsRemaining = jobsRemaining.filter(j => {
                  if (j.lang !== lang || j.season !== season.number) return true;
                  return !extracted.some(e => e.episode === j.episode);
                });
                report('bulk', 0, 0, `Bulk package found: S${season.number} ${LANG_NAMES[lang]} (${extracted.length} episodes)`);
                break;
              }
            }
          }
        } catch { /* skip */ }
      }
      if (!seasonCache[cacheKey]) seasonCache[cacheKey] = null;
    }
  }

  // 4. Save bulk ZIP results to R2
  for (const [cacheKey, extracted] of Object.entries(seasonCache)) {
    if (!extracted || extracted.length === 0) continue;
    const [lang, sPart] = cacheKey.split('_');
    const seasonNum = parseInt(sPart.replace('s', ''), 10);
    for (const entry of extracted) {
      const vttContent = entry.content.startsWith('WEBVTT') ? entry.content : srtToVtt(entry.content);
      if (!vttContent?.trim()) { skipped++; continue; }
      const key = getSubtitleKey('tv', tmdbId, lang, seasonNum, entry.episode);
      const publicUrl = getR2PublicUrl(env, key);
      const uploaded = await r2PutObject(env, key, vttContent, 'text/vtt; charset=utf-8');
      if (uploaded) {
        const entryMeta = {
          id: generateId('tv', tmdbId, lang, seasonNum, entry.episode),
          type: 'tv', tmdbId: Number(tmdbId), imdbId: imdbId || null, title: title || null,
          lang, langName: LANG_NAMES[lang] || lang, key, url: publicUrl, format: 'vtt',
          season: seasonNum, episode: entry.episode,
          downloadedAt: new Date().toISOString(), source: 'subdl',
          bulkPackage: true, bulkFilename: entry.filename,
        };
        await addToMetadata(env, entryMeta).catch(() => {});
        results.push({ season: seasonNum, episode: entry.episode, lang, success: true, url: publicUrl, bulk: true });
        success++;
      }
    }
  }

  // 5. Pre-check provider availability before downloading
  const providerStatus = {};
  try {
    const creds = await resolveProviderCredentials(env);
    providerStatus.opensubtitles_com = !!(creds.opensubtitles_com.apiKey && creds.opensubtitles_com.username && creds.opensubtitles_com.password);
    providerStatus.subdl = !!creds.subdl.apiKey;
    providerStatus.subtitlecat = true;
  } catch {}
  const activeProviders = Object.entries(providerStatus).filter(([, v]) => v).map(([k]) => k);
  if (activeProviders.length === 0) {
    const msg = 'Tidak ada provider subtitle yang dikonfigurasi. Siapkan kredensial di Settings.';
    report('error', 0, 0, msg);
    return { total: 0, success: 0, fail: 0, skipped: 0, results: [], error: msg };
  }

  // 6. Download remaining individual episodes from providers
  const total = jobsRemaining.length;
  report('downloading', 0, total, `Downloading ${total} individual subtitles dari ${activeProviders.length} provider...`);

  for (let i = 0; i < jobsRemaining.length; i++) {
    const job = jobsRemaining[i];
    report('downloading', i, total, `S${job.season}:E${job.episode} · ${LANG_NAMES[job.lang] || job.lang}`);
    try {
      const existing = await getOrFetchSubtitle(env, 'tv', tmdbId, job.lang, {
        season: job.season, episode: job.episode, imdbId, title, year,
      });
      if (existing) {
        results.push({ season: job.season, episode: job.episode, lang: job.lang, success: true, url: existing.url, cached: existing.cached });
        success++;
      } else {
        // Provide specific reason for failure
        const reasons = [];
        if (!providerStatus.opensubtitles_com) reasons.push('OS.com tidak aktif');
        if (!providerStatus.subdl) reasons.push('Subdl tidak aktif');
        const reasonStr = reasons.length > 0 ? ` (${reasons.join(', ')})` : '';
        results.push({ season: job.season, episode: job.episode, lang: job.lang, success: false, message: `Subtitle tidak ditemukan di semua provider${reasonStr}` });
        fail++;
      }
    } catch (err) {
      results.push({ season: job.season, episode: job.episode, lang: job.lang, success: false, message: err.message });
      fail++;
    }
  }

  report('done', total, total, `Done: ${success} ok, ${fail} fail, ${skipped} skipped`);
  return { total: success + fail + skipped, success, fail, skipped, results };
}

// ─── Provider: Search (no download) ──────────────────────────────────────────

/**
 * Which provider already delivered this exact title, per the R2 metadata index.
 * Mirrors hijitv's `active_*.txt` marker: a title's own history beats a global
 * provider priority. Returns null when nothing is remembered.
 */
async function preferredProviderFor(env, { type, tmdbId, season, episode, lang }) {
  try {
    const { subtitles } = await readMetadata(env);
    const sameTitle = (subtitles || []).filter(s =>
      s.type === type
      && String(s.tmdbId) === String(tmdbId)
      && (type !== 'tv' || ((s.season ?? null) === (season ?? null) && (s.episode ?? null) === (episode ?? null)))
    );
    if (!sameTitle.length) return null;
    const exactLang = lang ? sameTitle.filter(s => s.lang === lang) : [];
    const pool = exactLang.length ? exactLang : sameTitle;
    pool.sort((a, b) => String(b.downloadedAt || '').localeCompare(String(a.downloadedAt || '')));
    const source = pool[0]?.source || '';
    if (!source || source === 'manual' || source === 'upload') return null;
    // AI tracks are stored as `ai-translate:<source>`; the searchable provider is the source.
    return source.startsWith('ai-translate:') ? 'ai_translate' : source;
  } catch { return null; }
}

/**
 * Search subtitles from all providers without downloading.
 *
 * Returns { results, diagnostics }: results ranked by weighted score
 * (title / year / language / preferred provider / download count), plus one row
 * per provider saying whether it ran and what it returned. Silent provider
 * failure was why a bare "0 results" used to be unexplainable in the UI.
 */
export async function searchSubtitlesFromProviders(env, type, tmdbId, options = {}) {
  const { season, episode, imdbId: clientImdbId, lang, title: clientTitle, year } = options;
  const creds = await resolveProviderCredentials(env);
  const results = [];
  const diagnostics = [];
  /** Record one provider outcome; console mirrors it so logs and API agree. */
  const record = (provider, status, count, message = null) => {
    diagnostics.push({ provider, status, count: count || 0, message });
    if (status === 'error') console.error(`[Subtitle] ${provider} search failed: ${message}`);
    else console.log(`[Subtitle] ${provider} search: ${status} (${count || 0} hasil)${message ? ` — ${message}` : ''}`);
  };

  // SubtitleCat is keyed on a title and OpenSubtitles.com falls back to an IMDB
  // id, so fill in whichever the caller omitted with a single TMDB call here
  // rather than in every request handler. `append_to_response=external_ids` is
  // what carries imdb_id — without it the response has none at all.
  const hadClientTitle = Boolean(String(clientTitle || '').trim());
  let title = String(clientTitle || '').trim();
  let imdbId = clientImdbId || null;
  // Why the lookup contributed nothing, carried into each provider row that
  // needed it: a bare "no title" hid the real cause (an invalid key answers
  // 401), which made this indistinguishable from a missing row.
  let metadataNote = null;
  if ((!title || !imdbId) && env.TMDB_API_KEY) {
    try {
      const res = await tmdbFetch(
        env.TMDB_API_KEY,
        type === 'tv' ? `/tv/${tmdbId}` : `/movie/${tmdbId}`,
        { append_to_response: 'external_ids' },
      );
      if (res.ok) {
        const meta = await res.json();
        if (!imdbId) imdbId = meta.external_ids?.imdb_id || meta.imdb_id || null;
        if (!title) title = String(meta.title || meta.name || '').trim();
        if (!title) metadataNote = 'TMDB tidak mengembalikan judul';
      } else {
        metadataNote = `TMDB menolak lookup (HTTP ${res.status})`;
      }
    } catch (err) {
      metadataNote = `TMDB tidak dapat dihubungi: ${err.message}`;
    }
  } else if (!title) {
    metadataNote = 'TMDB_API_KEY belum diisi';
  }
  // Named for whoever supplied the title, so a label never claims the client
  // when the value actually came from TMDB.
  const titleSource = hadClientTitle ? 'klien' : 'TMDB';

  // 1. OpenSubtitles.com — search without language filter (returns all langs)
  if (creds.opensubtitles_com.apiKey && creds.opensubtitles_com.username && creds.opensubtitles_com.password) {
    const login = await osComLogin(creds.opensubtitles_com);
    if (!login) {
      record('opensubtitles_com', 'error', 0, 'login gagal (cek API key / username / password)');
    } else {
      let count = 0;
      try {
        const params = new URLSearchParams({ tmdb_id: String(tmdbId), type: type === 'tv' ? 'episode' : 'movie' });
        if (lang) params.set('languages', LANG_MAP[lang] || lang);
        if (season !== undefined) params.set('season_number', String(season));
        if (episode !== undefined) params.set('episode_number', String(episode));
        let subs = [];
        const res = await fetch(`${OS_COM_BASE}/subtitles?${params}`, {
          headers: { 'Api-Key': creds.opensubtitles_com.apiKey, Authorization: `Bearer ${login.token}`, 'User-Agent': 'HIJISTREAM/1.0' },
        });
        if (res.ok) subs = (await res.json()).data || [];
        else console.error(`[Subtitle] opensubtitles_com search: ${await readApiError(res, 'HTTP gagal')}`);
        // Fallback: search by IMDB ID
        if (!subs.length && imdbId) {
          const p2 = new URLSearchParams({ imdb_id: imdbId.replace(/^tt/, ''), type: type === 'tv' ? 'episode' : 'movie' });
          if (lang) p2.set('languages', LANG_MAP[lang] || lang);
          if (season !== undefined) p2.set('season_number', String(season));
          if (episode !== undefined) p2.set('episode_number', String(episode));
          const r2 = await fetch(`${OS_COM_BASE}/subtitles?${p2}`, {
            headers: { 'Api-Key': creds.opensubtitles_com.apiKey, Authorization: `Bearer ${login.token}`, 'User-Agent': 'HIJISTREAM/1.0' },
          });
          if (r2.ok) subs = (await r2.json()).data || [];
        }
        for (const s of subs.slice(0, 15)) {
          const attr = s.attributes || {};
          const file = attr.files?.[0] || {};
          const subLang = normalizeLang(lang) || normalizeLang(attr.language) || normalizeLang(file.language) || detectLangFromFilename(file.file_name) || 'en';
          results.push({
            provider: 'opensubtitles_com',
            lang: subLang,
            langName: LANG_NAMES[subLang] || subLang,
            title: attr.release || file.file_name || '',
            downloadCount: attr.download_count || 0,
            rating: attr.ratings || 0,
            format: file.format || 'srt',
            size: file.file_size || 0,
            fileId: file.file_id,
            fps: file.fps || null,
            hearingImpaired: file.hearing_impaired || false,
          });
          count++;
        }
        record('opensubtitles_com', count > 0 ? 'ok' : 'empty', count,
          login.quota !== null ? `kuota unduhan tersisa ${login.quota}` : null);
      } catch (err) { record('opensubtitles_com', 'error', count, err.message); }
    }
  } else {
    record('opensubtitles_com', 'skipped', 0, 'belum dikonfigurasi');
  }

  // 2. Subdl — search without language filter (returns all langs)
  if (creds.subdl.apiKey) {
    let count = 0;
    try {
      const params = new URLSearchParams({ api_key: creds.subdl.apiKey, tmdb_id: String(tmdbId), type });
      if (lang) params.set('languages', lang.toUpperCase());
      if (type === 'tv') {
        if (season !== undefined) params.set('season_number', String(season));
        if (episode !== undefined) params.set('episode_number', String(episode));
      }
      const res = await fetch(`${SUBDL_BASE}/subtitles?${params}`, { headers: { 'User-Agent': 'HIJISTREAM/1.0' } });
      if (!res.ok) {
        record('subdl', 'error', 0, await readApiError(res, 'pencarian gagal'));
      } else {
        const data = await res.json();
        const subs = data.subtitles || [];
        for (const s of subs.slice(0, 15)) {
          const subLang = normalizeLang(s.lang || s.language) || detectLangFromFilename(s.release_name) || 'en';
          results.push({
            provider: 'subdl',
            lang: subLang,
            langName: LANG_NAMES[subLang] || subLang,
            title: s.release_name || '',
            downloadCount: s.download_count || 0,
            rating: 0,
            format: s.format || 'srt',
            size: 0,
            fileId: s.url || null,
            fps: null,
            hearingImpaired: false,
          });
          count++;
        }
        record('subdl', count > 0 ? 'ok' : 'empty', count);
      }
    } catch (err) { record('subdl', 'error', count, err.message); }
  } else {
    record('subdl', 'skipped', 0, 'belum dikonfigurasi');
  }

  // 3. SubtitleCat (free, movie & TV) — keyed on the title resolved above.
  if (!title) {
    record('subtitlecat', 'skipped', 0, metadataNote || 'judul tidak tersedia');
  } else {
    try {
      const catSub = await fetchFromSubtitleCat(tmdbId, type, lang || 'id', season, episode, title);
      if (catSub) {
        results.push({
          provider: 'subtitlecat',
          lang: lang || 'id',
          langName: LANG_NAMES[lang || 'id'] || (lang || 'id'),
          title: `${title} (SubtitleCat)`,
          downloadCount: 0,
          rating: 0,
          format: 'srt',
          size: 0,
          fileId: 'direct',
          fps: null,
          hearingImpaired: false,
        });
        record('subtitlecat', 'ok', 1, `judul dari ${titleSource}`);
      } else {
        record('subtitlecat', 'empty', 0, `judul dari ${titleSource}`);
      }
    } catch (err) { record('subtitlecat', 'error', 0, err.message); }
  }

  // Rank what the providers returned: weighted score (title, year, language,
  // preferred provider, download count) instead of a raw download-count sort.
  // Scoring fields stay inside this scope — the API contract is unchanged.
  const preferredProvider = await preferredProviderFor(env, { type, tmdbId, season, episode, lang });
  const scorable = {
    type,
    title: title || '',
    year,
    season: season ?? null,
    episode: episode ?? null,
    lang: lang ?? null,
    preferredProvider,
  };
  const ranked = rankSubtitles(results, scorable).map(({ score: _score, matches: _matches, ...sub }) => sub);
  results.length = 0;
  results.push(...ranked);

  // AI translation candidates (parity with hijitv HandleSubtitleSearch): every
  // English result also offers an "EN -> ID via AI" option. Only offered when a
  // concrete EN source file exists in this result set and AI is configured —
  // no fake candidates for a source we cannot actually translate.
  if (aiTranslateEnabled(creds)) {
    const enResults = ranked.filter(r => r.lang === 'en' && r.provider !== 'ai_translate' && r.fileId).slice(0, 5);
    for (const en of enResults) {
      results.push({
        provider: 'ai_translate',
        lang: 'id',
        langName: LANG_NAMES.id,
        title: `${en.title || en.provider} (AI EN \u2192 ID)`,
        downloadCount: 0,
        rating: 0,
        format: 'vtt',
        size: 0,
        fileId: encodeAiFileId(en.provider, en.fileId),
        fps: null,
        hearingImpaired: false,
        canAI: true,
        sourceLang: 'en',
      });
    }
  }
  return { results, diagnostics };
}

// ─── AI translation wiring ──────────────────────────────────────────────────

function aiTranslateEnabled(creds) {
  const c = creds?.ai_translate;
  return !!(c?.enabled && c?.baseUrl && c?.apiKey);
}

/** Pack the source provider + fileId into the fileId of an ai_translate candidate. */
export function encodeAiFileId(provider, fileId) {
  return JSON.stringify([provider, fileId ?? null]);
}

function decodeAiFileId(fileId) {
  try {
    const [provider, srcFileId] = JSON.parse(String(fileId));
    if (typeof provider === 'string' && provider && provider !== 'ai_translate' && srcFileId) {
      return [provider, srcFileId];
    }
  } catch { /* not an encoded candidate */ }
  return [null, null];
}

/**
 * Fetch a single subtitle's raw content from one provider by fileId.
 * Returns { content, source, alreadyVtt? } or null. No storage side effects.
 */
export async function fetchSubtitleFromProvider(env, provider, fileId, type, tmdbId, lang, options = {}) {
  const { season, episode, title } = options;
  const creds = await resolveProviderCredentials(env);
  let result = null;

  if (provider === 'opensubtitles_com' && fileId) {
    const login = await osComLogin(creds.opensubtitles_com);
    if (!login) throw new Error('Login OpenSubtitles.com gagal (cek API key / username / password)');
    const content = await osComDownload(creds.opensubtitles_com, login.token, fileId);
    if (content) result = { content, source: 'opensubtitles_com' };
  } else if (provider === 'subdl' && fileId) {
    const dlUrl = fileId.startsWith('http') ? fileId : `https://dl.subdl.com${fileId}`;
    const dlRes = await fetch(dlUrl, { headers: { 'User-Agent': 'HIJISTREAM/1.0' }, redirect: 'follow' });
    if (!dlRes.ok) throw new Error(`Subdl menolak unduhan: HTTP ${dlRes.status}`);
    const blob = await dlRes.arrayBuffer();
    if (blob.byteLength <= 100) throw new Error('Subdl mengembalikan berkas kosong');
    const content = await extractSubtitleFromZip(blob);
    if (!content) throw new Error('Subdl: arsip tidak berisi berkas subtitle');
    result = { content, source: 'subdl' };
  } else if (provider === 'subtitlecat') {
    const catRes = await fetchFromSubtitleCat(tmdbId, type, lang, season, episode, title);
    if (catRes) result = catRes;
  }

  return result;
}

/**
 * fetchSubtitleFromProvider + failure bookkeeping: provider refusals that
 * carry a reason (OpenSubtitles.com quota notice, HTTP 429/406) are recorded
 * in the admin error log — otherwise the reason dies with the HTTP response.
 */
async function fetchProviderTracked(env, provider, fileId, type, tmdbId, lang, options) {
  try {
    return await fetchSubtitleFromProvider(env, provider, fileId, type, tmdbId, lang, options);
  } catch (err) {
    if (/quota|allowed|429|406/i.test(String(err.message))) {
      console.error(`[Subtitle] ${provider} menolak unduhan: ${err.message}`);
      await appendErrorLog(env, { type: 'quota', provider, lang, message: err.message });
    }
    throw err;
  }
}

/**
 * Download a specific subtitle by provider + fileId, convert to VTT, and cache it
 * in R2. Used after the user picks a search result.
 *
 * `provider === 'ai_translate'` first downloads the English source encoded in
 * fileId, then translates it — hijitv parity, where the select path runs
 * TranslateSRTToIndonesian on the downloaded VTT.
 */
export async function downloadSubtitleByProvider(env, provider, fileId, type, tmdbId, lang, options = {}) {
  const { season, episode, imdbId, title } = options;
  const creds = await resolveProviderCredentials(env);
  let result = null;

  if (provider === 'ai_translate') {
    const [srcProvider, srcFileId] = decodeAiFileId(fileId);
    if (!srcProvider) return null;
    if (!aiTranslateEnabled(creds)) {
      console.error('[Subtitle] AI translate requested but not configured');
      return null;
    }
    const src = await fetchProviderTracked(env, srcProvider, srcFileId, type, tmdbId, 'en', { season, episode, imdbId, title });
    if (!src?.content) return null;
    const srcVtt = src.alreadyVtt ? src.content : srtToVtt(src.content);
    if (!srcVtt?.includes('-->')) return null;
    const translated = await translateSrtToIndonesian(srcVtt, creds.ai_translate);
    if (!translated?.includes('-->')) return null;
    result = { content: translated, source: `ai-translate:${srcProvider}`, alreadyVtt: true };
  } else {
    result = await fetchProviderTracked(env, provider, fileId, type, tmdbId, lang, { season, episode, imdbId, title });
  }

  if (!result) return null;

  // Convert to VTT
  const vttContent = result.alreadyVtt ? result.content : srtToVtt(result.content);
  if (!vttContent?.trim()) return null;

  // Upload to R2
  const key = getSubtitleKey(type, tmdbId, lang, season, episode);
  const publicUrl = getR2PublicUrl(env, key);
  const uploaded = await r2PutObject(env, key, vttContent, 'text/vtt; charset=utf-8');
  if (!uploaded) return null;

  // Update metadata
  const entry = {
    id: generateId(type, tmdbId, lang, season, episode),
    type, tmdbId: Number(tmdbId), imdbId: imdbId || null, title: title || null,
    lang, langName: LANG_NAMES[lang] || lang, key, url: publicUrl, format: 'vtt',
    season: season ?? null, episode: episode ?? null,
    downloadedAt: new Date().toISOString(), source: result.source,
  };
  await addToMetadata(env, entry).catch(() => {});

  return { url: publicUrl, lang, format: 'vtt', cached: false };
}

// ─── Core: get or fetch subtitle ─────────────────────────────────────────────

/**
 * Get subtitle from R2 cache, or download from providers.
 * Tries providers in order: opensubtitles_com → subdl → subtitlecat
 */
export async function getOrFetchSubtitle(env, type, tmdbId, lang, options = {}) {
  const { season, episode, imdbId, title, force } = options;
  const key = getSubtitleKey(type, tmdbId, lang, season, episode);
  const publicUrl = getR2PublicUrl(env, key);

  // 1. Check R2 cache via signed HEAD
  if (!force) {
    try {
      const dateStr = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
      const endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
      const path = `/${env.R2_BUCKET_NAME}/${key}`;
      const { authorization, payloadHash } = await signS3('HEAD', path, { host: new URL(endpoint).host }, null, env.R2_ACCESS_KEY_ID, env.R2_SECRET_ACCESS_KEY, 'auto', 's3', dateStr);
      const headRes = await fetch(`${endpoint}${path}`, { method: 'HEAD', headers: { Authorization: authorization, 'x-amz-content-sha256': payloadHash, 'x-amz-date': dateStr } });
      if (headRes.ok) return { url: publicUrl, lang, format: 'vtt', cached: true };
    } catch { /* proceed */ }
  }

  // 2. Resolve credentials
  const creds = await resolveProviderCredentials(env);

  // 3. Search ALL providers simultaneously, pick best result
  const providerCalls = [
    { name: 'opensubtitles_com', fn: () => fetchFromOsCom(creds.opensubtitles_com, tmdbId, type, lang, season, episode, imdbId) },
    { name: 'subdl', fn: () => fetchFromSubdl(creds.subdl, tmdbId, type, lang, season, episode) },
    { name: 'subtitlecat', fn: () => fetchFromSubtitleCat(tmdbId, type, lang, season, episode, options.title) },
  ];

  const providerResults = await Promise.allSettled(
    providerCalls.map(async (p) => {
      try {
        const r = await p.fn();
        return r?.content ? { source: p.name, content: r.content, alreadyVtt: r.alreadyVtt } : null;
      } catch (err) {
        console.error(`[Subtitle] ${p.name} error:`, err.message);
        return null;
      }
    })
  );

  // Pick best result (prefer non-cached, then by source priority)
  const successful = providerResults
    .filter(r => r.status === 'fulfilled' && r.value?.content)
    .map(r => r.value);

  let result = null;
  let usedSource = null;
  if (successful.length > 0) {
    const sourcePriority = { opensubtitles_com: 1, subdl: 2, subtitlecat: 3 };
    successful.sort((a, b) => (sourcePriority[a.source] || 9) - (sourcePriority[b.source] || 9));
    result = successful[0];
    usedSource = result.source;
  }

  // If no subtitle found for Indonesian ('id') and AI translation is configured, fallback to AI translate
  if (!result && (lang === 'id' || lang === 'ind') && creds.ai_translate?.enabled && creds.ai_translate?.baseUrl && creds.ai_translate?.apiKey) {
    try {
      console.log(`[Subtitle] No ID subtitle found for ${type}/${tmdbId}. Attempting AI translation from EN...`);
      // Fetch English subtitle first
      const enSub = await getOrFetchSubtitle(env, type, tmdbId, 'en', { season, episode, imdbId, title, force: false });
      if (enSub?.url) {
        const enRes = await fetch(enSub.url);
        if (enRes.ok) {
          const enVtt = await enRes.text();
          if (enVtt && enVtt.includes('-->')) {
            const translatedVtt = await translateSrtToIndonesian(enVtt, creds.ai_translate);
            if (translatedVtt && translatedVtt.includes('-->')) {
              result = {
                content: translatedVtt,
                source: 'ai-translate:en',
                alreadyVtt: true,
                isAI: true,
              };
              usedSource = 'ai_translate';
            }
          }
        }
      }
    } catch (aiErr) {
      console.error('[Subtitle] AI translation fallback error:', aiErr.message);
    }
  }

  if (!result) {
    await appendErrorLog(env, { type: 'not_found', message: `No subtitle found for ${type}/${tmdbId} (${lang})`, subtitleId: generateId(type, tmdbId, lang, season, episode), lang }).catch(() => {});
    return null;
  }

  // 4. Convert to VTT
  const vttContent = result.alreadyVtt ? result.content : srtToVtt(result.content);
  if (!vttContent?.trim()) return null;

  // 5. Upload to R2
  const uploaded = await r2PutObject(env, key, vttContent, 'text/vtt; charset=utf-8');
  if (!uploaded) { console.error('[Subtitle] R2 upload failed'); return null; }

  // 6. Update metadata
  const entry = {
    id: generateId(type, tmdbId, lang, season, episode),
    type, tmdbId: Number(tmdbId), imdbId: imdbId || null, title: title || null,
    lang, langName: LANG_NAMES[lang] || lang, key, url: publicUrl, format: 'vtt',
    season: season ?? null, episode: episode ?? null,
    downloadedAt: new Date().toISOString(), source: usedSource,
  };
  await addToMetadata(env, entry).catch(err => console.error('[Subtitle] metadata write failed:', err.message));

  return { url: publicUrl, lang, format: 'vtt', cached: false };
}

export async function getOrFetchSubtitles(env, type, tmdbId, languages, options = {}) {
  const results = [];
  for (const lang of languages) {
    const sub = await getOrFetchSubtitle(env, type, tmdbId, lang, options);
    if (sub) results.push(sub);
  }
  return results;
}

// ─── Refresh ─────────────────────────────────────────────────────────────────

export async function refreshSubtitle(env, entry) {
  const result = await getOrFetchSubtitle(env, entry.type, entry.tmdbId, entry.lang, {
    season: entry.season || undefined, episode: entry.episode || undefined,
    imdbId: entry.imdbId || undefined, title: entry.title || undefined, force: true,
  });
  if (result) await updateMetadataEntry(env, entry.id, { refreshedAt: new Date().toISOString() }).catch(() => {});
  return result;
}

export async function refreshAllSubtitles(env) {
  const metadata = await readMetadata(env);
  const toRefresh = metadata.subtitles.filter(s => s.source !== 'manual');
  const results = [];
  for (const entry of toRefresh) {
    const r = await refreshSubtitle(env, entry);
    results.push({ id: entry.id, title: entry.title || `TMDB #${entry.tmdbId}`, lang: entry.lang, status: r ? 'ok' : 'fail' });
  }
  return { total: toRefresh.length, ok: results.filter(r => r.status === 'ok').length, fail: results.filter(r => r.status === 'fail').length, results };
}

// ─── Manual upload ────────────────────────────────────────────────────────────

export async function handleUploadSubtitle(env, params) {
  const { type, tmdbId, lang, content, imdbId, title, season, episode } = params;
  if (!type || !tmdbId || !lang || !content) return null;
  const key = getSubtitleKey(type, tmdbId, lang, season, episode);
  const publicUrl = getR2PublicUrl(env, key);
  const isSrt = /\d{2}:\d{2}:\d{2},\d{3}\s*-->/.test(content);
  let finalContent = isSrt ? srtToVtt(content) : content;
  if (!finalContent.startsWith('WEBVTT')) finalContent = 'WEBVTT\n\n' + finalContent;
  if (!finalContent.trim()) return null;
  const uploaded = await r2PutObject(env, key, finalContent, 'text/vtt; charset=utf-8');
  if (!uploaded) return null;
  const entry = {
    id: generateId(type, tmdbId, lang, season, episode), type, tmdbId: Number(tmdbId),
    imdbId: imdbId || null, title: title || null, lang, langName: LANG_NAMES[lang] || lang,
    key, url: publicUrl, format: 'vtt', season: season ?? null, episode: episode ?? null,
    downloadedAt: new Date().toISOString(), source: 'manual',
  };
  await addToMetadata(env, entry).catch(() => {});
  return { url: publicUrl, lang, format: 'vtt' };
}

// ─── Error log ────────────────────────────────────────────────────────────────

const ERROR_LOG_KEY = 'subtitles/error-log.json';
const MAX_LOG = 200;

export async function readErrorLog(env) {
  try {
    const data = await r2GetObject(env, ERROR_LOG_KEY);
    if (!data) return [];
    const d = JSON.parse(data);
    return Array.isArray(d) ? d : [];
  } catch { return []; }
}

export async function appendErrorLog(env, entry) {
  try {
    const log = await readErrorLog(env);
    log.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2,6)}`, timestamp: new Date().toISOString(), ...entry });
    if (log.length > MAX_LOG) log.length = MAX_LOG;
    await r2PutObject(env, ERROR_LOG_KEY, JSON.stringify(log, null, 2), 'application/json; charset=utf-8');
  } catch (err) { console.error('[ErrorLog]', err.message); }
}

export async function clearErrorLog(env) {
  return r2PutObject(env, ERROR_LOG_KEY, '[]', 'application/json; charset=utf-8');
}

// ─── Monitoring ───────────────────────────────────────────────────────────────

export async function getMonitoringData(env) {
  const metadata = await readMetadata(env);
  const errorLog = await readErrorLog(env);
  const subtitles = metadata.subtitles || [];

  const langStats = {};
  subtitles.forEach(s => {
    if (!langStats[s.lang]) langStats[s.lang] = { lang: s.lang, total: 0, refreshed: 0, manual: 0, opensubtitles: 0, subdl: 0, errors: 0 };
    langStats[s.lang].total++;
    if (s.refreshedAt) langStats[s.lang].refreshed++;
    if (s.source === 'manual') langStats[s.lang].manual++;
    else if (s.source === 'subdl') langStats[s.lang].subdl++;
    else langStats[s.lang].opensubtitles++;
  });
  errorLog.forEach(e => { const l = e.lang || 'unknown'; if (langStats[l]) langStats[l].errors++; });

  const refreshActivity = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    refreshActivity[d.toISOString().slice(0, 10)] = 0;
  }
  subtitles.forEach(s => {
    const date = (s.refreshedAt || s.downloadedAt || '').slice(0, 10);
    if (refreshActivity[date] !== undefined) refreshActivity[date]++;
  });

  const metrics = await readMetrics(env);
  const visitors = metrics.visitors || { total: 0, uniqueCount: 0, daily: {}, pages: {}, devices: {} };
  const topPlayed = (metrics.plays || []).slice(0, 25);

  const visitorActivity = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayData = visitors.daily?.[dateStr] || { visits: 0, uniques: 0 };
    visitorActivity.push({
      date: dateStr,
      visits: dayData.visits || 0,
      uniques: dayData.uniques || 0,
    });
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayVisits = visitors.daily?.[todayStr]?.visits || 0;
  const todayUniques = visitors.daily?.[todayStr]?.uniques || 0;

  return {
    summary: {
      totalSubtitles: subtitles.length,
      totalMovies: subtitles.filter(s => s.type === 'movie').length,
      totalTV: subtitles.filter(s => s.type === 'tv').length,
      totalLanguages: Object.keys(langStats).length,
      totalManual: subtitles.filter(s => s.source === 'manual').length,
      totalOS: subtitles.filter(s => s.source && s.source !== 'manual' && s.source !== 'subdl').length,
      totalSubdl: subtitles.filter(s => s.source === 'subdl').length,
      totalRefreshed: subtitles.filter(s => s.refreshedAt).length,
      totalErrors: errorLog.length,
      totalVisits: visitors.total || 0,
      totalUniqueVisitors: visitors.uniqueCount || 0,
      todayVisits,
      todayUniques,
      totalPlays: (metrics.plays || []).reduce((acc, p) => acc + (p.count || 0), 0),
    },
    langStats: Object.values(langStats).sort((a, b) => b.total - a.total),
    refreshActivity: Object.entries(refreshActivity).map(([date, count]) => ({ date, count })),
    recentErrors: errorLog.slice(0, 30),
    visitors: {
      total: visitors.total || 0,
      uniqueCount: visitors.uniqueCount || 0,
      todayVisits,
      todayUniques,
      activity: visitorActivity,
      pages: Object.entries(visitors.pages || {})
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15),
      devices: visitors.devices || { desktop: 0, mobile: 0, tv: 0, other: 0 },
    },
    topPlayed,
  };
}

// ─── Backfill missing titles from TMDB ──────────────────────────────────────

/**
 * Backfill missing titles for subtitle entries by fetching from TMDB.
 * Returns { updated, skipped, errors }.
 */
export async function backfillTitles(env) {
  const metadata = await readMetadata(env);
  const subtitles = metadata.subtitles || [];
  const missing = subtitles.filter(s => !s.title && s.tmdbId);

  if (missing.length === 0) return { updated: 0, skipped: subtitles.length, errors: 0 };

  // Group by tmdbId to avoid duplicate API calls
  const uniqueTmdbIds = [...new Set(missing.map(s => `${s.type}:${s.tmdbId}`))];
  const titleCache = {};
  let updated = 0;
  let errors = 0;

  for (const key of uniqueTmdbIds) {
    const [type, tmdbId] = key.split(':');
    try {
      const tmdbKey = env.TMDB_API_KEY;
      if (!tmdbKey) { errors++; continue; }
      const res = await tmdbFetch(tmdbKey, type === 'tv' ? `/tv/${tmdbId}` : `/movie/${tmdbId}`, { append_to_response: 'external_ids' });
      if (!res.ok) { errors++; continue; }
      const data = await res.json();
      const title = data.title || data.name || null;
      const imdbId = data.external_ids?.imdb_id || null;
      if (title) titleCache[key] = { title, imdbId };
    } catch { errors++; }
  }

  // Apply cached titles to metadata
  for (const entry of subtitles) {
    if (!entry.title && entry.tmdbId) {
      const cacheKey = `${entry.type}:${entry.tmdbId}`;
      const cached = titleCache[cacheKey];
      if (cached?.title) {
        entry.title = cached.title;
        if (cached.imdbId && !entry.imdbId) entry.imdbId = cached.imdbId;
        updated++;
      }
    }
  }

  if (updated > 0) await writeMetadata(env, metadata);
  return { updated, skipped: subtitles.length - updated, errors };
}
// ─── Metrics Subsystem: Visitor Analytics & Top Played ──────────────────────

export const METRICS_DATA_KEY = 'metrics/data.json';

export async function readMetrics(env) {
  try {
    const raw = await r2GetObject(env, METRICS_DATA_KEY);
    if (!raw) {
      return {
        visitors: { total: 0, uniqueCount: 0, uniqueIds: [], daily: {}, pages: {}, devices: { desktop: 0, mobile: 0, tv: 0, other: 0 } },
        plays: [],
        updatedAt: null,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      visitors: parsed.visitors || { total: 0, uniqueCount: 0, uniqueIds: [], daily: {}, pages: {}, devices: { desktop: 0, mobile: 0, tv: 0, other: 0 } },
      plays: parsed.plays || [],
      updatedAt: parsed.updatedAt || null,
    };
  } catch {
    return {
      visitors: { total: 0, uniqueCount: 0, uniqueIds: [], daily: {}, pages: {}, devices: { desktop: 0, mobile: 0, tv: 0, other: 0 } },
      plays: [],
      updatedAt: null,
    };
  }
}

export async function writeMetrics(env, data) {
  data.updatedAt = new Date().toISOString();
  return r2PutObject(env, METRICS_DATA_KEY, JSON.stringify(data, null, 2), 'application/json; charset=utf-8');
}

export async function recordVisit(env, { visitorId, path, deviceType }) {
  try {
    const metrics = await readMetrics(env);
    const today = new Date().toISOString().slice(0, 10);
    const vis = metrics.visitors || { total: 0, uniqueCount: 0, uniqueIds: [], daily: {}, pages: {}, devices: {} };

    vis.total = (vis.total || 0) + 1;
    const vId = visitorId || `anon_${Math.random().toString(36).slice(2, 10)}`;
    if (!Array.isArray(vis.uniqueIds)) vis.uniqueIds = [];
    if (!vis.uniqueIds.includes(vId)) {
      vis.uniqueIds.push(vId);
      if (vis.uniqueIds.length > 5000) vis.uniqueIds.shift();
    }
    vis.uniqueCount = vis.uniqueIds.length;

    if (!vis.daily) vis.daily = {};
    if (!vis.daily[today]) vis.daily[today] = { visits: 0, uniques: 0, uniqueList: [] };
    vis.daily[today].visits = (vis.daily[today].visits || 0) + 1;
    if (!vis.daily[today].uniqueList) vis.daily[today].uniqueList = [];
    if (!vis.daily[today].uniqueList.includes(vId)) {
      vis.daily[today].uniqueList.push(vId);
      vis.daily[today].uniques = vis.daily[today].uniqueList.length;
      if (vis.daily[today].uniqueList.length > 1000) vis.daily[today].uniqueList.shift();
    }

    if (!vis.pages) vis.pages = {};
    // Collapse dynamic segments (/movies/27205 -> /movies/:id) so the map is
    // keyed by route shape, not by every title ever visited. Without this the
    // report grows one entry per title and buries the actual top pages.
    const cleanPath = (path ? path.split('?')[0] : '/')
      .replace(/\/\d+(?=\/|$)/g, '/:id')
      .replace(/\/[0-9a-f]{8,}(?=\/|$)/gi, '/:id');
    vis.pages[cleanPath] = (vis.pages[cleanPath] || 0) + 1;
    // Hard cap as a backstop: a client sending arbitrary paths must not be able
    // to grow this object without bound.
    const pageKeys = Object.keys(vis.pages);
    if (pageKeys.length > 200) {
      const trimmed = pageKeys
        .sort((a, b) => (vis.pages[b] || 0) - (vis.pages[a] || 0))
        .slice(0, 200);
      vis.pages = Object.fromEntries(trimmed.map(k => [k, vis.pages[k]]));
    }

    if (!vis.devices) vis.devices = { desktop: 0, mobile: 0, tv: 0, other: 0 };
    // Whitelist: an arbitrary deviceType from the client must not create keys.
    const dev = ['desktop', 'mobile', 'tv', 'other'].includes(deviceType) ? deviceType : 'other';
    vis.devices[dev] = (vis.devices[dev] || 0) + 1;
    // uniqueCount must track the retained window, not a lifetime total that
    // diverges from uniqueIds once the array starts shifting.
    vis.uniqueCount = vis.uniqueIds.length;

    metrics.visitors = vis;
    await writeMetrics(env, metrics);
    return { success: true };
  } catch (err) {
    console.error('[Metrics] recordVisit error:', err.message);
    return { success: false, error: err.message };
  }
}

export async function recordPlay(env, { id, type, title, poster_url }) {
  if (!id) return { success: false, error: 'Missing media id' };
  try {
    const metrics = await readMetrics(env);
    if (!Array.isArray(metrics.plays)) metrics.plays = [];

    const existingIdx = metrics.plays.findIndex(p => String(p.id) === String(id) && p.type === type);
    const now = new Date().toISOString();

    if (existingIdx >= 0) {
      metrics.plays[existingIdx].count = (metrics.plays[existingIdx].count || 0) + 1;
      metrics.plays[existingIdx].lastPlayed = now;
      if (title) metrics.plays[existingIdx].title = title;
      if (poster_url) metrics.plays[existingIdx].poster_url = poster_url;
    } else {
      metrics.plays.push({
        id: String(id),
        type: type || 'movie',
        title: title || `ID #${id}`,
        poster_url: poster_url || '',
        count: 1,
        lastPlayed: now,
      });
    }

    metrics.plays.sort((a, b) => (b.count || 0) - (a.count || 0));
    if (metrics.plays.length > 100) metrics.plays = metrics.plays.slice(0, 100);

    await writeMetrics(env, metrics);
    return { success: true, count: existingIdx >= 0 ? metrics.plays[existingIdx].count : 1 };
  } catch (err) {
    console.error('[Metrics] recordPlay error:', err.message);
    return { success: false, error: err.message };
  }
}

export async function getTopPlayed(env, limit = 20) {
  const metrics = await readMetrics(env);
  const plays = metrics.plays || [];
  return plays.slice(0, limit);
}
