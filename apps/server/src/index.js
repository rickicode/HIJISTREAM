const PORT = process.env.PORT || 3001;
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org';

// Genre ID mapping (movie + TV)
const GENRE_MAP = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
  10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics',
};

function mapGenreIds(ids) {
  if (!ids || !Array.isArray(ids)) return '';
  return ids.map(id => GENRE_MAP[id] || '').filter(Boolean).join(', ');
}

// In-memory cache
const cache = new Map();
const MAX_CACHE_SIZE = 10000;

// TTL constants (milliseconds)
const TTL = {
  LIST: 300000,        // 5 minutes
  DETAIL: 600000,      // 10 minutes
  SEARCH: 120000,      // 2 minutes
};

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data, ttl) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const keysToDelete = [...cache.keys()].slice(0, cache.size - MAX_CACHE_SIZE + 1);
    for (const k of keysToDelete) {
      cache.delete(k);
    }
  }
  cache.set(key, { data, expiresAt: Date.now() + ttl, createdAt: Date.now() });
}

// Periodic cache cleanup every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now > entry.expiresAt) {
      cache.delete(key);
    }
  }
}, 5 * 60 * 1000);

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// Response transformers
function transformMovieListItem(movie) {
  return {
    id: movie.id,
    title: movie.title,
    year: movie.release_date?.substring(0, 4) || '',
    poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '',
    backdrop_url: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : '',
    rating: movie.vote_average?.toFixed(1) || '0.0',
    genre: mapGenreIds(movie.genre_ids),
    overview: movie.overview || '',
    popularity: movie.popularity,
    type: 'movie',
    embed_url: `https://vaplayer.ru/embed/movie/${movie.id}`,
  };
}

function transformTVListItem(show) {
  return {
    id: show.id,
    title: show.name,
    year: show.first_air_date?.substring(0, 4) || '',
    poster_url: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : '',
    backdrop_url: show.backdrop_path ? `https://image.tmdb.org/t/p/original${show.backdrop_path}` : '',
    rating: show.vote_average?.toFixed(1) || '0.0',
    genre: mapGenreIds(show.genre_ids),
    overview: show.overview || '',
    popularity: show.popularity,
    type: 'tv',
    embed_url: `https://vaplayer.ru/embed/tv/${show.id}`,
  };
}

function transformMovieDetail(movie) {
  return {
    id: movie.id,
    imdb_id: movie.external_ids?.imdb_id || movie.imdb_id || null,
    title: movie.title,
    year: movie.release_date?.substring(0, 4) || '',
    poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '',
    backdrop_url: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : '',
    rating: movie.vote_average?.toFixed(1) || '0.0',
    genre: movie.genres?.map(g => g.name).join(', ') || '',
    overview: movie.overview || '',
    runtime: movie.runtime || null,
    credits: movie.credits?.cast?.slice(0, 10).map(c => ({ name: c.name, character: c.character, profile_path: c.profile_path })) || [],
    type: 'movie',
    embed_url: `https://vaplayer.ru/embed/movie/${movie.id}`,
  };
}

function transformTVDetail(show) {
  return {
    id: show.id,
    title: show.name,
    year: show.first_air_date?.substring(0, 4) || '',
    poster_url: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : '',
    backdrop_url: show.backdrop_path ? `https://image.tmdb.org/t/p/original${show.backdrop_path}` : '',
    rating: show.vote_average?.toFixed(1) || '0.0',
    genre: show.genres?.map(g => g.name).join(', ') || '',
    overview: show.overview || '',
    number_of_seasons: show.number_of_seasons || 0,
    number_of_episodes: show.number_of_episodes || 0,
    credits: show.credits?.cast?.slice(0, 10).map(c => ({ name: c.name, character: c.character, profile_path: c.profile_path })) || [],
    type: 'tv',
    embed_url: `https://vaplayer.ru/embed/tv/${show.id}`,
  };
}

function transformSeason(season, tmdbId) {
  return {
    id: season.id,
    season_number: season.season_number,
    episodes: season.episodes?.map(ep => ({
      id: ep.id,
      episode_number: ep.episode_number,
      name: ep.name,
      overview: ep.overview || '',
      still_path: ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : '',
      air_date: ep.air_date || '',
      runtime: ep.runtime || null,
      embed_url: `https://vaplayer.ru/embed/tv/${tmdbId}/${season.season_number}/${ep.episode_number}`,
    })) || [],
  };
}

function transformSearchResults(data) {
  const items = (data.results || [])
    .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
    .map(item => {
      if (item.media_type === 'movie') return transformMovieListItem(item);
      return transformTVListItem(item);
    });
  return { page: data.page, total_pages: data.total_pages, total_results: data.total_results, items };
}

function wrapPaginatedList(data, items) {
  return { page: data.page, total_pages: data.total_pages, total_results: data.total_results, items };
}

