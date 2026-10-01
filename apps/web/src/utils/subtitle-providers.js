/**
 * Subtitle Provider Registry — Bazarr-inspired architecture
 * 
 * Each provider implements:
 * - search(video, languages) → Subtitle[]
 * - download(subtitle) → string (content)
 * - getConfig() → ProviderConfig
 * - isEnabled() → boolean
 */

const LANG_MAP = { id: 'id', en: 'en', es: 'es', pt: 'pt', hi: 'hi', ja: 'ja', ko: 'ko' };
const LANG_MAP_3 = { id: 'ind', en: 'eng', es: 'spa', pt: 'por', hi: 'hin', ja: 'jpn', ko: 'kor' };
const LANG_NAMES = { id: 'Indonesian', en: 'English', es: 'Spanish', pt: 'Portuguese', hi: 'Hindi', ja: 'Japanese', ko: 'Korean' };

// ─── Base Provider Class ─────────────────────────────────────────────────────

export class SubtitleProvider {
  constructor(name, displayName) {
    this.name = name;
    this.displayName = displayName;
    this._enabled = true;
    this._throttled = false;
    this._throttleUntil = 0;
  }

  get enabled() { return this._enabled && !this._throttled; }
  set enabled(val) { this._enabled = val; }

  throttle(durationMs) {
    this._throttled = true;
    this._throttleUntil = Date.now() + durationMs;
  }

  checkThrottle() {
    if (this._throttled && Date.now() >= this._throttleUntil) {
      this._throttled = false;
    }
    return this._throttled;
  }

  async search(video, languages) {
    throw new Error(`${this.name}.search() not implemented`);
  }

  async download(subtitle) {
    throw new Error(`${this.name}.download() not implemented`);
  }

  getConfig() {
    return { name: this.name, displayName: this.displayName, enabled: this._enabled };
  }
}

// ─── OpenSubtitles.com Provider ──────────────────────────────────────────────

export class OpenSubtitlesComProvider extends SubtitleProvider {
  constructor() {
    super('opensubtitles_com', 'OpenSubtitles.com');
    this.baseUrl = 'https://api.opensubtitles.com/api/v1';
  }

  async search(video, languages, creds) {
    if (!creds?.apiKey || !creds?.username || !creds?.password) return [];
    
    try {
      // Login
      const loginRes = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Api-Key': creds.apiKey, 'User-Agent': 'HIJISTREAM/1.0' },
        body: JSON.stringify({ username: creds.username, password: creds.password }),
      });
      if (!loginRes.ok) return [];
      const { token } = await loginRes.json();
      
      // Search
      const params = new URLSearchParams({ tmdb_id: String(video.tmdbId), type: video.type === 'tv' ? 'episode' : 'movie' });
      if (languages.length === 1) params.set('languages', LANG_MAP[languages[0]] || languages[0]);
      if (video.season !== undefined) params.set('season_number', String(video.season));
      if (video.episode !== undefined) params.set('episode_number', String(video.episode));
      
      const searchRes = await fetch(`${this.baseUrl}/subtitles?${params}`, {
        headers: { 'Api-Key': creds.apiKey, Authorization: `Bearer ${token}`, 'User-Agent': 'HIJISTREAM/1.0' },
      });
      if (!searchRes.ok) return [];
      
