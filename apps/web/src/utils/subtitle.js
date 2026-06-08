/**
 * Subtitle Service
 *
 * Auto-download subtitles via OpenSubtitles API and cache them in Cloudflare R2.
 * Subtitles are converted to WebVTT format and served from a public R2 bucket.
 *
 * Env vars required:
 *   OPENSUBTITLES_API_KEY
 *   OPENSUBTITLES_USERNAME
 *   OPENSUBTITLES_PASSWORD
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET_NAME
 *   R2_PUBLIC_URL      (e.g. https://pub-xxxxx.r2.dev)
 */

const OS_BASE = 'https://api.opensubtitles.com/api/v1';

// Language map: app locale → OpenSubtitles language code
const LANG_MAP = {
  id: 'id',
  en: 'en',
  es: 'es',
  pt: 'pt',
  hi: 'hi',
  ja: 'ja',
  ko: 'ko',
};

// ============================================================
//  AWS SigV4 signing for R2 S3-compatible API
// ============================================================

async function sha256Hex(data) {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    typeof data === 'string' ? new TextEncoder().encode(data) : data
  );
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmac(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    typeof key === 'string' ? new TextEncoder().encode(key) : key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    typeof data === 'string' ? new TextEncoder().encode(data) : data
  );
}

function toHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = await hmac('AWS4' + key, dateStamp);
  const kRegion = await hmac(kDate, regionName);
  const kService = await hmac(kRegion, serviceName);
  const kSigning = await hmac(kService, 'aws4_request');
  return kSigning;
}

/**
 * Sign an S3 request using AWS Signature V4.
 * Works on both Vercel Edge and Cloudflare Workers via Web Crypto API.
 */
async function signS3(method, path, headers, body, accessKeyId, secretAccessKey, region, service, dateStr) {
  const payloadHash = await sha256Hex(body || '');

  const allHeaders = {
    ...headers,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': dateStr + 'T000000Z',
  };

  // Determine host
  const host = path.startsWith('http')
    ? new URL(path).host
    : (headers.host || '');
  if (host) {
    allHeaders.host = host;
  }

  const canonicalUri = path.startsWith('http') ? new URL(path).pathname : path;
  const canonicalQueryString = '';
  const sortedKeys = Object.keys(allHeaders).sort();
  const canonicalHeaders = sortedKeys.map((k) => `${k.toLowerCase()}:${allHeaders[k]}\n`).join('');
  const signedHeaders = sortedKeys.map((k) => k.toLowerCase()).join(';');
  const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStr}/${region}/${service}/aws4_request`;
  const stringToSign = `${algorithm}\n${dateStr}T000000Z\n${credentialScope}\n${await sha256Hex(canonicalRequest)}`;
  const signingKey = await getSignatureKey(secretAccessKey, dateStr, region, service);
  const signature = toHex(await hmac(signingKey, stringToSign));
  const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { authorization, payloadHash };
}

/**
 * Upload a subtitle file to R2 using S3-compatible PUT.
 */
async function r2PutObject(env, key, body, contentType) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const path = `/${env.R2_BUCKET_NAME}/${key}`;
  const url = `${endpoint}${path}`;

  const bodyBytes = typeof body === 'string'
    ? new TextEncoder().encode(body)
    : body;

  const { authorization, payloadHash } = await signS3(
    'PUT',
    path,
    {
      'content-type': contentType,
      'content-length': String(bodyBytes.byteLength || bodyBytes.length),
      host: new URL(endpoint).host,
    },
    bodyBytes,
    env.R2_ACCESS_KEY_ID,
    env.R2_SECRET_ACCESS_KEY,
    'auto',
    's3',
    dateStr
  );

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: authorization,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': dateStr + 'T000000Z',
      'content-type': contentType,
      'content-length': String(bodyBytes.byteLength || bodyBytes.length),
    },
    body: bodyBytes,
  });

  return response.ok;
}

/**
 * Get the public R2 URL for a subtitle key.
 */
function getR2PublicUrl(env, key) {
  const base = env.R2_PUBLIC_URL.replace(/\/+$/, '');
  return `${base}/${key}`;
}

// ============================================================
//  OpenSubtitles API v2
// ============================================================

/**
 * Login to OpenSubtitles and get an auth token.
 */
async function openSubtitlesLogin(env) {
  const res = await fetch(`${OS_BASE}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': env.OPENSUBTITLES_API_KEY,
      'User-Agent': 'HIJISTREAM/1.0',
    },
    body: JSON.stringify({
      username: env.OPENSUBTITLES_USERNAME,
      password: env.OPENSUBTITLES_PASSWORD,
    }),
  });

  if (!res.ok) {
    console.error(`[Subtitle] OpenSubtitles login failed: ${res.status}`);
    return null;
  }

  const data = await res.json();
  return data.token || null;
}