// TMDB API fetch helper
async function fetchTMDB(path, queryParams = {}) {
  const params = new URLSearchParams({ api_key: TMDB_API_KEY, ...queryParams });
  const url = `${TMDB_BASE}${path}?${params.toString()}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'HIJISTREAM/1.0' } });
  if (!res.ok) {
    throw new Error(`TMDB API error: ${res.status}`);
  }
  return res.json();
}

const startTime = Date.now();

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const { pathname } = url;
    const method = req.method;
    const requestStart = Date.now();

    // Handle OPTIONS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // Health endpoint
    if (pathname === '/health') {
      const body = JSON.stringify({
        status: 'ok',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        cache_size: cache.size,
      });
      console.log(`[${new Date().toISOString()}] ${method} ${pathname} 200 - ${Date.now() - requestStart}ms`);
      return new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    // Only handle /api/* routes
    if (!pathname.startsWith('/api')) {
      const body = JSON.stringify({ error: 'Not Found' });
      console.log(`[${new Date().toISOString()}] ${method} ${pathname} 404 - ${Date.now() - requestStart}ms`);
      return new Response(body, {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    // Check TMDB_API_KEY
    if (!TMDB_API_KEY) {
      const body = JSON.stringify({ error: 'TMDB_API_KEY not configured' });
      console.log(`[${new Date().toISOString()}] ${method} ${pathname} 503 - ${Date.now() - requestStart}ms`);
      return new Response(body, {
        status: 503,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    const cacheKey = `${pathname}${url.search}`;

    // Check cache
    const cached = getCached(cacheKey);
    if (cached) {
      const body = JSON.stringify(cached);
      console.log(`[${new Date().toISOString()}] ${method} ${pathname} 200 CACHE_HIT ${Date.now() - requestStart}ms`);
      return new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    try {
      const page = url.searchParams.get('page') || '1';
      let result;
      let ttl = TTL.LIST;

      // Route: GET /api/movies/popular
      if (pathname === '/api/movies/popular') {
        const data = await fetchTMDB('/3/movie/popular', { page });
        const items = (data.results || []).map(transformMovieListItem);
        result = wrapPaginatedList(data, items);
      }
      // Route: GET /api/movies/trending
      else if (pathname === '/api/movies/trending') {
        const data = await fetchTMDB('/3/trending/movie/week', { page });
        const items = (data.results || []).map(transformMovieListItem);
        result = wrapPaginatedList(data, items);
      }
      // Route: GET /api/movies/top-rated
      else if (pathname === '/api/movies/top-rated') {
        const data = await fetchTMDB('/3/movie/top_rated', { page });
        const items = (data.results || []).map(transformMovieListItem);
        result = wrapPaginatedList(data, items);
      }
      // Route: GET /api/movies/upcoming
      else if (pathname === '/api/movies/upcoming') {
        const data = await fetchTMDB('/3/movie/upcoming', { page });
        const items = (data.results || []).map(transformMovieListItem);
        result = wrapPaginatedList(data, items);
      }
      // Route: GET /api/tv/popular
      else if (pathname === '/api/tv/popular') {
        const data = await fetchTMDB('/3/tv/popular', { page });
        const items = (data.results || []).map(transformTVListItem);
        result = wrapPaginatedList(data, items);
      }
      // Route: GET /api/tv/trending
      else if (pathname === '/api/tv/trending') {
        const data = await fetchTMDB('/3/trending/tv/week', { page });
        const items = (data.results || []).map(transformTVListItem);
        result = wrapPaginatedList(data, items);
      }
      // Route: GET /api/tv/top-rated
      else if (pathname === '/api/tv/top-rated') {
        const data = await fetchTMDB('/3/tv/top_rated', { page });
        const items = (data.results || []).map(transformTVListItem);
        result = wrapPaginatedList(data, items);
      }
      // Route: GET /api/search
      else if (pathname === '/api/search') {
        const query = url.searchParams.get('query') || '';
        const data = await fetchTMDB('/3/search/multi', { query, page });
        result = transformSearchResults(data);
        ttl = TTL.SEARCH;
      }
      // Route: GET /api/tv/:id/season/:season
      else if (pathname.match(/^\/api\/tv\/(\d+)\/season\/(\d+)$/)) {
        const match = pathname.match(/^\/api\/tv\/(\d+)\/season\/(\d+)$/);
        const tmdbId = match[1];
        const seasonNum = match[2];
        const data = await fetchTMDB(`/3/tv/${tmdbId}/season/${seasonNum}`);
        result = transformSeason(data, tmdbId);
        ttl = TTL.DETAIL;
      }
      // Route: GET /api/movie/:id
      else if (pathname.match(/^\/api\/movie\/(\d+)$/)) {
        const match = pathname.match(/^\/api\/movie\/(\d+)$/);
        const movieId = match[1];
        const data = await fetchTMDB(`/3/movie/${movieId}`, { append_to_response: 'credits,external_ids' });
        result = transformMovieDetail(data);
        ttl = TTL.DETAIL;
      }
      // Route: GET /api/tv/:id
      else if (pathname.match(/^\/api\/tv\/(\d+)$/)) {
        const match = pathname.match(/^\/api\/tv\/(\d+)$/);
        const tvId = match[1];
        const data = await fetchTMDB(`/3/tv/${tvId}`, { append_to_response: 'credits,external_ids' });
        result = transformTVDetail(data);
        ttl = TTL.DETAIL;
      }
      // 404
      else {
        const body = JSON.stringify({ error: 'Not Found' });
        console.log(`[${new Date().toISOString()}] ${method} ${pathname} 404 - ${Date.now() - requestStart}ms`);
        return new Response(body, {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders() },
        });
      }

      setCache(cacheKey, result, ttl);
      const body = JSON.stringify(result);
      console.log(`[${new Date().toISOString()}] ${method} ${pathname} 200 CACHE_MISS ${Date.now() - requestStart}ms`);
      return new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    } catch (err) {
      const body = JSON.stringify({ error: 'Bad Gateway', detail: err.message });
      console.log(`[${new Date().toISOString()}] ${method} ${pathname} 502 ERROR ${Date.now() - requestStart}ms`);
      return new Response(body, {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }
  },
});

console.log(`[hijistream-server] Listening on http://localhost:${server.port}`);