      const { data } = await searchRes.json();
      return (data || []).map(s => ({
        provider: this.name,
        id: s.id,
        lang: this._normalizeLang(s.attributes?.language),
        title: s.attributes?.release || '',
        downloadCount: s.attributes?.download_count || 0,
        rating: s.attributes?.ratings || 0,
        format: s.attributes?.files?.[0]?.format || 'srt',
        size: s.attributes?.files?.[0]?.file_size || 0,
        fileId: s.attributes?.files?.[0]?.file_id,
        hearingImpaired: s.attributes?.files?.[0]?.hearing_impaired || false,
      }));
    } catch { return []; }
  }

  async download(subtitle, creds) {
    if (!subtitle.fileId || !creds?.apiKey) return null;
    
    try {
      const loginRes = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Api-Key': creds.apiKey, 'User-Agent': 'HIJISTREAM/1.0' },
        body: JSON.stringify({ username: creds.username, password: creds.password }),
      });
      if (!loginRes.ok) return null;
      const { token } = await loginRes.json();
      
      const dlRes = await fetch(`${this.baseUrl}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Api-Key': creds.apiKey, Authorization: `Bearer ${token}`, 'User-Agent': 'HIJISTREAM/1.0' },
        body: JSON.stringify({ file_id: subtitle.fileId }),
      });
      if (!dlRes.ok) return null;
      const { link } = await dlRes.json();
      if (!link) return null;
      
      const fileRes = await fetch(link);
      return fileRes.ok ? await fileRes.text() : null;
    } catch { return null; }
  }

  _normalizeLang(raw) {
    if (!raw) return 'en';
    const s = raw.toLowerCase().trim();
    if (LANG_MAP[s]) return s;
    const by639_2 = Object.entries(LANG_MAP_3).find(([, v]) => v === s);
    if (by639_2) return by639_2[0];
    if (s.startsWith('ind') || s.includes('indonesi')) return 'id';
    if (s.startsWith('eng') || s.includes('english')) return 'en';
    if (s.startsWith('spa') || s.includes('spanish')) return 'es';
    if (s.startsWith('por') || s.includes('portugu')) return 'pt';
    if (s.startsWith('hin') || s.includes('hindi')) return 'hi';
    if (s.startsWith('jpn') || s.includes('japanese')) return 'ja';
    if (s.startsWith('kor') || s.includes('korean')) return 'ko';
    return s.slice(0, 2);
  }
}

// ─── Subdl Provider ──────────────────────────────────────────────────────────

export class SubdlProvider extends SubtitleProvider {
  constructor() {
    super('subdl', 'Subdl');
    this.baseUrl = 'https://api.subdl.com/api/v1';
  }

  async search(video, languages, creds) {
    if (!creds?.apiKey) return [];
    
    try {
      const params = new URLSearchParams({ api_key: creds.apiKey, tmdb_id: String(video.tmdbId), type: video.type });
      if (languages.length === 1) params.set('languages', (LANG_MAP[languages[0]] || languages[0]).toUpperCase());
      if (video.type === 'tv') {
        if (video.season !== undefined) params.set('season_number', String(video.season));
        if (video.episode !== undefined) params.set('episode_number', String(video.episode));
      }
      
      const res = await fetch(`${this.baseUrl}/subtitles?${params}`, { headers: { 'User-Agent': 'HIJISTREAM/1.0' } });
      if (!res.ok) return [];
      
      const { subtitles } = await res.json();
      return (subtitles || []).map(s => ({
        provider: this.name,
        id: s.url,
        lang: this._normalizeLang(s.lang || s.language),
        title: s.release_name || '',
        downloadCount: s.download_count || 0,
        rating: 0,
        format: s.format || 'srt',
        size: 0,
        fileId: s.url,
        hearingImpaired: false,
      }));
    } catch { return []; }
  }

  async download(subtitle, creds) {
    if (!subtitle.fileId || !creds?.apiKey) return null;
    
    try {
      const res = await fetch(`https://dl.subdl.com${subtitle.fileId}`, { headers: { 'User-Agent': 'HIJISTREAM/1.0' } });
      if (!res.ok) return null;
      
      const blob = await res.arrayBuffer();
      return await this._extractFromZip(blob);
    } catch { return null; }
  }

  async _extractFromZip(buffer) {
    // Simplified ZIP extraction — find first .srt/.vtt file
    const bytes = new Uint8Array(buffer);
    const decoder = new TextDecoder('utf-8');
    let offset = 0;
    
    while (offset < bytes.length - 4) {
      if (bytes[offset] === 0x50 && bytes[offset+1] === 0x4b && bytes[offset+2] === 0x03 && bytes[offset+3] === 0x04) {
        const compression = bytes[offset+8] | (bytes[offset+9] << 8);
        const compressedSize = bytes[offset+18] | (bytes[offset+19] << 8) | (bytes[offset+20] << 16) | (bytes[offset+21] << 24);
        const fnLen = bytes[offset+26] | (bytes[offset+27] << 8);
        const extraLen = bytes[offset+28] | (bytes[offset+29] << 8);
        const filename = decoder.decode(bytes.slice(offset+30, offset+30+fnLen));
        const dataStart = offset + 30 + fnLen + extraLen;
        const compressedData = bytes.slice(dataStart, dataStart + compressedSize);
        
        if (/\.(srt|vtt)$/i.test(filename)) {
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
      } else { offset++; }
    }
    return null;
  }

  _normalizeLang(raw) {
    if (!raw) return 'en';
    const s = raw.toLowerCase().trim();
    if (LANG_MAP[s]) return s;
    if (s.startsWith('ind') || s.includes('indonesi')) return 'id';
    if (s.startsWith('eng') || s.includes('english')) return 'en';
    if (s.startsWith('spa') || s.includes('spanish')) return 'es';
    if (s.startsWith('por') || s.includes('portugu')) return 'pt';
    if (s.startsWith('hin') || s.includes('hindi')) return 'hi';
    if (s.startsWith('jpn') || s.includes('japanese')) return 'ja';
    if (s.startsWith('kor') || s.includes('korean')) return 'ko';
    return s.slice(0, 2);
  }
}