/**
 * Search for subtitles on OpenSubtitles.
 * For TV shows, pass season_number and episode_number in params.
 */
async function openSubtitlesSearch(env, token, tmdbId, type, lang, extraParams = {}) {
  const osLang = LANG_MAP[lang] || lang;

  const params = new URLSearchParams({
    tmdb_id: String(tmdbId),
    type: type === 'tv' ? 'episode' : 'movie',
    languages: osLang,
  });

  // Add season/episode for TV
  if (extraParams.season_number !== undefined) {
    params.set('season_number', String(extraParams.season_number));
  }
  if (extraParams.episode_number !== undefined) {
    params.set('episode_number', String(extraParams.episode_number));
  }

  const res = await fetch(`${OS_BASE}/subtitles?${params}`, {
    headers: {
      'Api-Key': env.OPENSUBTITLES_API_KEY,
      Authorization: `Bearer ${token}`,
      'User-Agent': 'HIJISTREAM/1.0',
    },
  });

  if (!res.ok) {
    console.error(`[Subtitle] OpenSubtitles search failed: ${res.status}`);
    return [];
  }

  const data = await res.json();
  return data.data || [];
}

/**
 * Get download link and fetch subtitle file content.
 */
async function openSubtitlesDownload(env, token, fileId) {
  const res = await fetch(`${OS_BASE}/download`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': env.OPENSUBTITLES_API_KEY,
      Authorization: `Bearer ${token}`,
      'User-Agent': 'HIJISTREAM/1.0',
    },
    body: JSON.stringify({ file_id: fileId }),
  });

  if (!res.ok) {
    console.error(`[Subtitle] OpenSubtitles download link failed: ${res.status}`);
    return null;
  }

  const data = await res.json();
  if (!data.link) return null;

  // Download the actual subtitle file
  const fileRes = await fetch(data.link);
  if (!fileRes.ok) return null;
  return await fileRes.text();
}

// ============================================================
//  Subtitle Processing
// ============================================================

/**
 * Convert SRT subtitle format to WebVTT.
 * SRT: 00:00:01,000 --> 00:00:04,000
 * VTT:  00:00:01.000 --> 00:00:04.000
 */
function srtToVtt(srt) {
  if (!srt || srt.trim().length === 0) return '';
  let vtt = srt;
  // Strip BOM if present
  vtt = vtt.replace(/^\uFEFF/, '');
  // Replace comma with dot in timestamps (SRT: 00:00:01,000 → VTT: 00:00:01.000)
  vtt = vtt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  // Add WEBVTT header if not present
  if (!vtt.startsWith('WEBVTT')) {
    vtt = 'WEBVTT\n\n' + vtt;
  }
  return vtt;
}

// ============================================================
//  R2 Key & URL helpers
// ============================================================

function getSubtitleKey(type, id, lang, season, episode) {
  if (type === 'tv' && season !== undefined && episode !== undefined) {
    return `subtitles/tv/${id}/${season}/${episode}/${lang}.vtt`;
  }
  return `subtitles/movie/${id}/${lang}.vtt`;
}

// ============================================================
//  Metadata Management (R2 JSON file)
// ============================================================

const METADATA_KEY = 'subtitles/metadata.json';

const LANG_NAMES = {
  id: 'Indonesian',
  en: 'English',
  es: 'Spanish',
  pt: 'Portuguese',
  hi: 'Hindi',
  ja: 'Japanese',
  ko: 'Korean',
};

function generateId(type, tmdbId, lang, season, episode) {
  const base = `${type}_${tmdbId}_${lang}`;
  if (type === 'tv' && season !== undefined && episode !== undefined) {
    return `${base}_s${season}e${episode}`;
  }
  return base;
}

