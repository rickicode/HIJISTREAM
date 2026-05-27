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
    embed_url: `https://vaplayer.ru/embed/movie/${movie.external_ids?.imdb_id || movie.imdb_id || movie.id}`,
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

async function fetchTMDB(apiKey, path, queryParams = {}) {
  const params = new URLSearchParams({ api_key: apiKey, ...queryParams });
  const url = `${TMDB_BASE}${path}?${params.toString()}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'HIJISTREAM/1.0' } });
  if (!res.ok) {
    throw new Error(`TMDB API error: ${res.status}`);
  }
  return res.json();
}

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/^\/api/, '');

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  if (!TMDB_API_KEY) {
    return new Response(JSON.stringify({ error: 'TMDB_API_KEY not configured' }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    });
  }

  try {
    const page = url.searchParams.get('page') || '1';
    let result;
    let cacheControl = 'public, s-maxage=300, stale-while-revalidate=600';

    // Route: /movies/popular
    if (pathname === '/movies/popular') {
      const data = await fetchTMDB(TMDB_API_KEY, '/3/movie/popular', { page });
      const items = (data.results || []).map(transformMovieListItem);
      result = wrapPaginatedList(data, items);
    }
    // Route: /movies/trending
    else if (pathname === '/movies/trending') {
      const data = await fetchTMDB(TMDB_API_KEY, '/3/trending/movie/week', { page });
      const items = (data.results || []).map(transformMovieListItem);
      result = wrapPaginatedList(data, items);
    }
    // Route: /movies/top-rated
    else if (pathname === '/movies/top-rated') {
      const data = await fetchTMDB(TMDB_API_KEY, '/3/movie/top_rated', { page });
      const items = (data.results || []).map(transformMovieListItem);
      result = wrapPaginatedList(data, items);
    }
    // Route: /movies/upcoming
    else if (pathname === '/movies/upcoming') {
      const data = await fetchTMDB(TMDB_API_KEY, '/3/movie/upcoming', { page });
      const items = (data.results || []).map(transformMovieListItem);
      result = wrapPaginatedList(data, items);
    }
    // Route: /tv/popular
    else if (pathname === '/tv/popular') {
      const data = await fetchTMDB(TMDB_API_KEY, '/3/tv/popular', { page });
      const items = (data.results || []).map(transformTVListItem);
      result = wrapPaginatedList(data, items);
    }
    // Route: /tv/trending
    else if (pathname === '/tv/trending') {
      const data = await fetchTMDB(TMDB_API_KEY, '/3/trending/tv/week', { page });
      const items = (data.results || []).map(transformTVListItem);
      result = wrapPaginatedList(data, items);
    }
    // Route: /tv/top-rated
    else if (pathname === '/tv/top-rated') {
      const data = await fetchTMDB(TMDB_API_KEY, '/3/tv/top_rated', { page });
      const items = (data.results || []).map(transformTVListItem);
      result = wrapPaginatedList(data, items);
    }
    // Route: /search
    else if (pathname === '/search') {
      const query = url.searchParams.get('query') || '';
      const data = await fetchTMDB(TMDB_API_KEY, '/3/search/multi', { query, page });
      result = transformSearchResults(data);
      cacheControl = 'public, s-maxage=120, stale-while-revalidate=300';
    }
    // Route: /tv/:id/season/:season
    else if (pathname.match(/^\/tv\/(\d+)\/season\/(\d+)$/)) {
      const match = pathname.match(/^\/tv\/(\d+)\/season\/(\d+)$/);
      const tmdbId = match[1];
      const seasonNum = match[2];
      const data = await fetchTMDB(TMDB_API_KEY, `/3/tv/${tmdbId}/season/${seasonNum}`);
      result = transformSeason(data, tmdbId);
      cacheControl = 'public, s-maxage=600, stale-while-revalidate=1200';
    }
    // Route: /movie/:id
    else if (pathname.match(/^\/movie\/(\d+)$/)) {
      const match = pathname.match(/^\/movie\/(\d+)$/);
      const movieId = match[1];
      const data = await fetchTMDB(TMDB_API_KEY, `/3/movie/${movieId}`, { append_to_response: 'credits,external_ids' });
      result = transformMovieDetail(data);
      cacheControl = 'public, s-maxage=600, stale-while-revalidate=1200';
    }
    // Route: /tv/:id
    else if (pathname.match(/^\/tv\/(\d+)$/)) {
      const match = pathname.match(/^\/tv\/(\d+)$/);
      const tvId = match[1];
      const data = await fetchTMDB(TMDB_API_KEY, `/3/tv/${tvId}`, { append_to_response: 'credits,external_ids' });
      result = transformTVDetail(data);
      cacheControl = 'public, s-maxage=600, stale-while-revalidate=1200';
    }
    // 404
    else {
      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        },
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
    return new Response(JSON.stringify({ error: 'Bad Gateway', message: error.message }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    });
  }
}
