import { getOrFetchSubtitle, readMetadata, removeFromMetadata, deleteSubtitleFile, handleUploadSubtitle, refreshSubtitle, refreshAllSubtitles, updateMetadataEntry, getMonitoringData, r2PutObject, getR2PublicUrl, signS3, readProviderSettings, writeProviderSettings, PROVIDERS_SETTINGS_KEY, searchSubtitlesFromProviders, downloadSubtitleByProvider, backfillTitles } from '../../src/utils/subtitle.js';

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

function transformMovieListItem(m) {
  return { id: m.id, title: m.title, year: m.release_date?.substring(0, 4) || '', poster_url: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : '', backdrop_url: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : '', rating: m.vote_average?.toFixed(1) || '0.0', genre: mapGenreIds(m.genre_ids), overview: m.overview || '', popularity: m.popularity, type: 'movie', embed_url: `https://vaplayer.ru/embed/movie/${m.id}` };
}

function transformTVListItem(s) {
  return { id: s.id, title: s.name, year: s.first_air_date?.substring(0, 4) || '', poster_url: s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : '', backdrop_url: s.backdrop_path ? `https://image.tmdb.org/t/p/original${s.backdrop_path}` : '', rating: s.vote_average?.toFixed(1) || '0.0', genre: mapGenreIds(s.genre_ids), overview: s.overview || '', popularity: s.popularity, type: 'tv', embed_url: `https://vaplayer.ru/embed/tv/${s.id}` };
}

function transformMovieDetail(m) {
  return { id: m.id, imdb_id: m.external_ids?.imdb_id || m.imdb_id || null, title: m.title, year: m.release_date?.substring(0, 4) || '', poster_url: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : '', backdrop_url: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : '', rating: m.vote_average?.toFixed(1) || '0.0', genre: m.genres?.map(g => g.name).join(', ') || '', overview: m.overview || '', runtime: m.runtime || null, credits: m.credits?.cast?.slice(0, 10).map(c => ({ name: c.name, character: c.character, profile_path: c.profile_path })) || [], type: 'movie', embed_url: `https://vaplayer.ru/embed/movie/${m.id}` };
}

function transformTVDetail(s) {
  return { id: s.id, imdb_id: s.external_ids?.imdb_id || null, title: s.name, year: s.first_air_date?.substring(0, 4) || '', poster_url: s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : '', backdrop_url: s.backdrop_path ? `https://image.tmdb.org/t/p/original${s.backdrop_path}` : '', rating: s.vote_average?.toFixed(1) || '0.0', genre: s.genres?.map(g => g.name).join(', ') || '', overview: s.overview || '', number_of_seasons: s.number_of_seasons || 0, number_of_episodes: s.number_of_episodes || 0, seasons: s.seasons?.filter(x => x.season_number > 0).map(x => ({ season_number: x.season_number, name: x.name || `Season ${x.season_number}`, episode_count: x.episode_count || 0, air_date: x.air_date || '', poster_path: x.poster_path ? `https://image.tmdb.org/t/p/w300${x.poster_path}` : '' })) || [], credits: s.credits?.cast?.slice(0, 10).map(c => ({ name: c.name, character: c.character, profile_path: c.profile_path })) || [], type: 'tv', embed_url: `https://vaplayer.ru/embed/tv/${s.id}` };
}

function transformSeason(season, tmdbId) {
  return { id: season.id, season_number: season.season_number, episodes: season.episodes?.map(ep => ({ id: ep.id, episode_number: ep.episode_number, name: ep.name, overview: ep.overview || '', still_path: ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : '', air_date: ep.air_date || '', runtime: ep.runtime || null, embed_url: `https://vaplayer.ru/embed/tv/${tmdbId}/${season.season_number}/${ep.episode_number}` })) || [] };
}

function transformSearchResults(data) {
  const items = (data.results || []).filter(i => i.media_type === 'movie' || i.media_type === 'tv').map(i => i.media_type === 'movie' ? transformMovieListItem(i) : transformTVListItem(i));
  return { page: data.page, total_pages: data.total_pages, total_results: data.total_results, items };
}