/**
 * Read subtitle metadata from R2 metadata.json.
 */
export async function readMetadata(env) {
  const url = getR2PublicUrl(env, METADATA_KEY);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      // File doesn't exist yet — return empty
      return { version: 1, updatedAt: null, subtitleCount: 0, subtitles: [] };
    }
    return await res.json();
  } catch {
    return { version: 1, updatedAt: null, subtitleCount: 0, subtitles: [] };
  }
}

/**
 * Write subtitle metadata back to R2.
 */
export async function writeMetadata(env, metadata) {
  metadata.updatedAt = new Date().toISOString();
  metadata.subtitleCount = metadata.subtitles?.length || 0;
  const json = JSON.stringify(metadata, null, 2);
  return r2PutObject(env, METADATA_KEY, json, 'application/json; charset=utf-8');
}

/**
 * Add or update a subtitle entry in metadata.
 */
export async function addToMetadata(env, entry) {
  try {
    const metadata = await readMetadata(env);
    const existingIdx = metadata.subtitles.findIndex((s) => s.id === entry.id);
    if (existingIdx >= 0) {
      metadata.subtitles[existingIdx] = { ...metadata.subtitles[existingIdx], ...entry };
    } else {
      metadata.subtitles.push(entry);
    }
    return await writeMetadata(env, metadata);
  } catch (err) {
    console.error('[Metadata] Failed to add entry:', err.message);
    return false;
  }
}

/**
 * Remove a subtitle entry from metadata.
 */
export async function removeFromMetadata(env, id) {
  try {
    const metadata = await readMetadata(env);
    metadata.subtitles = metadata.subtitles.filter((s) => s.id !== id);
    return await writeMetadata(env, metadata);
  } catch (err) {
    console.error('[Metadata] Failed to remove entry:', err.message);
    return false;
  }
}

/**
 * Delete a subtitle file from R2.
 */
export async function deleteSubtitleFile(env, key) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const path = `/${env.R2_BUCKET_NAME}/${key}`;
  const url = `${endpoint}${path}`;

  const { authorization, payloadHash } = await signS3(
    'DELETE',
    path,
    { host: new URL(endpoint).host },
    null,
    env.R2_ACCESS_KEY_ID,
    env.R2_SECRET_ACCESS_KEY,
    'auto',
    's3',
    dateStr
  );

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: authorization,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': dateStr + 'T000000Z',
    },
  });

  return response.ok || response.status === 204;
}

// ============================================================
//  Manual Upload
// ============================================================

/**
 * Handle manual subtitle upload: convert to VTT, upload to R2, update metadata.
 *
 * @param {object} env
 * @param {object} params
 * @param {string} params.type - 'movie' or 'tv'
 * @param {string|number} params.tmdbId
 * @param {string} params.lang - Language code
 * @param {string} params.content - Raw subtitle content (SRT or VTT)
 * @param {string} [params.imdbId]
 * @param {string} [params.title]
 * @param {number} [params.season]
 * @param {number} [params.episode]
 * @returns {Promise<{url:string, lang:string, format:string}|null>}
 */
export async function handleUploadSubtitle(env, params) {
  const { type, tmdbId, lang, content, imdbId, title, season, episode } = params;

  if (!type || !tmdbId || !lang || !content) {
    console.error('[Upload] Missing required params');
    return null;
  }

  const key = getSubtitleKey(type, tmdbId, lang, season, episode);
  const publicUrl = getR2PublicUrl(env, key);

  // Detect if content is SRT or already VTT
  const isSrt = /\d{2}:\d{2}:\d{2},\d{3}\s*-->/.test(content);
  const vttContent = isSrt ? srtToVtt(content) : content;

  if (!vttContent || vttContent.trim().length === 0) {
    console.error('[Upload] Empty content after conversion');
    return null;
  }

  // Ensure VTT header
  let finalContent = vttContent;
  if (!finalContent.startsWith('WEBVTT')) {
    finalContent = 'WEBVTT\n\n' + finalContent;
  }

  // Upload to R2
  const uploaded = await r2PutObject(env, key, finalContent, 'text/vtt; charset=utf-8');
  if (!uploaded) {
    console.error('[Upload] Failed to upload to R2');
    return null;
  }

  // Update metadata
  const entry = {
    id: generateId(type, tmdbId, lang, season, episode),
    type,
    tmdbId: Number(tmdbId),
    imdbId: imdbId || null,
    title: title || null,
    lang,
    langName: LANG_NAMES[lang] || lang,
    key,
    url: publicUrl,
    format: 'vtt',
    season: season ?? null,
    episode: episode ?? null,
    downloadedAt: new Date().toISOString(),
    source: 'manual',
  };
  await addToMetadata(env, entry).catch((err) => {
    console.error('[Upload] Failed to write metadata:', err.message);
  });

  return { url: publicUrl, lang, format: 'vtt' };
}

