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

// ─── Podnapisi Provider (Free, no auth) ─────────────────────────────────────

export class PodnapisiProvider extends SubtitleProvider {
  constructor() {
    super('podnapisi', 'Podnapisi');
    this.baseUrl = 'https://podnapisi.net/subtitles';
  }

  async search(video, languages) {
    try {
      const keyword = video.title || '';
      if (!keyword) return [];

      const results = [];
      
      for (const lang of languages) {
        try {
          const params = new URLSearchParams({ sXML: '1', sL: lang, sK: keyword });
          if (video.type === 'tv') {
            if (video.season) params.set('sTS', String(video.season));
            if (video.episode) params.set('sTE', String(video.episode));
          }
          if (video.year) params.set('sY', String(video.year));

          const res = await fetch(`${this.baseUrl}/search/old?${params}`, {
            headers: { 'User-Agent': 'HIJISTREAM/1.0' },
          });
          if (!res.ok) continue;

          const xml = await res.text();
          const subtitles = this._parseXml(xml);
          results.push(...subtitles);
        } catch { /* skip lang */ }
      }

      return results;
    } catch { return []; }
  }

  async download(subtitle) {
    if (!subtitle.fileId) return null;

    try {
      const res = await fetch(`${this.baseUrl}/${subtitle.fileId}/download?container=zip`, {
        headers: { 'User-Agent': 'HIJISTREAM/1.0' },
      });
      if (!res.ok) return null;

      const blob = await res.arrayBuffer();
      return await this._extractFromZip(blob);
    } catch { return null; }
  }

  _parseXml(xml) {
    const results = [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      const subtitles = doc.querySelectorAll('subtitle');

      for (const sub of subtitles) {
        const pid = sub.querySelector('pid')?.textContent || '';
        const lang = sub.querySelector('language')?.textContent || 'en';
        const release = sub.querySelector('release')?.textContent || '';
        const title = sub.querySelector('title')?.textContent || '';
        const flags = sub.querySelector('flags')?.textContent || '';
        const tvSeason = sub.querySelector('tvSeason')?.textContent || '0';
        const tvEpisode = sub.querySelector('tvEpisode')?.textContent || '0';
        const year = sub.querySelector('year')?.textContent || '0';

        results.push({
          provider: 'podnapisi',
          id: pid,
          lang: lang.toLowerCase(),
          langName: LANG_NAMES[lang.toLowerCase()] || lang,
          title: release || title,
          downloadCount: 0,
          rating: 0,
          format: 'srt',
          size: 0,
          fileId: pid,
          hearingImpaired: flags.includes('n'),
        });
      }
    } catch { /* parse error */ }
    return results;
  }

  async _extractFromZip(buffer) {
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
providerRegistry.register(new PodnapisiProvider());

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