// ─── YIFY Subtitles Provider (Free, Movie only, by IMDB ID) ─────────────────

const YIFY_LANG_SLUGS = {
  id: 'indonesian', en: 'english', es: 'spanish', pt: 'portuguese',
  hi: 'hindi', ja: 'japanese', ko: 'korean', fr: 'french',
  de: 'german', it: 'italian', ru: 'russian', ar: 'arabic',
};

export class YifyProvider extends SubtitleProvider {
  constructor() {
    super('yify', 'YIFY Subtitles');
    this.baseUrl = 'https://yifysubtitles.ch';
  }

  async search(video, languages) {
    // Movies only — YIFY does not host TV episodes
    if (video.type === 'tv' || !video.imdbId) return [];

    try {
      const imdbId = video.imdbId.startsWith('tt') ? video.imdbId : `tt${video.imdbId}`;
      const res = await fetch(`${this.baseUrl}/movie-imdb/${imdbId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        },
      });
      if (!res.ok) return [];
      const html = await res.text();

      const results = [];
      for (const lang of languages) {
        const slug = YIFY_LANG_SLUGS[lang.toLowerCase()] || lang.toLowerCase();
        const re = new RegExp(`href="(/subtitles/[^"]*?-${slug}-yify-\\d+)"`, 'g');
        let m;
        const seen = new Set();
        while ((m = re.exec(html)) !== null) {
          const path = m[1];
          if (seen.has(path)) continue;
          seen.add(path);
          const slugID = path.split('/').pop();
          results.push({
            provider: this.name,
            id: slugID,
            lang,
            langName: LANG_NAMES[lang] || lang,
            title: slugID,
            downloadCount: 0,
            rating: 0,
            format: 'srt',
            size: 0,
            fileId: slugID,
            hearingImpaired: false,
          });
          if (results.length >= 10) break;
        }
      }
      return results;
    } catch { return []; }
  }

  async download(subtitle) {
    if (!subtitle.fileId) return null;
    try {
      const url = `${this.baseUrl}/subtitle/${subtitle.fileId}.zip`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        },
      });
      if (!res.ok) return null;
      const blob = await res.arrayBuffer();
      return await this._extractFromZip(blob);
    } catch { return null; }
  }

  async _extractFromZip(buffer) {
    const MAX_UNCOMPRESSED = 4 * 1024 * 1024;
    const bytes = new Uint8Array(buffer);
    const decoder = new TextDecoder('utf-8');
    let offset = 0;

    while (offset < bytes.length - 4) {
      if (bytes[offset] === 0x50 && bytes[offset+1] === 0x4b && bytes[offset+2] === 0x03 && bytes[offset+3] === 0x04) {
        const compression = bytes[offset+8] | (bytes[offset+9] << 8);
        const compressedSize = bytes[offset+18] | (bytes[offset+19] << 8) | (bytes[offset+20] << 16) | (bytes[offset+21] << 24);
        const uncompressedSize = bytes[offset+22] | (bytes[offset+23] << 8) | (bytes[offset+24] << 16) | (bytes[offset+25] << 24);
        const fnLen = bytes[offset+26] | (bytes[offset+27] << 8);
        const extraLen = bytes[offset+28] | (bytes[offset+29] << 8);
        const filename = decoder.decode(bytes.slice(offset+30, offset+30+fnLen));
        const dataStart = offset + 30 + fnLen + extraLen;
        const compressedData = bytes.slice(dataStart, dataStart + compressedSize);

        if (uncompressedSize > MAX_UNCOMPRESSED || compressedSize > MAX_UNCOMPRESSED) {
          offset = dataStart + compressedSize;
          continue;
        }

        if (/\.(srt|vtt)$/i.test(filename)) {
          let text = null;
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
              let totalLen = 0;
              while (!done) {
                const { value, done: d } = await reader.read();
                if (value) {
                  totalLen += value.length;
                  if (totalLen > MAX_UNCOMPRESSED) break;
                  chunks.push(value);
                }
                done = d;
              }
              if (totalLen <= MAX_UNCOMPRESSED) {
                const result = new Uint8Array(totalLen);
                let pos = 0;
                for (const c of chunks) { result.set(c, pos); pos += c.length; }
                text = decoder.decode(result);
              }
            } catch { text = null; }
          }
          if (text && text.includes('-->')) return text;
        }
        offset = dataStart + compressedSize;
      } else { offset++; }
    }
    return null;
  }
}