// ============================================================
//  Main Public API
// ============================================================

/**
 * Get or fetch subtitle for a given content.
 *
 * @param {object}  env              - Environment variables
 * @param {string}  type             - 'movie' or 'tv'
 * @param {string|number} tmdbId     - TMDB content ID
 * @param {string}  lang             - Language code (id, en, ja, etc.)
 * @param {object}  [options]
 * @param {number}  [options.season]
 * @param {number}  [options.episode]
 * @param {string}  [options.imdbId] - Optional IMDB ID for better OpenSubtitles matching
 * @param {string}  [options.title]  - Content title for metadata
 * @param {boolean} [options.force]  - Skip R2 cache check, always re-download
 * @returns {Promise<{url:string, lang:string, format:string, cached:boolean}|null>}
 */
export async function getOrFetchSubtitle(env, type, tmdbId, lang, options = {}) {
  const { season, episode, title, force } = options;
  const key = getSubtitleKey(type, tmdbId, lang, season, episode);
  const publicUrl = getR2PublicUrl(env, key);

  // 1. Check if already cached in R2 (HEAD request to public URL)
  // Skip when force=true (used by refreshSubtitle to force re-download)
  if (!force) {
    try {
      const headRes = await fetch(publicUrl, { method: 'HEAD' });
      if (headRes.ok) {
        return { url: publicUrl, lang, format: 'vtt', cached: true };
      }
    } catch {
      // Network error — proceed to download from OpenSubtitles
    }
  }

  // 2. Not in R2 — download from OpenSubtitles
  const token = await openSubtitlesLogin(env);
  if (!token) {
    const errMsg = 'OpenSubtitles login failed';
    console.error('[Subtitle]', errMsg);
    await appendErrorLog(env, { type: 'login_failed', message: errMsg, subtitleId: generateId(type, tmdbId, lang, season, episode), lang }).catch(() => {});
    return null;
  }

  const extraParams = {};
  if (type === 'tv') {
    if (season !== undefined) extraParams.season_number = season;
    if (episode !== undefined) extraParams.episode_number = episode;
  }

  // Search by TMDB ID
  let subs = await openSubtitlesSearch(env, token, tmdbId, type, lang, extraParams);

  // If no results and we have IMDB ID, try searching by IMDB ID instead
  if ((!subs || subs.length === 0) && options.imdbId) {
    const imdbNumeric = options.imdbId.replace(/^tt/, '');
    const params = new URLSearchParams({
      imdb_id: imdbNumeric,
      type: type === 'tv' ? 'episode' : 'movie',
      languages: LANG_MAP[lang] || lang,
    });
    if (extraParams.season_number) params.set('season_number', String(extraParams.season_number));
    if (extraParams.episode_number) params.set('episode_number', String(extraParams.episode_number));

    const res = await fetch(`${OS_BASE}/subtitles?${params}`, {
      headers: {
        'Api-Key': env.OPENSUBTITLES_API_KEY,
        Authorization: `Bearer ${token}`,
        'User-Agent': 'HIJISTREAM/1.0',
      },
    });
    if (res.ok) {
      const data = await res.json();
      subs = data.data || [];
    }
  }

  if (!subs || subs.length === 0) {
    const msg = `No subtitles found for ${type}/${tmdbId} (${lang})`;
    console.log(`[Subtitle] ${msg}`);
    await appendErrorLog(env, { type: 'not_found', message: msg, subtitleId: generateId(type, tmdbId, lang, season, episode), lang }).catch(() => {});
    return null;
  }

  // 3. Pick best match (prefer higher download count)
  const bestSub = subs.sort((a, b) => {
    const aCount = a.attributes?.download_count || 0;
    const bCount = b.attributes?.download_count || 0;
    return bCount - aCount;
  })[0];

  const files = bestSub?.attributes?.files;
  if (!files || files.length === 0) {
    console.log('[Subtitle] No files in subtitle entry');
    return null;
  }

  const fileId = files[0].file_id;
  if (!fileId) return null;

  // 4. Download subtitle content
  const content = await openSubtitlesDownload(env, token, fileId);
  if (!content) {
    const msg = 'Failed to download subtitle file from OpenSubtitles';
    console.error('[Subtitle]', msg);
    await appendErrorLog(env, { type: 'download_failed', message: msg, subtitleId: generateId(type, tmdbId, lang, season, episode), lang }).catch(() => {});
    return null;
  }

  // 5. Convert SRT to WebVTT
  const vttContent = srtToVtt(content);
  if (!vttContent) {
    console.error('[Subtitle] Empty subtitle content after conversion');
    return null;
  }

  // 6. Upload to R2
  const uploaded = await r2PutObject(env, key, vttContent, 'text/vtt; charset=utf-8');
  if (!uploaded) {
    console.error('[Subtitle] Failed to upload to R2');
    return null;
  }

  // 7. Write metadata entry
  const entry = {
    id: generateId(type, tmdbId, lang, season, episode),
    type,
    tmdbId: Number(tmdbId),
    imdbId: options.imdbId || null,
    title: title || null,
    lang,
    langName: LANG_NAMES[lang] || lang,
    key,
    url: publicUrl,
    format: 'vtt',
    season: season ?? null,
    episode: episode ?? null,
    downloadedAt: new Date().toISOString(),
    source: 'opensubtitles',
  };
  await addToMetadata(env, entry).catch((err) => {
    console.error('[Subtitle] Failed to write metadata:', err.message);
  });

  return { url: publicUrl, lang, format: 'vtt', cached: false };
}

