import cacheManager, { TTL } from './cache';
import { getCurrentLanguage, getApiLanguageParam } from './language';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

function filterValidItems(items) {
  if (!Array.isArray(items)) return [];
  return items.filter(item => item && item.id && item.title && item.title.trim() !== '');
}

export { filterValidItems };

function fetchWithCache(endpoint, cacheKey, ttl) {
  const lang = getCurrentLanguage();
  const langCacheKey = `${cacheKey}_${lang}`;

  const cached = cacheManager.get(langCacheKey);
  if (cached) return Promise.resolve(cached);

  const separator = endpoint.includes('?') ? '&' : '?';
  const langParam = getApiLanguageParam(lang);
  const url = `${BASE_URL}${endpoint}${separator}language=${langParam}`;

  return fetch(url).then(response => {
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Content not found or has been removed');
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }).then(data => {
    if (data && Array.isArray(data.items)) {
      data.items = filterValidItems(data.items);
    }
    cacheManager.set(langCacheKey, data, ttl);
    return data;
  });
}

export const TMDB_COUNTRIES = [
  { code: 'korea', iso: 'KR', flag: '🇰🇷' },
  { code: 'japan', iso: 'JP', flag: '🇯🇵' },
  { code: 'india', iso: 'IN', flag: '🇮🇳' },
  { code: 'usa', iso: 'US', flag: '🇺🇸' },
  { code: 'brazil', iso: 'BR', flag: '🇧🇷' },
  { code: 'mexico', iso: 'MX', flag: '🇲🇽' },
  { code: 'indonesia', iso: 'ID', flag: '🇮🇩' },
  { code: 'uk', iso: 'GB', flag: '🇬🇧' },
  { code: 'france', iso: 'FR', flag: '🇫🇷' },
  { code: 'germany', iso: 'DE', flag: '🇩🇪' },
  { code: 'china', iso: 'CN', flag: '🇨🇳' },
  { code: 'thailand', iso: 'TH', flag: '🇹🇭' },
  { code: 'turkey', iso: 'TR', flag: '🇹🇷' },
  { code: 'nigeria', iso: 'NG', flag: '🇳🇬' },
];

export const GENRE_IDS = {
  action: 28, adventure: 12, animation: 16, comedy: 35, crime: 80,
  documentary: 99, drama: 18, family: 10751, fantasy: 14, history: 36,
  horror: 27, music: 10402, mystery: 9648, romance: 10749,
  scienceFiction: 878, tvMovie: 10770, thriller: 53, war: 10752, western: 37,
};

export const SORT_OPTIONS = [
  { id: 'popularity.desc', label: 'filters.popular' },
  { id: 'vote_average.desc', label: 'filters.topRated' },
  { id: 'primary_release_date.desc', label: 'filters.newest' },
  { id: 'revenue.desc', label: 'filters.revenue' },
];

