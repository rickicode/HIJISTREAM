/**
 * Subtitle Service — Multi-provider
 *
 * Providers (tried in order until one succeeds):
 *   1. opensubtitles_com  — REST API v1, needs apiKey + username + password
 *   2. opensubtitles_org  — XML-RPC legacy, needs username + password only
 *   3. subdl              — REST API, needs apiKey only
 *
 * Credentials stored in R2: settings/subtitle-providers.json
 * Subtitles cached in R2 as WebVTT files.
 */

// ─── Language maps ────────────────────────────────────────────────────────────

// app locale → ISO 639-1 (OS.com / Subdl)
const LANG_MAP = { id: 'id', en: 'en', es: 'es', pt: 'pt', hi: 'hi', ja: 'ja', ko: 'ko' };
// app locale → ISO 639-2 (OS.org XML-RPC)
const LANG_MAP_3 = { id: 'ind', en: 'eng', es: 'spa', pt: 'por', hi: 'hin', ja: 'jpn', ko: 'kor' };
const LANG_NAMES = { id: 'Indonesian', en: 'English', es: 'Spanish', pt: 'Portuguese', hi: 'Hindi', ja: 'Japanese', ko: 'Korean' };

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
    opensubtitles_org: {
      username: env.OPENSUBTITLES_ORG_USERNAME || stored.opensubtitles_org?.username || '',
      password: env.OPENSUBTITLES_ORG_PASSWORD || stored.opensubtitles_org?.password || '',
    },
    subdl: {
      apiKey: env.SUBDL_API_KEY || stored.subdl?.apiKey || '',
    },
  };
}

// ─── Provider: OpenSubtitles.com (REST v1) ────────────────────────────────────

const OS_COM_BASE = 'https://api.opensubtitles.com/api/v1';

