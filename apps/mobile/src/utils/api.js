import cacheManager, { TTL } from './cache';
import { getCurrentLanguage, getApiLanguageParam } from './language';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://hijistream-web.vercel.app/api';

function filterValidItems(items) {
  if (!Array.isArray(items)) return [];
  return items.filter(item => item && item.id && item.title && item.title.trim() !== '');
}

async function fetchWithCache(endpoint, cacheKey, ttl) {
  const lang = await getCurrentLanguage();
  const langCacheKey = `${cacheKey}_${lang}`;

  const cached = await cacheManager.get(langCacheKey);
  if (cached) return cached;

  const separator = endpoint.includes('?') ? '&' : '?';
  const langParam = getApiLanguageParam(lang);
  const url = `${BASE_URL}${endpoint}${separator}language=${langParam}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data && Array.isArray(data.items)) {
    data.items = filterValidItems(data.items);
  }

  await cacheManager.set(langCacheKey, data, ttl);
  return data;
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
};

export default api;