// ─── SubtitleCat Provider (Free, Movie & TV, direct .srt) ───────────────────

export class SubtitleCatProvider extends SubtitleProvider {
  constructor() {
    super('subtitlecat', 'SubtitleCat');
    this.baseUrl = 'https://www.subtitlecat.com';
  }

  async search(video, languages) {
    const title = video.title || '';
    if (!title) return [];

    try {
      let query = title;
      if (video.type === 'tv') {
        const s = String(video.season || 1).padStart(2, '0');
        const e = String(video.episode || 1).padStart(2, '0');
        query = `${title} S${s}E${e}`;
      }

      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeout = controller ? setTimeout(() => controller.abort(), 18000) : null;

      const res = await fetch(`${this.baseUrl}/index.php?search=${encodeURIComponent(query)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        },
        signal: controller?.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) return [];
      const html = await res.text();

      const detailMatches = Array.from(html.matchAll(/href="(subs\/\d+\/[^"]+\.html)"/g)).map(m => m[1]);
      if (detailMatches.length === 0) return [];

      const results = [];
      const seen = new Set();
      const targetLangs = new Set(languages.map(l => (l.toLowerCase() === 'in' ? 'id' : l.toLowerCase())));

      for (const detailPath of detailMatches.slice(0, 6)) {
        try {
          const detailRes = await fetch(`${this.baseUrl}/${detailPath}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            },
          });
          if (!detailRes.ok) continue;
          const detailHtml = await detailRes.text();
          const fileMatches = Array.from(detailHtml.matchAll(/href="(\/subs\/\d+\/[^"]+-([a-zA-Z]{2}|[a-zA-Z]{2}-[a-zA-Z]{2})\.srt)"/g));