function wrapPaginatedList(data, items) {
  return { page: data.page, total_pages: data.total_pages, total_results: data.total_results, items };
}

async function fetchTMDB(apiKey, path, queryParams = {}) {
  const params = new URLSearchParams({ api_key: apiKey, ...queryParams });
  const res = await fetch(`${TMDB_BASE}${path}?${params}`, { headers: { 'User-Agent': 'HIJISTREAM/1.0' } });
  if (!res.ok) { const err = new Error(`TMDB API error: ${res.status}`); err.status = res.status; throw err; }
  return res.json();
}

function checkAdminAuth(env, request) {
  const username = env.ADMIN_USERNAME, password = env.ADMIN_PASSWORD;
  if (!username || !password) return new Response(JSON.stringify({ error: 'Admin not configured' }), { status: 503, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Basic ')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'WWW-Authenticate': 'Basic realm="Admin"' } });
  try {
    const decoded = atob(authHeader.slice(6));
    const colonIdx = decoded.indexOf(':');
    if (decoded.slice(0, colonIdx) !== username || decoded.slice(colonIdx + 1) !== password) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  } catch { return new Response(JSON.stringify({ error: 'Invalid auth' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }); }
  return null;
}

async function handleSubtitles(env, url) {
  const type = url.searchParams.get('type');
  const tmdbId = url.searchParams.get('tmdb_id');
  const lang = url.searchParams.get('lang') || 'en';
  const season = url.searchParams.get('season');
  const episode = url.searchParams.get('episode');
  const imdbId = url.searchParams.get('imdb_id');

  if (!type || !tmdbId) return { error: 'Missing type, tmdb_id', subtitles: [] };
  if (type !== 'movie' && type !== 'tv') return { error: 'type must be movie or tv', subtitles: [] };

  const r2Vars = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL'];
  const missingR2 = r2Vars.filter(v => !env[v]);
  if (missingR2.length) return { error: 'R2 not configured', subtitles: [], missing: missingR2 };

  try {
    const options = {};
    if (season) options.season = Number(season);
    if (episode) options.episode = Number(episode);
    if (imdbId) options.imdbId = imdbId;
    const languages = lang.split(',').map(l => l.trim()).filter(Boolean);
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

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const jsonRes = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });

async function handleAdmin(pathname, method, env, request) {
  if (pathname === '/admin/monitoring' && method === 'GET') {
    return jsonRes(await getMonitoringData(env));
  }

  if (pathname === '/admin/subtitles') {
    if (method === 'GET') return jsonRes(await readMetadata(env));
    if (method === 'DELETE') {
      const { id } = await request.json().catch(() => ({}));
      if (!id) return jsonRes({ error: 'Missing id' }, 400);
      const meta = await readMetadata(env);
      const entry = meta.subtitles.find(s => s.id === id);
      if (entry) { await deleteSubtitleFile(env, entry.key); await removeFromMetadata(env, id); }
      return jsonRes({ success: true });
    }
  }

  if (pathname === '/admin/subtitles/refresh' && method === 'POST') {
    const { id } = await request.json().catch(() => ({}));
    if (!id) return jsonRes({ error: 'Missing id' }, 400);
    const meta = await readMetadata(env);
    const entry = meta.subtitles.find(s => s.id === id);
    if (!entry) return jsonRes({ error: 'Not found' }, 404);
    const result = await refreshSubtitle(env, entry);
    return result ? jsonRes({ success: true, subtitle: result }) : jsonRes({ error: 'Refresh failed' }, 500);
  }

  if (pathname === '/admin/subtitles/refresh-all' && method === 'POST') {
    return jsonRes(await refreshAllSubtitles(env));
  }

  if (pathname === '/admin/subtitles/backfill' && method === 'POST') {
    const result = await backfillTitles(env);
    return jsonRes(result);
  }

  if (pathname === '/admin/subtitles/edit' && method === 'POST') {
    const { id, title, imdbId } = await request.json().catch(() => ({}));
    if (!id) return jsonRes({ error: 'Missing id' }, 400);
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (imdbId !== undefined) updates.imdbId = imdbId;
    if (!Object.keys(updates).length) return jsonRes({ error: 'No fields' }, 400);
    const ok = await updateMetadataEntry(env, id, updates);
    return ok ? jsonRes({ success: true }) : jsonRes({ error: 'Not found' }, 404);
  }

  if (pathname === '/admin/subtitles/download' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const { type, tmdb_id, lang, imdb_id, title, season, episode } = body;
    if (!type || !tmdb_id || !lang) return jsonRes({ error: 'type, tmdb_id, lang required' }, 400);
    const langs = String(lang).split(',').map(l => l.trim()).filter(Boolean);
    const results = [];
    for (const l of langs) {
      const sub = await getOrFetchSubtitle(env, type, String(tmdb_id), l, {
        imdbId: imdb_id || undefined, title: title || undefined,
        season: season ? Number(season) : undefined,
        episode: episode ? Number(episode) : undefined,
        force: true,
      });
      results.push({ lang: l, success: !!sub, url: sub?.url || null });
    }
    return jsonRes({ results, ok: results.filter(r => r.success).length });
  }

  if (pathname === '/admin/subtitles/upload' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const { type, tmdb_id, lang, content, imdb_id, title, season, episode } = body;
    if (!type || !tmdb_id || !lang || !content) return jsonRes({ error: 'Missing fields' }, 400);
    const result = await handleUploadSubtitle(env, { type, tmdbId: tmdb_id, lang, content, imdbId: imdb_id, title, season, episode });
    return result ? jsonRes({ success: true, subtitle: result }) : jsonRes({ error: 'Upload failed' }, 500);
  }

  if (pathname === '/admin/settings') {
    if (method === 'GET') {
      const settings = await readProviderSettings(env).catch(() => ({}));
      return new Response(JSON.stringify(settings), { status: 200, headers: { ...JSON_HEADERS, 'Cache-Control': 'no-store' } });
    }
    if (method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const existing = await readProviderSettings(env).catch(() => ({}));
      const { provider, ...rest } = body;
      const updated = provider ? { ...existing, [provider]: rest } : { ...existing, ...rest };
      const ok = await writeProviderSettings(env, updated);
      return ok ? jsonRes({ success: true }) : jsonRes({ error: 'Save failed' }, 500);
    }
  }

  if (pathname === '/admin/settings/check' && method === 'POST') {
    const { provider, apiKey, username, password } = await request.json().catch(() => ({}));
    try {
      if (provider === 'opensubtitles_com') {
        if (!apiKey || !username || !password) return jsonRes({ success: false, message: 'apiKey, username, password required' });
        const r = await fetch('https://api.opensubtitles.com/api/v1/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Api-Key': apiKey, 'User-Agent': 'HIJISTREAM/1.0' }, body: JSON.stringify({ username, password }) });
        const d = await r.json().catch(() => ({}));
        return jsonRes({ success: r.ok, message: r.ok ? `Login OK! Sisa download: ${d.user?.allowed_downloads ?? '?'}` : (d.message || `Gagal (${r.status})`) });
      }
      if (provider === 'opensubtitles_org') {
        if (!username || !password) return jsonRes({ success: false, message: 'username & password required' });
        const xml = `<?xml version="1.0"?><methodCall><methodName>LogIn</methodName><params><param><value><string>${username}</string></value></param><param><value><string>${password}</string></value></param><param><value><string>en</string></value></param><param><value><string>HIJISTREAM v1.0</string></value></param></params></methodCall>`;
        const r = await fetch('https://api.opensubtitles.org/xml-rpc', { method: 'POST', headers: { 'Content-Type': 'text/xml', 'User-Agent': 'HIJISTREAM v1.0' }, body: xml });
        const text = await r.text();
        const ok = r.ok && text.includes('200 OK');
        return jsonRes({ success: ok, message: ok ? 'Login OS.org berhasil!' : 'Login gagal (cek username/password)' });
      }
      if (provider === 'subdl') {
        if (!apiKey) return jsonRes({ success: false, message: 'apiKey required' });
        const r = await fetch(`https://api.subdl.com/api/v1/subtitles?api_key=${apiKey}&tmdb_id=27205&type=movie&languages=EN`, { headers: { 'User-Agent': 'HIJISTREAM/1.0' } });
        return jsonRes({ success: r.ok, message: r.ok ? 'API Key Subdl valid!' : `Tidak valid (${r.status})` });
      }
      return jsonRes({ success: false, message: 'Provider tidak dikenal' });
    } catch (err) {
      return jsonRes({ success: false, message: err.message });
    }
  }

  if (pathname === '/admin/r2-status' && method === 'GET') {
    const r2Vars = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL'];
    const missing = r2Vars.filter(v => !env[v]);
    if (missing.length) return jsonRes({ configured: false, missing });
    try {
      const dateStr = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
      const endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
      const path = `/${env.R2_BUCKET_NAME}`;
      const { authorization, payloadHash } = await signS3('GET', path + '?list-type=2&max-keys=1000', { host: new URL(endpoint).host }, null, env.R2_ACCESS_KEY_ID, env.R2_SECRET_ACCESS_KEY, 'auto', 's3', dateStr);
      const r2Res = await fetch(`${endpoint}${path}?list-type=2&max-keys=1000`, { headers: { Authorization: authorization, 'x-amz-content-sha256': payloadHash, 'x-amz-date': dateStr } });
      let objectCount = 0, totalSize = 0;
      if (r2Res.ok) {
        const xml = await r2Res.text();
        const sizes = [...xml.matchAll(/<Size>(\d+)<\/Size>/g)].map(m => Number(m[1]));
        objectCount = sizes.length; totalSize = sizes.reduce((a, b) => a + b, 0);
      }
      const stored = await readProviderSettings(env).catch(() => ({}));
      return jsonRes({ configured: true, bucket: env.R2_BUCKET_NAME, publicUrl: env.R2_PUBLIC_URL, objectCount, totalSize, osConfigured: !!(env.OPENSUBTITLES_API_KEY || stored.opensubtitles_com?.apiKey) });
    } catch (err) {
      return jsonRes({ configured: true, error: err.message });
    }
  }

  return jsonRes({ error: 'Admin route not found' }, 404);
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const pathname = url.pathname.replace(/^\/api/, '');
  const method = context.request.method;

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
  }

  const TMDB_API_KEY = context.env.TMDB_API_KEY;
  if (!TMDB_API_KEY) return jsonRes({ error: 'TMDB_API_KEY not configured' }, 503);

  const env = context.env;

  try {
    const page = url.searchParams.get('page') || '1';
    const language = url.searchParams.get('language') || '';
    const langParam = language ? { language } : {};
    const pageNum = Number(page);
    if (!Number.isInteger(pageNum) || pageNum < 1 || pageNum > 1000) return jsonRes({ error: 'Invalid page' }, 400);

    let result, cacheControl = 'public, s-maxage=300, stale-while-revalidate=600';

    if (pathname === '/movies/popular') { const d = await fetchTMDB(TMDB_API_KEY, '/3/movie/popular', { page, ...langParam }); result = wrapPaginatedList(d, d.results.map(transformMovieListItem)); }
    else if (pathname === '/movies/trending') { const d = await fetchTMDB(TMDB_API_KEY, '/3/trending/movie/week', { page, ...langParam }); result = wrapPaginatedList(d, d.results.map(transformMovieListItem)); }
    else if (pathname === '/movies/top-rated') { const d = await fetchTMDB(TMDB_API_KEY, '/3/movie/top_rated', { page, ...langParam }); result = wrapPaginatedList(d, d.results.map(transformMovieListItem)); }
    else if (pathname === '/movies/upcoming') { const d = await fetchTMDB(TMDB_API_KEY, '/3/movie/upcoming', { page, ...langParam }); result = wrapPaginatedList(d, d.results.map(transformMovieListItem)); }
    else if (pathname === '/tv/popular') { const d = await fetchTMDB(TMDB_API_KEY, '/3/tv/popular', { page, ...langParam }); result = wrapPaginatedList(d, d.results.map(transformTVListItem)); }
    else if (pathname === '/tv/trending') { const d = await fetchTMDB(TMDB_API_KEY, '/3/trending/tv/week', { page, ...langParam }); result = wrapPaginatedList(d, d.results.map(transformTVListItem)); }
    else if (pathname === '/tv/top-rated') { const d = await fetchTMDB(TMDB_API_KEY, '/3/tv/top_rated', { page, ...langParam }); result = wrapPaginatedList(d, d.results.map(transformTVListItem)); }
    else if (pathname === '/tv/on-the-air') { const d = await fetchTMDB(TMDB_API_KEY, '/3/tv/on_the_air', { page, ...langParam }); result = wrapPaginatedList(d, d.results.map(transformTVListItem)); }
    else if (pathname === '/anime/trending') { const d = await fetchTMDB(TMDB_API_KEY, '/3/discover/tv', { with_genres: '16', with_original_language: 'ja', sort_by: 'popularity.desc', page, ...langParam }); result = wrapPaginatedList(d, d.results.map(transformTVListItem)); }
    else if (pathname === '/anime/ongoing') { const ago = new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0]; const d = await fetchTMDB(TMDB_API_KEY, '/3/discover/tv', { with_genres: '16', with_original_language: 'ja', 'air_date.gte': ago, with_status: '0', sort_by: 'popularity.desc', page, ...langParam }); result = wrapPaginatedList(d, d.results.map(transformTVListItem)); }
    else if (pathname === '/anime/top-rated') { const d = await fetchTMDB(TMDB_API_KEY, '/3/discover/tv', { with_genres: '16', with_original_language: 'ja', sort_by: 'vote_average.desc', 'vote_count.gte': '100', page, ...langParam }); result = wrapPaginatedList(d, d.results.map(transformTVListItem)); }
    else if (pathname === '/search') {
      const query = url.searchParams.get('query')?.trim() || '';
      if (!query || query.length > 200) return jsonRes({ error: 'Invalid query' }, 400);
      const d = await fetchTMDB(TMDB_API_KEY, '/3/search/multi', { query, page, ...langParam });
      result = transformSearchResults(d); cacheControl = 'public, s-maxage=120, stale-while-revalidate=300';
    }
    else if (pathname === '/discover/movie' || pathname === '/discover/tv') {
      const isMovie = pathname === '/discover/movie';
      const p = { sort_by: url.searchParams.get('sort_by') || 'popularity.desc', page, ...langParam };
      const wg = url.searchParams.get('with_genres'), woc = url.searchParams.get('with_origin_country'), vc = url.searchParams.get('vote_count.gte');
      if (wg) p.with_genres = wg; if (woc) p.with_origin_country = woc; if (vc) p['vote_count.gte'] = vc;
      const d = await fetchTMDB(TMDB_API_KEY, isMovie ? '/3/discover/movie' : '/3/discover/tv', p);
      result = wrapPaginatedList(d, d.results.map(isMovie ? transformMovieListItem : transformTVListItem));
    }
    else if (pathname === '/genres/movie') { result = { genres: (await fetchTMDB(TMDB_API_KEY, '/3/genre/movie/list', langParam)).genres || [] }; }
    else if (pathname === '/genres/tv') { result = { genres: (await fetchTMDB(TMDB_API_KEY, '/3/genre/tv/list', langParam)).genres || [] }; }
    else if (pathname.match(/^\/movies\/([\w]{1,20})\/recommendations$/)) { const [,id] = pathname.match(/^\/movies\/([\w]{1,20})\/recommendations$/); const d = await fetchTMDB(TMDB_API_KEY, `/3/movie/${id}/recommendations`, { page, ...langParam }); result = wrapPaginatedList(d, d.results.map(transformMovieListItem)); }
    else if (pathname.match(/^\/tv\/([\w]{1,20})\/recommendations$/)) { const [,id] = pathname.match(/^\/tv\/([\w]{1,20})\/recommendations$/); const d = await fetchTMDB(TMDB_API_KEY, `/3/tv/${id}/recommendations`, { page, ...langParam }); result = wrapPaginatedList(d, d.results.map(transformTVListItem)); }
    else if (pathname.match(/^\/tv\/([\w]{1,20})\/season\/(\d+)$/)) {
      const [,id,s] = pathname.match(/^\/tv\/([\w]{1,20})\/season\/(\d+)$/);
      result = transformSeason(await fetchTMDB(TMDB_API_KEY, `/3/tv/${id}/season/${s}`, langParam), id);
      cacheControl = 'public, s-maxage=600, stale-while-revalidate=1200';
    }
    else if (pathname.match(/^\/movie\/([\w]{1,20})$/)) {
      const [,id] = pathname.match(/^\/movie\/([\w]{1,20})$/);
      const d = await fetchTMDB(TMDB_API_KEY, `/3/movie/${id}`, { append_to_response: 'credits,external_ids', ...langParam });
      if (!d.overview && language && language !== 'en-US') { const en = await fetchTMDB(TMDB_API_KEY, `/3/movie/${id}`, { language: 'en-US' }); if (en.overview) d.overview = en.overview; }
      result = transformMovieDetail(d); cacheControl = 'public, s-maxage=600, stale-while-revalidate=1200';
    }
    else if (pathname.match(/^\/tv\/([\w]{1,20})$/)) {
      const [,id] = pathname.match(/^\/tv\/([\w]{1,20})$/);
      const d = await fetchTMDB(TMDB_API_KEY, `/3/tv/${id}`, { append_to_response: 'credits,external_ids', ...langParam });
      if (!d.overview && language && language !== 'en-US') { const en = await fetchTMDB(TMDB_API_KEY, `/3/tv/${id}`, { language: 'en-US' }); if (en.overview) d.overview = en.overview; }
      result = transformTVDetail(d); cacheControl = 'public, s-maxage=600, stale-while-revalidate=1200';
    }
    else if (pathname === '/subtitles') {
      result = await handleSubtitles(env, url);
      cacheControl = 'public, s-maxage=3600, stale-while-revalidate=7200';
    }
    else if (pathname === '/subtitles/search') {
      const type = url.searchParams.get('type');
      const tmdbId = url.searchParams.get('tmdb_id');
      const lang = url.searchParams.get('lang') || '';
      const season = url.searchParams.get('season');
      const episode = url.searchParams.get('episode');
      const imdbId = url.searchParams.get('imdb_id');
      if (!type || !tmdbId) return jsonRes({ error: 'Missing type, tmdb_id', results: [] }, 400);
      const r2Vars = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL'];
      if (r2Vars.some(v => !env[v])) return jsonRes({ error: 'R2 not configured', results: [] }, 503);
      const opts = {};
      if (season) opts.season = Number(season);
      if (episode) opts.episode = Number(episode);
      if (imdbId) opts.imdbId = imdbId;
      if (lang) opts.lang = lang;
      const results = await searchSubtitlesFromProviders(env, type, tmdbId, opts);
      return jsonRes({ results, total: results.length });
    }
    else if (pathname === '/subtitles/download' && method === 'POST') {
      const body = await context.request.json().catch(() => ({}));
      const { provider, file_id, type, tmdb_id, lang, imdb_id, title, season, episode } = body;
      if (!provider || !file_id || !type || !tmdb_id || !lang) return jsonRes({ error: 'provider, file_id, type, tmdb_id, lang required' }, 400);
      const r2Vars = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL'];
      if (r2Vars.some(v => !env[v])) return jsonRes({ error: 'R2 not configured' }, 503);
      const sub = await downloadSubtitleByProvider(env, provider, file_id, type, String(tmdb_id), lang, {
        season: season ? Number(season) : undefined,
        episode: episode ? Number(episode) : undefined,
        imdbId: imdb_id || undefined,
        title: title || undefined,
      });
      if (!sub) return jsonRes({ error: 'Download failed' }, 500);
      return jsonRes({ success: true, subtitle: sub });
    }
    else if (pathname.startsWith('/admin/')) {
      const authErr = checkAdminAuth(env, context.request);
      if (authErr) return authErr;
      return handleAdmin(pathname, method, env, context.request);
    }
    else return jsonRes({ error: 'Not Found' }, 404);

    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': cacheControl } });
  } catch (error) {
    if (error.status === 404) return jsonRes({ error: 'Content not found' }, 404);
    return jsonRes({ error: 'Bad Gateway', message: error.message }, 502);
  }
}