/**
 * Get subtitles for multiple languages at once.
 * Returns only the ones that were found.
 */
/**
 * Refresh a subtitle: delete old file from R2, re-download from OpenSubtitles, upload new.
 * Uses the metadata entry to know what content + language to re-fetch.
 *
 * @param {object} env
 * @param {object} entry - Subtitle metadata entry (contains id, type, tmdbId, etc.)
 * @returns {Promise<{url:string, lang:string, format:string, cached:boolean}|null>}
 */
/**
 * Update a single field in a metadata entry.
 */
export async function updateMetadataEntry(env, id, updates) {
  const metadata = await readMetadata(env);
  const idx = metadata.subtitles.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  metadata.subtitles[idx] = { ...metadata.subtitles[idx], ...updates };
  return writeMetadata(env, metadata);
}

/**
 * Refresh a subtitle: delete old file from R2, re-download from OpenSubtitles, upload new.
 * Updates refreshedAt timestamp on success.
 *
 * @param {object} env
 * @param {object} entry - Subtitle metadata entry (contains id, type, tmdbId, etc.)
 * @returns {Promise<{url:string, lang:string, format:string, cached:boolean}|null>}
 */
export async function refreshSubtitle(env, entry) {
  if (!entry || !entry.id) {
    console.error('[Refresh] Invalid entry');
    return null;
  }

  // Download fresh from OpenSubtitles (force=true skips R2 cache, overwrites old file)
  const result = await getOrFetchSubtitle(env, entry.type, entry.tmdbId, entry.lang, {
    season: entry.season || undefined,
    episode: entry.episode || undefined,
    imdbId: entry.imdbId || undefined,
    title: entry.title || undefined,
    force: true,
  });

  if (result) {
    // Update refreshedAt timestamp in metadata
    const now = new Date().toISOString();
    await updateMetadataEntry(env, entry.id, { refreshedAt: now }).catch(() => {});
    console.log(`[Refresh] Successfully refreshed subtitle: ${entry.id}`);
  } else {
    console.error(`[Refresh] Failed to refresh subtitle: ${entry.id}`);
  }

  return result;
}

/**
 * Refresh all OpenSubtitles-sourced subtitles at once.
 * Returns array of {id, title, lang, status: 'ok'|'fail'}.
 */