          for (const fm of fileMatches) {
            const srtPath = fm[1];
            let srtLang = fm[2].toLowerCase();
            if (srtLang === 'in') srtLang = 'id';
            if (targetLangs.size > 0 && !targetLangs.has(srtLang)) continue;
            if (seen.has(srtPath)) continue;
            seen.add(srtPath);

            const filename = srtPath.split('/').pop();
            results.push({
              provider: this.name,
              id: filename,
              lang: srtLang,
              langName: LANG_NAMES[srtLang] || srtLang,
              title: filename,
              downloadCount: 0,
              rating: 0,
              format: 'srt',
              size: 0,
              fileId: srtPath,
              hearingImpaired: false,
            });
          }
          if (results.length >= 10) break;
        } catch { /* continue next detail */ }
      }
      return results;
    } catch { return []; }
  }

  async download(subtitle) {
    if (!subtitle.fileId) return null;
    try {
      const url = subtitle.fileId.startsWith('http') ? subtitle.fileId : `${this.baseUrl}${subtitle.fileId}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        },
      });
      if (!res.ok) return null;
      const text = await res.text();
      return text && text.includes('-->') ? text : null;
    } catch { return null; }
  }
}

// ─── AI Translation Provider (AxonRouter / OpenAI LLM) ──────────────────────

export class AiTranslateProvider extends SubtitleProvider {
  constructor() {
    super('ai_translate', 'AI Translation');
  }

  async search() {
    // Translation is a synthesis step, not an upstream candidate repository
    return [];
  }

  async download() {
    return null;
  }
}

// ─── Provider Registry ───────────────────────────────────────────────────────

class ProviderRegistryClass {
  constructor() {
    this.providers = new Map();
  }

  register(provider) {
    this.providers.set(provider.name, provider);
  }

  get(name) {
    return this.providers.get(name);
  }

  getAll() {
    return Array.from(this.providers.values());
  }

  getEnabled() {
    return this.getAll().filter(p => p.enabled);
  }

  getByName(name) {
    return this.providers.get(name);
  }
}

export const providerRegistry = new ProviderRegistryClass();

// Register built-in providers
providerRegistry.register(new OpenSubtitlesComProvider());
providerRegistry.register(new SubdlProvider());
providerRegistry.register(new YifyProvider());
providerRegistry.register(new SubtitleCatProvider());
providerRegistry.register(new AiTranslateProvider());

// ─── Subtitle Scoring (Bazarr-inspired) ──────────────────────────────────────

export const DEFAULT_SCORES = {
  hash: 359,           // Perfect hash match (file identity)
  series: 180,         // Series name match
  title: 60,           // Movie title match
  year: 90,            // Year match
  season: 30,          // Season match
  episode: 30,         // Episode match
  release_group: 15,   // Release group match
  source: 7,           // Source quality match (BluRay, WEB-DL, etc.)
  audio_codec: 3,      // Audio codec match
  resolution: 2,       // Resolution match
  video_codec: 2,      // Video codec match
  hearing_impaired: 1, // Hearing impaired preference
  streaming_service: 0,// Streaming service match
  language: 40,        // Requested language matches the subtitle language
  preferred_source: 25,// Provider that already delivered this title (R2 metadata)
};

/**
 * Compute subtitle score based on release name matching.
 * Simplified version of Bazarr's scoring algorithm.
 */
export function computeScore(subtitle, video) {
  const matches = new Set();
  let score = 0;
  
  const releaseName = (subtitle.title || '').toLowerCase();
  const videoName = (video.title || '').toLowerCase();
  
  // Title/series match
  if (videoName && releaseName.includes(videoName)) {
    matches.add('title');
    score += video.type === 'tv' ? DEFAULT_SCORES.series : DEFAULT_SCORES.title;
  }
  
  // Year match
  if (video.year && releaseName.includes(String(video.year))) {
    matches.add('year');
    score += DEFAULT_SCORES.year;
  }
  
  // Season/Episode match (TV only)
  if (video.type === 'tv') {
    const seasonEp = `s${String(video.season).padStart(2, '0')}e${String(video.episode).padStart(2, '0')}`;
    if (releaseName.includes(seasonEp)) {
      matches.add('season');
      matches.add('episode');
      score += DEFAULT_SCORES.season + DEFAULT_SCORES.episode;
    }
  }
  // Requested-language match — the provider list is unfiltered when the user
  // searches across all languages, so language is the strongest usable signal.
  if (video.lang && subtitle.lang === video.lang) {
    matches.add('language');
    score += DEFAULT_SCORES.language;
  }

  // Provider preference for this title, remembered server-side in R2 metadata.
  if (video.preferredProvider && subtitle.provider === video.preferredProvider) {
    matches.add('preferred_source');
    score += DEFAULT_SCORES.preferred_source;
  }

  // Download count bonus (normalized)
  const dlBonus = Math.min(20, Math.floor((subtitle.downloadCount || 0) / 100));
  score += dlBonus;
  
  return { score, matches: Array.from(matches) };
}

/**
 * Sort subtitles by score and return best match.
 */
export function rankSubtitles(subtitles, video) {
  return subtitles
    .map(sub => ({ ...sub, ...computeScore(sub, video) }))
    .sort((a, b) => b.score - a.score);
}
