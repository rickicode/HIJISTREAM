import { getOrFetchSubtitle, readMetadata, removeFromMetadata, deleteSubtitleFile, addToMetadata, handleUploadSubtitle, refreshSubtitle, refreshAllSubtitles, updateMetadataEntry, getMonitoringData } from './src/utils/subtitle.js';

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

  // Check if all required env vars are configured
  const requiredVars = [
    'OPENSUBTITLES_API_KEY', 'OPENSUBTITLES_USERNAME', 'OPENSUBTITLES_PASSWORD',
    'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL',
  ];
  const missing = requiredVars.filter((v) => !env[v]);
  if (missing.length > 0) {
    console.log(`[Subtitle] Missing env vars: ${missing.join(', ')}`);
    return { error: 'Subtitle service not configured', subtitles: [], missing };
  }

  try {
    const options = {};
    if (season) options.season = Number(season);
    if (episode) options.episode = Number(episode);
    if (imdbId) options.imdbId = imdbId;

    const languages = lang.split(',').map((l) => l.trim()).filter(Boolean);
    const results = [];

    for (const l of languages) {
      const sub = await getOrFetchSubtitle(env, type, tmdbId, l, options);
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
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
