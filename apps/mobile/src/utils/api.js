import cacheManager, { TTL } from './cache';

const BASE_URL = 'https://vidapi.ru';

async function fetchWithCache(endpoint, cacheKey, ttl) {
  const cached = await cacheManager.get(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${BASE_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  await cacheManager.set(cacheKey, data, ttl);
  return data;
}

const api = {
  // Movies - all use /movies/latest/ with page offsets for different categories
  getLatestMovies(page = 1) {
    return fetchWithCache(
      `/movies/latest/page-${page}.json`,
      `movies_latest_${page}`,
      TTL.CONTENT_LIST
    );
  },

  getTrendingMovies(page = 1) {
    const offset = page + 10;
    return fetchWithCache(
      `/movies/latest/page-${offset}.json`,
      `movies_trending_${page}`,
      TTL.CONTENT_LIST
    );
  },

  getTopRatedMovies(page = 1) {
    const offset = page + 20;
    return fetchWithCache(
      `/movies/latest/page-${offset}.json`,
      `movies_toprated_${page}`,
      TTL.CONTENT_LIST
    );
  },

  getUpcomingMovies(page = 1) {
    const offset = page + 30;
    return fetchWithCache(
      `/movies/latest/page-${offset}.json`,
      `movies_upcoming_${page}`,
      TTL.CONTENT_LIST
    );
  },

  // TV Shows - use /tvshows/latest/ (NOT /tv/latest/)
  getLatestTV(page = 1) {
    return fetchWithCache(
      `/tvshows/latest/page-${page}.json`,
      `tv_latest_${page}`,
      TTL.CONTENT_LIST
    );
  },

  getTrendingTV(page = 1) {
    const offset = page + 10;
    return fetchWithCache(
      `/tvshows/latest/page-${offset}.json`,
      `tv_trending_${page}`,
      TTL.CONTENT_LIST
    );
  },

  getTopRatedTV(page = 1) {
    const offset = page + 20;
    return fetchWithCache(
      `/tvshows/latest/page-${offset}.json`,
      `tv_toprated_${page}`,
      TTL.CONTENT_LIST
    );
  },

  // Movie details - no detail endpoint available, search from cached lists
  async getMovieDetails(id) {
    const cacheKey = `movie_detail_${id}`;
    const cached = await cacheManager.get(cacheKey);
    if (cached) return cached;

    // Try to find in cached list pages
    for (let p = 1; p <= 5; p++) {
      const listCacheKey = `movies_latest_${p}`;
      const listData = await cacheManager.get(listCacheKey);
      if (listData && listData.items) {
        const found = listData.items.find(
          (item) => String(item.tmdb_id) === String(id) || item.imdb_id === id
        );
        if (found) {
          await cacheManager.set(cacheKey, found, TTL.CONTENT_DETAIL);
          return found;
        }
      }
    }

    // Fallback: fetch page 1 and search
    const data = await fetchWithCache(
      `/movies/latest/page-1.json`,
      `movies_latest_1`,
      TTL.CONTENT_LIST
    );
    const found = data.items.find(
      (item) => String(item.tmdb_id) === String(id) || item.imdb_id === id
    );
    if (found) {
      await cacheManager.set(cacheKey, found, TTL.CONTENT_DETAIL);
      return found;
    }

    // Not found - return minimal fallback
    const fallback = {
      tmdb_id: id,
      imdb_id: null,
      title: `Movie ${id}`,
      year: '',
      poster_url: '',
      rating: '',
      genre: '',
      type: 'movie',
      embed_url: `https://vaplayer.ru/embed/movie/${id}`,
    };
    await cacheManager.set(cacheKey, fallback, TTL.CONTENT_DETAIL);
    return fallback;
  },

  // TV details - same approach
  async getTVDetails(id) {
    const cacheKey = `tv_detail_${id}`;
    const cached = await cacheManager.get(cacheKey);
    if (cached) return cached;

    for (let p = 1; p <= 5; p++) {
      const listCacheKey = `tv_latest_${p}`;
      const listData = await cacheManager.get(listCacheKey);
      if (listData && listData.items) {
        const found = listData.items.find(
          (item) => String(item.tmdb_id) === String(id) || item.imdb_id === id
        );
        if (found) {
          await cacheManager.set(cacheKey, found, TTL.CONTENT_DETAIL);
          return found;
        }
      }
    }

    const data = await fetchWithCache(
      `/tvshows/latest/page-1.json`,
      `tv_latest_1`,
      TTL.CONTENT_LIST
    );
    const found = data.items.find(
      (item) => String(item.tmdb_id) === String(id) || item.imdb_id === id
    );
    if (found) {
      await cacheManager.set(cacheKey, found, TTL.CONTENT_DETAIL);
      return found;
    }

    const fallback = {
      tmdb_id: id,
      imdb_id: null,
      title: `TV Show ${id}`,
      year: '',
      poster_url: '',
      rating: '',
      genre: '',
      type: 'tv',
      embed_url: `https://vaplayer.ru/embed/tv/${id}`,
    };
    await cacheManager.set(cacheKey, fallback, TTL.CONTENT_DETAIL);
    return fallback;
  },

  // Search - client-side filter from cached data
  async search(query) {
    const cacheKey = `search_${query.toLowerCase()}`;
    const cached = await cacheManager.get(cacheKey);
    if (cached) return cached;

    const q = query.toLowerCase();
    const results = [];

    // Search in movies (first 5 pages)
    for (let p = 1; p <= 5; p++) {
      try {
        const data = await fetchWithCache(
          `/movies/latest/page-${p}.json`,
          `movies_latest_${p}`,
          TTL.CONTENT_LIST
        );
        if (data && data.items) {
          const matches = data.items.filter((item) =>
            item.title.toLowerCase().includes(q)
          );
          results.push(...matches.map((m) => ({ ...m, _detectedType: 'movie' })));
        }
      } catch {
        break;
      }
    }

    // Search in TV shows (first 5 pages)
    for (let p = 1; p <= 5; p++) {
      try {
        const data = await fetchWithCache(
          `/tvshows/latest/page-${p}.json`,
          `tv_latest_${p}`,
          TTL.CONTENT_LIST
        );
        if (data && data.items) {
          const matches = data.items.filter((item) =>
            item.title.toLowerCase().includes(q)
          );
          results.push(...matches.map((m) => ({ ...m, _detectedType: 'tv' })));
        }
      } catch {
        break;
      }
    }

    const searchResult = { items: results, total: results.length };
    await cacheManager.set(cacheKey, searchResult, TTL.SEARCH);
    return searchResult;
  },
};

export default api;
