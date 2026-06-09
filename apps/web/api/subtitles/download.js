/**
 * Subtitle Download API — Node.js Runtime
 */
import { getOrFetchSubtitle } from '../../src/utils/subtitle.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = await req.json();
    const { provider, file_id, type, tmdb_id, lang, imdb_id, title, season, episode } = body;

    if (!provider || !file_id || !type || !tmdb_id || !lang) {
      return res.status(400).json({ error: 'provider, file_id, type, tmdb_id, lang required' });
    }

    const env = process.env;

    // Use getOrFetchSubtitle which handles all providers correctly
    const sub = await getOrFetchSubtitle(env, type, String(tmdb_id), lang, {
      season: season ? Number(season) : undefined,
      episode: episode ? Number(episode) : undefined,
      imdbId: imdb_id || undefined,
      title: title || undefined,
    });

    if (!sub) {
      return res.status(500).json({ error: 'Download failed' });
    }

    return res.status(200).json({ success: true, subtitle: sub });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
