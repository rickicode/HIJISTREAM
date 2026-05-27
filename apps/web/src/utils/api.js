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
  search(query, page = 1) {
    return fetchWithCache(`/search?query=${encodeURIComponent(query)}&page=${page}`, `search_${query}_${page}`, TTL.SEARCH);
  },
};

export default api;