async function osComLogin(creds) {
  const res = await fetch(`${OS_COM_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Api-Key': creds.apiKey, 'User-Agent': 'HIJISTREAM/1.0' },
    body: JSON.stringify({ username: creds.username, password: creds.password }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.token || null;
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
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.link) return null;
  const fileRes = await fetch(data.link);
  return fileRes.ok ? fileRes.text() : null;
}

async function fetchFromOsCom(creds, tmdbId, type, lang, season, episode, imdbId) {
  if (!creds.apiKey || !creds.username || !creds.password) return null;
  const token = await osComLogin(creds);
  if (!token) return null;

  let subs = await osComSearch(creds, token, tmdbId, type, lang, season, episode);

  // Fallback: search by IMDB ID
  if (!subs.length && imdbId) {
    const params = new URLSearchParams({ imdb_id: imdbId.replace(/^tt/, ''), type: type === 'tv' ? 'episode' : 'movie', languages: LANG_MAP[lang] || lang });
    if (season !== undefined) params.set('season_number', String(season));
    if (episode !== undefined) params.set('episode_number', String(episode));
    const res = await fetch(`${OS_COM_BASE}/subtitles?${params}`, {
      headers: { 'Api-Key': creds.apiKey, Authorization: `Bearer ${token}`, 'User-Agent': 'HIJISTREAM/1.0' },
    });
    if (res.ok) subs = (await res.json()).data || [];
  }

  if (!subs.length) return null;
  const best = subs.sort((a, b) => (b.attributes?.download_count || 0) - (a.attributes?.download_count || 0))[0];
  const fileId = best?.attributes?.files?.[0]?.file_id;
  if (!fileId) return null;
  const content = await osComDownload(creds, token, fileId);
  return content ? { content, source: 'opensubtitles_com' } : null;
}

// ─── Provider: OpenSubtitles.org (XML-RPC) ───────────────────────────────────

const OS_ORG_ENDPOINT = 'https://api.opensubtitles.org/xml-rpc';
const OS_ORG_UA = 'HIJISTREAM v1.0'; // must be registered; fallback to temp app name

function xmlRpcCall(methodName, params) {
  const paramsXml = params.map(p => `<param>${valueToXml(p)}</param>`).join('');
  return `<?xml version="1.0"?><methodCall><methodName>${methodName}</methodName><params>${paramsXml}</params></methodCall>`;
}

function valueToXml(v) {
  if (typeof v === 'string') return `<value><string>${v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</string></value>`;
  if (typeof v === 'number') return `<value><int>${v}</int></value>`;
  if (typeof v === 'boolean') return `<value><boolean>${v ? 1 : 0}</boolean></value>`;
  if (Array.isArray(v)) return `<value><array><data>${v.map(valueToXml).join('')}</data></array></value>`;
  if (v && typeof v === 'object') {
    const members = Object.entries(v).map(([k, val]) => `<member><name>${k}</name>${valueToXml(val)}</member>`).join('');
    return `<value><struct>${members}</struct></value>`;
  }
  return `<value><string></string></value>`;
}

function parseXmlValue(node) {
  if (!node) return null;
  const child = node.firstElementChild;
  if (!child) return node.textContent?.trim() || '';
  const tag = child.tagName;
  if (tag === 'string' || tag === 'base64') return child.textContent || '';
  if (tag === 'int' || tag === 'i4') return parseInt(child.textContent, 10);
  if (tag === 'boolean') return child.textContent === '1';
  if (tag === 'double') return parseFloat(child.textContent);
  if (tag === 'array') {
    const data = child.querySelector('data');
    return data ? [...data.children].map(v => parseXmlValue(v)) : [];
  }
  if (tag === 'struct') {
    const obj = {};
    for (const member of child.querySelectorAll(':scope > member')) {
      const name = member.querySelector(':scope > name')?.textContent;
      const val = member.querySelector(':scope > value');
      if (name) obj[name] = parseXmlValue(val);
    }
    return obj;
  }
  return child.textContent || '';
}

async function xmlRpcRequest(body) {
  const res = await fetch(OS_ORG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml', 'User-Agent': OS_ORG_UA },
    body,
  });
  if (!res.ok) return null;
  const text = await res.text();
  // Parse XML response using DOMParser (available in CF Workers / Vercel Edge)
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/xml');
    const valueNode = doc.querySelector('methodResponse > params > param > value');
    return parseXmlValue(valueNode);
  } catch {
    // DOMParser not available in all runtimes — fallback regex parse for token
    const tokenMatch = text.match(/<member><name>token<\/name><value><string>([^<]+)<\/string><\/value>/);
    const statusMatch = text.match(/<member><name>status<\/name><value><string>([^<]+)<\/string><\/value>/);
    if (tokenMatch) return { token: tokenMatch[1], status: statusMatch?.[1] || '200 OK' };
    return null;
  }
}

async function osOrgLogin(creds) {
  const result = await xmlRpcRequest(xmlRpcCall('LogIn', [creds.username, creds.password, 'en', OS_ORG_UA]));
  if (!result?.token || !result.status?.startsWith('200')) return null;
  return result.token;
}

async function osOrgSearch(token, tmdbId, type, lang, season, episode, imdbId) {
  const query = { sublanguageid: LANG_MAP_3[lang] || 'eng' };
  if (imdbId) query.imdbid = imdbId.replace(/^tt/, '').replace(/^0+/, '');
  if (type === 'tv') {
    if (season !== undefined) query.season = String(season);
    if (episode !== undefined) query.episode = String(episode);
    if (!imdbId) query.query = `tmdb:${tmdbId}`;
  } else {
    if (!imdbId) query.query = `tmdb:${tmdbId}`;
  }

  const result = await xmlRpcRequest(xmlRpcCall('SearchSubtitles', [token, [query], { limit: 20 }]));
  return Array.isArray(result?.data) ? result.data : [];
}

async function fetchFromOsOrg(creds, tmdbId, type, lang, season, episode, imdbId) {
  if (!creds.username || !creds.password) return null;
  const token = await osOrgLogin(creds);
  if (!token) return null;

  const subs = await osOrgSearch(token, tmdbId, type, lang, season, episode, imdbId);
  if (!subs.length) return null;

  // Sort by download count
  const best = subs.sort((a, b) => Number(b.SubDownloadsCnt || 0) - Number(a.SubDownloadsCnt || 0))[0];
  const downloadLink = best?.SubDownloadLink;
  if (!downloadLink) return null;

  // SubDownloadLink is gzip-compressed — request with /subformat-vtt/ for direct VTT
  const vttLink = downloadLink.replace('/download/', '/download/subformat-vtt/subencoding-utf8/');
  const res = await fetch(vttLink, { headers: { 'User-Agent': OS_ORG_UA } });
  if (!res.ok) return null;

  // Response may be gzip; fetch API auto-decompresses in most runtimes
  const content = await res.text();
  // Log out
  xmlRpcRequest(xmlRpcCall('LogOut', [token])).catch(() => {});
  return content ? { content, source: 'opensubtitles_org', alreadyVtt: true } : null;
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

/**
 * Extract first subtitle file from a ZIP archive.
 * Minimal ZIP parser — finds local file headers and extracts deflate-compressed entries.
 */
async function extractSubtitleFromZip(buffer) {
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder('utf-8');
  let offset = 0;

  while (offset < bytes.length - 4) {
    // Local file header signature: 0x04034b50
    if (bytes[offset] === 0x50 && bytes[offset+1] === 0x4b && bytes[offset+2] === 0x03 && bytes[offset+3] === 0x04) {
      const compression = bytes[offset+8] | (bytes[offset+9] << 8);
      const compressedSize = bytes[offset+18] | (bytes[offset+19] << 8) | (bytes[offset+20] << 16) | (bytes[offset+21] << 24);
      const fnLen = bytes[offset+26] | (bytes[offset+27] << 8);
      const extraLen = bytes[offset+28] | (bytes[offset+29] << 8);
      const filename = decoder.decode(bytes.slice(offset+30, offset+30+fnLen));
      const dataStart = offset + 30 + fnLen + extraLen;
      const compressedData = bytes.slice(dataStart, dataStart + compressedSize);

      if (/\.(srt|vtt|ass|ssa)$/i.test(filename)) {
        let text;
        if (compression === 0) {
          text = decoder.decode(compressedData);
        } else if (compression === 8) {
          try {
            const ds = new DecompressionStream('deflate-raw');
            const writer = ds.writable.getWriter();
            const reader = ds.readable.getReader();
            writer.write(compressedData);
            writer.close();
            const chunks = [];
            let done = false;
            while (!done) {
              const { value, done: d } = await reader.read();
              if (value) chunks.push(value);
              done = d;
            }
            const total = chunks.reduce((a, c) => a + c.length, 0);
            const result = new Uint8Array(total);
            let pos = 0;
            for (const c of chunks) { result.set(c, pos); pos += c.length; }
            text = decoder.decode(result);
          } catch { text = null; }
        }
        if (text) return text;
      }
      offset = dataStart + compressedSize;
    } else {
      offset++;
    }
  }
  return null;
}

/**
 * Extract ALL subtitle files from a ZIP archive.
 * Returns array of { filename, content } for each .srt/.vtt/.ass/.ssa file found.
 */
async function extractAllSubtitlesFromZip(buffer) {
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder('utf-8');
  let offset = 0;
  const entries = [];

  while (offset < bytes.length - 4) {
    if (bytes[offset] === 0x50 && bytes[offset+1] === 0x4b && bytes[offset+2] === 0x03 && bytes[offset+3] === 0x04) {
      const compression = bytes[offset+8] | (bytes[offset+9] << 8);
      const compressedSize = bytes[offset+18] | (bytes[offset+19] << 8) | (bytes[offset+20] << 16) | (bytes[offset+21] << 24);
      const fnLen = bytes[offset+26] | (bytes[offset+27] << 8);
      const extraLen = bytes[offset+28] | (bytes[offset+29] << 8);
      const filename = decoder.decode(bytes.slice(offset+30, offset+30+fnLen));
      const dataStart = offset + 30 + fnLen + extraLen;
      const compressedData = bytes.slice(dataStart, dataStart + compressedSize);

      if (/\.(srt|vtt|ass|ssa)$/i.test(filename)) {
        let text;
        if (compression === 0) {
          text = decoder.decode(compressedData);
        } else if (compression === 8) {
          try {
            const ds = new DecompressionStream('deflate-raw');
            const writer = ds.writable.getWriter();
            const reader = ds.readable.getReader();
            writer.write(compressedData);
            writer.close();
            const chunks = [];
            let done = false;
            while (!done) {
              const { value, done: d } = await reader.read();
              if (value) chunks.push(value);
              done = d;
            }
            const total = chunks.reduce((a, c) => a + c.length, 0);
            const result = new Uint8Array(total);
            let pos = 0;
            for (const c of chunks) { result.set(c, pos); pos += c.length; }
            text = decoder.decode(result);
          } catch { text = null; }
        }
        if (text) entries.push({ filename, content: text });
      }
      offset = dataStart + compressedSize;
    } else {
      offset++;
    }
  }
  return entries;
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
 * @param {ProgressFn} [options.onProgress]
 * @returns {Promise<{ total, success, fail, skipped, results }>
 */
export async function bulkDownloadSubtitles(env, type, tmdbId, options = {}) {
  const { languages = ['id', 'en'], imdbId, title, onProgress } = options;
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
    if (!tmdbKey) throw new Error('TMDB_API_KEY not configured');
    const tvRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?language=en-US`, {
      headers: { Authorization: `Bearer ${tmdbKey}` },
    });
    if (!tvRes.ok) throw new Error('TMDB TV fetch failed');
    const tvData = await tvRes.json();
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

  // 5. Download remaining individual episodes from providers
  const total = jobsRemaining.length;
  report('downloading', 0, total, `Downloading ${total} individual subtitles...`);

  for (let i = 0; i < jobsRemaining.length; i++) {
    const job = jobsRemaining[i];
    report('downloading', i, total, `S${job.season}:E${job.episode} · ${LANG_NAMES[job.lang] || job.lang}`);
    try {
      const existing = await getOrFetchSubtitle(env, 'tv', tmdbId, job.lang, {
        season: job.season, episode: job.episode, imdbId, title,
      });
      if (existing) {
        results.push({ season: job.season, episode: job.episode, lang: job.lang, success: true, url: existing.url, cached: existing.cached });
        success++;
      } else {
        results.push({ season: job.season, episode: job.episode, lang: job.lang, success: false, message: 'Not found' });
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
 * Search subtitles from all providers without downloading.
 * Returns merged results sorted by download count.
 */
export async function searchSubtitlesFromProviders(env, type, tmdbId, options = {}) {
  const { season, episode, imdbId, lang } = options;
  const creds = await resolveProviderCredentials(env);
  const results = [];

  // 1. OpenSubtitles.com — search without language filter (returns all langs)
  try {
    if (creds.opensubtitles_com.apiKey && creds.opensubtitles_com.username && creds.opensubtitles_com.password) {
      const token = await osComLogin(creds.opensubtitles_com);
      if (token) {
        try {
          const params = new URLSearchParams({ tmdb_id: String(tmdbId), type: type === 'tv' ? 'episode' : 'movie' });
          if (lang) params.set('languages', LANG_MAP[lang] || lang);
          if (season !== undefined) params.set('season_number', String(season));
          if (episode !== undefined) params.set('episode_number', String(episode));
          let subs = [];
          const res = await fetch(`${OS_COM_BASE}/subtitles?${params}`, {
            headers: { 'Api-Key': creds.opensubtitles_com.apiKey, Authorization: `Bearer ${token}`, 'User-Agent': 'HIJISTREAM/1.0' },
          });
          if (res.ok) subs = (await res.json()).data || [];
          // Fallback: search by IMDB ID
          if (!subs.length && imdbId) {
            const p2 = new URLSearchParams({ imdb_id: imdbId.replace(/^tt/, ''), type: type === 'tv' ? 'episode' : 'movie' });
            if (lang) p2.set('languages', LANG_MAP[lang] || lang);
            if (season !== undefined) p2.set('season_number', String(season));
            if (episode !== undefined) p2.set('episode_number', String(episode));
            const r2 = await fetch(`${OS_COM_BASE}/subtitles?${p2}`, {
              headers: { 'Api-Key': creds.opensubtitles_com.apiKey, Authorization: `Bearer ${token}`, 'User-Agent': 'HIJISTREAM/1.0' },
            });
            if (r2.ok) subs = (await r2.json()).data || [];
          }
          for (const s of subs.slice(0, 15)) {
            const attr = s.attributes || {};
            const file = attr.files?.[0] || {};
            const subLang = LANG_MAP[lang] ? lang : (Object.entries(LANG_MAP).find(([, v]) => v === (attr.language || file.language || ''))?.[0] || attr.language || 'en');
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
          }
        } catch { /* skip */ }
      }
    }
  } catch { /* skip provider */ }

  // 2. OpenSubtitles.org — search top 3 languages (API requires sublanguageid)
  try {
    if (creds.opensubtitles_org.username && creds.opensubtitles_org.password) {
      const token = await osOrgLogin(creds.opensubtitles_org);
      if (token) {
        const searchLangs = lang ? [lang] : ['id', 'en', 'ja'];
        for (const l of searchLangs) {
          try {
            const subs = await osOrgSearch(token, tmdbId, type, l, season, episode, imdbId);
            for (const s of subs.slice(0, 10)) {
              results.push({
                provider: 'opensubtitles_org',
                lang: l,
                langName: LANG_NAMES[l] || l,
                title: s.SubFileName || s.SubDownloadLink?.split('/').pop() || '',
                downloadCount: Number(s.SubDownloadsCnt || 0),
                rating: Number(s.SubRating || 0),
                format: s.SubFormat || 'srt',
                size: Number(s.SubSize || 0),
                fileId: s.SubDownloadLink || null,
                fps: s.FPS || null,
                hearingImpaired: s.HearingImpaired === '1',
              });
            }
          } catch { /* skip lang */ }
        }
        xmlRpcRequest(xmlRpcCall('LogOut', [token])).catch(() => {});
      }
    }
  } catch { /* skip provider */ }

  // 3. Subdl — search without language filter (returns all langs)
  try {
    if (creds.subdl.apiKey) {
      try {
        const params = new URLSearchParams({ api_key: creds.subdl.apiKey, tmdb_id: String(tmdbId), type });
        if (lang) params.set('languages', lang.toUpperCase());
        if (type === 'tv') {
          if (season !== undefined) params.set('season_number', String(season));
          if (episode !== undefined) params.set('episode_number', String(episode));
        }
        const res = await fetch(`${SUBDL_BASE}/subtitles?${params}`, { headers: { 'User-Agent': 'HIJISTREAM/1.0' } });
        if (res.ok) {
          const data = await res.json();
          const subs = data.subtitles || [];
          for (const s of subs.slice(0, 15)) {
            const subLang = (s.lang || s.language || 'en').toLowerCase();
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
          }
        }
      } catch { /* skip */ }
    }
  } catch { /* skip provider */ }

  // Sort by download count descending
  results.sort((a, b) => b.downloadCount - a.downloadCount);
  return results;
}

/**
 * Download a specific subtitle by provider + fileId.
 * Used after user selects from search results.
 */
export async function downloadSubtitleByProvider(env, provider, fileId, type, tmdbId, lang, options = {}) {
  const { season, episode, imdbId, title } = options;
  const creds = await resolveProviderCredentials(env);
  let result = null;

  if (provider === 'opensubtitles_com' && fileId) {
    const token = await osComLogin(creds.opensubtitles_com);
    if (token) {
      const content = await osComDownload(creds.opensubtitles_com, token, fileId);
      if (content) result = { content, source: 'opensubtitles_com' };
    }
  } else if (provider === 'opensubtitles_org' && fileId) {
    const vttLink = fileId.replace('/download/', '/download/subformat-vtt/subencoding-utf8/');
    const res = await fetch(vttLink, { headers: { 'User-Agent': OS_ORG_UA } });
    if (res.ok) {
      const content = await res.text();
      if (content) result = { content, source: 'opensubtitles_org', alreadyVtt: true };
    }
  } else if (provider === 'subdl' && fileId) {
    const dlUrl = `https://dl.subdl.com${fileId}`;
    const dlRes = await fetch(dlUrl, { headers: { 'User-Agent': 'HIJISTREAM/1.0' } });
    if (dlRes.ok) {
      const blob = await dlRes.arrayBuffer();
      const content = await extractSubtitleFromZip(blob);
      if (content) result = { content, source: 'subdl' };
    }
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
 * Tries providers in order: opensubtitles_com → opensubtitles_org → subdl
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

  // 3. Try providers in order
  const providers = [
    () => fetchFromOsCom(creds.opensubtitles_com, tmdbId, type, lang, season, episode, imdbId),
    () => fetchFromOsOrg(creds.opensubtitles_org, tmdbId, type, lang, season, episode, imdbId),
    () => fetchFromSubdl(creds.subdl, tmdbId, type, lang, season, episode),
  ];

  let result = null;
  let usedSource = null;

  for (const tryProvider of providers) {
    try {
      const r = await tryProvider();
      if (r?.content) { result = r; usedSource = r.source; break; }
    } catch (err) {
      console.error(`[Subtitle] Provider error:`, err.message);
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
    },
    langStats: Object.values(langStats).sort((a, b) => b.total - a.total),
    refreshActivity: Object.entries(refreshActivity).map(([date, count]) => ({ date, count })),
    recentErrors: errorLog.slice(0, 30),
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
      const endpoint = type === 'tv'
        ? `https://api.themoviedb.org/3/tv/${tmdbId}?language=en-US`
        : `https://api.themoviedb.org/3/movie/${tmdbId}?language=en-US`;
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${tmdbKey}` },
      });
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
