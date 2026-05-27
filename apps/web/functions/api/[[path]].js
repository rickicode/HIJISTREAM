export async function onRequest(context) {
  const url = new URL(context.request.url);
  const apiPath = url.pathname.replace(/^\/api/, '');
  const targetUrl = `https://vidapi.ru${apiPath}${url.search}`;

  const response = await fetch(targetUrl, {
    method: context.request.method,
    headers: {
      'User-Agent': 'HIJISTREAM/1.0',
    },
  });

  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  newHeaders.set('Access-Control-Allow-Headers', 'Content-Type');

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: newHeaders });
  }

  return new Response(response.body, {
    status: response.status,
    headers: newHeaders,
  });
}
