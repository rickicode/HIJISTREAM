/**
 * Subtitle Search API — Node.js Runtime
 */
import { searchSubtitlesFromProviders } from '../../src/utils/subtitle.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, `http://${req.headers.host}`);
  const type = url.searchParams.get('type');
  const tmdbId = url.searchParams.get('tmdb_id');
  const lang = url.searchParams.get('lang') || '';
  const season = url.searchParams.get('season');
  const episode = url.searchParams.get('episode');
  const imdbId = url.searchParams.get('imdb_id');

  if (!type || !tmdbId) {
    return res.status(400).json({ error: 'Missing type, tmdb_id', results: [] });
  }

  try {
    const opts = {};
    if (season) opts.season = Number(season);
    if (episode) opts.episode = Number(episode);
    if (imdbId) opts.imdbId = imdbId;
    if (lang) opts.lang = lang;

    const results = await searchSubtitlesFromProviders(process.env, type, tmdbId, opts);
    return res.status(200).json({ results, total: results.length });
  } catch (err) {
    return res.status(500).json({ error: err.message, results: [] });
  }
}
