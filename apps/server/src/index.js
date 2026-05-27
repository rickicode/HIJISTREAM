const PORT = process.env.PORT || 3001;
const UPSTREAM = 'https://vidapi.ru';

// In-memory cache
const cache = new Map();

// TTL constants (milliseconds)
const TTL = {
  LIST: 86400000,      // 24 hours
  DETAIL: 604800000,   // 7 days
  SEARCH: 3600000,     // 1 hour
};

function getTTL(path) {
  if (path.includes('/search')) return TTL.SEARCH;
  if (path.match(/\/(movie|tv)\/[^/]+\.json$/)) return TTL.DETAIL;
  return TTL.LIST;
}

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
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

const startTime = Date.now();

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const { pathname, search } = url;
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

    // Strip /api prefix and build upstream URL
    const upstreamPath = pathname.replace(/^\/api/, '');
    const cacheKey = `${pathname}${search}`;

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

    // Proxy to upstream
    try {
      const upstreamUrl = `${UPSTREAM}${upstreamPath}${search}`;
      const upstreamRes = await fetch(upstreamUrl);

      if (!upstreamRes.ok) {
        const body = JSON.stringify({ error: `Upstream error: ${upstreamRes.status}` });
        console.log(`[${new Date().toISOString()}] ${method} ${pathname} ${upstreamRes.status} CACHE_MISS ${Date.now() - requestStart}ms`);
        return new Response(body, {
          status: upstreamRes.status,
          headers: { 'Content-Type': 'application/json', ...corsHeaders() },
        });
      }

      const data = await upstreamRes.json();
      const ttl = getTTL(upstreamPath);
      setCache(cacheKey, data, ttl);

      const body = JSON.stringify(data);
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
