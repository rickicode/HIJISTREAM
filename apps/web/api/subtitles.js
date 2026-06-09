/**
 * Subtitle API routes — runs in Node.js Runtime (supports DecompressionStream)
 */

import { getOrFetchSubtitle, readMetadata, searchSubtitlesFromProviders, downloadSubtitleByProvider, backfillTitles, bulkDownloadSubtitles } from '../src/utils/subtitle.js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, `http://${req.headers.host}`);
  const type = url.searchParams.get('type');
  const tmdbId = url.searchParams.get('tmdb_id');
  const lang = url.searchParams.get('lang') || 'en';
  const season = url.searchParams.get('season');
  const episode = url.searchParams.get('episode');
  const imdbId = url.searchParams.get('imdb_id');

  if (!type || !tmdbId) {
    return res.status(400).json({ error: 'Missing type, tmdb_id', subtitles: [] });
  }

  const env = process.env;

  try {
    const options = {};
    if (season) options.season = Number(season);
    if (episode) options.episode = Number(episode);
    if (imdbId) options.imdbId = imdbId;

    // Fetch title from TMDB
    try {
      const tmdbKey = env.TMDB_API_KEY;
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
    } catch {}

    const languages = lang.split(',').map(l => l.trim()).filter(Boolean);
    const results = [];

    for (const l of languages) {
      const sub = await getOrFetchSubtitle(env, type, tmdbId, l, options);
      if (sub) results.push(sub);
    }

    return res.status(200).json({ subtitles: results });
  } catch (err) {
    console.error('[Subtitle] Error:', err.message);
    return res.status(500).json({ error: err.message, subtitles: [] });
  }
}
