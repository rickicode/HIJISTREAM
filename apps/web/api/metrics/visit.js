/**
 * Metrics Visit API — Node.js Runtime (Vercel)
 * Records a pageview for visitor analytics.
 */
import { recordVisit } from '../../src/utils/subtitle.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = await req.json().catch(() => ({}));
    const userAgent = req.headers['user-agent'] || '';
    let deviceType = 'desktop';
    if (/tv|smarttv|googletv|appletv|android tv/i.test(userAgent)) deviceType = 'tv';
    else if (/mobile|iphone|android|ipad/i.test(userAgent)) deviceType = 'mobile';

    const result = await recordVisit(process.env, {
      visitorId: body.visitorId,
      path: body.path || '/',
      deviceType: body.deviceType || deviceType,
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
