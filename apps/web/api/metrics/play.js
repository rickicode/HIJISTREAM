/**
 * Metrics Play API — Node.js Runtime (Vercel)
 * Records a playback event for the Top Played leaderboard.
 */
import { recordPlay } from '../../src/utils/subtitle.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = await req.json().catch(() => ({}));
    const { id, type, title, poster_url } = body;
    if (!id) return res.status(400).json({ error: 'id required' });

    const result = await recordPlay(process.env, { id, type: type || 'movie', title, poster_url });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