const api = {
  getPopularMovies(page = 1) {
    return fetchWithCache(`/movies/popular?page=${page}`, `movies_popular_${page}`, TTL.CONTENT_LIST);
  },
  getTrendingMovies(page = 1) {
    return fetchWithCache(`/movies/trending?page=${page}`, `movies_trending_${page}`, TTL.CONTENT_LIST);
  },
  getTopRatedMovies(page = 1) {
    return fetchWithCache(`/movies/top-rated?page=${page}`, `movies_toprated_${page}`, TTL.CONTENT_LIST);
  },
  getUpcomingMovies(page = 1) {
    return fetchWithCache(`/movies/upcoming?page=${page}`, `movies_upcoming_${page}`, TTL.CONTENT_LIST);
  },
  getPopularTV(page = 1) {
    return fetchWithCache(`/tv/popular?page=${page}`, `tv_popular_${page}`, TTL.CONTENT_LIST);
  },
  getTrendingTV(page = 1) {
    return fetchWithCache(`/tv/trending?page=${page}`, `tv_trending_${page}`, TTL.CONTENT_LIST);
  },
  getTopRatedTV(page = 1) {
    return fetchWithCache(`/tv/top-rated?page=${page}`, `tv_toprated_${page}`, TTL.CONTENT_LIST);
  },
  getMovieDetails(id) {
    return fetchWithCache(`/movie/${id}`, `movie_detail_${id}`, TTL.CONTENT_DETAIL);
  },
  getTVDetails(id) {
    return fetchWithCache(`/tv/${id}`, `tv_detail_${id}`, TTL.CONTENT_DETAIL);
  },
  getTVSeason(id, season) {
    return fetchWithCache(`/tv/${id}/season/${season}`, `tv_season_${id}_${season}`, TTL.CONTENT_DETAIL);
  },
  getMovieRecommendations(id) {
    return fetchWithCache(`/movies/${id}/recommendations`, `movie_recommendations_${id}`, TTL.CONTENT_LIST);
  },
  getTVRecommendations(id) {
    return fetchWithCache(`/tv/${id}/recommendations`, `tv_recommendations_${id}`, TTL.CONTENT_LIST);
  },
  getAnimeTrending(page = 1) {
    return fetchWithCache(`/anime/trending?page=${page}`, `anime_trending_${page}`, TTL.CONTENT_LIST);
  },
  getAnimeOngoing(page = 1) {
    return fetchWithCache(`/anime/ongoing?page=${page}`, `anime_ongoing_${page}`, TTL.CONTENT_LIST);
  },
  getAnimeTopRated(page = 1) {
    return fetchWithCache(`/anime/top-rated?page=${page}`, `anime_toprated_${page}`, TTL.CONTENT_LIST);
  },
  getTVOnTheAir(page = 1) {
    return fetchWithCache(`/tv/on-the-air?page=${page}`, `tv_ontheair_${page}`, TTL.CONTENT_LIST);
  },
  search(query, page = 1) {
    return fetchWithCache(`/search?query=${encodeURIComponent(query)}&page=${page}`, `search_${query}_${page}`, TTL.SEARCH);
  },
  getGenres(type = 'movie') {
    return fetchWithCache(`/genres/${type}`, `genres_${type}`, TTL.CONTENT_LIST);
  },
  getDiscoverByCountry(type = 'movie', countryCode, page = 1, sortBy = 'popularity.desc') {
    return fetchWithCache(
      `/discover/${type}?with_origin_country=${countryCode}&page=${page}&sort_by=${sortBy}${sortBy === 'vote_average.desc' ? '&vote_count.gte=50' : ''}`,
      `discover_country_${type}_${countryCode}_${page}_${sortBy}`,
      TTL.CONTENT_LIST
    );
  },
  getDiscoverByGenre(type = 'movie', genreId, page = 1, sortBy = 'popularity.desc') {
    return fetchWithCache(
      `/discover/${type}?with_genres=${genreId}&page=${page}&sort_by=${sortBy}${sortBy === 'vote_average.desc' ? '&vote_count.gte=50' : ''}`,
      `discover_genre_${type}_${genreId}_${page}_${sortBy}`,
      TTL.CONTENT_LIST
    );
  },

  /**
   * Fetch subtitle URLs for a movie or TV episode.
   * @param {object} params
   * @param {'movie'|'tv'} params.type
   * @param {string|number} params.tmdbId
   * @param {string} params.lang - Language code(s), comma-separated
   * @param {number} [params.season] - For TV
   * @param {number} [params.episode] - For TV
   * @param {string} [params.imdbId] - Optional IMDB ID for better matching
   * @returns {Promise<{subtitles: Array<{url:string, lang:string, format:string, cached:boolean}>}>}
   */
  getSubtitles({ type, tmdbId, lang = 'id', season, episode, imdbId }) {
    const params = new URLSearchParams({ type, tmdb_id: String(tmdbId), lang });
    if (season !== undefined) params.set('season', String(season));
    if (episode !== undefined) params.set('episode', String(episode));
    if (imdbId) params.set('imdb_id', imdbId);

    const cacheKey = `subtitles_${type}_${tmdbId}_${lang}${season ? `_s${season}` : ''}${episode ? `_e${episode}` : ''}`;
    return fetchWithCache(`/subtitles?${params}`, cacheKey, TTL.CONTENT_DETAIL);
  },

  /**
   * Search subtitles from all providers without downloading.
   */
  searchSubtitles({ type, tmdbId, lang = '', season, episode, imdbId }) {
    const params = new URLSearchParams({ type, tmdb_id: String(tmdbId) });
    if (lang) params.set('lang', lang);
    if (season !== undefined) params.set('season', String(season));
    if (episode !== undefined) params.set('episode', String(episode));
    if (imdbId) params.set('imdb_id', imdbId);
    return fetch(`${BASE_URL}/subtitles/search?${params}`, {
      headers: { 'Cache-Control': 'no-store' },
    }).then(res => {
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    });
  },

  /**
   * Download a specific subtitle from a provider by fileId.
   */
  downloadSubtitle({ provider, fileId, type, tmdbId, lang, imdbId, title, season, episode }) {
    return fetch(`${BASE_URL}/subtitles/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider, file_id: fileId, type, tmdb_id: String(tmdbId), lang,
        imdb_id: imdbId || null, title: title || null,
        season: season || null, episode: episode || null,
      }),
    }).then(res => {
      if (!res.ok) return res.json().then(d => { throw new Error(d.error || 'Download failed'); });
      return res.json();
    });
  },

  // ============================================================
  // Admin API
  // ============================================================

  /**
   * Get stored admin auth header from localStorage.
   */
  _getAdminAuth() {
    const stored = localStorage.getItem('hijistream_admin_auth');
    return stored || '';
  },

  /**
   * Save admin credentials to localStorage.
   */
  setAdminAuth(username, password) {
    const encoded = btoa(`${username}:${password}`);
    localStorage.setItem('hijistream_admin_auth', `Basic ${encoded}`);
  },

  /**
   * Clear stored admin auth.
   */
  clearAdminAuth() {
    localStorage.removeItem('hijistream_admin_auth');
  },

  /**
   * Check if admin is authenticated.
   */
  isAdminAuthenticated() {
    return !!localStorage.getItem('hijistream_admin_auth');
  },

  /**
   * Fetch all subtitle metadata from admin API.
   */
  getAdminSubtitles() {
    return fetch(`${BASE_URL}/admin/subtitles`, {
      headers: { Authorization: this._getAdminAuth() },
    }).then((res) => {
      if (res.status === 401 || res.status === 403) {
        this.clearAdminAuth();
        throw new Error('Unauthorized');
      }
      if (!res.ok) throw new Error('Failed to fetch subtitles');
      return res.json();
    });
  },

  /**
   * Delete a subtitle by ID.
   */
  deleteAdminSubtitle(id) {
    return fetch(`${BASE_URL}/admin/subtitles`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this._getAdminAuth(),
      },
      body: JSON.stringify({ id }),
    }).then((res) => {
      if (!res.ok) throw new Error('Failed to delete subtitle');
      return res.json();
    });
  },

  /**
   * Refresh (re-download) a subtitle from OpenSubtitles.
   */
  refreshAdminSubtitle(id) {
    return fetch(`${BASE_URL}/admin/subtitles/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this._getAdminAuth(),
      },
      body: JSON.stringify({ id }),
    }).then((res) => {
      if (!res.ok) return res.json().then((d) => { throw new Error(d.error || 'Refresh failed'); });
      return res.json();
    });
  },

  /**
   * Refresh ALL OpenSubtitles-sourced subtitles at once.
   */
  refreshAllAdminSubtitles() {
    return fetch(`${BASE_URL}/admin/subtitles/refresh-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this._getAdminAuth(),
      },
    }).then((res) => {
      if (!res.ok) throw new Error('Bulk refresh failed');
      return res.json();
    });
  },

  /**
   * Backfill missing titles from TMDB.
   */
  backfillTitles() {
    return fetch(`${BASE_URL}/admin/subtitles/backfill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this._getAdminAuth(),
      },
    }).then((res) => {
      if (!res.ok) throw new Error('Backfill failed');
      return res.json();
    });
  },

  /**
   * Bulk download subtitles for a movie or TV series.
   */
  bulkDownloadSubtitles({ type, tmdbId, languages, seasonFilter, imdbId, title }) {
    return fetch(`${BASE_URL}/admin/subtitles/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this._getAdminAuth(),
      },
      body: JSON.stringify({
        type, tmdb_id: String(tmdbId),
        languages: languages || ['id', 'en'],
        season_filter: seasonFilter || null,
        imdb_id: imdbId || null,
        title: title || null,
      }),
    }).then((res) => {
      if (!res.ok) return res.json().then(d => { throw new Error(d.error || 'Bulk download failed'); });
      return res.json();
    });
  },

  /**
   * Edit subtitle metadata (title, imdbId).
   */
  editAdminSubtitle(id, updates) {
    return fetch(`${BASE_URL}/admin/subtitles/edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this._getAdminAuth(),
      },
      body: JSON.stringify({ id, ...updates }),
    }).then((res) => {
      if (!res.ok) return res.json().then((d) => { throw new Error(d.error || 'Edit failed'); });
      return res.json();
    });
  },

  /**
   * Get monitoring dashboard data.
   */
  getAdminMonitoring() {
    return fetch(`${BASE_URL}/admin/monitoring`, {
      headers: { Authorization: this._getAdminAuth() },
    }).then((res) => {
      if (res.status === 401 || res.status === 403) {
        this.clearAdminAuth();
        throw new Error('Unauthorized');
      }
      if (!res.ok) throw new Error('Failed to fetch monitoring data');
      return res.json();
    });
  },

  getR2Status() {
    return fetch(`${BASE_URL}/admin/r2-status`, {
      headers: { Authorization: this._getAdminAuth() },
    }).then((res) => {
      if (!res.ok) throw new Error('Failed to fetch R2 status');
      return res.json();
    });
  },

  /**
   * Get stored OpenSubtitles settings.
   */
  getAdminSettings() {
    return fetch(`${BASE_URL}/admin/settings`, {
      headers: { Authorization: this._getAdminAuth() },
    }).then((res) => {
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    });
  },

  /**
   * Save OpenSubtitles credentials.
   */
  saveAdminSettings(settings) {
    return fetch(`${BASE_URL}/admin/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: this._getAdminAuth() },
      body: JSON.stringify(settings),
    }).then((res) => {
      if (!res.ok) return res.json().then((d) => { throw new Error(d.error || 'Save failed'); });
      return res.json();
    });
  },

  /**
   * Check OpenSubtitles credentials by attempting login.
   */
  checkOSAccount({ provider, apiKey, username, password }) {
    return fetch(`${BASE_URL}/admin/settings/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: this._getAdminAuth() },
      body: JSON.stringify({ provider, apiKey, username, password }),
    }).then((res) => {
      if (!res.ok) return res.json().then((d) => { throw new Error(d.error || 'Check failed'); });
      return res.json();
    });
  },

  downloadAdminSubtitle({ type, tmdbId, lang, imdbId, title, season, episode }) {
    return fetch(`${BASE_URL}/admin/subtitles/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: this._getAdminAuth() },
      body: JSON.stringify({ type, tmdb_id: String(tmdbId), lang, imdb_id: imdbId || null, title: title || null, season: season || null, episode: episode || null }),
    }).then(res => {
      if (!res.ok) return res.json().then(d => { throw new Error(d.error || 'Download failed'); });
      return res.json();
    });
  },

  /**
   * Upload a subtitle file manually.
   */
  uploadAdminSubtitle({ type, tmdbId, lang, content, imdbId, title, season, episode }) {
    return fetch(`${BASE_URL}/admin/subtitles/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this._getAdminAuth(),
      },
      body: JSON.stringify({
        type,
        tmdb_id: String(tmdbId),
        lang,
        content,
        imdb_id: imdbId || null,
        title: title || null,
        season: season || null,
        episode: episode || null,
      }),
    }).then((res) => {
      if (!res.ok) return res.json().then((d) => { throw new Error(d.error || 'Upload failed'); });
      return res.json();
    });
  },
};

export default api;
