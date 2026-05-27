const UPSTREAM = 'https://vidapi.ru';

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const url = new URL(request.url);
  const apiPath = url.pathname.replace(/^\/api/, '');
  const targetUrl = `${UPSTREAM}${apiPath}${url.search}`;

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

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'HIJISTREAM/1.0',
      },
    });

    const body = await upstreamResponse.text();

    // Only cache successful responses with actual content
    const hasContent = upstreamResponse.ok && body && body.length > 2;
    const cacheHeader = hasContent
      ? 'public, s-maxage=300, stale-while-revalidate=600'
      : 'no-store, no-cache, must-revalidate';

    return new Response(body || JSON.stringify({ error: 'Not Found' }), {
      status: upstreamResponse.status,
      headers: {
        'Content-Type': upstreamResponse.headers.get('content-type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': cacheHeader,
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Bad Gateway', message: error.message }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