export async function refreshAllSubtitles(env) {
  const metadata = await readMetadata(env);
  const toRefresh = metadata.subtitles.filter(
    (s) => s.source === 'opensubtitles' || !s.source
  );

  const results = [];
  for (const entry of toRefresh) {
    const result = await refreshSubtitle(env, entry);
    results.push({
      id: entry.id,
      title: entry.title || `TMDB #${entry.tmdbId}`,
      lang: entry.lang,
      status: result ? 'ok' : 'fail',
    });
  }

  return { total: toRefresh.length, ok: results.filter((r) => r.status === 'ok').length, fail: results.filter((r) => r.status === 'fail').length, results };
}

// ============================================================
//  Monitoring & Logs
// ============================================================

const ERROR_LOG_KEY = 'subtitles/error-log.json';
const MAX_LOG_ENTRIES = 200;

/**
 * Read error log from R2.
 */
export async function readErrorLog(env) {
  const url = getR2PublicUrl(env, ERROR_LOG_KEY);
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Append an entry to the error log. Keeps at most MAX_LOG_ENTRIES.
 */
export async function appendErrorLog(env, entry) {
  try {
    const log = await readErrorLog(env);
    log.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    });
    // Trim to max
    if (log.length > MAX_LOG_ENTRIES) log.length = MAX_LOG_ENTRIES;
    const json = JSON.stringify(log, null, 2);
    await r2PutObject(env, ERROR_LOG_KEY, json, 'application/json; charset=utf-8');
  } catch (err) {
    console.error('[ErrorLog] Failed to append:', err.message);
  }
}

/**
 * Clear error log.
 */
export async function clearErrorLog(env) {
  const json = JSON.stringify([], null, 2);
  return r2PutObject(env, ERROR_LOG_KEY, json, 'application/json; charset=utf-8');
}

/**
 * Get monitoring dashboard data.
 * Aggregates metadata + error logs into a comprehensive response.
 */
export async function getMonitoringData(env) {
  const metadata = await readMetadata(env);
  const errorLog = await readErrorLog(env);
  const subtitles = metadata.subtitles || [];

  // ── Per-language stats ──
  const langStats = {};
  subtitles.forEach((s) => {
    if (!langStats[s.lang]) {
      langStats[s.lang] = { lang: s.lang, total: 0, refreshed: 0, manual: 0, opensubtitles: 0, errors: 0 };
    }
    langStats[s.lang].total++;
    if (s.refreshedAt) langStats[s.lang].refreshed++;
    if (s.source === 'manual') langStats[s.lang].manual++;
    else langStats[s.lang].opensubtitles++;
  });

  // Count errors per language from error log
  errorLog.forEach((e) => {
    const l = e.lang || 'unknown';
    if (langStats[l]) langStats[l].errors++;
  });

  // ── Refresh activity (last 14 days) ──
  const refreshActivity = {};
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    refreshActivity[d.toISOString().slice(0, 10)] = 0;
  }
  subtitles.forEach((s) => {
    const date = (s.refreshedAt || s.downloadedAt || '').slice(0, 10);
    if (refreshActivity[date] !== undefined) refreshActivity[date]++;
  });

  // ── Source health ──
  const totalManual = subtitles.filter((s) => s.source === 'manual').length;
  const totalOS = subtitles.filter((s) => s.source !== 'manual').length;

  return {
    summary: {
      totalSubtitles: subtitles.length,
      totalMovies: subtitles.filter((s) => s.type === 'movie').length,
      totalTV: subtitles.filter((s) => s.type === 'tv').length,
      totalLanguages: Object.keys(langStats).length,
      totalManual,
      totalOS,
      totalRefreshed: subtitles.filter((s) => s.refreshedAt).length,
      totalErrors: errorLog.length,
    },
    langStats: Object.values(langStats).sort((a, b) => b.total - a.total),
    refreshActivity: Object.entries(refreshActivity).map(([date, count]) => ({ date, count })),
    recentErrors: errorLog.slice(0, 30),
  };
}

export async function getOrFetchSubtitles(env, type, tmdbId, languages, options = {}) {
  const results = [];
  for (const lang of languages) {
    const sub = await getOrFetchSubtitle(env, type, tmdbId, lang, options);
    if (sub) results.push(sub);
  }
  return results;
}
