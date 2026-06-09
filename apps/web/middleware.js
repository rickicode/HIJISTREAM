import { getOrFetchSubtitle, readMetadata, removeFromMetadata, deleteSubtitleFile, addToMetadata, handleUploadSubtitle, refreshSubtitle, refreshAllSubtitles, updateMetadataEntry, getMonitoringData, r2PutObject, getR2PublicUrl, signS3, readProviderSettings, writeProviderSettings, PROVIDERS_SETTINGS_KEY, searchSubtitlesFromProviders, downloadSubtitleByProvider, backfillTitles, bulkDownloadSubtitles } from './src/utils/subtitle.js';

const TMDB_BASE = 'https://api.themoviedb.org';

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

function transformMovieListItem(movie) {
  return {
    id: movie.id,
    tmdbId: movie.id,
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
    tmdbId: show.id,
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
    seasons: show.seasons?.filter(s => s.season_number > 0).map(s => ({
      season_number: s.season_number,
      name: s.name || `Season ${s.season_number}`,
      episode_count: s.episode_count || 0,
      air_date: s.air_date || '',
      poster_path: s.poster_path ? `https://image.tmdb.org/t/p/w300${s.poster_path}` : '',
    })) || [],
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

async function fetchTMDB(apiKey, path, queryParams = {}) {
  const params = new URLSearchParams({ api_key: apiKey, ...queryParams });
  const url = `${TMDB_BASE}${path}?${params.toString()}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'HIJISTREAM/1.0' } });
  if (!res.ok) {
    const err = new Error(`TMDB API error: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Check admin authentication against ADMIN_USERNAME / ADMIN_PASSWORD env vars.
 * Returns a 401 Response if unauthorized, or null if authenticated.
 */
function checkAdminAuth(env, request) {
  const username = env.ADMIN_USERNAME;
  const password = env.ADMIN_PASSWORD;
  if (!username || !password) {
    return new Response(JSON.stringify({ error: 'Admin not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD env vars.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Basic ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'WWW-Authenticate': 'Basic realm="Admin"',
      },
    });
  }

  try {
    const base64 = authHeader.slice(6);
    const decoded = atob(base64);
    const colonIdx = decoded.indexOf(':');
    const user = decoded.slice(0, colonIdx);
    const pass = decoded.slice(colonIdx + 1);

    if (user !== username || pass !== password) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid authorization header' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  return null; // authenticated
}

/**
 * Handle subtitle requests: fetch subtitles from R2 cache or OpenSubtitles API.
 */
async function handleSubtitles(env, url) {
  const type = url.searchParams.get('type'); // 'movie' or 'tv'
  const tmdbId = url.searchParams.get('tmdb_id');
  const lang = url.searchParams.get('lang') || 'en';
  const season = url.searchParams.get('season');
  const episode = url.searchParams.get('episode');
  const imdbId = url.searchParams.get('imdb_id');

  if (!type || !tmdbId) {
    return { error: 'Missing required params: type, tmdb_id', subtitles: [] };
  }

  if (type !== 'movie' && type !== 'tv') {
    return { error: 'type must be movie or tv', subtitles: [] };
  }

  // Check R2 infra vars
  const r2Vars = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL'];
  const missingR2 = r2Vars.filter((v) => !env[v]);
  if (missingR2.length > 0) {
    return { error: 'Subtitle service not configured', subtitles: [], missing: missingR2 };
  }

  // Resolve OS credentials: env vars > R2-stored settings
  let osEnv = env;
  if (!env.OPENSUBTITLES_API_KEY || !env.OPENSUBTITLES_USERNAME || !env.OPENSUBTITLES_PASSWORD) {
    try {
      const res = await fetch(getR2PublicUrl(env, PROVIDERS_SETTINGS_KEY));
      if (res.ok) {
        const stored = await res.json();
        if (stored.opensubtitles_com?.apiKey) {
          osEnv = { ...env, OPENSUBTITLES_API_KEY: stored.opensubtitles_com.apiKey, OPENSUBTITLES_USERNAME: stored.opensubtitles_com.username, OPENSUBTITLES_PASSWORD: stored.opensubtitles_com.password };
        }
      }
    } catch { /* ignore */ }
  }
  if (!osEnv.OPENSUBTITLES_API_KEY) {
    return { error: 'OpenSubtitles credentials not configured', subtitles: [] };
  }

  try {
    const options = {};
    if (season) options.season = Number(season);
    if (episode) options.episode = Number(episode);
    if (imdbId) options.imdbId = imdbId;

    // Fetch title from TMDB to store in subtitle metadata
    try {
      const tmdbKey = process.env.TMDB_API_KEY;
      if (tmdbKey) {
        const endpoint = type === 'tv'
          ? `https://api.themoviedb.org/3/tv/${tmdbId}?language=en-US`
          : `https://api.themoviedb.org/3/movie/${tmdbId}?language=en-US`;
        const tmdbRes = await fetch(endpoint, { headers: { Authorization: `Bearer ${tmdbKey}` } });
        if (tmdbRes.ok) {
          const tmdbData = await tmdbRes.json();
          options.title = tmdbData.title || tmdbData.name || null;
          if (!options.imdbId && tmdbData.external_ids?.imdb_id) {
            options.imdbId = tmdbData.external_ids.imdb_id;
          }
        }
      }
    } catch { /* proceed without title */ }

    const languages = lang.split(',').map((l) => l.trim()).filter(Boolean);
    const results = [];

    for (const l of languages) {
      const sub = await getOrFetchSubtitle(osEnv, type, tmdbId, l, options);
      if (sub) results.push(sub);
    }

    return { subtitles: results };
  } catch (err) {
    console.error('[Subtitle] Error:', err.message);
    return { error: err.message, subtitles: [] };
  }
}

export const config = {
  matcher: '/api/:path*',
};

export default async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/^\/api/, '');

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  if (!TMDB_API_KEY) {
    return new Response(JSON.stringify({ error: 'TMDB_API_KEY not configured. Set it in Vercel project environment variables.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const page = url.searchParams.get('page') || '1';
    const language = url.searchParams.get('language') || '';
    const langParam = language ? { language } : {};

    // Validate page parameter
    const pageNum = Number(page);
    if (!Number.isInteger(pageNum) || pageNum < 1 || pageNum > 1000) {
      return new Response(JSON.stringify({ error: 'Invalid page parameter. Must be an integer between 1 and 1000.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    let result;
    let cacheControl = 'public, s-maxage=300, stale-while-revalidate=600';

    if (pathname === '/movies/popular') {
      const data = await fetchTMDB(TMDB_API_KEY, '/3/movie/popular', { page, ...langParam });
      result = wrapPaginatedList(data, (data.results || []).map(transformMovieListItem));
    } else if (pathname === '/movies/trending') {
      const data = await fetchTMDB(TMDB_API_KEY, '/3/trending/movie/week', { page, ...langParam });
      result = wrapPaginatedList(data, (data.results || []).map(transformMovieListItem));
    } else if (pathname === '/movies/top-rated') {
      const data = await fetchTMDB(TMDB_API_KEY, '/3/movie/top_rated', { page, ...langParam });
      result = wrapPaginatedList(data, (data.results || []).map(transformMovieListItem));
    } else if (pathname === '/movies/upcoming') {
      const data = await fetchTMDB(TMDB_API_KEY, '/3/movie/upcoming', { page, ...langParam });
      result = wrapPaginatedList(data, (data.results || []).map(transformMovieListItem));
    } else if (pathname === '/tv/popular') {
      const data = await fetchTMDB(TMDB_API_KEY, '/3/tv/popular', { page, ...langParam });
      result = wrapPaginatedList(data, (data.results || []).map(transformTVListItem));
    } else if (pathname === '/tv/trending') {
      const data = await fetchTMDB(TMDB_API_KEY, '/3/trending/tv/week', { page, ...langParam });
      result = wrapPaginatedList(data, (data.results || []).map(transformTVListItem));
    } else if (pathname === '/tv/top-rated') {
      const data = await fetchTMDB(TMDB_API_KEY, '/3/tv/top_rated', { page, ...langParam });
      result = wrapPaginatedList(data, (data.results || []).map(transformTVListItem));
    } else if (pathname === '/search') {
      const query = url.searchParams.get('query') || '';
      const trimmedQuery = query.trim();
      if (!trimmedQuery || trimmedQuery.length > 200) {
        return new Response(JSON.stringify({ error: 'Invalid query parameter. Must be non-empty and at most 200 characters.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      const data = await fetchTMDB(TMDB_API_KEY, '/3/search/multi', { query: trimmedQuery, page, ...langParam });
      result = transformSearchResults(data);
      cacheControl = 'public, s-maxage=120, stale-while-revalidate=300';
    } else if (pathname === '/anime/trending') {
      const data = await fetchTMDB(TMDB_API_KEY, '/3/discover/tv', { with_genres: '16', with_original_language: 'ja', sort_by: 'popularity.desc', page, ...langParam });
      result = wrapPaginatedList(data, (data.results || []).map(transformTVListItem));
    } else if (pathname === '/anime/ongoing') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const data = await fetchTMDB(TMDB_API_KEY, '/3/discover/tv', { with_genres: '16', with_original_language: 'ja', 'air_date.gte': thirtyDaysAgo, with_status: '0', sort_by: 'popularity.desc', page, ...langParam });
      result = wrapPaginatedList(data, (data.results || []).map(transformTVListItem));
    } else if (pathname === '/anime/top-rated') {
      const data = await fetchTMDB(TMDB_API_KEY, '/3/discover/tv', { with_genres: '16', with_original_language: 'ja', sort_by: 'vote_average.desc', 'vote_count.gte': '100', page, ...langParam });
      result = wrapPaginatedList(data, (data.results || []).map(transformTVListItem));
    } else if (pathname === '/tv/on-the-air') {
      const data = await fetchTMDB(TMDB_API_KEY, '/3/tv/on_the_air', { page, ...langParam });
      result = wrapPaginatedList(data, (data.results || []).map(transformTVListItem));
    } else if (pathname === '/discover/movie') {
      const with_genres = url.searchParams.get('with_genres') || '';
      const with_origin_country = url.searchParams.get('with_origin_country') || '';
      const sort_by = url.searchParams.get('sort_by') || 'popularity.desc';
      const vote_count_gte = url.searchParams.get('vote_count.gte') || '';
      const params = { sort_by, page, ...langParam };
      if (with_genres) params.with_genres = with_genres;
      if (with_origin_country) params.with_origin_country = with_origin_country;
      if (vote_count_gte) params['vote_count.gte'] = vote_count_gte;
      const data = await fetchTMDB(TMDB_API_KEY, '/3/discover/movie', params);
      result = wrapPaginatedList(data, (data.results || []).map(transformMovieListItem));
    } else if (pathname === '/discover/tv') {
      const with_genres = url.searchParams.get('with_genres') || '';
      const with_origin_country = url.searchParams.get('with_origin_country') || '';
      const sort_by = url.searchParams.get('sort_by') || 'popularity.desc';
      const vote_count_gte = url.searchParams.get('vote_count.gte') || '';
      const params = { sort_by, page, ...langParam };
      if (with_genres) params.with_genres = with_genres;
      if (with_origin_country) params.with_origin_country = with_origin_country;
      if (vote_count_gte) params['vote_count.gte'] = vote_count_gte;
      const data = await fetchTMDB(TMDB_API_KEY, '/3/discover/tv', params);
      result = wrapPaginatedList(data, (data.results || []).map(transformTVListItem));
    } else if (pathname === '/genres/movie') {
      const data = await fetchTMDB(TMDB_API_KEY, '/3/genre/movie/list', { ...langParam });
      result = { genres: data.genres || [] };
    } else if (pathname === '/genres/tv') {
      const data = await fetchTMDB(TMDB_API_KEY, '/3/genre/tv/list', { ...langParam });
      result = { genres: data.genres || [] };
    } else if (pathname.match(/^\/movies\/([\w]{1,20})\/recommendations$/)) {
      const match = pathname.match(/^\/movies\/([\w]{1,20})\/recommendations$/);
      const data = await fetchTMDB(TMDB_API_KEY, `/3/movie/${match[1]}/recommendations`, { page, ...langParam });
      result = wrapPaginatedList(data, (data.results || []).map(transformMovieListItem));
    } else if (pathname.match(/^\/tv\/([\w]{1,20})\/recommendations$/)) {
      const match = pathname.match(/^\/tv\/([\w]{1,20})\/recommendations$/);
      const data = await fetchTMDB(TMDB_API_KEY, `/3/tv/${match[1]}/recommendations`, { page, ...langParam });
      result = wrapPaginatedList(data, (data.results || []).map(transformTVListItem));
    } else if (pathname.match(/^\/tv\/([\w]{1,20})\/season\/(\d+)$/)) {
      const match = pathname.match(/^\/tv\/([\w]{1,20})\/season\/(\d+)$/);
      const data = await fetchTMDB(TMDB_API_KEY, `/3/tv/${match[1]}/season/${match[2]}`, { ...langParam });
      result = transformSeason(data, match[1]);
      cacheControl = 'public, s-maxage=600, stale-while-revalidate=1200';
    } else if (pathname.match(/^\/movie\/([\w]{1,20})$/)) {
      const match = pathname.match(/^\/movie\/([\w]{1,20})$/);
      const data = await fetchTMDB(TMDB_API_KEY, `/3/movie/${match[1]}`, { append_to_response: 'credits,external_ids', ...langParam });
      // Fallback to English if overview is missing in selected language
      if (!data.overview && language && language !== 'en-US') {
        const enData = await fetchTMDB(TMDB_API_KEY, `/3/movie/${match[1]}`, { language: 'en-US' });
        if (enData.overview) data.overview = enData.overview;
      }
      result = transformMovieDetail(data);
      cacheControl = 'public, s-maxage=600, stale-while-revalidate=1200';
    } else if (pathname.match(/^\/tv\/([\w]{1,20})$/)) {
      const match = pathname.match(/^\/tv\/([\w]{1,20})$/);
      const data = await fetchTMDB(TMDB_API_KEY, `/3/tv/${match[1]}`, { append_to_response: 'credits,external_ids', ...langParam });
      // Fallback to English if overview is missing in selected language
      if (!data.overview && language && language !== 'en-US') {
        const enData = await fetchTMDB(TMDB_API_KEY, `/3/tv/${match[1]}`, { language: 'en-US' });
        if (enData.overview) data.overview = enData.overview;
      }
      result = transformTVDetail(data);
      cacheControl = 'public, s-maxage=600, stale-while-revalidate=1200';
    }
    // Route: /subtitles
    else if (pathname === '/subtitles') {
      result = await handleSubtitles(process.env, url);
      cacheControl = 'public, s-maxage=3600, stale-while-revalidate=7200';
    }
    // Route: /subtitles/search — search all providers without downloading
    else if (pathname === '/subtitles/search') {
      const type = url.searchParams.get('type');
      const tmdbId = url.searchParams.get('tmdb_id');
      const lang = url.searchParams.get('lang') || '';
      const season = url.searchParams.get('season');
      const episode = url.searchParams.get('episode');
      const imdbId = url.searchParams.get('imdb_id');
      if (!type || !tmdbId) {
        return new Response(JSON.stringify({ error: 'Missing required params: type, tmdb_id', results: [] }), {
          status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      const r2Vars = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL'];
      const missingR2 = r2Vars.filter((v) => !process.env[v]);
      if (missingR2.length > 0) {
        return new Response(JSON.stringify({ error: 'Subtitle service not configured', results: [], missing: missingR2 }), {
          status: 503, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      try {
        const opts = {};
        if (season) opts.season = Number(season);
        if (episode) opts.episode = Number(episode);
        if (imdbId) opts.imdbId = imdbId;
        if (lang) opts.lang = lang;
        const results = await searchSubtitlesFromProviders(process.env, type, tmdbId, opts);
        return new Response(JSON.stringify({ results, total: results.length }), {
          status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message, results: [] }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }
    // Route: /subtitles/download — download a specific subtitle from provider
    else if (pathname === '/subtitles/download' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}));
        const { provider, file_id, type, tmdb_id, lang, imdb_id, title, season, episode } = body;
        if (!provider || !file_id || !type || !tmdb_id || !lang) {
          return new Response(JSON.stringify({ error: 'provider, file_id, type, tmdb_id, lang required' }), {
            status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
        const r2Vars = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL'];
        const missingR2 = r2Vars.filter((v) => !process.env[v]);
        if (missingR2.length > 0) {
          return new Response(JSON.stringify({ error: 'R2 not configured' }), {
            status: 503, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
        const sub = await downloadSubtitleByProvider(process.env, provider, file_id, type, String(tmdb_id), lang, {
          season: season ? Number(season) : undefined,
          episode: episode ? Number(episode) : undefined,
          imdbId: imdb_id || undefined,
          title: title || undefined,
        });
        if (!sub) {
          return new Response(JSON.stringify({ error: 'Download failed' }), {
            status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
        return new Response(JSON.stringify({ success: true, subtitle: sub }), {
          status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }
    // Admin routes
    else if (pathname.startsWith('/admin/')) {
      const authResult = checkAdminAuth(process.env, request);
      if (authResult) return authResult;

      if (pathname === '/admin/monitoring') {
        if (request.method === 'GET') {
          const data = await getMonitoringData(process.env);
          return new Response(JSON.stringify(data), {
            status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      }
      if (pathname === '/admin/subtitles') {
        if (request.method === 'GET') {
          const metadata = await readMetadata(process.env);
          return new Response(JSON.stringify(metadata), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
        if (request.method === 'DELETE') {
          const body = await request.json().catch(() => ({}));
          const { id } = body;
          if (!id) {
            return new Response(JSON.stringify({ error: 'Missing subtitle id' }), {
              status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
          }
          // Get the metadata to find the key
          const metadata = await readMetadata(process.env);
          const entry = metadata.subtitles.find((s) => s.id === id);
          if (entry) {
            await deleteSubtitleFile(process.env, entry.key);
            await removeFromMetadata(process.env, id);
          }
          return new Response(JSON.stringify({ success: true }), {
            status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      }
      if (pathname === '/admin/subtitles/refresh') {
        if (request.method === 'POST') {
          const body = await request.json().catch(() => ({}));
          const { id } = body;
          if (!id) {
            return new Response(JSON.stringify({ error: 'Missing subtitle id' }), {
              status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
          }
          const metadata = await readMetadata(process.env);
          const entry = metadata.subtitles.find((s) => s.id === id);
          if (!entry) {
            return new Response(JSON.stringify({ error: 'Subtitle not found' }), {
              status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
          }
          const result = await refreshSubtitle(process.env, entry);
          if (!result) {
            return new Response(JSON.stringify({ error: 'Failed to refresh subtitle' }), {
              status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
          }
          return new Response(JSON.stringify({ success: true, subtitle: result }), {
            status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      }
      if (pathname === '/admin/subtitles/refresh-all') {
        if (request.method === 'POST') {
          const result = await refreshAllSubtitles(process.env);
          return new Response(JSON.stringify(result), {
            status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      }
      if (pathname === '/admin/subtitles/backfill') {
        if (request.method === 'POST') {
          const result = await backfillTitles(process.env);
          return new Response(JSON.stringify(result), {
            status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      }
      if (pathname === '/admin/subtitles/bulk') {
        if (request.method === 'POST') {
          const body = await request.json().catch(() => ({}));
          const { type, tmdb_id, languages, season_filter, imdb_id, title } = body;
          if (!type || !tmdb_id) {
            return new Response(JSON.stringify({ error: 'type and tmdb_id required' }), {
              status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
          }
          const result = await bulkDownloadSubtitles(process.env, type, String(tmdb_id), {
            languages: languages || ['id', 'en'],
            seasonFilter: season_filter || null,
            imdbId: imdb_id || undefined,
            title: title || undefined,
          });
          return new Response(JSON.stringify(result), {
            status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      }
      if (pathname === '/admin/subtitles/edit') {
        if (request.method === 'POST') {
          const body = await request.json().catch(() => ({}));
          const { id, title, imdbId } = body;
          if (!id) {
            return new Response(JSON.stringify({ error: 'Missing subtitle id' }), {
              status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
          }
          const updates = {};
          if (title !== undefined) updates.title = title;
          if (imdbId !== undefined) updates.imdbId = imdbId;
          if (Object.keys(updates).length === 0) {
            return new Response(JSON.stringify({ error: 'No fields to update' }), {
              status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
          }
          const ok = await updateMetadataEntry(process.env, id, updates);
          if (!ok) {
            return new Response(JSON.stringify({ error: 'Subtitle not found' }), {
              status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
          }
          return new Response(JSON.stringify({ success: true }), {
            status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      }
      if (pathname === '/admin/subtitles/download') {
        if (request.method === 'POST') {
          const body = await request.json().catch(() => ({}));
          const { type, tmdb_id, lang, imdb_id, title, season, episode } = body;
          if (!type || !tmdb_id || !lang) {
            return new Response(JSON.stringify({ error: 'type, tmdb_id, lang required' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
          }
          const langs = String(lang).split(',').map(l => l.trim()).filter(Boolean);
          const results = [];
          for (const l of langs) {
            const sub = await getOrFetchSubtitle(process.env, type, String(tmdb_id), l, {
              imdbId: imdb_id || undefined, title: title || undefined,
              season: season ? Number(season) : undefined,
              episode: episode ? Number(episode) : undefined,
              force: true,
            });
            results.push({ lang: l, success: !!sub, url: sub?.url || null });
          }
          return new Response(JSON.stringify({ results, ok: results.filter(r => r.success).length }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
      }
      if (pathname === '/admin/subtitles/upload') {
        if (request.method === 'POST') {
          const body = await request.json().catch(() => ({}));
          const { type, tmdb_id, lang, content, imdb_id, title, season, episode } = body;
          if (!type || !tmdb_id || !lang || !content) {
            return new Response(JSON.stringify({ error: 'Missing required fields: type, tmdb_id, lang, content' }), {
              status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
          }
          const result = await handleUploadSubtitle(process.env, {
            type, tmdbId: tmdb_id, lang, content,
            imdbId: imdb_id, title, season, episode,
          });
          if (!result) {
            return new Response(JSON.stringify({ error: 'Failed to upload subtitle' }), {
              status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
          }
          return new Response(JSON.stringify({ success: true, subtitle: result }), {
            status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      }
      if (pathname === '/admin/settings') {
        if (request.method === 'GET') {
          try {
            const settingsUrl = getR2PublicUrl(process.env, PROVIDERS_SETTINGS_KEY);
            const settings = await readProviderSettings(process.env).catch(() => ({}));
            return new Response(JSON.stringify(settings), {
              status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' },
            });
          } catch {
            return new Response(JSON.stringify({}), {
              status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' },
            });
          }
        }
        if (request.method === 'POST') {
          const body = await request.json().catch(() => ({}));
          // Accept either full object or per-provider patch
          const existing = await readProviderSettings(process.env).catch(() => ({}));
          const { provider, ...rest } = body;
          const updated = provider
            ? { ...existing, [provider]: rest }
            : { ...existing, ...rest };
          const ok = await writeProviderSettings(process.env, updated);
          return new Response(JSON.stringify(ok ? { success: true } : { error: 'Failed to save' }), {
            status: ok ? 200 : 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      }
      if (pathname === '/admin/settings/check') {
        if (request.method === 'POST') {
          const body = await request.json().catch(() => ({}));
          const { provider, apiKey, username, password } = body;
          try {
            let success = false, message = '';
            if (provider === 'opensubtitles_com' || (!provider && apiKey)) {
              if (!apiKey || !username || !password) return new Response(JSON.stringify({ success: false, message: 'apiKey, username, password required' }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
              const r = await fetch('https://api.opensubtitles.com/api/v1/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Api-Key': apiKey, 'User-Agent': 'HIJISTREAM/1.0' }, body: JSON.stringify({ username, password }) });
              const d = await r.json().catch(() => ({}));
              success = r.ok; message = r.ok ? `Login OK! Sisa download: ${d.user?.allowed_downloads ?? '?'}` : (d.message || `Login failed (${r.status})`);
            } else if (provider === 'opensubtitles_org') {
              if (!username || !password) return new Response(JSON.stringify({ success: false, message: 'username & password required' }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
              const xml = `<?xml version="1.0"?><methodCall><methodName>LogIn</methodName><params><param><value><string>${username}</string></value></param><param><value><string>${password}</string></value></param><param><value><string>en</string></value></param><param><value><string>HIJISTREAM v1.0</string></value></param></params></methodCall>`;
              const r = await fetch('https://api.opensubtitles.org/xml-rpc', { method: 'POST', headers: { 'Content-Type': 'text/xml', 'User-Agent': 'HIJISTREAM v1.0' }, body: xml });
              const text = await r.text();
              success = r.ok && text.includes('200 OK');
              message = success ? 'Login ke OpenSubtitles.org berhasil!' : 'Login gagal (cek username/password)';
            } else if (provider === 'subdl') {
              if (!apiKey) return new Response(JSON.stringify({ success: false, message: 'apiKey required' }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
              const r = await fetch(`https://api.subdl.com/api/v1/subtitles?api_key=${apiKey}&tmdb_id=27205&type=movie&languages=EN`, { headers: { 'User-Agent': 'HIJISTREAM/1.0' } });
              success = r.ok; message = r.ok ? 'API Key Subdl valid!' : `API Key tidak valid (${r.status})`;
            } else {
              message = 'Provider tidak dikenal';
            }
            return new Response(JSON.stringify({ success, message }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
          } catch (err) {
            return new Response(JSON.stringify({ success: false, message: err.message }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
          }
        }
      }
      if (pathname === '/admin/r2-status') {
        if (request.method === 'GET') {
          const r2Vars = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL'];
          const missing = r2Vars.filter((v) => !process.env[v]);
          if (missing.length > 0) {
            return new Response(JSON.stringify({ configured: false, missing }), {
              status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
          }
          try {
            const dateStr = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
            const endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
            const path = `/${process.env.R2_BUCKET_NAME}`;
            const { authorization, payloadHash } = await signS3(
              'GET', path + '?list-type=2&max-keys=1000',
              { host: new URL(endpoint).host }, null,
              process.env.R2_ACCESS_KEY_ID, process.env.R2_SECRET_ACCESS_KEY,
              'auto', 's3', dateStr
            );
            const r2Res = await fetch(`${endpoint}${path}?list-type=2&max-keys=1000`, {
              headers: { Authorization: authorization, 'x-amz-content-sha256': payloadHash, 'x-amz-date': dateStr },
            });
            let objectCount = 0, totalSize = 0;
            if (r2Res.ok) {
              const xml = await r2Res.text();
              const sizes = [...xml.matchAll(/<Size>(\d+)<\/Size>/g)].map((m) => Number(m[1]));
              objectCount = sizes.length;
              totalSize = sizes.reduce((a, b) => a + b, 0);
            }
            return new Response(JSON.stringify({
              configured: true,
              bucket: process.env.R2_BUCKET_NAME,
              publicUrl: process.env.R2_PUBLIC_URL,
              objectCount, totalSize,
              osConfigured: !!(process.env.OPENSUBTITLES_API_KEY && process.env.OPENSUBTITLES_USERNAME),
            }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
          } catch (err) {
            return new Response(JSON.stringify({ configured: true, error: err.message }), {
              status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
          }
        }
      }
      // 404 for unknown admin route
      return new Response(JSON.stringify({ error: 'Admin route not found' }), {
        status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
    // 404
    else {
      return new Response(JSON.stringify({ error: 'Not Found', path: pathname }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': cacheControl,
      },
    });
  } catch (error) {
    console.error('API Error:', error.message);
    if (error.status === 404) {
      return new Response(JSON.stringify({ error: 'Content not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
    return new Response(JSON.stringify({ error: 'Bad Gateway', message: error.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
