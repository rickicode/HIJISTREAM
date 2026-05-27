import cacheManager, { TTL } from './cache';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function fetchWithCache(endpoint, cacheKey, ttl) {
  const cached = cacheManager.get(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${BASE_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  cacheManager.set(cacheKey, data, ttl);
  return data;
}

const api = {
  getLatestMovies(page = 1) {
    return fetchWithCache(
      `/movies/latest/page-${page}.json`,
      `movies_latest_${page}`,
      TTL.CONTENT_LIST
    );
  },

  getTrendingMovies(page = 1) {
    return fetchWithCache(
      `/movies/trending/page-${page}.json`,
      `movies_trending_${page}`,
      TTL.CONTENT_LIST
    );
  },

  getTopRatedMovies(page = 1) {
    return fetchWithCache(
      `/movies/top-rated/page-${page}.json`,
      `movies_top_rated_${page}`,
      TTL.CONTENT_LIST
    );
  },

  getUpcomingMovies(page = 1) {
    return fetchWithCache(
      `/movies/upcoming/page-${page}.json`,
      `movies_upcoming_${page}`,
      TTL.CONTENT_LIST
    );
  },

  getLatestTV(page = 1) {
    return fetchWithCache(
      `/tv/latest/page-${page}.json`,
      `tv_latest_${page}`,
      TTL.CONTENT_LIST
    );
  },

  getTrendingTV(page = 1) {
    return fetchWithCache(
      `/tv/trending/page-${page}.json`,
      `tv_trending_${page}`,
      TTL.CONTENT_LIST
    );
  },

  getTopRatedTV(page = 1) {
    return fetchWithCache(
      `/tv/top-rated/page-${page}.json`,
      `tv_top_rated_${page}`,
      TTL.CONTENT_LIST
    );
  },

  getMovieDetails(id) {
    return fetchWithCache(
      `/movie/${id}.json`,
      `movie_detail_${id}`,
      TTL.CONTENT_DETAIL
    );
  },

  getTVDetails(id) {
    return fetchWithCache(
      `/tv/${id}.json`,
      `tv_detail_${id}`,
      TTL.CONTENT_DETAIL
    );
  },

  async search(query) {
    const cacheKey = `search_${query}`;
    const cached = cacheManager.get(cacheKey);
    if (cached) return cached;

    const response = await fetch(
      `${BASE_URL}/search?query=${encodeURIComponent(query)}`
    );
    if (!response.ok) {
      throw new Error(`Search Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    cacheManager.set(cacheKey, data, TTL.SEARCH);
    return data;
  },
};

export default api;
